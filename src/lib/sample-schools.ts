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

/** Seeded passcodes for public demos (also the Cloud Function default when unset). */
export const SAMPLE_SCHOOL_ACCESS_PASSCODE = '1234';
export const SAMPLE_ADMIN_PASSCODE = '1234';
