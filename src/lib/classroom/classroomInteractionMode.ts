export type ClassroomInteractionMode = 'award' | 'attendance';

export const DEFAULT_CLASSROOM_INTERACTION_MODE: ClassroomInteractionMode = 'award';

export function classroomInteractionModeLabel(mode: ClassroomInteractionMode): string {
  if (mode === 'attendance') return 'Take attendance';
  return 'Award points';
}
