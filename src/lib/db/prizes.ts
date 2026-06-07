import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  collection,
  runTransaction,
  Firestore,
  type UpdateData,
} from 'firebase/firestore';
import { prizeRestrictionTeacherIds } from '@/lib/prizes/prizeUtils';
import {
  deductCategoryPointsForPrize,
  prizeHasCategoryRestriction,
  studentCanAffordPrizeByCategory,
} from '@/lib/prizes/prizeCategoryEligibility';
import type { Category, Student, Prize, HistoryItem } from '../types';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { removeUndefined } from './helpers';
import { AI_FUN_UNIFIED_PRIZE_ID } from '@/lib/aiJokePrize';
import { derivePrizeScanCode, generatePrizeScanCode, isPrizeScanCode } from '@/lib/prizes/prizeScanCode';
import { prizeCardColorForId } from '@/lib/prizes/prizeCardColor';

/** Creates the single Fun (AI) prize doc if missing — students choose joke/riddle/fortune teller at redeem. */
export async function ensureUnifiedAiFunPrize(
  firestore: Firestore,
  schoolId: string,
  defaults: { points: number },
): Promise<void> {
  const prizeDocRef = doc(firestore, 'schools', schoolId, 'prizes', AI_FUN_UNIFIED_PRIZE_ID);
  try {
    const snap = await getDoc(prizeDocRef);
    if (snap.exists()) return;
    const payload = removeUndefined({
      name: 'Fun',
      points: Math.max(0, defaults.points),
      icon: 'Sparkles',
      inStock: true,
      offerPrintTicketOnRedeem: true,
      aiFunReward: 'picker' as const,
      addedBy: 'System',
    } as unknown as Record<string, unknown>);
    await setDoc(prizeDocRef, payload);
  } catch (error) {
    reportFirestorePermissionError(error, { path: prizeDocRef.path, operation: 'create', requestResourceData: { id: AI_FUN_UNIFIED_PRIZE_ID } });
    throw error;
  }
}

export async function ensurePrizeScanCode(
  firestore: Firestore,
  schoolId: string,
  prize: Prize,
): Promise<string> {
  const existing = prize.scanCode?.trim().toUpperCase();
  if (existing && isPrizeScanCode(existing)) return existing;
  const scanCode = derivePrizeScanCode(prize.id);
  const prizeDocRef = doc(firestore, 'schools', schoolId, 'prizes', prize.id);
  try {
    await updateDoc(prizeDocRef, { scanCode });
  } catch (error) {
    reportFirestorePermissionError(error, { path: prizeDocRef.path, operation: 'update', requestResourceData: { scanCode } });
    throw error;
  }
  return scanCode;
}

/** Assigns missing scan codes for all prizes in a school (idempotent). */
export async function backfillPrizeScanCodes(firestore: Firestore, schoolId: string, prizes: Prize[]): Promise<void> {
  await Promise.all(prizes.map((p) => ensurePrizeScanCode(firestore, schoolId, p)));
}

export const addPrize = async (firestore: Firestore, schoolId: string, prizeData: Omit<Prize, 'id'>): Promise<string> => {
  const newId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const scanCode = prizeData.scanCode?.trim().toUpperCase() || generatePrizeScanCode();
  const newPrize: Prize = {
    ...prizeData,
    id: newId,
    scanCode,
    cardColor: prizeData.cardColor?.trim() || prizeCardColorForId(newId),
  };
  const prizeDocRef = doc(firestore, 'schools', schoolId, 'prizes', newPrize.id);
  try {
    const ids = prizeRestrictionTeacherIds(newPrize);
    const { teacherId: _tid, teacherIds: _tids, vendingMotor, ...rest } = newPrize;
    const payload = removeUndefined({ ...rest } as unknown as Record<string, unknown>) as Record<string, unknown>;
    delete payload.teacherId;
    delete payload.teacherIds;
    if (ids.length > 0) {
      payload.teacherIds = ids;
    }
    if (vendingMotor !== undefined) {
      payload.vendingMotor = removeUndefined(vendingMotor as unknown as Record<string, unknown>);
    }
    await setDoc(prizeDocRef, payload);
    return newId;
  } catch (error) {
    reportFirestorePermissionError(error, { path: prizeDocRef.path, operation: 'create', requestResourceData: newPrize });
    throw error;
  }
};

export const updatePrize = async (firestore: Firestore, schoolId: string, updatedPrize: Prize) => {
  const prizeDocRef = doc(firestore, 'schools', schoolId, 'prizes', updatedPrize.id);
  try {
    const { stockCount, imageUrl, cardColor, teacherId, teacherIds, vendingMotor, aiFunReward, categoryIds, id, ...rest } = updatedPrize;
    const payload = removeUndefined({ ...rest } as unknown as Record<string, unknown>) as Record<string, unknown>;
    if (stockCount === undefined) {
      payload.stockCount = deleteField();
    } else {
      payload.stockCount = stockCount;
    }
    if (!imageUrl) {
      payload.imageUrl = deleteField();
    } else {
      payload.imageUrl = imageUrl;
    }
    if (!cardColor?.trim()) {
      payload.cardColor = deleteField();
    } else {
      payload.cardColor = cardColor.trim();
    }
    if (vendingMotor === undefined) {
      payload.vendingMotor = deleteField();
    } else {
      // Strip undefined leaves so Firestore doesn't reject the write.
      payload.vendingMotor = removeUndefined(vendingMotor as unknown as Record<string, unknown>);
    }
    if (aiFunReward === undefined) {
      payload.aiFunReward = deleteField();
    } else {
      payload.aiFunReward = aiFunReward;
    }
    const catIds = [...(categoryIds || [])].filter((id): id is string => typeof id === 'string' && id.length > 0);
    if (catIds.length > 0) {
      payload.categoryIds = catIds;
    } else {
      payload.categoryIds = deleteField();
    }
    const ids = [...(teacherIds || [])].filter((tid): tid is string => typeof tid === 'string' && tid.length > 0);
    if (ids.length > 0) {
      payload.teacherIds = ids;
      payload.teacherId = deleteField();
    } else if (teacherId) {
      payload.teacherId = teacherId;
      payload.teacherIds = deleteField();
    } else {
      payload.teacherId = deleteField();
      payload.teacherIds = deleteField();
    }
    await updateDoc(prizeDocRef, payload as UpdateData<Prize>);
  } catch (error) {
    reportFirestorePermissionError(error, { path: prizeDocRef.path, operation: 'update', requestResourceData: updatedPrize });
    throw error;
  }
};

