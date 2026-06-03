/** Section ids for Classroom Management (shared by admin + teacher portals). */
export type ClassroomTabSection = 'setup' | 'seating' | 'behavior' | 'alerts' | 'room-display';

/** User-facing label for the live class awards / seating section. */
export const CLASSROOM_SEATING_SECTION_LABEL = 'Class Awards Live';

/** Fixed tabs — principal and parent portal are configured under Setup only. */
export function buildClassroomSections(): ClassroomTabSection[] {
  return ['setup', 'seating', 'behavior', 'alerts', 'room-display'];
}
