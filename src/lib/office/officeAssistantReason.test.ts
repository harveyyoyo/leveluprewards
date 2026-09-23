import { describe, expect, it } from 'vitest';
import {
  buildReasonContext,
  maskText,
  matchStudentsByName,
  parseReasonReply,
  reasonActiveStudents,
  type ReasonStudent,
} from '@/lib/office/officeAssistantReason';
import { parseOfficeAssistantDecision } from '@/lib/office/officeAssistantView';

const students: ReasonStudent[] = [
  {
    id: 'st-1',
    firstName: 'Mason',
    lastName: 'Hall',
    classId: 'c7',
    notes: 'Mason sits near the door. Call Rebecca Hall at (555) 011-5974 or rebecca.hall@example.com.',
    allergies: 'Peanuts',
    healthNotes: 'Inhaler in the office',
  },
  { id: 'st-2', firstName: 'Emma', lastName: 'King', classId: 'c7' },
  { id: 'st-3', firstName: 'Emma', lastName: 'Stone', classId: 'c5', status: 'withdrawn' },
  { id: 'st-4', firstName: 'Old', lastName: 'Record', archived: true },
];
const classNameById = new Map([
  ['c7', 'Grade 7'],
  ['c5', 'Grade 5'],
]);

describe('matchStudentsByName', () => {
  it('finds a student by full or partial name, and reports more than one or none', () => {
    const [full, partial, many, none] = matchStudentsByName(students, ['Mason Hall', 'hall', 'Emma', 'Zed']);
    expect(full!.matches.map((s) => s.id)).toEqual(['st-1']);
    expect(partial!.matches.map((s) => s.id)).toEqual(['st-1']);
    expect(many!.matches.map((s) => s.id)).toEqual(['st-2', 'st-3']);
    expect(none!.matches).toEqual([]);
  });

  it('leaves out withdrawn and removed students for school-wide questions', () => {
    expect(reasonActiveStudents(students).map((s) => s.id)).toEqual(['st-1', 'st-2']);
  });
});

describe('buildReasonContext', () => {
  const today = '2026-09-23';
  const attendance = [
    { studentId: 'st-1', date: '2026-09-21', status: 'absent' },
    { studentId: 'st-1', date: '2026-09-14', status: 'late' },
    { studentId: 'st-1', date: '2026-08-10', status: 'absent' },
    { studentId: 'st-2', date: '2026-09-21', status: 'present' },
    { studentId: 'someone-else', date: '2026-09-21', status: 'absent' },
  ];
  const grades = [
    { studentId: 'st-1', termLabel: 'Spring 2026', subject: 'Math', numericGrade: 90 },
    { studentId: 'st-1', termLabel: 'Spring 2026', subject: 'Reading', numericGrade: 84 },
    { studentId: 'st-1', termLabel: 'Fall 2026', subject: 'Math', numericGrade: 78 },
    { studentId: 'st-1', termLabel: 'Fall 2026', subject: 'Reading', numericGrade: 80, notes: 'Mason was distracted' },
  ];

  it('sends codes instead of names, and does the counting in the app', () => {
    const ctx = buildReasonContext({
      students: students.slice(0, 2),
      classNameById,
      topics: ['attendance', 'grades'],
      today,
      attendance,
      grades,
    });
    const sent = JSON.stringify(ctx.records);
    for (const word of ['Mason', 'Hall', 'Emma', 'King', 'st-1', 'st-2', 'someone-else']) expect(sent).not.toContain(word);
    expect(ctx.tokenToId.get('S1')).toBe('st-1');
    // The question itself goes with names hidden too.
    const asked = buildReasonContext({
      students: students.slice(0, 2),
      classNameById,
      topics: ['grades'],
      today,
      question: "Summarize Mason Hall's grades and compare with Emma",
    });
    expect(asked.question).toBe("Summarize S1's grades and compare with S2");

    const s1 = ctx.records[0] as { student: string; class: string; attendance: any; grades: any };
    expect(s1.student).toBe('S1');
    expect(s1.class).toBe('Grade 7');
    expect(s1.attendance.last4Weeks).toMatchObject({ absent: 1, late: 1 });
    expect(s1.attendance.previous4Weeks).toMatchObject({ absent: 1 });
    expect(s1.grades.termAverages).toEqual([
      { term: 'Spring 2026', average: 87 },
      { term: 'Fall 2026', average: 79 },
    ]);
    expect(s1.grades.changeSincePreviousTerm).toBe(-8);
  });

  it('leaves notes and health details out unless the question is about them', () => {
    const plain = JSON.stringify(
      buildReasonContext({ students: students.slice(0, 1), classNameById, topics: ['grades'], today, grades }).records,
    );
    for (const word of ['door', 'Peanuts', 'Inhaler', 'distracted']) expect(plain).not.toContain(word);

    const withNotes = buildReasonContext({
      students: students.slice(0, 1),
      classNameById,
      topics: ['notes', 'grades'],
      today,
      grades,
      otherNames: ['Rebecca Hall'],
    }).records[0] as { notes: string; grades: { entries: Array<{ note?: string }> } };
    expect(withNotes.notes).toBe('S1 sits near the door. Call [name] at [phone] or [email].');
    expect(withNotes.notes).not.toMatch(/Mason|Hall|Rebecca|555|example\.com/);
    expect(withNotes.grades.entries.some((e) => e.note === 'S1 was distracted')).toBe(true);
    expect(JSON.stringify(withNotes)).not.toContain('Peanuts');

    const health = buildReasonContext({ students: students.slice(0, 1), classNameById, topics: ['health'], today })
      .records[0] as Record<string, unknown>;
    expect(health.allergies).toBe('Peanuts');
    expect(health.healthNotes).toBe('Inhaler in the office');
  });
});

