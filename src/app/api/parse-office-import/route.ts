import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { guardAiRoute } from '@/lib/apiAuth';
import { firebaseConfig } from '@/firebase/config';
import { normalizeOfficeAiSnapshot } from '@/lib/office/officeAiImport';
import { parseLooseJson } from '@/lib/server/looseJson';

function buildOfficeImportInstruction(classNames: string[], studentNames: string[]): string {
  const classList =
    classNames.length > 0
      ? `Existing office classes (prefer these names when they fit): ${classNames.join(', ')}.`
      : '';
  const studentList =
    studentNames.length > 0
      ? `Existing office students (match grade/billing rows to these when possible): ${studentNames.slice(0, 120).join('; ')}${studentNames.length > 120 ? '…' : ''}.`
      : '';

  return `You are importing data into School Office — a school admin app for grades, billing, and roster (NOT a student rewards arcade).

The user may paste ANYTHING: CSV exports, report cards, tuition spreadsheets, family contact lists, mixed tables, emails, bullet lists, SIS dumps, etc.

Your job: detect what is present and return ONE JSON object with only the keys you extracted. Do not invent rows. Omit empty keys.

${classList}
${studentList}

Entity types (all optional):

1) "classes" — instructional groups / homerooms. [{ "name": "string" }]

2) "students" — office roster pupils. [{
  "firstName": "string",
  "lastName": "string",
  "className"?: "string",
  "nickname"?: "string",
  "teacherName"?: "string",
  "notes"?: "string"
}]
Or use "studentName" / "name" as full name if first/last are not split.

3) "grades" — term grades / report card lines. [{
  "studentName"?: "string (or firstName+lastName)",
  "termLabel": "string (e.g. Fall 2026, Spring 2026)",
  "subject": "string",
  "letterGrade"?: "string",
  "numericGrade"?: number (0-100 percent),
  "notes"?: "string"
}]

4) "billingAccounts" — families / payers. [{
  "familyName": "string",
  "studentNames"?: ["string"] (children on this account),
  "contactEmail"?: "string",
  "contactPhone"?: "string",
  "balanceCents"?: number,
  "notes"?: "string"
}]
Amounts in dollars can use "amount" as dollars; prefer balanceCents in cents when clear.

5) "invoices" — bills/charges. [{
  "familyName": "string (must match a billing family)",
  "label": "string",
  "amountCents"?: number,
  "amount"?: number (dollars if cents unclear),
  "dueDate"?: "YYYY-MM-DD",
  "status"?: "draft" | "sent" | "paid" | "void"
}]

6) "staffAccounts" — School Office desk logins (NOT teachers). [{
  "displayName": "string",
  "username": "string",
  "passcode": "string"
}]

7) "defaultActiveTerm" — string if a default school term is stated.

8) "statementSchoolName" — string if a legal name for printed billing statements is stated.

Rules:
- Do NOT extract arcade rewards, point categories, prize shop items, or bell periods unless they clearly belong to grades/billing/roster above.
- Skip duplicate rows.
- For grades, every row needs term + subject + student identity.
- Respond with JSON only.`;
}

async function hasOfficeDataImportAccess(
  idToken: string,
  uid: string,
  schoolId: string,
): Promise<boolean> {
  const projectId = firebaseConfig.projectId;
  if (!projectId) return false;
  const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/schools/${encodeURIComponent(schoolId)}`;
  const urls = [
    `${base}/roles_admin/${encodeURIComponent(uid)}`,
    `${base}/roles_office/${encodeURIComponent(uid)}`,
  ];
  try {
    const results = await Promise.all(
      urls.map((url) =>
        fetch(url, { headers: { Authorization: `Bearer ${idToken}` }, cache: 'no-store' }),
      ),
    );
    return results.some((res) => res.ok);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const guarded = await guardAiRoute(req, {
      requireSchoolStaff: true,
      maxRequests: 8,
      maxBodyBytes: 256 * 1024,
    });
    if (!guarded.ok) return guarded.response;

    const body = guarded.value.body;
    const schoolId = guarded.value.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const idToken = /^Bearer\s+(.+)$/i.exec(authHeader)?.[1] ?? '';
    const officeAccess = await hasOfficeDataImportAccess(idToken, guarded.value.uid, schoolId);
    if (!officeAccess) {
      return NextResponse.json(
        { error: 'School Office import requires admin or office access at this school.' },
        { status: 403 },
      );
    }

    const prompt = body.prompt;
    if (typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const model = typeof body.model === 'string' ? body.model : 'gpt-4o-mini';
    const classNames = Array.isArray(body.classNames)
      ? body.classNames.filter((n): n is string => typeof n === 'string').slice(0, 300)
      : [];
    const studentNames = Array.isArray(body.studentNames)
      ? body.studentNames.filter((n): n is string => typeof n === 'string').slice(0, 500)
      : [];

    const systemInstruction = buildOfficeImportInstruction(classNames, studentNames);
    let responseText = '';

    if (model.startsWith('gpt')) {
      const effectiveKey = process.env.OPENAI_API_KEY;
      if (!effectiveKey) {
        return NextResponse.json({ error: 'OpenAI API key is not configured on the server' }, { status: 503 });
      }
      const openai = new OpenAI({ apiKey: effectiveKey });
      const response = await openai.chat.completions.create({
        model: model as 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `Extract School Office data from:\n\n${prompt.slice(0, 120000)}` },
        ],
      });
      responseText = response.choices[0].message.content || '{}';
    } else {
      const effectiveKey = process.env.GEMINI_API_KEY;
      if (!effectiveKey) {
        return NextResponse.json({ error: 'Gemini API key is not configured on the server' }, { status: 503 });
      }
      const genAI = new GoogleGenerativeAI(effectiveKey);
      const activeModel = genAI.getGenerativeModel({
        model,
        generationConfig: { responseMimeType: 'application/json' },
        systemInstruction,
      });
      const result = await activeModel.generateContent(
        `Extract School Office data from:\n\n${prompt.slice(0, 120000)}`,
      );
      responseText = result.response.text();
    }

    const parsedRes = parseLooseJson(responseText);
    if (!parsedRes.ok) {
      console.error('parse-office-import JSON failure:', parsedRes.error);
      return NextResponse.json(
        { error: `Invalid response format from AI (JSON parse failed: ${parsedRes.error}).` },
        { status: 500 },
      );
    }

    const obj =
      parsedRes.value && typeof parsedRes.value === 'object' && !Array.isArray(parsedRes.value)
        ? (parsedRes.value as Record<string, unknown>)
        : {};
    const snapshot = normalizeOfficeAiSnapshot(obj);
    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error('Error in /api/parse-office-import:', error);
    return NextResponse.json({ error: 'Failed to parse office import' }, { status: 500 });
  }
}
