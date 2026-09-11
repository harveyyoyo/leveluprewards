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

/** Firebase custom token with no email — leftover developer/office handoff, not staff. */
export function isLeftoverCustomAuthUser(
  user: { email?: string | null; providerData?: ReadonlyArray<unknown> } | null | undefined,
): boolean {
  if (!user) return false;
  const email = typeof user.email === 'string' ? user.email.trim() : '';
  return !email && (user.providerData?.length ?? 0) === 0;
}

/** True only when Firestore is likely to allow private `schools/{id}` reads. */
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

/** Same gate as roster reads — the private school document holds passcodes. */
export const canReadPrivateSchoolDocument = canReadSchoolRoster;
