import type { Category, Goal, GoalType, Student } from '@/lib/types';
import { GOAL_ALMOST_THERE_RATIO, goalTypeLabel, progressPercent } from '@/lib/goals/goalHelpers';

/** Simple on/off Goals extras. Defaults keep day-to-day use smooth. */
export type GoalsOptions = {
  /** Tiny progress ring on classroom seating desks. */
  showOnClassroom: boolean;
  /** Cheer when points finish a goal (staff + student). */
  celebrateOnAward: boolean;
  /** Tell teachers when a student is near a goal. */
  teacherAlmostThereNudge: boolean;
  /** Hallway screens highlight recent finishes. */
  hallwaySpotlight: boolean;
  /** Offer goal ideas from how the class earns points. */
  suggestFromHabits: boolean;
  /** Use a shorter empty-list message while keeping every list tab visible. */
  hideEmptySections: boolean;
  /** Prize shop shows “Need X more points”. */
  showNeedMoreInShop: boolean;
  /** Softer wording on the student home portal. */
  familyFriendlyPortal: boolean;
  /** Bigger celebration when a class goal finishes. */
  classPartyMode: boolean;
};

export const DEFAULT_GOALS_OPTIONS: GoalsOptions = {
  showOnClassroom: true,
  celebrateOnAward: true,
  teacherAlmostThereNudge: true,
  hallwaySpotlight: true,
  suggestFromHabits: true,
  hideEmptySections: true,
  showNeedMoreInShop: true,
  familyFriendlyPortal: true,
  classPartyMode: true,
};

export const GOALS_OPTION_FIELDS: Array<{
  key: keyof GoalsOptions;
  label: string;
  hint: string;
}> = [
  {
    key: 'celebrateOnAward',
    label: 'Cheer when a goal finishes',
    hint: 'Show confetti and a congratulations message when a goal is completed. Students also see encouragement when they are close. Turn this off to hide these celebrations and student messages.',
  },
  {
    key: 'teacherAlmostThereNudge',
    label: 'Nudge teachers when someone is close',
    hint: 'Show the teacher an “Almost there!” message after awarding points when a goal reaches 80% of its target — for example, 80 out of 100 points. Turn this off to hide that reminder.',
  },
  {
    key: 'showOnClassroom',
    label: 'Show progress on classroom seats',
    hint: 'Add a small progress ring to each student’s seat on the classroom seating chart so teachers can see how close they are to a goal. Turn this off to hide the rings.',
  },
  {
    key: 'showNeedMoreInShop',
    label: 'Show “need more points” in the shop',
    hint: 'In the student prize shop, show how many more points a student needs for a prize. For example, a 100-point prize says “Need 30 more points” if they have 70. Turn this off to hide that extra message.',
  },
  {
    key: 'hallwaySpotlight',
    label: 'Spotlight finishes on hallway screens',
    hint: 'Highlight recently completed goals on hallway displays with a “Just finished!” message. Turn this off to stop highlighting those finishes on the screens.',
  },
  {
    key: 'classPartyMode',
    label: 'Class goal party',
    hint: 'Use a bigger confetti celebration when a shared class goal is completed. “Cheer when a goal finishes” must also be on. Turn this off to use the regular celebration; it does not change rewards.',
  },
  {
    key: 'hideEmptySections',
    label: 'Keep empty lists simple',
    hint: 'When a list has no goals, show only “No goals in this list yet.” Turn this off to also show tips for adding or finding goals. Current, Finished, Past due, and Archived always stay visible.',
  },
  {
    key: 'familyFriendlyPortal',
    label: 'Family-friendly home portal words',
    hint: 'Use friendlier goal labels and progress messages on the student home page, such as “Saving for a reward” and “Needs 20 more points.” Turn this off to use the standard wording. Points and rewards stay the same.',
  },
];

export function resolveGoalsOptions(partial?: Partial<GoalsOptions> | null): GoalsOptions {
  return { ...DEFAULT_GOALS_OPTIONS, ...(partial || {}) };
}

export function pointsStillNeeded(progress: number, targetPoints: number): number {
  const target = Math.max(0, Number(targetPoints) || 0);
  const have = Math.max(0, Number(progress) || 0);
  return Math.max(0, target - have);
}

export function pointsNeededForPrize(studentPoints: number, prizeCost: number): number {
  return Math.max(0, Math.max(0, Number(prizeCost) || 0) - Math.max(0, Number(studentPoints) || 0));
}

/** Uncapped percent for “goal crushed” displays (can be > 100). */
export function progressPercentUncapped(progress: number, targetPoints: number): number {
  const target = Number(targetPoints) || 0;
  if (target <= 0) return 0;
  return Math.round((progress / target) * 100);
}

export function isGoalCrushed(progress: number, targetPoints: number): boolean {
  return Number(targetPoints) > 0 && progress > Number(targetPoints);
}

export function proudProgressLabel(progress: number, targetPoints: number): string {
  if (isGoalCrushed(progress, targetPoints)) {
    return `Goal crushed! ${progress.toLocaleString()} / ${Number(targetPoints).toLocaleString()}`;
  }
  const pct = progressPercent(progress, targetPoints);
  return `${progress.toLocaleString()} / ${Number(targetPoints).toLocaleString()} · ${pct}%`;
}

export function familyGoalTypeLabel(type: GoalType | string | undefined): string {
  switch (type) {
    case 'personal':
      return 'Personal target';
    case 'prize_savings':
      return 'Saving for a reward';
    case 'class':
      return 'Class challenge';
    case 'school':
      return 'School challenge';
    default:
      return 'Goal';
  }
}

