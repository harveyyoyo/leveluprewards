/** Developer-assigned school profile that unlocks community-specific features. */
export type SchoolProfileType = 'standard' | 'jewish_orthodox';

export const SCHOOL_PROFILE_LABELS: Record<SchoolProfileType, string> = {
  standard: 'Standard',
  jewish_orthodox: 'Jewish Orthodox',
};

/** Built-in demo schools that should behave as Jewish Orthodox until explicitly changed. */
export const KNOWN_JEWISH_ORTHODOX_SCHOOL_IDS = ['yeshiva'] as const;

export function isSchoolProfileType(value: unknown): value is SchoolProfileType {
  return value === 'standard' || value === 'jewish_orthodox';
}

export function normalizeSchoolProfile(value: unknown): SchoolProfileType {
  return isSchoolProfileType(value) ? value : 'standard';
}

/**
 * Whether a school should receive Jewish Orthodox feature options.
 * Uses the stored profile first, then known demo school IDs as a fallback.
 */
export function isJewishOrthodoxSchool(
  data?: { schoolProfile?: SchoolProfileType | null } | null,
  schoolId?: string | null,
): boolean {
  const profile = data?.schoolProfile;
  if (profile === 'jewish_orthodox') return true;
  if (profile === 'standard') return false;

  const sid = (schoolId || '').trim().toLowerCase();
  return (KNOWN_JEWISH_ORTHODOX_SCHOOL_IDS as readonly string[]).includes(sid);
}
