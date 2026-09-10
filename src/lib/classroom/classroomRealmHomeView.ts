export type ClassroomRealmHomeUi = 'leftover-realm-hub' | 'command-center';

export type ClassroomRealmHomePhase = 'off' | 'hub';

export type ClassroomRealmHomeViewInput = {
  classroomOn: boolean;
  /** Once the leftover hub has painted, keep it through settings refetches. */
  keepHub: boolean;
};

/**
 * Standalone /classroom-realm home.
 * PR #59 locked the seating-chart command center — that was the older UI.
 * Home is the leftover chalkboard Classroom Realm hub only. Never remount
 * ClassroomCommandCenter after settings load.
 */
export function classroomRealmHomeUi(): ClassroomRealmHomeUi {
  return 'leftover-realm-hub';
}

export function classroomRealmHomePhase(
  input: ClassroomRealmHomeViewInput,
): ClassroomRealmHomePhase {
  if (input.keepHub) return 'hub';
  if (!input.classroomOn) return 'off';
  return 'hub';
}

export function shouldLatchClassroomRealmHub(classroomOn: boolean): boolean {
  return classroomOn;
}
