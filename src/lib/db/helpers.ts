import type { Student, Category, Achievement, Badge } from '../types';
import type { DocumentData } from 'firebase/firestore';

// -------------------------------------------------------------------------
// Helper: remove undefined values from an object before writing to Firestore.
// The return type is `DocumentData` (i.e. `{ [field: string]: any }`) because
// that's what `setDoc` / `updateDoc` / `transaction.update` expect — using a
// stricter `Record<string, unknown>` here breaks those call sites.
// -------------------------------------------------------------------------
export const removeUndefined = <T extends Record<string, unknown>>(obj: T): DocumentData => {
  const newObj: DocumentData = {};
  Object.keys(obj).forEach(key => {
    const value = (obj as Record<string, unknown>)[key];
    if (value !== undefined) {
      newObj[key] = value;
    }
  });
  return newObj;
}

// -------------------------------------------------------------------------
// Period key helpers (for category-based badges).
// -------------------------------------------------------------------------

/** Returns period keys for a given timestamp (for category-based badges and total points). */
export function getPeriodKeys(now: number): { day: string; week: string; month: string; semester: string; year: string; all_time: string } {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = d.getMonth() + 1; // 1-12
  const date = d.getDate();
  const day = `${y}-${String(m).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
  const month = `${y}-${String(m).padStart(2, '0')}`;
  const semester = m <= 6 ? `${y}-H1` : `${y}-H2`;
  const year = String(y);

  // ISO week logic
  const d2 = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d2.getUTCDay() || 7;
  d2.setUTCDate(d2.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d2.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d2.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const week = `${d2.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;

  return { day, week, month, semester, year, all_time: 'all' };
}

/** Update categoryPointsByPeriod for an award of `points` in `categoryName` at time `now`. */
export function applyCategoryPointsByPeriod(
  current: Student['categoryPointsByPeriod'],
  categoryName: string,
  points: number,
  now: number
): Student['categoryPointsByPeriod'] {
  const keys = getPeriodKeys(now);
  const periodKeys = [keys.month, keys.semester, keys.year, keys.all_time];
  const next = { ...current } as Record<string, Record<string, number>>;
  for (const key of periodKeys) {
    if (!next[key]) next[key] = {};
    next[key][categoryName] = (next[key][categoryName] || 0) + points;
  }
  return next;
}

/** Update pointsByPeriod for an award of `points` at time `now`. */
export function applyPointsByPeriod(
  current: Student['pointsByPeriod'],
  points: number,
  now: number
): Student['pointsByPeriod'] {
  const keys = getPeriodKeys(now);
  const periodKeys = [keys.day, keys.week, keys.month, keys.semester, keys.year, keys.all_time];
  const next = { ...current } as Record<string, number>;
  for (const key of periodKeys) {
    next[key] = (next[key] || 0) + points;
  }
  return next;
}

// -------------------------------------------------------------------------
// Achievement evaluation
// -------------------------------------------------------------------------

/** Evaluates which achievements a student has newly earned based on their current state. */
export const evaluateAchievements = (
  student: Student,
  achievements: Achievement[],
  categories: Category[]
): { achievementId: string; earnedAt: number; bonusPoints: number }[] => {
  const newEarned: { achievementId: string; earnedAt: number; bonusPoints: number }[] = [];
  const existingIds = new Set(student.earnedAchievements?.map(a => a.achievementId) || []);

  for (const ach of achievements) {
    if (existingIds.has(ach.id)) continue;
    if (ach.criteria.type === 'manual') continue;

    let isEarned = false;
    const { type, threshold, categoryId } = ach.criteria;

    if (type === 'points') {
      if (categoryId) {
        // Find category name to check categoryPoints
        const cat = categories.find(c => c.id === categoryId);
        const catName = cat ? cat.name : null;
        if (catName && (student.categoryPoints?.[catName] || 0) >= threshold) {
          isEarned = true;
        }
      } else {
        if (student.points >= threshold) isEarned = true;
      }
    } else if (type === 'lifetimePoints') {
      if ((student.lifetimePoints || 0) >= threshold) isEarned = true;
    } else if (type === 'coupons') {
      // Placeholder for coupons redeemed count if needed. 
      // Manual/Manual check for now.
    }

    if (isEarned) {
      newEarned.push({
        achievementId: ach.id,
        earnedAt: Date.now(),
        bonusPoints: ach.bonusPoints || 0
      });
    }
  }

  return newEarned;
};

// -------------------------------------------------------------------------
// Badge evaluation
// -------------------------------------------------------------------------

/** Evaluates which (real) badges a student has newly earned based on category points in the relevant period. */
export function evaluateBadges(
  student: Student,
  badges: Badge[],
  categories: Category[]
): { badgeId: string; periodKey: string; earnedAt: number }[] {
  const newEarned: { badgeId: string; periodKey: string; earnedAt: number }[] = [];
  const earnedSet = new Set((student.earnedBadges || []).map(e => `${e.badgeId}:${e.periodKey}`));
  const byPeriod = student.categoryPointsByPeriod || {};
  const now = Date.now();
  const keys = getPeriodKeys(now);

  for (const badge of badges) {
    if (badge.enabled === false) continue;
    const cat = categories.find(c => c.id === badge.categoryId);
    const categoryName = cat?.name;
    if (!categoryName) continue;

    const periodKey = badge.period === 'month' ? keys.month
      : badge.period === 'semester' ? keys.semester
        : badge.period === 'year' ? keys.year
          : 'all';
    const periodPoints = byPeriod[periodKey]?.[categoryName] ?? 0;
    if (periodPoints < badge.pointsRequired) continue;
    if (earnedSet.has(`${badge.id}:${periodKey}`)) continue;

    earnedSet.add(`${badge.id}:${periodKey}`);
    newEarned.push({ badgeId: badge.id, periodKey, earnedAt: now });
  }
  return newEarned;
}

// -------------------------------------------------------------------------
// Shared transaction helper for badge + achievement evaluation during
// point awards (used by students, coupons, etc.)
// -------------------------------------------------------------------------
import type {
  Transaction,
  DocumentReference,
  Firestore,
} from 'firebase/firestore';
import { doc, collection } from 'firebase/firestore';

/**
 * Within an ongoing Firestore transaction, evaluates badge and achievement
 * awards for a student, writes the activity log entries, and returns the
 * updated arrays and any bonus points.
 *
 * The caller must still call `transaction.update(studentRef, …)` with the
 * returned data — this helper only writes the activity sub-docs.
 */
export function applyAchievementsAndBadges(
  transaction: Transaction,
  studentRef: DocumentReference,
  studentData: Student,
  updatedPoints: number,
  updatedLifetimePoints: number,
  updatedCategoryPoints: Record<string, number>,
  updatedCategoryPointsByPeriod: Student['categoryPointsByPeriod'],
  allAchievements: Achievement[],
  allCategories: Category[],
  allBadges: Badge[],
  schoolId: string,
  studentId: string,
  firestore: Firestore,
): {
  earnedAchievements: Student['earnedAchievements'];
  earnedBadges: Student['earnedBadges'];
  bonusTotal: number;
} {
  // --- Badges ---
  const studentForBadges: Student = {
    ...studentData,
    categoryPoints: updatedCategoryPoints,
    categoryPointsByPeriod: updatedCategoryPointsByPeriod,
  };
  const newBadges = evaluateBadges(studentForBadges, allBadges, allCategories);
  const earnedBadges = [...(studentData.earnedBadges || [])];
  for (const b of newBadges) {
    earnedBadges.push({ badgeId: b.badgeId, periodKey: b.periodKey, earnedAt: b.earnedAt });
    const badgeInfo = allBadges.find(x => x.id === b.badgeId);
    const badgeActivityRef = doc(
      collection(firestore, 'schools', schoolId, 'students', studentId, 'activities')
    );
    transaction.set(badgeActivityRef, {
      desc: `Badge earned: ${badgeInfo?.name || 'Unknown'}`,
      amount: 0,
      date: b.earnedAt,
    });
  }

  // --- Achievements ---
  const studentForAch: Student = {
    ...studentData,
    points: updatedPoints,
    lifetimePoints: updatedLifetimePoints,
    categoryPoints: updatedCategoryPoints,
  };
  const newAchievements = evaluateAchievements(studentForAch, allAchievements, allCategories);
  const earnedAchievements = [...(studentData.earnedAchievements || [])];
  let bonusTotal = 0;

  for (const ach of newAchievements) {
    earnedAchievements.push({ achievementId: ach.achievementId, earnedAt: ach.earnedAt });
    bonusTotal += ach.bonusPoints;
    const achInfo = allAchievements.find(a => a.id === ach.achievementId);
    const achActivityRef = doc(
      collection(firestore, 'schools', schoolId, 'students', studentId, 'activities')
    );
    transaction.set(achActivityRef, {
      desc: `Achievement Unlocked: ${achInfo?.name || 'Unknown'}`,
      amount: ach.bonusPoints,
      date: Date.now(),
    });
  }

  return { earnedAchievements, earnedBadges, bonusTotal };
}
