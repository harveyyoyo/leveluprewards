export const CLASSROOM_GROUP_COUNT_MIN = 2;
export const CLASSROOM_GROUP_COUNT_MAX = 6;

export type ClassroomGroupAssignment = {
  count: number;
  byStudent: Record<string, number>;
};

export type ClassroomGroupTone = {
  bg: string;
  fg: string;
  ring: string;
  label: string;
};

export const CLASSROOM_GROUP_TONES: ClassroomGroupTone[] = [
  { bg: '#2563eb', fg: '#ffffff', ring: '#93c5fd', label: 'Group 1' },
  { bg: '#ea580c', fg: '#ffffff', ring: '#fdba74', label: 'Group 2' },
  { bg: '#7c3aed', fg: '#ffffff', ring: '#c4b5fd', label: 'Group 3' },
  { bg: '#0f766e', fg: '#ffffff', ring: '#5eead4', label: 'Group 4' },
  { bg: '#be123c', fg: '#ffffff', ring: '#fda4af', label: 'Group 5' },
  { bg: '#4d7c0f', fg: '#ffffff', ring: '#bef264', label: 'Group 6' },
];

export function clampClassroomGroupCount(count: number): number {
  if (!Number.isFinite(count)) return 4;
  return Math.min(CLASSROOM_GROUP_COUNT_MAX, Math.max(CLASSROOM_GROUP_COUNT_MIN, Math.round(count)));
}

export function classroomGroupTone(groupNumber: number): ClassroomGroupTone {
  const index = Math.max(1, Math.round(groupNumber)) - 1;
  return CLASSROOM_GROUP_TONES[index % CLASSROOM_GROUP_TONES.length]!;
}

export function assignClassroomGroups(
  studentIds: string[],
  count: number,
  random: () => number = Math.random,
): ClassroomGroupAssignment | null {
  const unique = [...new Set(studentIds.filter(Boolean))];
  if (!unique.length) return null;
  const groupCount = Math.min(clampClassroomGroupCount(count), unique.length);

  const shuffled = [...unique];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const current = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = current;
  }

  const byStudent: Record<string, number> = {};
  shuffled.forEach((studentId, index) => {
    byStudent[studentId] = (index % groupCount) + 1;
  });

  return { count: groupCount, byStudent };
}

export function parseClassroomGroups(value: unknown): ClassroomGroupAssignment | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const byStudent =
    record.byStudent && typeof record.byStudent === 'object'
      ? Object.fromEntries(
          Object.entries(record.byStudent as Record<string, unknown>).filter(
            (entry): entry is [string, number] =>
              typeof entry[0] === 'string' &&
              typeof entry[1] === 'number' &&
              Number.isFinite(entry[1]) &&
              entry[1] >= 1,
          ),
        )
      : {};
  if (!Object.keys(byStudent).length) return undefined;
  return { count: clampClassroomGroupCount(Number(record.count)), byStudent };
}
