/**
 * Built-in schools exposed on the public login page ("Try a demo school").
 * Keep in sync with reset/seed logic (e.g. BackupProvider dev reset).
 */
export const PUBLIC_SAMPLE_SCHOOL_IDS = ['schoolabc', 'yeshiva'] as const;
export type PublicSampleSchoolId = (typeof PUBLIC_SAMPLE_SCHOOL_IDS)[number];

export function isPublicSampleSchoolId(id: string | null | undefined): boolean {
  const s = (id ?? '').trim().toLowerCase();
  return (PUBLIC_SAMPLE_SCHOOL_IDS as readonly string[]).includes(s);
}

/** School gate for manual `/sign-in` fallback when demo admin callable fails (matches seeded access passcode). */
export const SAMPLE_SCHOOL_ACCESS_PASSCODE = '1234';

/**
 * Sent with demo auto-admin login. Empty pairs with `PUBLIC_DEMO_ADMIN_SCHOOL_IDS` in
 * Cloud Function `verifySchoolPasscode` (no passcode verified server-side for those IDs).
 */
export const PUBLIC_DEMO_ADMIN_PASSCODE = '';
