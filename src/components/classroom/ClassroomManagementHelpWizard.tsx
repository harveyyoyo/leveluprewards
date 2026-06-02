'use client';

import { TabWalkthroughWizard } from '@/components/admin/TabWalkthroughWizard';
import type { TabWalkthroughStep } from '@/lib/tabWalkthrough';
import type { ClassroomTabSection } from '@/lib/classroom/classroomTabSections';
import { CLASSROOM_SEATING_SECTION_LABEL } from '@/lib/classroom/classroomTabSections';

const STEP_BY_SECTION: Record<ClassroomTabSection, TabWalkthroughStep> = {
  setup: {
    title: 'Setup',
    checklist: [
      'Turn Principal or Parent portal on or off for your school.',
      'Use the preview links to see what each audience sees.',
      'Room display is always available on its own tab.',
    ],
  },
  seating: {
    title: CLASSROOM_SEATING_SECTION_LABEL,
    checklist: [
      'Hold P, C, I, W, or H and click a student for note popups (positive, comment, incident, warning, highlight).',
      'Use the Quick and Awards tabs in the toolbar — or Shift+click for a note picker.',
      'Arrange seats to drag desks into your room layout. Full-screen auto-exit is under Setup.',
    ],
  },
  behavior: {
    title: 'Behavior',
    checklist: [
      `Add notes from ${CLASSROOM_SEATING_SECTION_LABEL} (P/C/I/W/H + click or award menu notes).`,
      'Saved notes appear in the Behavior tab list right away.',
      'Enable Principal in Setup to preview the school-wide timeline.',
    ],
  },
  alerts: {
    title: 'Alerts',
    checklist: [
      'Create if/then rules: threshold + time window → auto behavior note.',
      'Examples: 25 classroom points in 24h, or 3 concern notes in a week.',
      'Rules run when awards or notes are saved; each rule fires once per student per window.',
    ],
  },
  'room-display': {
    title: 'Room display',
    checklist: [
      'Pick a class, customize the headline and modules, then open on your classroom TV.',
      'Session leaderboard updates as you award on the seating chart.',
      'Separate from the hallway Smart Screen.',
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
      title="Classroom Management"
      subtitle="How each section works"
      steps={steps}
      triggerLabel="Help wizard"
      className={className}
    />
  );
}