export const deletePrize = async (firestore: Firestore, schoolId: string, prizeId: string) => {
  const prizeDocRef = doc(firestore, 'schools', schoolId, 'prizes', prizeId);
  try {
    await deleteDoc(prizeDocRef);
  } catch (error) {
    reportFirestorePermissionError(error, { path: prizeDocRef.path, operation: 'delete' });
    throw error;
  }
};

export const redeemPrize = async (
  firestore: Firestore,
  schoolId: string,
  studentId: string,
  prize: Prize,
  quantity: number,
  pointsOverride?: number,
  options?: { markFulfilled?: boolean },
  categories: Category[] = [],
): Promise<{ success: boolean; activityId: string; redeemedAt: number; totalCost: number }> => {
  const studentRef = doc(firestore, 'schools', schoolId, 'students', studentId);
  const prizeRef = doc(firestore, 'schools', schoolId, 'prizes', prize.id);
  const activityRef = doc(collection(firestore, 'schools', schoolId, 'students', studentId, 'activities'));
  const redeemedAt = Date.now();
  try {
    await runTransaction(firestore, async (transaction) => {
      const [studentDoc, prizeDoc] = await Promise.all([
        transaction.get(studentRef),
        transaction.get(prizeRef),
      ]);

      if (!studentDoc.exists()) {
        throw new Error("Student not found.");
      }
      if (!prizeDoc.exists()) {
      throw new Error("Reward item not found.");
      }

      const studentData = studentDoc.data() as Student;
      const prizeData = prizeDoc.data() as Prize;
      const totalCost = typeof pointsOverride === 'number' ? pointsOverride : prizeData.points * quantity;

      if (!prizeData.inStock) {
      throw new Error("This reward item is not available.");
      }
      if (typeof prizeData.stockCount === 'number') {
        if (prizeData.stockCount < quantity) {
          throw new Error('Not enough items in stock for that quantity.');
        }
      }

      if (
        !studentCanAffordPrizeByCategory(studentData, prizeData as Prize, categories, quantity) &&
        typeof pointsOverride !== 'number'
      ) {
        throw new Error(
          prizeHasCategoryRestriction(prizeData as Prize)
            ? 'Not enough points in the required categories.'
            : 'Not enough points.',
        );
      }

      if (typeof pointsOverride === 'number' && studentData.points < totalCost) {
        throw new Error('Not enough points.');
      }

      const categoryPointsUpdate = prizeHasCategoryRestriction(prizeData as Prize)
        ? deductCategoryPointsForPrize(
            { ...(studentData.categoryPoints || {}) },
            prizeData as Prize,
            categories,
            totalCost,
          )
        : null;

      if (prizeHasCategoryRestriction(prizeData as Prize) && !categoryPointsUpdate) {
        throw new Error('Not enough points in the required categories.');
      }

      if (studentData.points < totalCost) {
        throw new Error('Not enough points.');
      }

      const restrictionIds = prizeRestrictionTeacherIds(prizeData as Prize);
      const newHistoryItem: Omit<HistoryItem, 'id'> = {
        desc: `Redeemed: ${prizeData.name}${quantity > 1 ? ` (x${quantity})` : ''}`,
        amount: -totalCost,
        date: redeemedAt,
        fulfilled: options?.markFulfilled === true,
        teacherId: restrictionIds[0] ?? prizeData.teacherId,
      };

      transaction.update(studentRef, {
        points: studentData.points - totalCost,
        ...(categoryPointsUpdate ? { categoryPoints: categoryPointsUpdate } : {}),
        updatedAt: redeemedAt,
      });
      transaction.set(activityRef, removeUndefined(newHistoryItem as unknown as Record<string, unknown>));

      if (typeof prizeData.stockCount === 'number') {
        const nextStock = prizeData.stockCount - quantity;
        const updates: UpdateData<Prize> = {
          stockCount: Math.max(0, nextStock),
          inStock: nextStock > 0,
        };
        transaction.update(prizeRef, updates);
      }
    });
    void import('@/lib/goalsProgress').then((m) =>
      m.syncGoalsForStudent(firestore, schoolId, studentId).catch(() => {}),
    );
    return { success: true, activityId: activityRef.id, redeemedAt, totalCost: typeof pointsOverride === 'number' ? pointsOverride : prize.points * quantity };
  } catch (e) {
    reportFirestorePermissionError(e, { path: studentRef.path, operation: 'update', requestResourceData: { prizeId: prize.id, quantity } });
    throw e;
  }
};

export const togglePrizeFulfillment = async (firestore: Firestore, schoolId: string, studentId: string, activityId: string, fulfilled: boolean) => {
  const activityDocRef = doc(firestore, 'schools', schoolId, 'students', studentId, 'activities', activityId);
  try {
    await updateDoc(activityDocRef, { fulfilled });
  } catch (error) {
    reportFirestorePermissionError(error, { path: activityDocRef.path, operation: 'update', requestResourceData: { fulfilled } });
    throw error;
  }
};
