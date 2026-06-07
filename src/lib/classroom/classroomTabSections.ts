/** Section ids for Classroom (shared by admin + teacher portals). */
export type ClassroomTabSection = 'seating' | 'behavior' | 'room-display';

/** Staff portal tab label (admin + teacher). */
export const CLASSROOM_TAB_LABEL = 'Classroom';

/** Launch button label for the teacher live awards monitor. */
export const CLASS_AWARDS_LIVE_LAUNCH_LABEL = 'Launch Class Awards Live';

/** Launch button label for the student-facing class screen mirror. */
export const CLASS_AWARDS_STUDENT_LAUNCH_LABEL = 'Launch for class screen';

/** User-facing label for settings + launch hub (live chart opens on monitor display). */
export const CLASSROOM_SEATING_SECTION_LABEL = 'Class Awards Live';

/** Class Awards Live holds settings; Behavior is the note timeline; Room display is the session mirror. */
export function buildClassroomSections(): ClassroomTabSection[] {
  return ['seating', 'behavior', 'room-display'];
}
