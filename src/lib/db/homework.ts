import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  runTransaction,
  Firestore,
} from 'firebase/firestore';
import type { HomeworkAssignment, Achievement, Category, Badge, Student } from '../types';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { getReadableErrorMessage } from '@/lib/errorMessage';
import {
  removeUndefined,
  applyPointsByPeriod,
  applyCategoryPointsByPeriod,
  applyAchievementsAndBadges,
} from './helpers';
import { homeworkRewardCategoryKey } from '@/lib/homeworkRewards';

export const addHomeworkAssignment = async (
  firestore: Firestore,
  schoolId: string,
  assignment: Omit<HomeworkAssignment, 'id'>
) => {
  const id = Math.random().toString(36).substring(2, 11);
  const docRef = doc(firestore, 'schools', schoolId, 'homework', id);
  try {
    await setDoc(docRef, removeUndefined({ ...assignment, id } as any));
    return id;
  } catch (error) {
    reportFirestorePermissionError(error, { path: docRef.path, operation: 'create' });
    throw error;
  }
};

export const deleteHomeworkAssignment = async (
  firestore: Firestore,
  schoolId: string,
  id: string
) => {
  const docRef = doc(firestore, 'schools', schoolId, 'homework', id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    reportFirestorePermissionError(error, { path: docRef.path, operation: 'delete' });
    throw error;
  }
};

export const submitHomework = async (
  firestore: Firestore,
  schoolId: string,
  studentId: string,
  assignmentId: string
) => {
  const docRef = doc(firestore, 'schools', schoolId, 'students', studentId, 'homeworkSubmissions', assignmentId);
  try {
    await setDoc(docRef, {
      id: assignmentId,
      assignmentId,
      studentId,
      status: 'submitted',
      submissionDate: Date.now(),
    });
  } catch (error) {
    reportFirestorePermissionError(error, { path: docRef.path, operation: 'update' });
    throw error;
  }
};

export const approveHomework = async (
  firestore: Firestore,
  schoolId: string,
  studentId: string,
  assignmentId: string,
  points: number,
  title: string,
  allAchievements: Achievement[] = [],
  allCategories: Category[] = [],
  allBadges: Badge[] = []
) => {
  const studentRef = doc(firestore, 'schools', schoolId, 'students', studentId);
  const submissionRef = doc(firestore, 'schools', schoolId, 'students', studentId, 'homeworkSubmissions', assignmentId);

  try {
    let bonusTotal = 0;
    await runTransaction(firestore, async (transaction) => {
      const studentDoc = await transaction.get(studentRef);
      if (!studentDoc.exists()) throw new Error("Student not found.");
      const studentData = studentDoc.data() as Student;

      const submissionDoc = await transaction.get(submissionRef);
      if (submissionDoc.exists() && submissionDoc.data()?.status === 'completed') {
         throw new Error("Homework already completed.");
      }

      const description = homeworkRewardCategoryKey(title);
      const newPoints = studentData.points + points;
      const newLifetimePoints = (studentData.lifetimePoints || 0) + points;

      const categoryPointsUpdate = { ...studentData.categoryPoints };
      categoryPointsUpdate[description] = (categoryPointsUpdate[description] || 0) + points;

      const now = Date.now();
      const pointsByPeriodUpdate = applyPointsByPeriod(studentData.pointsByPeriod, points, now);
      const categoryPointsByPeriodUpdate = applyCategoryPointsByPeriod(studentData.categoryPointsByPeriod, description, points, now);

      const result = applyAchievementsAndBadges(
        transaction, studentRef, studentData,
        newPoints, newLifetimePoints,
        categoryPointsUpdate, categoryPointsByPeriodUpdate,
        allAchievements, allCategories, allBadges,
        schoolId, studentId, firestore,
      );
      bonusTotal = result.bonusTotal;

      transaction.update(studentRef, {
        points: newPoints + bonusTotal,
        lifetimePoints: newLifetimePoints + bonusTotal,
        categoryPoints: categoryPointsUpdate,
        pointsByPeriod: pointsByPeriodUpdate,
        categoryPointsByPeriod: categoryPointsByPeriodUpdate,
        earnedAchievements: result.earnedAchievements,
        earnedBadges: result.earnedBadges,
      });

      transaction.set(submissionRef, {
        id: assignmentId,
        assignmentId,
        studentId,
        status: 'completed',
        completedAt: now,
        pointsAwarded: points,
      }, { merge: true });

      const activityRef = doc(collection(firestore, 'schools', schoolId, 'students', studentId, 'activities'));
      transaction.set(activityRef, { desc: description, amount: points, date: now });
    });

    void import('@/lib/goalsProgress').then((m) =>
      m.syncGoalsForStudent(firestore, schoolId, studentId).catch(() => {}),
    );

    return { success: true, message: bonusTotal > 0 ? `Approved! Unlocked ${bonusTotal} bonus points.` : "Approved successfully.", bonusTotal };
  } catch (error) {
    const fallback = (error instanceof Error && error.message) || 'An unknown error occurred.';
    return { success: false, message: getReadableErrorMessage(error, fallback) };
  }
};
