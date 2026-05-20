import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { guardAiRoute } from '@/lib/apiAuth';
import type { ParsedSchoolSnapshot } from '@/lib/schoolDataImport';
import { parseLooseJson } from '@/lib/server/looseJson';

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

function buildLegacyInstruction(
  kind: 'classes' | 'teachers' | 'students',
  classNames: string[],
): string {
  const classList =
    classNames.length > 0
      ? `Known class names in this school (match students to these when possible): ${classNames.join(', ')}.`
      : 'No class list was provided; infer class names from the text when present.';

  if (kind === 'classes') {
    return `You extract DISTINCT class/group/homeroom names from messy administrative text.

Return ONLY valid JSON as an array OR wrapped in { "classes": [...] }:
[
  { "name": "string" }
]`;
  }

  if (kind === 'teachers') {
    return `You extract staff who should get teacher portal logins.

Return ONLY valid JSON as an array OR wrapped in { "teachers": [...] }:
[
  { "name": "string", "username": "string (optional)", "passcode": "string (optional)" }
]`;
  }

  return `You extract a student roster.

${classList}

Return ONLY valid JSON as an array OR wrapped in { "students": [...] }:
[
  {
    "firstName": "string",
    "lastName": "string",
    "className": "string (optional)",
    "middleName": "string (optional)",
    "nickname": "string (optional)",
    "birthday": "string (optional, ISO YYYY-MM-DD if possible; otherwise omit)",
    "parentEmail": "string (optional)",
    "parentPhone": "string (optional)",
    "studentEmail": "string (optional)",
    "studentPhone": "string (optional)"
  }
]`;
}

function buildAutoInstruction(classNames: string[]): string {
  const classList =
    classNames.length > 0
      ? `When mapping students, prefer these existing class names when they fit: ${classNames.join(', ')}.`
      : '';

  return `You are helping import school setup data into an app. The user may paste ANYTHING: mixed spreadsheets, emails, schedules, SIS exports, bullet lists, markdown tables, headers in unknown languages, etc.

Your job: identify which entities appear in the text and output structured JSON only. Omit keys entirely when that type of data is not present. Do not invent data.

${classList}

Entity types (all optional arrays):

1) "classes" — recurring instructional groups / homerooms / sections (NOT bell-schedule rows alone). [{ "name": "string" }]

2) "teachers" — adults who need a teacher portal login. [{ "name": "string", "username"?: "string", "passcode"?: "string" }]

3) "students" — pupils. [{
  "firstName": "string",
  "lastName": "string",
  "className"?: "string",
  "middleName"?: "string",
  "nickname"?: "string",
  "birthday"?: "string (ISO YYYY-MM-DD if you can confidently convert; otherwise omit)",
  "parentEmail"?: "string",
  "parentPhone"?: "string",
  "studentEmail"?: "string",
  "studentPhone"?: "string"
}]

4) "periods" — bell schedule / timetable slots with times (Period 1, Block A, etc.). Times must be parseable. [{ "label": "string", "startTime": "string", "endTime": "string" }] Use 24h HH:mm when possible; AM/PM is OK.

5) "categories" — behavior/academic point categories teachers award (NOT classes). [{ "name": "string", "points"?: number }] Default points to 5 if unsure.

  6) "prizes" — rewards shop items with point costs. [{ "name": "string", "points"?: number }]

7) "staffAccounts" — limited staff logins (NOT teachers). [{ "displayName": "string", "username": "string", "passcode": "string", "role"?: "secretary" | "prizeClerk" | "reports" | "librarian" | "office" | "houseCoordinator" }]

Rules:
- If the same person appears as both teacher and staff, prefer "teachers" unless the text clearly labels them as secretary/front desk only.
- Skip duplicate rows you infer from the same snippet.
- For periods, ignore generic words like "Monday" as labels unless paired with times that define a slot.

Respond with ONE JSON object containing only the keys you extracted. Example shape:
{ "classes": [...], "students": [...], "periods": [...] }

Use snake_case OR camelCase consistently — the server accepts common aliases (staff_accounts vs staffAccounts).`;
}

function normalizeTeachersFromRows(raw: unknown[]): ParsedSchoolSnapshot['teachers'] {
  const teachers: NonNullable<ParsedSchoolSnapshot['teachers']> = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    let fullName = '';
    if (typeof o.name === 'string' && o.name.trim()) fullName = o.name.trim();
    else if (typeof o.fullName === 'string' && o.fullName.trim()) fullName = o.fullName.trim();
    else {
      const fn = typeof o.firstName === 'string' ? o.firstName.trim() : '';
      const ln = typeof o.lastName === 'string' ? o.lastName.trim() : '';
      fullName = `${fn} ${ln}`.trim();
    }
    if (!fullName) continue;
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
    teachers.push({
      name: fullName,
      ...(username ? { username } : {}),
      ...(passcode ? { passcode } : {}),
    });
  }
  return teachers;
}

