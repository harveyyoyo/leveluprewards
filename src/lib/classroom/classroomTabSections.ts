/** Section ids for Classroom Management (shared by admin + teacher portals). */
export type ClassroomTabSection =
  | 'setup'
  | 'seating'
  | 'behavior'
  | 'principal'
  | 'parents'
  | 'room-display';

/** User-facing label for the live class awards / seating section. */
export const CLASSROOM_SEATING_SECTION_LABEL = 'Class awards Live';

/** Same sections for admin and teacher; optional sections follow school settings. */
export function buildClassroomSections(options: {
  parentPortalOn: boolean;
  principalTimelineOn: boolean;
  roomDisplayOn: boolean;
}): ClassroomTabSection[] {
  const sections: ClassroomTabSection[] = ['setup', 'seating', 'behavior'];
  if (options.roomDisplayOn) sections.push('room-display');
  if (options.principalTimelineOn) sections.push('principal');
  if (options.parentPortalOn) sections.push('parents');
  return sections;
}
