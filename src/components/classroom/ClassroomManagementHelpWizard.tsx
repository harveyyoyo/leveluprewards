'use client';

import { TabWalkthroughWizard } from '@/components/admin/TabWalkthroughWizard';
import type { TabWalkthroughStep } from '@/lib/tabWalkthrough';
import type { ClassroomTabSection } from '@/lib/classroom/classroomTabSections';
import {
  CLASS_AWARDS_LIVE_LAUNCH_LABEL,
  CLASSROOM_SEATING_SECTION_LABEL,
  CLASSROOM_TAB_LABEL,
} from '@/lib/classroom/classroomTabSections';

const STEP_BY_SECTION: Record<ClassroomTabSection, TabWalkthroughStep> = {
  seating: {
    title: CLASSROOM_SEATING_SECTION_LABEL,
    checklist: [
      `Use ${CLASS_AWARDS_LIVE_LAUNCH_LABEL} at the top of this section for the live seating chart and quick awards.`,
      'Use Launch for class screen on your projector — same chart, but behavior comments stay hidden.',
      'Set school access, award labels, point deductions, if/then alerts, and monitor options under Settings.',
      'On the monitor: Class (multi-class), Chart style, Layout, Desk display, and Toolbar options.',
    ],
  },
  behavior: {
    title: 'Behavior',
    checklist: [
      `Add notes from the live monitor (${CLASSROOM_SEATING_SECTION_LABEL} → ${CLASS_AWARDS_LIVE_LAUNCH_LABEL}).`,
      'Saved notes appear in the Behavior tab list right away.',
      'Enable Principal in Class Awards Live to preview the school-wide timeline.',
    ],
  },
  'room-display': {
    title: 'Room display',
    checklist: [
      'Pick a class, customize the headline and modules, then open on your classroom monitor.',
      'Session leaderboard updates as you award on the live monitor — separate from Class Awards Live.',
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
