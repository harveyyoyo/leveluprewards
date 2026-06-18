import { safeString } from '@/lib/safeDisplayValue';
import { isPublicSampleSchoolId, SAMPLE_SCHOOL_ACCESS_PASSCODE } from '@/lib/sampleSchools';

const SCHOOL_ID_RE = /^[\w-]{1,128}$/;

/** Trim, lowercase, and reject empty / legacy "null" tokens and invalid ids. */
export function normalizeSchoolId(raw: string | null | undefined): string {
  const s = safeString(raw).toLowerCase();
  if (!s || !SCHOOL_ID_RE.test(s)) return '';
  return s;
}

/** First path segment is not a real school id (e.g. `/null/student`). */
export function isInvalidSchoolPathSegment(segment: string | null | undefined): boolean {
  return !normalizeSchoolId(segment);
}

/** Credentials for `login('student', …)` including demo-school passcode when needed. */
export function studentKioskLoginCredentials(schoolId: string): {
  schoolId: string;
  passcode?: string;
} {
  const sid = normalizeSchoolId(schoolId);
  const credentials: { schoolId: string; passcode?: string } = { schoolId: sid };
  if (sid && isPublicSampleSchoolId(sid)) {
    credentials.passcode = SAMPLE_SCHOOL_ACCESS_PASSCODE;
  }
  return credentials;
}