function normalizeBirthdayToIso(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const s = input.trim();
  if (!s) return undefined;

  // ISO: YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return s;

  // YYYY/MM/DD
  const ymd = s.match(/^(\d{4})[\/.](\d{1,2})[\/.](\d{1,2})$/);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]);
    const d = Number(ymd[3]);
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // MM/DD/YYYY or M/D/YY
  const mdy = s.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{2}|\d{4})$/);
  if (mdy) {
    const m = Number(mdy[1]);
    const d = Number(mdy[2]);
    const yRaw = mdy[3];
    const y = yRaw.length === 2 ? 2000 + Number(yRaw) : Number(yRaw);
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  return undefined;
}

function normalizeStudentsFromRows(raw: unknown[]): ParsedSchoolSnapshot['students'] {
  const students: NonNullable<ParsedSchoolSnapshot['students']> = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    let firstName = typeof o.firstName === 'string' ? o.firstName.trim() : '';
    let lastName = typeof o.lastName === 'string' ? o.lastName.trim() : '';
    const middleName = typeof o.middleName === 'string' ? o.middleName.trim() : '';
    const nickname =
      typeof o.nickname === 'string'
        ? o.nickname.trim()
        : typeof o.preferredName === 'string'
          ? o.preferredName.trim()
          : '';
    const className =
      typeof o.className === 'string'
        ? o.className.trim()
        : typeof o.homeroom === 'string'
          ? o.homeroom.trim()
          : typeof o.section === 'string'
            ? o.section.trim()
            : undefined;
    const birthday =
      normalizeBirthdayToIso(o.birthday) ||
      normalizeBirthdayToIso(o.birthdate) ||
      normalizeBirthdayToIso(o.dateOfBirth) ||
      normalizeBirthdayToIso(o.dob);
    const parentEmail =
      typeof o.parentEmail === 'string'
        ? o.parentEmail.trim()
        : typeof o.guardianEmail === 'string'
          ? o.guardianEmail.trim()
          : '';
    const parentPhone =
      typeof o.parentPhone === 'string'
        ? o.parentPhone.trim()
        : typeof o.guardianPhone === 'string'
          ? o.guardianPhone.trim()
          : '';
    const studentEmail = typeof o.studentEmail === 'string' ? o.studentEmail.trim() : '';
    const studentPhone = typeof o.studentPhone === 'string' ? o.studentPhone.trim() : '';
    if (!firstName && !lastName && typeof o.fullName === 'string') {
      const parts = o.fullName.trim().split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }
    if (!firstName && !lastName) continue;
    students.push({
      firstName: firstName || '—',
      lastName: lastName || '—',
      ...(className ? { className } : {}),
      ...(middleName ? { middleName } : {}),
      ...(nickname ? { nickname } : {}),
      ...(birthday ? { birthday } : {}),
      ...(parentEmail ? { parentEmail } : {}),
      ...(parentPhone ? { parentPhone } : {}),
      ...(studentEmail ? { studentEmail } : {}),
      ...(studentPhone ? { studentPhone } : {}),
    });
  }
  return students;
}

