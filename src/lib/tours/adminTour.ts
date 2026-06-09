import { APP_NAME } from '@/lib/appBranding';
import { STAFF_AI_HELP_TOUR_TARGET } from '@/lib/wizardHelpCopy';
import type { IntroStep } from './types';

export const adminTourSteps: IntroStep[] = [
  {
    id: 'admin-welcome',
    title: 'Admin Portal',
    body: 'Welcome to the Admin Portal! This is where you build your school — load students, define classes, add staff, and set up your reward point categories.',
    onRoute: '/admin',
    target: 'portal-admin',
    navigateHint: 'Click the Admin Portal card to begin!',
  },
  {
    id: 'admin-sidebar',
    title: 'The Command Center',
    body: 'All your core tools live here on the left. Use "Add more" to enable optional features like Hall of Fame or Library.',
    onRoute: '/admin',
    target: 'staff-nav-sidebar',
    requireTarget: true,
  },
  {
    id: 'admin-students',
    title: 'Students',
    body: 'Manage your roster here. Add students manually, import them from a CSV, or print scannable ID cards.',
    onRoute: '/admin',
    target: 'staff-tab-students',
    requireTarget: true,
  },
  {
    id: 'admin-classes',
    title: 'Classes',
    body: 'Create classes to group students together and set primary teachers for reporting.',
    onRoute: '/admin',
    target: 'staff-tab-classes',
    requireTarget: true,
  },
  {
    id: 'admin-teachers',
    title: 'Staff & Teachers',
    body: 'Invite your team! You can assign point budgets and give specific permissions like "Prize Clerk" or "Secretary".',
    onRoute: '/admin',
    target: 'staff-tab-teachers',
    requireTarget: true,
  },
  {
    id: 'admin-points',
    title: 'Point Categories',
    body: 'Define how students earn points (e.g., "Helping Others", "On Time"). Print Coupons, either school wide or teacher specific.',
    onRoute: '/admin',
    target: 'staff-tab-categories',
    requireTarget: true,
  },
  {
    id: 'admin-prizes',
    title: 'Prizes & Rewards',
    body: 'Build out your school store! Set up items, stock levels, and costs so students can cash in their hard-earned points.',
    onRoute: '/admin',
    target: 'staff-tab-prizes',
    requireTarget: true,
  },
  {
    id: 'admin-finish',
    title: 'Need Help?',
    body: 'Click here anytime to ask our AI assistant for help or to contact tech support.',
    onRoute: '/admin',
    target: STAFF_AI_HELP_TOUR_TARGET,
  },
];
