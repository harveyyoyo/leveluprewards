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
import type { Student, Prize, HistoryItem } from '../types';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { removeUndefined } from './helpers';
import { prizeRestrictionTeacherIds } from '@/lib/prize-utils';
import { AI_FUN_UNIFIED_PRIZE_ID } from '@/lib/aiJokePrize';

/** Creates the single Fun (AI) prize doc if missing — students choose joke/riddle/fortune at redeem. */
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

export const addPrize = async (firestore: Firestore, schoolId: string, prizeData: Omit<Prize, 'id'>): Promise<string> => {
  const newId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const newPrize: Prize = { ...prizeData, id: newId };
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
    const { stockCount, imageUrl, teacherId, teacherIds, vendingMotor, aiFunReward, id, ...rest } = updatedPrize;
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
  pointsOverride?: number
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

      if (studentData.points < totalCost) {
        throw new Error("Not enough points.");
      }

      const restrictionIds = prizeRestrictionTeacherIds(prizeData as Prize);
      const newHistoryItem: Omit<HistoryItem, 'id'> = {
        desc: `Redeemed: ${prizeData.name}${quantity > 1 ? ` (x${quantity})` : ''}`,
        amount: -totalCost,
        date: redeemedAt,
        fulfilled: false,
        teacherId: restrictionIds[0] ?? prizeData.teacherId,
      };

      transaction.update(studentRef, { points: studentData.points - totalCost });
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
