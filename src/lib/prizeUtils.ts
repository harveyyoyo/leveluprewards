import type { Prize, Student } from '@/lib/types';

/** Prize appears in shop lists when marked in stock and quantity (if tracked) is above zero. */
export function prizeIsListed(p: Prize): boolean {
  if (!p.inStock) return false;
  if (typeof p.stockCount === 'number') return p.stockCount > 0;
  return true;
}

/** Leading ZWJ emoji sequence at the start of a prize title (legacy names like "🧽 Eraser"). */
export function leadingEmojiSequenceFromName(raw: string): string | undefined {
  const name = raw?.trim() ?? '';
  if (!name) return undefined;
  const m = name.match(
    /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D[\p{Extended_Pictographic}\u200D])*)+/u
  );
  return m?.[0]?.trim() || undefined;
}

/** Remove a leading emoji run from a title so it is not duplicated next to the Lucide icon. */
export function stripLeadingEmojiFromPrizeName(name: string): string {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) return '';
  const seq = leadingEmojiSequenceFromName(trimmed);
  if (!seq || !trimmed.startsWith(seq)) return trimmed;
  return trimmed.slice(seq.length).trim();
}

/** Teacher ids that restrict who can see the prize (legacy `teacherId` included). */
export function prizeRestrictionTeacherIds(p: Pick<Prize, 'teacherIds' | 'teacherId'>): string[] {
  const ids = [...(p.teacherIds || [])].filter((id): id is string => typeof id === 'string' && id.length > 0);
  if (p.teacherId && !ids.includes(p.teacherId)) ids.push(p.teacherId);
  return [...new Set(ids)];
}

export function isPrizeSchoolWideTeachers(p: Pick<Prize, 'teacherIds' | 'teacherId'>): boolean {
  return prizeRestrictionTeacherIds(p).length === 0;
}

export function studentSeesPrizeByTeachers(student: Pick<Student, 'teacherIds'>, p: Prize): boolean {
  const ids = prizeRestrictionTeacherIds(p);
  if (ids.length === 0) return true;
  const st = student.teacherIds || [];
  return ids.some((id) => st.includes(id));
}

export function teacherListedOnPrize(p: Prize, teacherId: string): boolean {
  return prizeRestrictionTeacherIds(p).includes(teacherId);
}

export function isTeacherPrizeCreator(p: Prize, teacherId: string): boolean {
  if (p.createdByTeacherId) return p.createdByTeacherId === teacherId;
  const ids = prizeRestrictionTeacherIds(p);
  // Only this teacher is on the restriction list — treat as theirs for edit/delete
  // (covers legacy rows created before `createdByTeacherId`, e.g. teacher PrizeModal used `addedBy: Admin`).
  if (ids.length === 1 && ids[0] === teacherId) return true;
  if (p.addedBy !== 'teacher') return false;
  if ((!p.teacherIds || p.teacherIds.length === 0) && p.teacherId === teacherId) return true;
  return false;
}

export type TeacherPrizeListItem =
  | { kind: 'section'; id: string; label: string; hint?: string }
  | { kind: 'prize'; prize: Prize };

/** Teacher portal: own items first, then school-wide / everything else. */
export function buildTeacherPrizeListItems(prizes: Prize[], teacherId: string): TeacherPrizeListItem[] {
  const byPoints = (a: Prize, b: Prize) => (a.points ?? 0) - (b.points ?? 0);
  const yours = prizes.filter((p) => isTeacherPrizeCreator(p, teacherId)).sort(byPoints);
  const rest = prizes.filter((p) => !isTeacherPrizeCreator(p, teacherId)).sort(byPoints);
  const out: TeacherPrizeListItem[] = [];

  if (yours.length > 0) {
    out.push({
      kind: 'section',
      id: 'yours',
      label: 'Your rewards',
      hint: 'Items you added for your students',
    });
    for (const prize of yours) out.push({ kind: 'prize', prize });
  }

  if (rest.length > 0) {
    out.push({
      kind: 'section',
      id: 'school-wide',
      label: yours.length > 0 ? 'School-wide & shared' : 'School rewards',
      hint: 'From admin or available to all teachers',
    });
    for (const prize of rest) out.push({ kind: 'prize', prize });
  }

  return out;
}

/** Remove this teacher from the restriction list (does not delete the prize). */
export function removeTeacherFromPrize(p: Prize, teacherId: string): Prize {
  const ids = prizeRestrictionTeacherIds(p).filter((id) => id !== teacherId);
  return {
    ...p,
    teacherId: undefined,
    teacherIds: ids.length > 0 ? ids : undefined,
  };
}