import { format } from 'date-fns';
import type { Teacher, TeacherBudgetPeriod } from '@/lib/types';

/** Monday-start week; window key is that Monday's local calendar date (yyyy-MM-dd). */
function startOfWeekMondayLocal(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + delta);
  return x;
}

export function budgetWindowKeyForDate(period: TeacherBudgetPeriod, date: Date = new Date()): string {
  if (period === 'day') return format(date, 'yyyy-MM-dd');
  if (period === 'month') return format(date, 'yyyy-MM');
  return format(startOfWeekMondayLocal(date), 'yyyy-MM-dd');
}

export function resolveTeacherBudgetPeriod(teacher: Pick<Teacher, 'budgetPeriod'>): TeacherBudgetPeriod {
  const p = teacher.budgetPeriod;
  if (p === 'day' || p === 'week' || p === 'month') return p;
  return 'month';
}

export function teacherBudgetRemainingPhrase(period: TeacherBudgetPeriod): string {
  switch (period) {
    case 'day':
      return 'today';
    case 'week':
      return 'this week';
    case 'month':
      return 'this month';
    default:
      return 'this month';
  }
}

/**
 * Effective spend in the active window. When `budgetWindowKey` is missing, stored
 * `spentThisMonth` is treated as the current window (legacy / first run).
 */
export function effectiveTeacherBudgetSpent(teacher: Teacher): { spent: number; windowKey: string; period: TeacherBudgetPeriod } {
  const period = resolveTeacherBudgetPeriod(teacher);
  const nowKey = budgetWindowKeyForDate(period);
  const storedKey = teacher.budgetWindowKey;
  const raw = teacher.spentThisMonth || 0;
  if (storedKey === undefined || storedKey === null || storedKey === '') {
    return { spent: raw, windowKey: nowKey, period };
  }
  if (storedKey !== nowKey) {
    return { spent: 0, windowKey: nowKey, period };
  }
  return { spent: raw, windowKey: nowKey, period };
}

export function remainingTeacherBudgetPoints(teacher: Teacher): number | null {
  if (teacher.monthlyBudget === undefined) return null;
  const { spent } = effectiveTeacherBudgetSpent(teacher);
  return Math.max(0, teacher.monthlyBudget - spent);
}

/** Apply a spend against the cap, rolling the window forward in Firestore when needed. */
export function teacherWithBudgetAfterSpend(teacher: Teacher, cost: number): Teacher {
  if (teacher.monthlyBudget === undefined) {
    return teacher;
  }
  const { spent, windowKey } = effectiveTeacherBudgetSpent(teacher);
  return {
    ...teacher,
    spentThisMonth: spent + cost,
    budgetWindowKey: windowKey,
  };
}
