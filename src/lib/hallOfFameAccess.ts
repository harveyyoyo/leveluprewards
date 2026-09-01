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
  'houseCoordinator',
] as const;

export function canAccessHallOfFameRoute(loginState: string): boolean {
  return (
    loginState === 'developer' ||
    (HALL_OF_FAME_STAFF_LOGIN_STATES as readonly string[]).includes(loginState)
  );
}

/** True only when Firestore is likely to allow private school roster reads. */
export function canReadSchoolRoster(args: {
  loginState: string;
  isAdmin?: boolean;
  isTeacher?: boolean;
  isPrizeClerk?: boolean;
  isSecretary?: boolean;
  isReports?: boolean;
  isLibrarian?: boolean;
  isHouseCoordinator?: boolean;
  isOffice?: boolean;
  email?: string | null;
}): boolean {
  if (
    args.isTeacher ||
    args.isPrizeClerk ||
    args.isSecretary ||
    args.isReports ||
    args.isLibrarian ||
    args.isHouseCoordinator ||
    args.isOffice
  ) {
    return true;
  }
  if (args.loginState === 'admin' && args.isAdmin) return true;
  // Developer UI can be restored from localStorage with a leftover custom token (no email).
  // Those tokens are not on the developer allowlist and cannot list classes.
  if (args.loginState === 'developer' && Boolean(args.email?.trim())) return true;
  return false;
}
