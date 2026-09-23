import type { Goal, GoalType, Prize, Student, Class as SchoolClass } from '@/lib/types';

/** Progress at or above this share of the target counts as “almost there.” */
export const GOAL_ALMOST_THERE_RATIO = 0.8;

export type GoalListBucket = 'active' | 'finished' | 'past_due' | 'archived';

export type GoalTemplate = {
  id: string;
  label: string;
  title: string;
  type: GoalType;
  targetPoints: number;
  description?: string;
};

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: 'kindness-50',
    label: '50 points this month',
    title: '50 points this month',
    type: 'personal',
    targetPoints: 50,
    description: 'Earn 50 points before the month ends.',
  },
  {
    id: 'class-500',
    label: 'Class hits 500',
    title: 'Class reaches 500 points',
    type: 'class',
    targetPoints: 500,
    description: 'Everyone’s points count toward this class target.',
  },
  {
    id: 'save-reward',
    label: 'Save for a reward',
    title: 'Save for a shop reward',
    type: 'prize_savings',
    targetPoints: 100,
    description: 'Watch your spendable balance grow toward a prize.',
  },
];

export function goalTypeLabel(type: GoalType | string | undefined): string {
  switch (type) {
    case 'personal':
      return 'Personal';
    case 'prize_savings':
      return 'Savings';
    case 'class':
      return 'Class';
    case 'school':
      return 'Whole school';
    default:
      return 'Goal';
  }
}

export function goalStatusLabel(status: Goal['status'] | string | undefined): string {
  switch (status) {
    case 'active':
      return 'In progress';
    case 'completed':
      return 'Finished';
    case 'expired':
      return 'Past due';
    default:
      return 'In progress';
  }
}

export function goalAudienceLabel(
  goal: Goal,
  students: Student[],
  classes: SchoolClass[],
): string {
  if (goal.type === 'school') return 'Whole school';
  if (goal.type === 'class' && goal.classId) {
    const cls = classes.find((c) => c.id === goal.classId);
    return cls?.name?.trim() || 'Whole class';
  }
  if (goal.studentId) {
    const s = students.find((st) => st.id === goal.studentId);
    if (s) {
      const name = `${s.firstName || ''} ${s.lastName || ''}`.trim();
      return name || 'Student';
    }
    return 'Student';
  }
  return 'School';
}

export function bucketForGoal(goal: Goal, now = Date.now()): GoalListBucket {
  if (goal.archived) return 'archived';
  if (goal.status === 'completed') return 'finished';
  if (goal.status === 'expired') return 'past_due';
  // Goals are marked expired when points next come in; show an overdue goal as past due right away.
  if (goal.endDate && goal.endDate < now) return 'past_due';
  return 'active';
}

export function isAlmostThere(progress: number, targetPoints: number): boolean {
  const target = Number(targetPoints) || 0;
  if (target <= 0) return false;
  return progress >= target * GOAL_ALMOST_THERE_RATIO && progress < target;
}

export function progressPercent(progress: number, targetPoints: number): number {
  const target = Number(targetPoints) || 0;
  if (target <= 0) return 0;
  return Math.min(100, Math.round((progress / target) * 100));
}

export function titleForPrizeSavings(prize: Pick<Prize, 'name'>): string {
  const name = (prize.name || 'reward').trim();
  return `Save for ${name}`;
}

export function filterStudentsByQuery(students: Student[], query: string): Student[] {
  const q = query.trim().toLowerCase();
  if (!q) return students;
  return students.filter((s) => {
    const hay = `${s.firstName || ''} ${s.lastName || ''} ${s.id}`.toLowerCase();
    return hay.includes(q);
  });
}

export function msFromDateInput(ymd: string, endOfDay: boolean): number | undefined {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return undefined;
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(
    y,
    m - 1,
    d,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
  return dt.getTime();
}

export function dateInputFromMs(ms?: number): string {
  if (!ms || !Number.isFinite(ms)) return '';
  const dt = new Date(ms);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Recently finished (7 days) — good for hallway “just finished” callouts. */
export function isRecentCompletion(goal: Goal, now = Date.now()): boolean {
  if (goal.status !== 'completed') return false;
  const at = goal.completedAt ?? goal.createdAt ?? 0;
  return now - at <= 7 * 24 * 60 * 60 * 1000;
}
