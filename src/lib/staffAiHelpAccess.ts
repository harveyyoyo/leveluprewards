import type { LoginState } from '@/components/providers/AuthProvider';

/**
 * Roles that may use the in-app staff AI help assistant (floating Sparkles button).
 * Available immediately upon school login ('school') through any staff role.
 * Student kiosk sessions are excluded.
 */
const STAFF_AI_HELP_LOGIN_STATES = new Set<LoginState>([
  'school',
  'admin',
  'teacher',
  'secretary',
  'prizeClerk',
  'reports',
  'librarian',
  'office',
  'houseCoordinator',
  'developer',
]);

export function canAccessStaffAiHelp(loginState: LoginState | string): boolean {
  return STAFF_AI_HELP_LOGIN_STATES.has(loginState as LoginState);
}
