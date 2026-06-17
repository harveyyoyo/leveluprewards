import type { Settings } from '@/components/providers/SettingsProvider';

/** Section ids for Classroom (shared by admin + teacher portals). */
export type ClassroomTabSection = 'seating' | 'behavior' | 'room-display' | 'raffle';

/** Staff portal tab label (admin + teacher). */
export const CLASSROOM_TAB_LABEL = 'Classroom';

/** Launch button label for the teacher live awards monitor. */
export const CLASS_AWARDS_LIVE_LAUNCH_LABEL = 'Launch Class Awards Live';

/** Launch button label for the student-facing class screen mirror. */
export const CLASS_AWARDS_STUDENT_LAUNCH_LABEL = 'Launch for class screen';

/** User-facing label for settings + launch hub (live chart opens on monitor display). */
export const CLASSROOM_SEATING_SECTION_LABEL = 'Class Awards Live';

export function isClassroomRaffleSectionVisible(
  settings: Settings,
  role: 'admin' | 'teacher',
): boolean {
  if (role === 'teacher') {
    return !(settings.teacherHiddenAddOnTabs || []).includes('raffle');
  }
  return !(settings.adminHiddenAddOnTabs || []).includes('raffle');
}

/** Class Awards Live, Behavior, Room display, and optional Raffle drawings. */
export function buildClassroomSections(
  settings: Settings | null | undefined,
  role: 'admin' | 'teacher',
): ClassroomTabSection[] {
  const sections: ClassroomTabSection[] = ['seating', 'behavior', 'room-display'];
  if (settings && isClassroomRaffleSectionVisible(settings, role)) {
    sections.push('raffle');
  }
  return sections;
}