export function familyGoalStatusLine(args: {
  status: Goal['status'] | string | undefined;
  progress: number;
  targetPoints: number;
  createdByStudent?: boolean;
}): string {
  const { status, progress, targetPoints, createdByStudent } = args;
  if (status === 'completed') return 'Done — nice work!';
  if (status === 'expired') return 'Time ran out — ask a teacher to extend.';
  const need = pointsStillNeeded(progress, targetPoints);
  if (need <= 0) return 'Ready to finish!';
  if (createdByStudent) return `Needs ${need.toLocaleString()} more points to unlock.`;
  return `Needs ${need.toLocaleString()} more points.`;
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Goals created in the previous ~30 days (for “copy last month”). */
export function goalsFromLastMonth(goals: Goal[], now = Date.now()): Goal[] {
  const start = now - 2 * MONTH_MS;
  const end = now - MONTH_MS / 30; // roughly older than today
  return goals.filter((g) => {
    const at = g.createdAt || 0;
    return at >= start && at <= now && at < end + MONTH_MS;
  });
}

/** Prefer goals from 15–45 days ago; fall back to any non-archived recent goals. */
export function pickGoalsToCopy(goals: Goal[], now = Date.now()): Goal[] {
  const windowStart = now - 45 * 24 * 60 * 60 * 1000;
  const windowEnd = now - 15 * 24 * 60 * 60 * 1000;
  const inWindow = goals.filter((g) => {
    if (g.archived) return false;
    const at = g.createdAt || 0;
    return at >= windowStart && at <= windowEnd;
  });
  if (inWindow.length > 0) return inWindow;
  // Fall back: most recent distinct titles (up to 8)
  const seen = new Set<string>();
  const out: Goal[] = [];
  for (const g of [...goals].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))) {
    if (g.archived) continue;
    const key = `${g.type}:${g.title}:${g.studentId || g.classId || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(g);
    if (out.length >= 8) break;
  }
  return out;
}

export function payloadForCopiedGoal(goal: Goal, now = Date.now()): Omit<Goal, 'id' | 'createdAt' | 'status'> {
  const span =
    goal.startDate && goal.endDate && goal.endDate > goal.startDate
      ? goal.endDate - goal.startDate
      : MONTH_MS;
  return {
    type: goal.type,
    title: goal.title,
    description: goal.description,
    targetPoints: goal.targetPoints,
    categoryId: goal.categoryId,
    studentId: goal.studentId,
    classId: goal.classId,
    teacherId: goal.teacherId,
    prizeId: goal.prizeId,
    bonusPointsReward: goal.bonusPointsReward,
    startDate: now,
    endDate: now + span,
    createdByStudent: undefined,
    archived: undefined,
    completedAt: undefined,
    almostThereNotifiedAt: undefined,
  };
}

export function extendedEndDate(goal: Goal, now = Date.now()): number {
  const base = Math.max(goal.endDate || 0, now);
  return base + WEEK_MS;
}

export type HabitGoalSuggestion = {
  id: string;
  label: string;
  title: string;
  type: GoalType;
  targetPoints: number;
  categoryId?: string;
  description: string;
};

/** Suggest personal goals from top category totals across a roster. */
export function suggestGoalsFromHabits(
  students: Student[],
  categories: Category[],
): HabitGoalSuggestion[] {
  const totals = new Map<string, number>();
  for (const s of students) {
    const cp = s.categoryPoints || {};
    for (const [name, pts] of Object.entries(cp)) {
      if (typeof pts !== 'number' || pts <= 0) continue;
      totals.set(name, (totals.get(name) || 0) + pts);
    }
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const out: HabitGoalSuggestion[] = [];
  for (const [name, sum] of ranked) {
    const cat = categories.find((c) => c.name === name);
    const avg = students.length > 0 ? Math.round(sum / students.length) : sum;
    const target = Math.max(25, Math.round(avg * 0.35) || 50);
    out.push({
      id: `habit-${cat?.id || name}`,
      label: `${name} focus`,
      title: `${target} ${name} points`,
      type: 'personal',
      targetPoints: target,
      categoryId: cat?.id,
      description: `Your class earns a lot of ${name} — try a short personal target.`,
    });
  }
  if (out.length === 0) {
    out.push({
      id: 'habit-starter',
      label: 'Starter goal',
      title: '25 points this week',
      type: 'personal',
      targetPoints: 25,
      description: 'A gentle first target while the class builds point habits.',
    });
  }
  return out;
}

export function activeGoalsForStudent(
  goals: Goal[],
  student: Pick<Student, 'id' | 'classId'>,
): Goal[] {
  return goals.filter(
    (g) =>
      !g.archived &&
      g.status === 'active' &&
      (g.type === 'school' || g.studentId === student.id || (g.type === 'class' && g.classId && g.classId === student.classId)),
  );
}

export function bestGoalProgressRatio(
  goals: Goal[],
  progressByGoalId: Record<string, number>,
): { goal: Goal; ratio: number; progress: number } | null {
  let best: { goal: Goal; ratio: number; progress: number } | null = null;
  for (const g of goals) {
    const target = Number(g.targetPoints) || 0;
    if (target <= 0) continue;
    const progress = progressByGoalId[g.id] ?? 0;
    const ratio = progress / target;
    if (!best || ratio > best.ratio) best = { goal: g, ratio, progress };
  }
  return best;
}

export { GOAL_ALMOST_THERE_RATIO, goalTypeLabel };
