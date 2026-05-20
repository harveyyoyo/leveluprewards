/**
 * Hall of Fame shows school-wide leaderboards; restrict to staff (and platform developer),
 * not student kiosk or school-portal-only sessions.
 */
const HALL_OF_FAME_STAFF_LOGIN_STATES = [
  'admin',
  'teacher',
  'secretary',
  'prizeClerk',
  'reports',
  'librarian',
  'office',
] as const;

export function canAccessHallOfFameRoute(loginState: string): boolean {
  return (
    loginState === 'developer' ||
    (HALL_OF_FAME_STAFF_LOGIN_STATES as readonly string[]).includes(loginState)
  );
}
