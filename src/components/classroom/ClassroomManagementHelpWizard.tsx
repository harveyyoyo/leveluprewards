'use client';

import { TabWalkthroughWizard } from '@/components/admin/TabWalkthroughWizard';
import type { TabWalkthroughStep } from '@/lib/tabWalkthrough';
import type { ClassroomTabSection } from '@/lib/classroom/classroomTabSections';
import { CLASSROOM_SEATING_SECTION_LABEL, CLASSROOM_TAB_LABEL } from '@/lib/classroom/classroomTabSections';

const STEP_BY_SECTION: Record<ClassroomTabSection, TabWalkthroughStep> = {
  seating: {
    title: CLASSROOM_SEATING_SECTION_LABEL,
    checklist: [
      'Launch Monitor Display for the live seating chart and quick awards.',
      'Set chart defaults, school access, award labels, if/then alerts, and monitor auto-exit.',
      'On the monitor: Class (when you have more than one), Chart style, Layout, Desk display, and Toolbar options.',
    ],
  },
  behavior: {
    title: 'Behavior',
    checklist: [
      `Add notes from the live monitor (${CLASSROOM_SEATING_SECTION_LABEL} → Launch Monitor Display).`,
      'Saved notes appear in the Behavior tab list right away.',
      'Enable Principal in Class Awards Live to preview the school-wide timeline.',
    ],
  },
  'room-display': {
    title: 'Room display',
    checklist: [
      'Pick a class, customize the headline and modules, then open on your classroom monitor.',
      'Session leaderboard updates as you award on the live monitor — separate from Launch Monitor Display.',
      'Hallway Smart Screen is separate — configure it under Admin → Smart Screen.',
    ],
  },
};

export function ClassroomManagementHelpWizard({
  sections,
  className,
}: {
  sections: ClassroomTabSection[];
  className?: string;
}) {
  const steps = sections.map((id) => STEP_BY_SECTION[id]).filter(Boolean);
  if (steps.length === 0) return null;

  return (
    <TabWalkthroughWizard
      title={CLASSROOM_TAB_LABEL}
      subtitle="How each section works"
      steps={steps}
      triggerLabel="Help wizard"
      className={className}
    />
  );
}
