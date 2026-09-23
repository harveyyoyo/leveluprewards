import type { Category, Goal, Student } from '@/lib/types';
import { categoryNameFromId } from '@/lib/goalsProgress';
import { activeGoalsForStudent, bestGoalProgressRatio } from '@/lib/goals/goalsOptions';
import { earnedInCategory } from '@/lib/goals/goalCategoryPoints';

/**
 * Fast progress estimate for classroom rings (no activity-log queries).
 * Date-ranged goals fall back to lifetime/category totals so desks stay snappy.
 */
export function estimateGoalProgressSync(
  goal: Goal,
  viewer: Student,
  roster: Student[],
  categories: Category[],
): number {
  if (goal.status !== 'active') return 0;
  const catName = categoryNameFromId(categories, goal.categoryId);

  if (goal.type === 'prize_savings') {
    if (!goal.studentId || goal.studentId !== viewer.id) return 0;
    return Math.max(0, viewer.points || 0);
  }

  if (goal.type === 'class' || goal.type === 'school') {
    const members = goal.type === 'school' ? roster : roster.filter((s) => s.classId === goal.classId);
    if (goal.categoryId) {
      if (!catName) return 0;
      return members.reduce((acc, s) => acc + earnedInCategory(s, catName), 0);
    }
    return members.reduce((acc, s) => acc + (s.lifetimePoints ?? s.points ?? 0), 0);
  }

  if (!goal.studentId || goal.studentId !== viewer.id) return 0;
  if (goal.categoryId) {
    if (!catName) return 0;
    return earnedInCategory(viewer, catName);
  }
  return viewer.lifetimePoints ?? viewer.points ?? 0;
}

/** Best active goal fill ratio (0–1+) per student id for seating overlays. */
export function buildStudentGoalRatioMap(
  goals: Goal[],
  students: Student[],
  categories: Category[],
  schoolStudents?: Student[],
): Record<string, number> {
  const byClass = new Map<string, Student[]>();
  for (const s of students) {
    if (!s.classId) continue;
    const list = byClass.get(s.classId) || [];
    list.push(s);
    byClass.set(s.classId, list);
  }

  const out: Record<string, number> = {};
  for (const student of students) {
    const relevant = activeGoalsForStudent(goals, student).filter((g) => g.type !== 'school' || schoolStudents);
    if (relevant.length === 0) continue;
    const progressByGoalId: Record<string, number> = {};
    for (const g of relevant) {
      const roster =
        g.type === 'school' ? schoolStudents! : g.type === 'class' && g.classId ? byClass.get(g.classId) || [student] : [student];
      progressByGoalId[g.id] = estimateGoalProgressSync(g, student, roster, categories);
    }
    const best = bestGoalProgressRatio(relevant, progressByGoalId);
    if (best) out[student.id] = best.ratio;
  }
  return out;
}
