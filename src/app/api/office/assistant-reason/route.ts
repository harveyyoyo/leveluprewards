export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { guardAiRoute } from '@/lib/apiAuth';
import { STAFF_HELP_AI_MODEL } from '@/lib/aiModelPreference';
import {
  REASON_STUDENT_LIMIT,
  buildReasonContext,
  matchStudentsByName,
  officeReasonRequestSchema,
  parseReasonReply,
  reasonActiveStudents,
  reasonCutoffDate,
  reasonSystemPrompt,
  type ReasonAttendance,
  type ReasonDeskEntry,
  type ReasonGrade,
  type ReasonStudent,
} from '@/lib/office/officeAssistantReason';
import {
  OfficeAccessDenied,
  appendOfficeAuditAsUser,
  getOfficeDocAsUser,
  queryOfficeCollectionAsUser,
} from '@/lib/office/server/officeRecordsAsUser';

const MAX_QUESTION_LEN = 500;

/**
 * Help → Ask for questions that need the assistant to think over records ("summarize this
 * student", "who has falling grades and more absences?"). Records are read with the caller's own
 * sign-in, so the database rules decide what they may see; the school can turn this off in
 * Settings; every read is written to the change history before anything is sent to the AI; and
 * the AI gets codes instead of names and only the fields the question needs.
 */
