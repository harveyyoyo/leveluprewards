export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { guardAiRoute } from '@/lib/apiAuth';
import { STAFF_HELP_AI_MODEL } from '@/lib/aiModelPreference';
import {
  officeAssistantSystemPrompt,
  officeAssistantViewSchema,
  parseOfficeAssistantDecision,
} from '@/lib/office/officeAssistantView';

const MAX_QUESTION_LEN = 500;
const MAX_CLASS_NAMES = 200;

/**
 * Help → Ask: decides whether a question is a "show me" request the app can answer as a filtered
 * list. Only the question, today's date, and class names are sent to the AI — never student,
 * family, or billing records. The app shows the matching records itself.
 */
export async function POST(req: NextRequest) {
  try {
    const guarded = await guardAiRoute(req, { requireSchoolStaff: true, maxRequests: 30, maxBodyBytes: 32 * 1024 });
    if (!guarded.ok) return guarded.response;
    const { body } = guarded.value;

    const question = typeof body.question === 'string' ? body.question.replace(/\u0000/g, '').trim().slice(0, MAX_QUESTION_LEN) : '';
    if (!question) return NextResponse.json({ error: 'question is required.' }, { status: 400 });
    const today =
      typeof body.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
        ? body.today
        : new Date().toISOString().slice(0, 10);
    const classNames = Array.isArray(body.classNames)
      ? body.classNames
          .filter((c): c is string => typeof c === 'string')
          .map((c) => c.trim().slice(0, 60))
          .filter(Boolean)
          .slice(0, MAX_CLASS_NAMES)
      : [];
    // The list already on screen (filters only, no records), so "only grade 8" can narrow it.
    const previousParsed = officeAssistantViewSchema.safeParse(body.previous);
    const previous = previousParsed.success ? previousParsed.data : null;
    // Whether Help may read records for "thinking" questions (the reading itself re-checks the
    // school's switch and the person's access on the server).
    const canReason = body.canReason === true;
    const studentOpen = body.studentOpen === true;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Without the AI service, fall back to the normal written-answer path.
      return NextResponse.json({ type: 'answer' });
    }

    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: STAFF_HELP_AI_MODEL,
      temperature: 0,
      max_tokens: 250,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: officeAssistantSystemPrompt({ today, classNames, previous, canReason, studentOpen }) },
        { role: 'user', content: question },
      ],
    });

    let raw: unknown = null;
    try {
      raw = JSON.parse(response.choices[0]?.message?.content ?? 'null');
    } catch {
      raw = null;
    }
    const decision = parseOfficeAssistantDecision(raw);
    return NextResponse.json(decision.type === 'reason' && !canReason ? { type: 'answer' } : decision);
  } catch (e) {
    console.error('office assistant-view:', e);
    // Any failure just means "answer in words" — the normal chat still works.
    return NextResponse.json({ type: 'answer' });
  }
}
