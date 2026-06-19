import type { Teacher } from '@/lib/types';
import { isLeadershipPersonnel } from '@/lib/teacherPersonnelRole';

/** Admins and house coordinators always manage houses; teachers need an explicit flag. */
export function teacherCanManageHouses(
  teacher: Teacher | null | undefined,
  opts?: { isAdmin?: boolean; isHouseCoordinator?: boolean },
): boolean {
  if (opts?.isAdmin || opts?.isHouseCoordinator) return true;
  if (!teacher) return false;
  if (isLeadershipPersonnel(teacher)) return true;
  return teacher.canManageHouses === true;
}
