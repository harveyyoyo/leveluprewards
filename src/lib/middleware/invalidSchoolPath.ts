import { isInvalidSchoolPathSegment } from '@/lib/schoolId';

/** True when the first URL segment is not a real school id (e.g. `/null/student`). */
export function invalidSchoolPathRedirect(pathname: string): boolean {
  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment) return false;
  return isInvalidSchoolPathSegment(segment);
}
