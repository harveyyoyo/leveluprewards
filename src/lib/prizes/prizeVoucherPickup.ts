import {
  collection,
  doc,
  getDoc,
  runTransaction,
  type Firestore,
} from 'firebase/firestore';

import type { HistoryItem, Prize } from '@/lib/types';
import { removeUndefined } from '@/lib/db/helpers';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { prizeRestrictionTeacherIds } from '@/lib/prizes/prizeUtils';
import {
  generatePrizeVoucherScanCode,
  isPrizeVoucherScanCode,
  normalizePrizeVoucherScanCode,
} from '@/lib/prizes/prizeVoucherScanCode';

export type PrizeVoucherLookup = {
  voucherScanCode: string;
  studentId: string;
  activityId: string;
  prizeId: string;
  prizeName: string;
  quantity: number;
  redeemedAt: number;
  fulfilled: boolean;
};

export async function lookupPrizeVoucherByScanCode(
  firestore: Firestore,
  schoolId: string,
  rawCode: string,
): Promise<PrizeVoucherLookup | null> {
  if (!schoolId?.trim()) return null;
  const code = normalizePrizeVoucherScanCode(rawCode);
  if (!isPrizeVoucherScanCode(code)) return null;

  const ref = doc(firestore, 'schools', schoolId, 'prizeVoucherByCode', code);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as Partial<PrizeVoucherLookup>;
  if (
    typeof data.studentId !== 'string' ||
    typeof data.activityId !== 'string' ||
    typeof data.prizeId !== 'string'
  ) {
    return null;
  }
  return {
    voucherScanCode: code,
    studentId: data.studentId,
    activityId: data.activityId,
    prizeId: data.prizeId,
    prizeName: typeof data.prizeName === 'string' ? data.prizeName : 'Prize',
    quantity: typeof data.quantity === 'number' && data.quantity > 0 ? Math.floor(data.quantity) : 1,
    redeemedAt: typeof data.redeemedAt === 'number' ? data.redeemedAt : 0,
    fulfilled: data.fulfilled === true,
  };
}

/** Redeem points and issue an unfulfilled pickup voucher (barcode for a separate kiosk). */
export async function redeemPrizeWithPickupVoucher(
  firestore: Firestore,
  schoolId: string,
  studentId: string,
  prize: Prize,
  quantity: number,
): Promise<{
  success: boolean;
  activityId: string;
  redeemedAt: number;
  totalCost: number;
  voucherScanCode: string;
}> {
  const studentRef = doc(firestore, 'schools', schoolId, 'students', studentId);
  const prizeRef = doc(firestore, 'schools', schoolId, 'prizes', prize.id);
  const activityRef = doc(collection(firestore, 'schools', schoolId, 'students', studentId, 'activities'));
  const redeemedAt = Date.now();

  let voucherScanCode = '';
  try {
    await runTransaction(firestore, async (transaction) => {
      const [studentDoc, prizeDoc] = await Promise.all([
        transaction.get(studentRef),
        transaction.get(prizeRef),
      ]);

      if (!studentDoc.exists()) throw new Error('Student not found.');
      if (!prizeDoc.exists()) throw new Error('Reward item not found.');

      const studentData = studentDoc.data();
      const prizeData = prizeDoc.data() as Prize;
      const totalCost = prizeData.points * quantity;

      if (!prizeData.inStock) throw new Error('This reward item is not available.');
      if (typeof prizeData.stockCount === 'number' && prizeData.stockCount < quantity) {
        throw new Error('Not enough items in stock for that quantity.');
      }
      if ((studentData.points ?? 0) < totalCost) throw new Error('Not enough points.');

      voucherScanCode = generatePrizeVoucherScanCode();
      const lookupRef = doc(firestore, 'schools', schoolId, 'prizeVoucherByCode', voucherScanCode);
      const restrictionIds = prizeRestrictionTeacherIds(prizeData);
      const activity: Omit<HistoryItem, 'id'> & {
        voucherScanCode: string;
        prizeId: string;
        pickupVoucher: boolean;
      } = {
        desc: `Redeemed: ${prizeData.name}${quantity > 1 ? ` (x${quantity})` : ''} (pickup voucher)`,
        amount: -totalCost,
        date: redeemedAt,
        fulfilled: false,
        pickupVoucher: true,
        voucherScanCode,
        prizeId: prize.id,
        teacherId: restrictionIds[0] ?? prizeData.teacherId,
      };

      transaction.update(studentRef, {
        points: (studentData.points ?? 0) - totalCost,
        updatedAt: redeemedAt,
      });
      transaction.set(activityRef, removeUndefined(activity as unknown as Record<string, unknown>));
      transaction.set(lookupRef, {
        voucherScanCode,
        studentId,
        activityId: activityRef.id,
        prizeId: prize.id,
        prizeName: prizeData.name || 'Prize',
        quantity,
        redeemedAt,
        fulfilled: false,
      });

      if (typeof prizeData.stockCount === 'number') {
        const nextStock = prizeData.stockCount - quantity;
        transaction.update(prizeRef, {
          stockCount: Math.max(0, nextStock),
          inStock: nextStock > 0,
        });
      }
    });
  } catch (e) {
    reportFirestorePermissionError(e, {
      path: studentRef.path,
      operation: 'update',
      requestResourceData: { prizeId: prize.id, quantity, pickupVoucher: true },
    });
    throw e;
  }

  void import('@/lib/goalsProgress').then((m) =>
    m.syncGoalsForStudent(firestore, schoolId, studentId).catch(() => {}),
  );

  return {
    success: true,
    activityId: activityRef.id,
    redeemedAt,
    totalCost: prize.points * quantity,
    voucherScanCode,
  };
}

