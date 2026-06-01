'use client';

import { TabWalkthroughWizard } from '@/components/admin/TabWalkthroughWizard';
import type { TabWalkthroughStep } from '@/lib/tabWalkthrough';
import type { ClassroomTabSection } from '@/lib/classroom/classroomTabSections';

const STEP_BY_SECTION: Record<ClassroomTabSection, TabWalkthroughStep> = {
  setup: {
    title: 'Setup',
    checklist: [
      'School admins turn Room display, Parent portal, and Principal on or off here.',
      'Teachers see the same tabs; toggles stay in sync for the whole school.',
      'Optional tabs only appear when they are enabled.',
    ],
  },
  seating: {
    title: 'Seating chart',
    checklist: [
      'Choose a class, then tap a desk for quick points (or open the award menu in classroom settings).',
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
      'Teachers add notes from the seating chart (Shift+click or the award menu).',
      'Choose positive, concern, or incident and write what happened.',
      'Notes can be shared with families when Parent portal is on.',
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
