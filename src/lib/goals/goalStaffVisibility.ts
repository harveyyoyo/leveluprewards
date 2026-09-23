import type { Goal } from '@/lib/types';

/** `seeAll` is for admins and office staff, who keep a school-wide view of every goal. */
export type GoalStaffViewer = { staffId?: string; teacherId?: string; isAdmin: boolean; seeAll?: boolean };

export function canManageGoal(goal: Goal, viewer: GoalStaffViewer): boolean {
  // Admins can manage every goal, as before assigners were recorded.
  if (viewer.isAdmin) return true;
  if (goal.assignedByStaffId) return goal.assignedByStaffId === viewer.staffId;
  if (goal.teacherId) return goal.teacherId === viewer.teacherId;
  return false;
}

export function canSeeStaffGoal(goal: Goal, viewer: GoalStaffViewer): boolean {
  if (viewer.isAdmin || viewer.seeAll) return true;
  return goal.staffVisibility === 'all' || canManageGoal(goal, viewer);
}

export function goalStaffVisibility(goal: Goal): 'creator' | 'all' {
  // Sharing with specific staff isn't offered in the goal form yet; show it as the private choice.
  if (goal.staffVisibility === 'specific') return 'creator';
  return goal.staffVisibility ?? (goal.teacherId || goal.assignedByStaffId ? 'creator' : 'all');
}
