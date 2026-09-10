export type ClassroomRealmHomePhase = 'off' | 'need-sign-in' | 'loading' | 'ready';

export type ClassroomRealmHomeViewInput = {
  classroomOn: boolean;
  staffOk: boolean;
  canReadRoster: boolean;
  studentsLoading: boolean;
  classesLoading: boolean;
  /** Once the command center has been shown, keep it through settings/roster refetches. */
  keepReady: boolean;
};

/**
 * Standalone /classroom-realm home. Never fall back to the older chalkboard
 * realm hub after the command center has already painted.
 */
export function classroomRealmHomePhase(
  input: ClassroomRealmHomeViewInput,
): ClassroomRealmHomePhase {
  if (input.keepReady) return 'ready';
  if (!input.classroomOn) return 'off';
  if (!input.staffOk || !input.canReadRoster) return 'need-sign-in';
  if (input.studentsLoading || input.classesLoading) return 'loading';
  return 'ready';
}

export function shouldLatchClassroomCommandCenter(input: {
  classroomOn: boolean;
  staffOk: boolean;
  canReadRoster: boolean;
  studentsLoading: boolean;
  classesLoading: boolean;
}): boolean {
  return (
    input.classroomOn &&
    input.staffOk &&
    input.canReadRoster &&
    !input.studentsLoading &&
    !input.classesLoading
  );
}
