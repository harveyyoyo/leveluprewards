'use client';

import { TabWalkthroughWizard } from '@/components/admin/TabWalkthroughWizard';
import type { TabWalkthroughStep } from '@/lib/tabWalkthrough';
import type { ClassroomTabSection } from '@/lib/classroom/classroomTabSections';
import { CLASSROOM_SEATING_SECTION_LABEL } from '@/lib/classroom/classroomTabSections';

const STEP_BY_SECTION: Record<ClassroomTabSection, TabWalkthroughStep> = {
  setup: {
    title: 'Setup',
    checklist: [
      'Turn Room display, Parent portal, and Principal on or off for your school.',
      'Teachers and admins use the same toggles — changes apply for everyone.',
      'Optional tabs only appear when they are enabled.',
    ],
  },
  seating: {
    title: CLASSROOM_SEATING_SECTION_LABEL,
    checklist: [
      'In classroom settings (gear), pick Quick select or Show award menu — only one mode at a time.',
      'Choose a class, then tap a desk to award points.',
      'Shift+click a student for a behavior note.',
    ],
  },
  'room-display': {
    title: 'Room display',
    checklist: [
      'For a projector or classroom TV in the room — not the hallway Smart Screen.',
      'Shows live seating, session totals, and class messages for the class.',
      'Full launch is coming soon; turn it on in Setup to see this section.',
    ],
  },
  behavior: {
    title: 'Behavior',
    checklist: [
      `Add notes from ${CLASSROOM_SEATING_SECTION_LABEL} (Shift+click or award menu → Behavior note).`,
      'Saved notes appear in the Behavior tab list right away.',
      'Turn on Principal in Setup for the same school-wide view under Principal.',
    ],
  },
  principal: {
    title: 'Principal',
    checklist: [
      'School-wide timeline of behavior notes from all classes.',
      'Turn on Principal under Setup if this tab is missing.',
      'Staff-only incidents stay hidden from families.',
    ],
  },
  parents: {
    title: 'Parent portal',
    checklist: [
      'Share the parent link from your school portal when the feature is on.',
      'Families sign in with the parent email on file for each student.',
      'Only behavior notes shared with parents appear in their view.',
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
