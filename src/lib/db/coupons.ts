import {
  doc,
  collection,
  writeBatch,
  runTransaction,
  deleteDoc,
  Firestore,
} from 'firebase/firestore';
import type { Student, Coupon, Achievement, Category, Badge } from '../types';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { getReadableErrorMessage } from '@/lib/errorMessage';
import { removeUndefined, applyCategoryPointsByPeriod, applyAchievementsAndBadges } from './helpers';

export const addCoupons = async (firestore: Firestore, schoolId: string, newCoupons: Coupon[]) => {
  const batch = writeBatch(firestore);
  newCoupons.forEach(coupon => {
    const couponDocRef = doc(firestore, 'schools', schoolId, 'coupons', coupon.id);
    batch.set(couponDocRef, removeUndefined(coupon as unknown as Record<string, unknown>));
  });
  try {
    await batch.commit();
  } catch (error) {
    reportFirestorePermissionError(error, { path: `schools/${schoolId}/coupons`, operation: 'write' });
    throw error;
  }
};

export const deleteCoupon = async (firestore: Firestore, schoolId: string, couponId: string) => {
  const couponDocRef = doc(firestore, 'schools', schoolId, 'coupons', couponId);
  try {
    await deleteDoc(couponDocRef);
  } catch (error) {
    reportFirestorePermissionError(error, { path: couponDocRef.path, operation: 'delete' });
    throw error;
  }
};

export const redeemCoupon = async (
  firestore: Firestore,
  schoolId: string,
  studentId: string,
  couponCode: string,
  allAchievements: Achievement[] = [],
  allCategories: Category[] = [],
  allBadges: Badge[] = []
): Promise<{ success: boolean; message: string; value?: number; bonusTotal?: number }> => {
  const couponRef = doc(firestore, 'schools', schoolId, 'coupons', couponCode.toUpperCase());
  const studentRef = doc(firestore, 'schools', schoolId, 'students', studentId);

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      success: false,
      message: getReadableErrorMessage({ code: 'unavailable' }, 'Cannot reach the server.'),
    };
  }

  try {
    const result = await runTransaction(firestore, async (transaction) => {
      const couponDoc = await transaction.get(couponRef);
      if (!couponDoc.exists()) throw new Error('Coupon code not found.');

      const coupon = couponDoc.data() as Coupon;
      const nowTs = Date.now();
      if (coupon.expiresAt && nowTs > coupon.expiresAt) {
        throw new Error('This coupon has expired.');
      }
      if (coupon.used) throw new Error('This coupon has already been used.');

      const studentDoc = await transaction.get(studentRef);
      if (!studentDoc.exists()) throw new Error("Student not found.");
      const currentStudent = studentDoc.data() as Student;

      const addedValue = coupon.value;
      const newPoints = currentStudent.points + addedValue;
      const newLifetimePoints = (currentStudent.lifetimePoints || 0) + addedValue;
      const categoryPoints = { ...(currentStudent.categoryPoints || {}) };
      const categoryName = coupon.category || 'Coupon';
      categoryPoints[categoryName] = (categoryPoints[categoryName] || 0) + addedValue;

      const now = Date.now();
      const categoryPointsByPeriod = applyCategoryPointsByPeriod(
        currentStudent.categoryPointsByPeriod,
        categoryName,
        addedValue,
        now
      );

      const evalResult = applyAchievementsAndBadges(
        transaction, studentRef, currentStudent,
        newPoints, newLifetimePoints,
        categoryPoints, categoryPointsByPeriod,
        allAchievements, allCategories, allBadges,
        schoolId, studentId, firestore,
      );

      transaction.update(studentRef, {
        points: newPoints + evalResult.bonusTotal,
        lifetimePoints: newLifetimePoints + evalResult.bonusTotal,
        categoryPoints: categoryPoints,
        categoryPointsByPeriod,
        earnedAchievements: evalResult.earnedAchievements,
        earnedBadges: evalResult.earnedBadges,
      });

      // Simplified activity log.
      const activityCollectionRef = collection(firestore, 'schools', schoolId, 'students', studentId, 'activities');
      const mainActivityRef = doc(activityCollectionRef);
      transaction.set(mainActivityRef, {
        desc: `Redeemed coupon: ${coupon.code} (${coupon.category})`,
        amount: coupon.value,
        date: Date.now(),
      });

      // Mark coupon as used
      transaction.update(couponRef, {
        used: true,
        usedAt: Date.now(),
        usedBy: studentId,
      });

      return { baseValue: coupon.value, bonusTotal: evalResult.bonusTotal };
    });
    return { success: true, message: "Redeemed successfully", value: result.baseValue, bonusTotal: result.bonusTotal };
  } catch (error: unknown) {
    reportFirestorePermissionError(error, {
      path: couponRef.path,
      operation: 'write',
      requestResourceData: { studentId, couponCode },
    });
    const fallback =
      error instanceof Error && error.message.length > 0
        ? error.message
        : 'An unknown error occurred.';
    return {
      success: false,
      message: getReadableErrorMessage(error, fallback),
    };
  }
};
