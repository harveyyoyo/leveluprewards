import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import type { Category, Goal, GoalType, Student } from '@/lib/types';
import { updateGoal } from '@/lib/db/goals';
import { awardPointsToStudent } from '@/lib/db/students';
import { GOAL_ALMOST_THERE_RATIO } from '@/lib/goals/goalHelpers';

export function categoryNameFromId(categories: Category[], categoryId?: string): string | undefined {
  if (!categoryId) return undefined;
  return categories.find((c) => c.id === categoryId)?.name;
}

async function sumActivitiesInRange(
  firestore: Firestore,
  schoolId: string,
  studentId: string,
  startMs: number,
  endMs: number,
  categoryName?: string,
): Promise<number> {
  const ref = collection(firestore, 'schools', schoolId, 'students', studentId, 'activities');
  const q = query(ref, where('date', '>=', startMs), where('date', '<=', endMs));
  const snap = await getDocs(q);
  let sum = 0;
  snap.forEach((d) => {
    const data = d.data() as { desc?: string; amount?: number };
    const amt = typeof data.amount === 'number' ? data.amount : 0;
    if (amt <= 0) return;
    if (categoryName !== undefined && categoryName !== '' && data.desc !== categoryName) return;
    sum += amt;
  });
  return sum;
}

/**
 * Numeric progress toward goal.targetPoints for the current student view (and aggregate for class goals).
 */
export async function computeGoalProgress(
  firestore: Firestore,
  schoolId: string,
  goal: Goal,
  viewerStudent: Student,
  rosterStudents: Student[],
  categories: Category[],
): Promise<number> {
  const now = Date.now();
  if (goal.status !== 'active') {
    // Still show final progress on completed/expired cards when possible.
    if (goal.status !== 'completed' && goal.status !== 'expired') return 0;
  }
  if (goal.status === 'active') {
    if (goal.startDate && now < goal.startDate) return 0;
    if (goal.endDate && now > goal.endDate) return 0;
  }

  const catName = categoryNameFromId(categories, goal.categoryId);
  const rangeStart = goal.startDate ?? 0;
  const rangeEnd = goal.endDate ?? now;
  const useActivityRange = goal.startDate != null || goal.endDate != null;

  if (goal.type === 'prize_savings') {
    const sid = goal.studentId;
    if (!sid || sid !== viewerStudent.id) return 0;
    return Math.max(0, viewerStudent.points || 0);
  }

  if (goal.type === 'class') {
    const roster = rosterStudents.filter((s) => s.classId === goal.classId);
    if (goal.categoryId) {
      if (!catName) return 0;
      if (useActivityRange) {
        const sums = await Promise.all(
          roster.map((s) => sumActivitiesInRange(firestore, schoolId, s.id, rangeStart, rangeEnd, catName)),
        );
        return sums.reduce((a, b) => a + b, 0);
      }
      return roster.reduce((acc, s) => acc + (s.categoryPoints?.[catName] || 0), 0);
    }
    if (useActivityRange) {
      const sums = await Promise.all(
        roster.map((s) => sumActivitiesInRange(firestore, schoolId, s.id, rangeStart, rangeEnd)),
      );
      return sums.reduce((a, b) => a + b, 0);
    }
    return roster.reduce((acc, s) => acc + (s.lifetimePoints ?? s.points ?? 0), 0);
  }

  const sid = goal.studentId;
  if (!sid || sid !== viewerStudent.id) return 0;

  if (goal.categoryId) {
    if (!catName) return 0;
    if (useActivityRange) {
      return sumActivitiesInRange(firestore, schoolId, viewerStudent.id, rangeStart, rangeEnd, catName);
    }
    return viewerStudent.categoryPoints?.[catName] || 0;
  }

  if (useActivityRange) {
    const ranged = await sumActivitiesInRange(firestore, schoolId, viewerStudent.id, rangeStart, rangeEnd);
    return goal.status === 'completed' ? Math.max(ranged, goal.targetPoints || 0) : ranged;
  }
  const lifetime = viewerStudent.lifetimePoints ?? viewerStudent.points ?? 0;
  return goal.status === 'completed' ? Math.max(lifetime, goal.targetPoints || 0) : lifetime;
}