describe('maskText', () => {
  it('hides emails, phone numbers and the given names', () => {
    expect(maskText('Email a@b.co or call 555-011-5974 about Emma', [{ token: 'S2', words: ['Emma'] }])).toBe(
      'Email [email] or call [phone] about S2',
    );
    expect(maskText('Out sick 2026-09-21; mom at (555) 011-5974', [])).toBe('Out sick 2026-09-21; mom at [phone]');
  });
});

describe('parseReasonReply', () => {
  const tokenToId = new Map([
    ['S1', 'st-1'],
    ['S2', 'st-2'],
  ]);

  it('turns codes into student markers and keeps only students it was given', () => {
    const reply = parseReasonReply(
      { answer: '[S1] missed 2 days; S2 is steady. S9 does not exist.', students: ['S1', 'S9', '[S2]'] },
      tokenToId,
    );
    expect(reply).toEqual({
      answer: '[[student:st-1]] missed 2 days; [[student:st-2]] is steady. S9 does not exist.',
      studentIds: ['st-1', 'st-2'],
    });
  });

  it('rejects an empty or malformed reply', () => {
    expect(parseReasonReply({ answer: '  ' }, tokenToId)).toBeNull();
    expect(parseReasonReply('nope', tokenToId)).toBeNull();
  });
});

describe('parseOfficeAssistantDecision (reading records)', () => {
  it('accepts a checked "reason" request and rejects unknown scopes or topics', () => {
    expect(
      parseOfficeAssistantDecision({
        type: 'reason',
        reason: { scope: 'named-students', names: ['Mason Hall'], topics: ['attendance', 'grades'] },
      }),
    ).toEqual({
      type: 'reason',
      reason: { scope: 'named-students', names: ['Mason Hall'], topics: ['attendance', 'grades'] },
    });
    expect(
      parseOfficeAssistantDecision({ type: 'reason', reason: { scope: 'everyone-everywhere', topics: ['grades'] } }),
    ).toEqual({ type: 'answer' });
    expect(parseOfficeAssistantDecision({ type: 'reason', reason: { scope: 'school', topics: ['passwords'] } })).toEqual({
      type: 'answer',
    });
  });
});
