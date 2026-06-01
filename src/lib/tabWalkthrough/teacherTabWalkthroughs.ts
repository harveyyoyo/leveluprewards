import type { TabWalkthroughConfig } from './types';
import { CLASSROOM_SEATING_SECTION_LABEL } from '@/lib/classroom/classroomTabSections';

const TEACHER_TAB_WALKTHROUGHS: Record<string, TabWalkthroughConfig> = {
  roster: {
    title: 'Students tab',
    subtitle: 'Your roster and quick actions',
    steps: [
      {
        title: 'Find a student',
        checklist: [
          'Search by name or ID; filter by class when you teach multiple groups.',
          'Open a row to view details or recent activity when available.',
        ],
      },
    ],
  },
  classes: {
    title: 'Classes tab',
    subtitle: 'Classes you teach or oversee',
    steps: [
      {
        title: 'Review assignments',
        checklist: [
          'See which students are in each class and primary-teacher ownership.',
          'Coordinate with admin if a class is missing or mis-assigned.',
        ],
      },
    ],
  },
  coupons: {
    title: 'Points tab',
    subtitle: 'Print coupons and award points',
    steps: [
      {
        title: 'Print a coupon sheet',
        checklist: [
          'Pick category and point value, then Generate Sheet.',
          'Hand coupons to students; they redeem codes at the student kiosk.',
        ],
      },
      {
        title: 'Manual points',
        checklist: [
          'Use Manually Add or Deduct Points for one-off awards or deductions without printing.',
        ],
      },
    ],
  },
  classroom: {
    title: 'Classroom Management',
    subtitle: 'Same sections as school admin',
    steps: [
      {
        title: 'Setup',
        checklist: [
          'Open Setup to turn on Principal, Room display, or Parent portal.',
          'Your choices apply for all staff — same tabs for teachers and admins.',
        ],
      },
      {
        title: CLASSROOM_SEATING_SECTION_LABEL,
        checklist: [
          'Choose your class and tap students for quick awards.',
          'Shift+click for a behavior note (see the Behavior section).',
        ],
      },
      {
        title: 'Behavior & Principal',
        checklist: [
          'Behavior lists notes you add from the chart.',
          'Turn on Principal in Setup to open the school-wide timeline tab.',
        ],
      },
      {
        title: 'Room display',
        checklist: [
          'Use Room display to show the live chart on a classroom screen.',
        ],
      },
    ],
  },
  prizes: {
    title: 'Prizes tab',
    subtitle: 'Rewards your students can buy',
    steps: [
      {
        title: 'Manage your shop items',
        checklist: [
          'Add items you are allowed to offer; respect school-wide vs teacher-only scope.',
          'Keep stock updated so students do not redeem out-of-stock rewards.',
        ],
      },
    ],
  },
  redemptions: {
    title: 'Redemptions tab',
    subtitle: 'Fulfill student purchases',
    steps: [
      {
        title: 'Mark orders complete',
        checklist: [
          'Open pending redemptions when students pick up prizes.',
          'Confirm delivery so inventory and history stay accurate.',
        ],
      },
    ],
  },
  reports: {
    title: 'Reports tab',
    subtitle: 'Exports for your classes only',
    steps: [
      {
        title: 'Run a report',
        checklist: [
          'Choose report type and narrow to your students or classes.',
          'Print or download CSV for conferences or records.',
        ],
      },
    ],
  },
  raffle: {
    title: 'Raffle tab',
    subtitle: 'Ticket drawings from student points',
    steps: [
      {
        title: 'Run a drawing',
        checklist: [
          'Confirm points-per-ticket in school settings if tickets look wrong.',
          'Spin or draw winners, then record results for your class or school.',
        ],
      },
    ],
  },
  attendance: {
    title: 'Attendance tab',
    subtitle: 'Sign-in rewards for your classes',
    steps: [
      {
        title: 'Set up rules',
        checklist: [
          'Confirm Universal Periods exist (admin → Attendance).',
          'Add at least one reward rule: class, period, and point values.',
        ],
        example: {
          heading: 'Example rule',
          rows: ['Class: morning group', 'Period 1', '5 pts sign-in + 2 on-time bonus'],
        },
      },
      {
        title: 'Test the kiosk',
        checklist: [
          'Have a student sign in during the period window on the Student page.',
          'Use the Example walkthrough button in this tab for step-by-step setup.',
        ],
      },
    ],
  },
  goals: {
    title: 'Goals tab',
    subtitle: 'Track student targets',
    steps: [
      {
        title: 'Monitor progress',
        checklist: [
          'Review active goals assigned to your students.',
          'Update or celebrate completion when a student reaches a target.',
        ],
      },
    ],
  },
  homework: {
    title: 'Homework tab',
    subtitle: 'Homework completion rewards',
    steps: [
      {
        title: 'Award homework points',
        checklist: [
          'Mark assignments complete to issue category-linked homework points.',
          'Align with your school\'s homework category naming from admin.',
        ],
      },
    ],
  },
  'generated-coupons': {
    title: 'Coupons tab',
    subtitle: 'Pre-generated or bulk codes',
    steps: [
      {
        title: 'Use generated codes',
        checklist: [
          'Distribute codes from this list when your school uses bulk-generated coupons.',
          'Check redemption status before reusing a code.',
        ],
      },
    ],
  },
};

export function getTeacherTabWalkthrough(tabId: string): TabWalkthroughConfig | null {
  return TEACHER_TAB_WALKTHROUGHS[tabId] ?? null;
}