export async function POST(req: NextRequest) {
  try {
    const guarded = await guardAiRoute(req, { requireSchoolStaff: true, maxRequests: 15, maxBodyBytes: 64 * 1024 });
    if (!guarded.ok) return guarded.response;
    const { body, schoolId, uid } = guarded.value;
    const idToken = /^Bearer\s+(.+)$/i.exec(req.headers.get('authorization') || '')?.[1];
    if (!schoolId || !idToken) return NextResponse.json({ error: 'Sign in again.' }, { status: 401 });

    const question =
      typeof body.question === 'string' ? body.question.replace(/\u0000/g, '').trim().slice(0, MAX_QUESTION_LEN) : '';
    const parsedReason = officeReasonRequestSchema.safeParse(body.reason);
    if (!question || !parsedReason.success) return NextResponse.json({ error: 'Invalid question.' }, { status: 400 });
    const reason = parsedReason.data;
    const today =
      typeof body.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : new Date().toISOString().slice(0, 10);
    const askedIds = Array.isArray(body.studentIds)
      ? body.studentIds.filter((x): x is string => typeof x === 'string').slice(0, REASON_STUDENT_LIMIT)
      : [];
    const changedBy = typeof body.changedBy === 'string' ? body.changedBy.trim().slice(0, 80) || null : null;

    // Office access and the school's switch, both read as the caller.
    let settings: Record<string, unknown> | null;
    try {
      settings = await getOfficeDocAsUser(idToken, schoolId, 'officeSettings/config');
    } catch (e) {
      if (e instanceof OfficeAccessDenied) {
        return NextResponse.json({ type: 'denied', message: 'Only School Office staff can ask about student records.' });
      }
      throw e;
    }
    const features = (settings?.features ?? {}) as Record<string, unknown>;
    if (features.aiRecords === false || features.aiHelp === false) {
      return NextResponse.json({ type: 'off' });
    }

    const topics = reason.topics;
    const wantNotes = topics.includes('notes');
    const wantHealth = topics.includes('health');
    const students = (await queryOfficeCollectionAsUser(idToken, schoolId, 'officeStudents', {
      fields: [
        'firstName',
        'lastName',
        'nickname',
        'classId',
        'familyId',
        'status',
        'archived',
        ...(wantNotes ? ['notes'] : []),
        ...(wantHealth ? ['allergies', 'healthNotes'] : []),
      ],
    })) as ReasonStudent[];
    const knownIds = new Set(students.filter((s) => s.archived !== true).map((s) => s.id));

    // Which students this question is about — always narrowed to records the caller could read.
    let scoped: ReasonStudent[];
    if (reason.scope === 'named-students') {
      const matched = matchStudentsByName(
        students.filter((s) => s.archived !== true),
        reason.names,
      );
      const missing = matched.find((m) => m.matches.length === 0);
      if (missing) return NextResponse.json({ type: 'none', message: `I couldn't find a student named “${missing.name}”.` });
      const unclear = matched.find((m) => m.matches.length > 1);
      if (unclear) {
        return NextResponse.json({
          type: 'clarify',
          name: unclear.name,
          studentIds: unclear.matches.slice(0, 6).map((s) => s.id),
        });
      }
      scoped = matched.map((m) => m.matches[0]!);
    } else if (reason.scope === 'school') {
      scoped = reasonActiveStudents(students);
    } else {
      const wanted = new Set(askedIds.filter((id) => knownIds.has(id)));
      scoped = students.filter((s) => wanted.has(s.id));
    }
    scoped = scoped.slice(0, REASON_STUDENT_LIMIT);
    if (scoped.length === 0) {
      return NextResponse.json({
        type: 'none',
        message:
          reason.scope === 'current-student'
            ? 'Open a student’s card first, then ask about “this student”.'
            : reason.scope === 'list-on-screen'
              ? 'Ask for a list first, then ask about it.'
              : 'There are no students to look at.',
      });
    }

    const cutoff = reasonCutoffDate(today);
    const [classes, attendance, grades, deskLog, families] = await Promise.all([
      queryOfficeCollectionAsUser(idToken, schoolId, 'officeClasses', { fields: ['name'] }),
      topics.includes('attendance')
        ? queryOfficeCollectionAsUser(idToken, schoolId, 'officeAttendance', {
            where: { field: 'date', op: 'GREATER_THAN_OR_EQUAL', value: cutoff },
            fields: ['studentId', 'date', 'status'],
          })
        : Promise.resolve([]),
      topics.includes('grades')
        ? queryOfficeCollectionAsUser(idToken, schoolId, 'officeGradeEntries', {
            fields: ['studentId', 'termLabel', 'subject', 'numericGrade', 'letterGrade', 'archived', ...(wantNotes ? ['notes'] : [])],
          })
        : Promise.resolve([]),
      topics.includes('frontdesk') || wantHealth
        ? queryOfficeCollectionAsUser(idToken, schoolId, 'officeDeskLog', {
            where: { field: 'date', op: 'GREATER_THAN_OR_EQUAL', value: cutoff },
            fields: ['studentId', 'date', 'kind', 'reason', 'archived', ...(wantHealth ? ['nurseAction', 'sentHome'] : [])],
          })
        : Promise.resolve([]),
      // Only to hide parents' and guardians' names inside any notes that are sent.
      wantNotes || wantHealth || topics.includes('frontdesk')
        ? queryOfficeCollectionAsUser(idToken, schoolId, 'officeFamilies', { fields: ['contacts'] })
        : Promise.resolve([]),
    ]);
    const scopedFamilyIds = new Set(scoped.map((s) => (typeof s.familyId === 'string' ? s.familyId : '')).filter(Boolean));
    const otherNames = families.filter((f) => scopedFamilyIds.has(f.id)).flatMap((f) =>
      Array.isArray(f.contacts)
        ? f.contacts.map((c) => (c && typeof c === 'object' && typeof (c as { name?: unknown }).name === 'string' ? (c as { name: string }).name : ''))
        : [],
    );

    const context = buildReasonContext({
      students: scoped,
      classNameById: new Map(classes.map((c) => [c.id, typeof c.name === 'string' ? c.name : ''])),
      topics,
      today,
      attendance: attendance as ReasonAttendance[],
      grades: grades as ReasonGrade[],
      deskLog: deskLog as ReasonDeskEntry[],
      otherNames: otherNames.filter(Boolean),
      question,
    });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ type: 'none', message: 'The assistant isn’t set up on this server.' });

    // The read is recorded before anything leaves for the AI service.
    await appendOfficeAuditAsUser(idToken, schoolId, {
      entityType: 'officeAssistant',
      entityId: 'help',
      action: 'create',
      summary: `Help read ${scoped.length} student record${scoped.length === 1 ? '' : 's'} (${topics.join(', ')}) to answer a question`,
      after: {
        students: scoped.length,
        topics,
        scope: reason.scope,
        studentIds: scoped.slice(0, 100).map((s) => s.id),
        byUid: uid,
      },
      changedBy,
      changedAt: Date.now(),
    });

    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: STAFF_HELP_AI_MODEL,
      temperature: 0.2,
      max_tokens: 700,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: reasonSystemPrompt() },
        {
          role: 'user',
          content: `Question: ${context.question}\nToday: ${today}\nRecords (${context.records.length} students${
            context.detailed ? '' : ', counts only'
          }):\n${JSON.stringify(context.records)}`,
        },
      ],
    });

    let raw: unknown = null;
    try {
      raw = JSON.parse(response.choices[0]?.message?.content ?? 'null');
    } catch {
      raw = null;
    }
    const reply = parseReasonReply(raw, context.tokenToId);
    if (!reply) return NextResponse.json({ type: 'none', message: 'I couldn’t work that out. Try asking another way.' });

    return NextResponse.json({
      type: 'answer',
      answer: reply.answer,
      studentIds: reply.studentIds,
      read: { students: scoped.length, topics, scope: reason.scope },
    });
  } catch (e) {
    console.error('office assistant-reason:', e);
    return NextResponse.json({ type: 'none', message: 'Something went wrong reading the records. Try again in a moment.' });
  }
}