export type FulfillPrizeVoucherResult =
  | { status: 'fulfilled'; lookup: PrizeVoucherLookup; prize: Prize | null }
  | { status: 'already_fulfilled'; lookup: PrizeVoucherLookup }
  | { status: 'not_found' }
  | { status: 'wrong_student'; lookup: PrizeVoucherLookup };

/** Scan printed voucher at pickup kiosk; marks activity fulfilled. */
export async function fulfillPrizeVoucherByScanCode(
  firestore: Firestore,
  schoolId: string,
  rawCode: string,
  options?: { expectedStudentId?: string },
): Promise<FulfillPrizeVoucherResult> {
  const lookup = await lookupPrizeVoucherByScanCode(firestore, schoolId, rawCode);
  if (!lookup) return { status: 'not_found' };

  if (options?.expectedStudentId && lookup.studentId !== options.expectedStudentId) {
    return { status: 'wrong_student', lookup };
  }

  if (lookup.fulfilled) {
    return { status: 'already_fulfilled', lookup };
  }

  const activityRef = doc(
    firestore,
    'schools',
    schoolId,
    'students',
    lookup.studentId,
    'activities',
    lookup.activityId,
  );
  const lookupRef = doc(firestore, 'schools', schoolId, 'prizeVoucherByCode', lookup.voucherScanCode);
  const prizeRef = doc(firestore, 'schools', schoolId, 'prizes', lookup.prizeId);

  try {
    await runTransaction(firestore, async (transaction) => {
      const lookupSnap = await transaction.get(lookupRef);
      if (!lookupSnap.exists()) throw new Error('Voucher not found.');
      if (lookupSnap.data()?.fulfilled === true) return;
      transaction.update(activityRef, { fulfilled: true });
      transaction.update(lookupRef, { fulfilled: true });
    });
  } catch (e) {
    reportFirestorePermissionError(e, {
      path: activityRef.path,
      operation: 'update',
      requestResourceData: { fulfilled: true },
    });
    throw e;
  }

  let prize: Prize | null = null;
  try {
    const prizeSnap = await getDoc(prizeRef);
    if (prizeSnap.exists()) {
      prize = { ...(prizeSnap.data() as Prize), id: prizeSnap.id };
    }
  } catch {
    // optional for vending hints
  }

  return {
    status: 'fulfilled',
    lookup: { ...lookup, fulfilled: true },
    prize,
  };
}
