import type { Prize, Student } from '@/lib/types';

/** Prize appears in shop lists when marked in stock and quantity (if tracked) is above zero. */
export function prizeIsListed(p: Prize): boolean {
  if (!p.inStock) return false;
  if (typeof p.stockCount === 'number') return p.stockCount > 0;
  return true;
}

/** Leading ZWJ emoji sequence at the start of a prize title (legacy names like "🧽 Eraser"). */
function leadingEmojiSequenceFromName(raw: string): string | undefined {
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
  if (p.addedBy !== 'teacher') return false;
  const ids = prizeRestrictionTeacherIds(p);
  if (ids.length === 1 && ids[0] === teacherId) return true;
  if ((!p.teacherIds || p.teacherIds.length === 0) && p.teacherId === teacherId) return true;
  return false;
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