export type GoalSyncEvent = {
  goalId: string;
  title: string;
  kind: 'completed' | 'almost_there';
  type: GoalType;
  classId?: string;
};

export async function syncGoalsForStudent(
  firestore: Firestore,
  schoolId: string,
  studentId: string,
): Promise<GoalSyncEvent[]> {
  const events: GoalSyncEvent[] = [];
  const studentRef = doc(firestore, 'schools', schoolId, 'students', studentId);
  const studentSnap = await getDoc(studentRef);
  if (!studentSnap.exists()) return events;

  const student = { id: studentSnap.id, ...studentSnap.data() } as Student;

  const goalsSnap = await getDocs(collection(firestore, 'schools', schoolId, 'goals'));
  const goals = goalsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Goal))
    .filter((g) => g.status === 'active')
    .filter(
      (g) =>
        g.studentId === studentId ||
        (g.type === 'class' && g.classId && g.classId === student.classId),
    );

  if (goals.length === 0) return events;

  const categoriesSnap = await getDocs(collection(firestore, 'schools', schoolId, 'categories'));
  const categories = categoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));

  const rosterCache = new Map<string, Student[]>();

  async function rosterForClass(classId: string): Promise<Student[]> {
    if (rosterCache.has(classId)) return rosterCache.get(classId)!;
    const q = query(collection(firestore, 'schools', schoolId, 'students'), where('classId', '==', classId));
    const snap = await getDocs(q);
    const list = snap.docs.map((x) => ({ id: x.id, ...x.data() } as Student));
    rosterCache.set(classId, list);
    return list;
  }

  const now = Date.now();

  for (const goal of goals) {
    if (goal.endDate && now > goal.endDate) {
      await updateGoal(firestore, schoolId, goal.id, { status: 'expired' });
      continue;
    }

    let rosterList: Student[] = [];
    if (goal.type === 'class' && goal.classId) {
      rosterList = await rosterForClass(goal.classId);
    } else {
      rosterList = [student];
    }

    const progress = await computeGoalProgress(firestore, schoolId, goal, student, rosterList, categories);
    const target = Number(goal.targetPoints) || 0;

    if (target > 0 && progress >= target * GOAL_ALMOST_THERE_RATIO && progress < target && !goal.almostThereNotifiedAt) {
      await updateGoal(firestore, schoolId, goal.id, { almostThereNotifiedAt: now });
      events.push({
        goalId: goal.id,
        title: goal.title,
        kind: 'almost_there',
        type: goal.type,
        classId: goal.classId,
      });
    }

    if (progress >= target && target > 0) {
      await updateGoal(firestore, schoolId, goal.id, { status: 'completed', completedAt: now });
      events.push({
        goalId: goal.id,
        title: goal.title,
        kind: 'completed',
        type: goal.type,
        classId: goal.classId,
      });

      const bonus = goal.bonusPointsReward ?? 0;
      if (bonus > 0) {
        if (goal.type === 'class') {
          for (const member of rosterList) {
            await awardPointsToStudent(
              firestore,
              schoolId,
              member.id,
              bonus,
              `Class goal reward: ${goal.title}`,
              [],
              categories,
              [],
              { skipGoalSync: true },
            );
          }
        } else {
          const recipient = goal.studentId;
          if (recipient) {
            await awardPointsToStudent(
              firestore,
              schoolId,
              recipient,
              bonus,
              `Goal reward: ${goal.title}`,
              [],
              categories,
              [],
              { skipGoalSync: true },
            );
          }
        }
      }
    }
  }

  return events;
}
