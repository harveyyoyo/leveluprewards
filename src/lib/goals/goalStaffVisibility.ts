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
  if (goal.staffVisibility === 'all') return true;
  if (canManageGoal(goal, viewer)) return true;
  if (goal.staffVisibility === 'specific' && Array.isArray(goal.sharedStaffIds)) {
    if (viewer.staffId && goal.sharedStaffIds.includes(viewer.staffId)) return true;
    if (viewer.teacherId) {
      if (goal.sharedStaffIds.includes(viewer.teacherId)) return true;
      if (goal.sharedStaffIds.includes(`teacher:${viewer.teacherId}`)) return true;
    }
    if (viewer.staffId) {
      const stripped = viewer.staffId.replace(/^(teacher|staff|admin):/, '');
      if (stripped && goal.sharedStaffIds.includes(stripped)) return true;
    }
  }
  return false;
}

export function goalStaffVisibility(goal: Goal): 'creator' | 'all' | 'specific' {
  if (goal.staffVisibility === 'specific') return 'specific';
  return goal.staffVisibility ?? (goal.teacherId || goal.assignedByStaffId ? 'creator' : 'all');
}
