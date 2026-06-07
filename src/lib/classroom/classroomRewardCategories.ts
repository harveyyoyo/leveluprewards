/** Prefix for teacher-scoped classroom reward keys in `student.categoryPoints`. */
export const CLASSROOM_TEACHER_CATEGORY_PREFIX = '__cm__:';

/** Build a teacher-scoped category key for classroom quick awards (not shown school-wide). */
export function classroomTeacherCategoryKey(teacherId: string, label: string): string {
  const tid = teacherId.trim();
  const clean = label.trim();
  if (!tid || !clean) return clean;
  return `${CLASSROOM_TEACHER_CATEGORY_PREFIX}${tid}:${clean}`;
}

export function isTeacherScopedCategoryKey(key: string): boolean {
  return key.startsWith(CLASSROOM_TEACHER_CATEGORY_PREFIX);
}

/** Strip the teacher prefix for display (e.g. in student breakdowns). */
export function displayCategoryKey(key: string): string {
  if (!isTeacherScopedCategoryKey(key)) return key.trim() || 'Uncategorized';
  const rest = key.slice(CLASSROOM_TEACHER_CATEGORY_PREFIX.length);
  const colon = rest.indexOf(':');
  return colon >= 0 ? rest.slice(colon + 1).trim() || 'Uncategorized' : rest.trim();
}

export function teacherIdFromCategoryKey(key: string): string | undefined {
  if (!isTeacherScopedCategoryKey(key)) return undefined;
  const rest = key.slice(CLASSROOM_TEACHER_CATEGORY_PREFIX.length);
  const colon = rest.indexOf(':');
  return colon >= 0 ? rest.slice(0, colon).trim() || undefined : undefined;
}

/** Category key used when recording a classroom award into rewards balances. */
export function classroomAwardCategoryKey(teacherId: string, description: string): string {
  return classroomTeacherCategoryKey(teacherId, description);
}

/** School-wide category lists should omit teacher-scoped classroom keys. */
export function filterSchoolwideCategoryKeys(keys: string[]): string[] {
  return keys.filter((k) => !isTeacherScopedCategoryKey(k));
}
