import type { IntroStep } from './types';
import { STAFF_AI_HELP_TOUR_TARGET } from '@/lib/wizardHelpCopy';

/** Add-on modules most relevant to day-to-day teacher workflows. */
export const teacherFeaturesTourSteps: IntroStep[] = [
  {
    id: 'teacher-features-intro',
    title: 'Teacher Add-Ons',
    body: 'Ready for more? These optional modules extend what you can do from the Teacher Portal.',
    onRoute: '/teacher',
    target: 'staff-tab-welcome',
    requireTarget: false,
  },
  {
    id: 'teacher-features-library',
    title: 'Library',
    body: 'Check library books in and out for students right from your portal when Library is enabled.',
    onRoute: '/teacher',
    target: 'addon-link-library',
    requireTarget: false,
  },
  {
    id: 'teacher-features-displays',
    title: 'Hallway Displays',
    body: 'Cast live leaderboards to hallway TVs — great for assemblies and friendly house competition.',
    onRoute: '/teacher',
    target: 'addon-link-displays',
    requireTarget: false,
  },
  {
    id: 'teacher-features-goals',
    title: 'Student Goals',
    body: 'When Goals are on, students can lock in a target prize and track progress — you can cheer them on from class.',
    onRoute: '/teacher',
    target: 'addon-link-goals',
    requireTarget: false,
  },
  {
    id: 'teacher-features-finish',
    title: 'You\'re All Set!',
    body: 'Enable the add-ons that fit your classroom under Add more anytime.',
    onRoute: '/teacher',
    target: STAFF_AI_HELP_TOUR_TARGET,
  },
];
