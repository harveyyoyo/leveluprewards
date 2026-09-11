/** Remember the class a teacher just picked so Live and Class screen stay in sync. */

const SESSION_KEY = 'levelup-classroom-active-class';
const LEGACY_KEY = 'defaultClassId';

export function rememberClassroomActiveClass(classId: string) {
  if (typeof window === 'undefined') return;
  const id = classId.trim();
  if (!id) return;
  try {
    sessionStorage.setItem(SESSION_KEY, id);
    localStorage.setItem(LEGACY_KEY, id);
  } catch {
    /* private mode / quota */
  }
}

export function readClassroomActiveClass(): string {
  if (typeof window === 'undefined') return '';
  try {
    return (sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(LEGACY_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function pickClassroomActiveClass(
  classes: ReadonlyArray<{ id: string }>,
  preferred?: string | null,
): string {
  const want = (preferred || readClassroomActiveClass()).trim();
  if (want && classes.some((c) => c.id === want)) return want;
  return classes[0]?.id || '';
}
