import type { StaffPortalLoginOption } from '@/lib/syncSchoolStaffDirectory';
import { officeStaffEntryHref } from '@/lib/officePublicUrl';

/** Post-login route for a staff portal login option from the school hub. */
export function staffLandingPath(schoolId: string, type: StaffPortalLoginOption['type']): string {
  if (type === 'teacher') return `/${schoolId}/teacher`;
  if (type === 'secretary') return `/${schoolId}/secretary`;
  if (type === 'prizeClerk') return `/${schoolId}/admin`;
  if (type === 'reports') return `/${schoolId}/reports`;
  if (type === 'librarian') return `/${schoolId}/librarian`;
  if (type === 'office') return officeStaffEntryHref(schoolId);
  if (type === 'houseCoordinator') return `/${schoolId}/admin`;
  return `/${schoolId}/admin`;
}