function normalizeAutoSnapshot(parsed: Record<string, unknown>): ParsedSchoolSnapshot {
  const classesRaw = unwrapArray(parsed, ['classes', 'classGroups', 'items']);
  const classes: ParsedSchoolSnapshot['classes'] = classesRaw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const o = row as Record<string, unknown>;
      const name = (o.name ?? o.className ?? o.title ?? o.label) as string | undefined;
      return typeof name === 'string' && name.trim() ? { name: name.trim() } : null;
    })
    .filter(Boolean) as { name: string }[];

  const teachers = normalizeTeachersFromRows(unwrapArray(parsed, ['teachers', 'staffTeaching', 'faculty']));
  const students = normalizeStudentsFromRows(unwrapArray(parsed, ['students', 'pupils', 'learners']));

  const periodsRaw = unwrapArray(parsed, ['periods', 'schedule', 'bellSchedule', 'slots']);
  const periods: ParsedSchoolSnapshot['periods'] = periodsRaw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const o = row as Record<string, unknown>;
      const label =
        (typeof o.label === 'string' && o.label.trim()) ||
        (typeof o.name === 'string' && o.name.trim()) ||
        (typeof o.className === 'string' && o.className.trim()) ||
        '';
      const startTime = String(o.startTime ?? o.start ?? '');
      const endTime = String(o.endTime ?? o.end ?? '');
      if (!label || !startTime || !endTime) return null;
      return { label, startTime, endTime };
    })
    .filter(Boolean) as NonNullable<ParsedSchoolSnapshot['periods']>;

  const catRaw = unwrapArray(parsed, ['categories', 'pointCategories', 'behaviorCategories']);
  const categories: ParsedSchoolSnapshot['categories'] = catRaw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const o = row as Record<string, unknown>;
      const name = typeof o.name === 'string' ? o.name.trim() : '';
      if (!name) return null;
      const points = typeof o.points === 'number' ? o.points : typeof o.defaultPoints === 'number' ? o.defaultPoints : undefined;
      return { name, ...(points !== undefined ? { points } : {}) };
    })
    .filter(Boolean) as NonNullable<ParsedSchoolSnapshot['categories']>;

  const prizeRaw = unwrapArray(parsed, ['prizes', 'rewards', 'shopItems']);
  const prizes: ParsedSchoolSnapshot['prizes'] = prizeRaw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const o = row as Record<string, unknown>;
      const name = typeof o.name === 'string' ? o.name.trim() : '';
      if (!name) return null;
      const points = typeof o.points === 'number' ? o.points : typeof o.cost === 'number' ? o.cost : undefined;
      return { name, ...(points !== undefined ? { points } : {}) };
    })
    .filter(Boolean) as NonNullable<ParsedSchoolSnapshot['prizes']>;

  const staffRaw = unwrapArray(parsed, ['staffAccounts', 'staff_accounts', 'deskStaff', 'officeStaff']);
  const staffAccounts: ParsedSchoolSnapshot['staffAccounts'] = staffRaw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const o = row as Record<string, unknown>;
      const displayName =
        (typeof o.displayName === 'string' && o.displayName.trim()) ||
        (typeof o.name === 'string' && o.name.trim()) ||
        '';
      const username = typeof o.username === 'string' ? o.username.trim() : '';
      const passcode = typeof o.passcode === 'string' ? o.passcode.trim() : '';
      if (!displayName || !username || !passcode) return null;
      let role: 'secretary' | 'prizeClerk' | 'reports' | 'librarian' | 'office' | 'houseCoordinator' | undefined;
      const r = String(o.role || '').toLowerCase();
      if (r.includes('prize') || r.includes('clerk')) role = 'prizeClerk';
      else if (r.includes('house')) role = 'houseCoordinator';
      else if (r.includes('librar')) role = 'librarian';
      else if (r.includes('report')) role = 'reports';
      else if (r.includes('office')) role = 'office';
      else if (r.includes('secretary') || r.includes('desk')) role = 'secretary';
      return { displayName, username, passcode, ...(role ? { role } : {}) };
    })
    .filter(Boolean) as NonNullable<ParsedSchoolSnapshot['staffAccounts']>;

  const snap: ParsedSchoolSnapshot = {};
  if (classes.length) snap.classes = classes;
  if (teachers?.length) snap.teachers = teachers;
  if (students?.length) snap.students = students;
  if (periods?.length) snap.periods = periods;
  if (categories?.length) snap.categories = categories;
  if (prizes?.length) snap.prizes = prizes;
  if (staffAccounts?.length) snap.staffAccounts = staffAccounts;
  return snap;
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
    const prompt = body.prompt;
    const kindRaw = body.kind;
    const kind =
      typeof kindRaw === 'string' && ['classes', 'teachers', 'students', 'auto'].includes(kindRaw)
        ? kindRaw
        : 'auto';
    const model = typeof body.model === 'string' ? body.model : 'gpt-4o-mini';
    const classNames = Array.isArray(body.classNames)
      ? body.classNames.filter((n): n is string => typeof n === 'string').slice(0, 300)
      : [];

    if (typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const isLegacy = kind === 'classes' || kind === 'teachers' || kind === 'students';
    const systemInstruction = isLegacy ? buildLegacyInstruction(kind, classNames) : buildAutoInstruction(classNames);

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
              (isLegacy
                ? '\nWrap arrays in a single JSON object with key matching the entity type.'
                : '\nReturn a single JSON object only.'),
          },
          { role: 'user', content: `Extract data from:\n\n${prompt.slice(0, 120000)}` },
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

      const result = await activeModel.generateContent(`Extract data from:\n\n${prompt.slice(0, 120000)}`);
      responseText = result.response.text();
    }

    let parsed: unknown;
    {
      const parsedRes = parseLooseJson(responseText);
      if (!parsedRes.ok) {
        console.error('parse-roster JSON failure:', parsedRes.error, parsedRes.cleaned.slice(0, 600));
        return NextResponse.json(
          { error: `Invalid response format from AI (JSON parse failed: ${parsedRes.error}).` },
          { status: 500 },
        );
      }
      parsed = parsedRes.value;
    }

    if (!isLegacy) {
      const obj = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
      const snapshot = normalizeAutoSnapshot(obj);
      return NextResponse.json({ mode: 'auto', snapshot });
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
      const teachers = normalizeTeachersFromRows(raw);
      return NextResponse.json({ kind: 'teachers', teachers });
    }

    const raw = unwrapArray(parsed, ['students', 'items', 'data']);
    const students = normalizeStudentsFromRows(raw);
    return NextResponse.json({ kind: 'students', students });
  } catch (error) {
    console.error('Error in /api/parse-roster:', error);
    return NextResponse.json({ error: 'Failed to parse roster' }, { status: 500 });
  }
}
