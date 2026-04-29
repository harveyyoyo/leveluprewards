import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { guardAiRoute } from '@/lib/apiAuth';

export type ParseRosterKind = 'classes' | 'teachers' | 'students';

function unwrapArray(parsed: unknown, keys: string[]): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    for (const k of keys) {
      const v = (parsed as Record<string, unknown>)[k];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

function buildInstruction(kind: ParseRosterKind, classNames: string[]): string {
  const classList =
    classNames.length > 0
      ? `Known class names in this school (match students to these when possible): ${classNames.join(', ')}.`
      : 'No class list was provided; infer class names from the text when present.';

  if (kind === 'classes') {
    return `You extract DISTINCT class/group/homeroom names from messy administrative text.

Input may be: CSV or TSV with any column headers, markdown tables, numbered lists, Excel pasted as tab-separated text, "Grade 3 - Room 4", etc.

Rules:
- Output ONE entry per unique class name (trim whitespace).
- Ignore student names, teacher names, and pure schedule times unless they clearly label a standing class (e.g. "Period 2 English" is a class label).
- If the text mixes multiple formats, still extract every class name you can confidently identify.

Return ONLY valid JSON: an array of objects:
[
  { "name": "string — the class or group name as it should appear in the app" }
]

For OpenAI JSON mode, wrap as: { "classes": [ ... ] }.`;
  }

  if (kind === 'teachers') {
    return `You extract staff who should get teacher portal logins from messy text (HR lists, schedules, arbitrary CSV exports, bullet lists).

Each person needs a display name. Username and password may appear as separate columns with ANY header names (login, email prefix, PIN, etc.). If missing, omit username and passcode (the app will generate them).

Rules:
- One object per teacher.
- Combine split name columns into a single full "name" when needed (e.g. first + last).
- Skip students, parents, and generic headers.

Return ONLY valid JSON as an array:
[
  { "name": "string", "username": "string (optional)", "passcode": "string (optional)" }
]

For OpenAI JSON mode, wrap as: { "teachers": [ ... ] }.`;
  }

  // students
  return `You extract a student roster from arbitrary formatted text: spreadsheets pasted as TSV, CSV with unknown columns, bullet lists, "Last, First", emails, ID numbers (ignore IDs unless needed for disambiguation).

${classList}

Rules:
- Split each person's given name and family name into firstName and lastName when possible.
- If only one combined name is present, put it in firstName and use "" or a sensible split for lastName.
- Add className when you can match to a known class or the text clearly states homeroom/section.

Return ONLY valid JSON as an array:
[
  { "firstName": "string", "lastName": "string", "className": "string (optional)" }
]

For OpenAI JSON mode, wrap as: { "students": [ ... ] }.`;
}

export async function POST(req: NextRequest) {
  try {
    const guarded = await guardAiRoute(req, {
      requireSchoolStaff: true,
      maxRequests: 8,
      maxBodyBytes: 96 * 1024,
    });
    if (!guarded.ok) return guarded.response;

    const body = guarded.value.body;
    const prompt = body.prompt;
    const kind = body.kind as string | undefined;
    const model = typeof body.model === 'string' ? body.model : 'gemini-2.5-flash';
    const classNames = Array.isArray(body.classNames)
      ? body.classNames.filter((n): n is string => typeof n === 'string').slice(0, 300)
      : [];

    if (typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }
    if (kind !== 'classes' && kind !== 'teachers' && kind !== 'students') {
      return NextResponse.json({ error: 'kind must be classes, teachers, or students' }, { status: 400 });
    }

    const systemInstruction = buildInstruction(kind, classNames);
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
          {
            role: 'system',
            content:
              systemInstruction +
              '\nAlways respond with a single JSON object only (no markdown). Use keys classes, teachers, or students matching the task.',
          },
          { role: 'user', content: `Extract roster data from:\n\n${prompt.slice(0, 90000)}` },
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
        generationConfig: {
          responseMimeType: 'application/json',
        },
        systemInstruction,
      });

      const result = await activeModel.generateContent(`Extract roster data from:\n\n${prompt.slice(0, 90000)}`);
      responseText = result.response.text();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      console.error('parse-roster JSON failure:', responseText.slice(0, 600));
      return NextResponse.json({ error: 'Invalid response format from AI' }, { status: 500 });
    }

    if (kind === 'classes') {
      const raw = unwrapArray(parsed, ['classes', 'items', 'data']);
      const names = raw
        .map((row) => {
          if (!row || typeof row !== 'object') return '';
          const o = row as Record<string, unknown>;
          const name = o.name ?? o.className ?? o.title ?? o.label;
          return typeof name === 'string' ? name.trim() : '';
        })
        .filter(Boolean);
      return NextResponse.json({ kind: 'classes', classes: names.map((name) => ({ name })) });
    }

    if (kind === 'teachers') {
      const raw = unwrapArray(parsed, ['teachers', 'items', 'data']);
      const teachers = raw
        .map((row) => {
          if (!row || typeof row !== 'object') return null;
          const o = row as Record<string, unknown>;
          let fullName = '';
          if (typeof o.name === 'string' && o.name.trim()) {
            fullName = o.name.trim();
          } else if (typeof o.fullName === 'string' && o.fullName.trim()) {
            fullName = o.fullName.trim();
          } else {
            const fn = typeof o.firstName === 'string' ? o.firstName.trim() : '';
            const ln = typeof o.lastName === 'string' ? o.lastName.trim() : '';
            fullName = `${fn} ${ln}`.trim();
          }
          if (!fullName) return null;
          const username =
            typeof o.username === 'string'
              ? o.username.trim()
              : typeof o.login === 'string'
                ? o.login.trim()
                : typeof o.email === 'string'
                  ? o.email.split('@')[0]?.trim()
                  : undefined;
          const passcode =
            typeof o.passcode === 'string'
              ? o.passcode.trim()
              : typeof o.password === 'string'
                ? o.password.trim()
                : typeof o.pin === 'string'
                  ? o.pin.trim()
                  : undefined;
          return {
            name: fullName,
            ...(username ? { username } : {}),
            ...(passcode ? { passcode } : {}),
          };
        })
        .filter(Boolean);
      return NextResponse.json({ kind: 'teachers', teachers });
    }

    const raw = unwrapArray(parsed, ['students', 'items', 'data']);
    const students = raw
      .map((row) => {
        if (!row || typeof row !== 'object') return null;
        const o = row as Record<string, unknown>;
        let firstName = typeof o.firstName === 'string' ? o.firstName.trim() : '';
        let lastName = typeof o.lastName === 'string' ? o.lastName.trim() : '';
        const className =
          typeof o.className === 'string'
            ? o.className.trim()
            : typeof o.homeroom === 'string'
              ? o.homeroom.trim()
              : typeof o.section === 'string'
                ? o.section.trim()
                : undefined;
        if (!firstName && !lastName && typeof o.fullName === 'string') {
          const parts = o.fullName.trim().split(/\s+/);
          firstName = parts[0] || '';
          lastName = parts.slice(1).join(' ') || '';
        }
        if (!firstName && !lastName) return null;
        return {
          firstName: firstName || '—',
          lastName: lastName || '—',
          ...(className ? { className } : {}),
        };
      })
      .filter(Boolean);
    return NextResponse.json({ kind: 'students', students });
  } catch (error) {
    console.error('Error in /api/parse-roster:', error);
    return NextResponse.json({ error: 'Failed to parse roster' }, { status: 500 });
  }
}
