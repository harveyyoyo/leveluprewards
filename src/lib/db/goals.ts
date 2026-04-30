import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  Firestore,
  type DocumentData,
} from 'firebase/firestore';
import type { Goal } from '../types';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { removeUndefined } from './helpers';

/** Create a new goal for a student or class. */
export const addGoal = async (
  firestore: Firestore,
  schoolId: string,
  goalData: Omit<Goal, 'id' | 'createdAt' | 'status'>
) => {
  const goalRef = doc(collection(firestore, 'schools', schoolId, 'goals'));
  const newGoal: Goal = {
    ...goalData,
    id: goalRef.id,
    createdAt: Date.now(),
    status: 'active',
  };

  try {
    await setDoc(goalRef, removeUndefined(newGoal as unknown as Record<string, unknown>));
  } catch (error) {
    reportFirestorePermissionError(error, {
      path: goalRef.path,
      operation: 'create',
      requestResourceData: newGoal,
    });
    throw error;
  }
  return newGoal.id;
};

/** Update an existing goal's details or status. */
export const updateGoal = async (
  firestore: Firestore,
  schoolId: string,
  goalId: string,
  updates: Partial<Goal>
) => {
  const goalRef = doc(firestore, 'schools', schoolId, 'goals', goalId);
  try {
    await updateDoc(goalRef, removeUndefined(updates as unknown as Record<string, unknown>) as DocumentData);
  } catch (error) {
    reportFirestorePermissionError(error, {
      path: goalRef.path,
      operation: 'update',
      requestResourceData: updates,
    });
    throw error;
  }
};

/** List all goals for a school (small/medium lists; client-filter as needed). */
export const fetchGoals = async (firestore: Firestore, schoolId: string): Promise<Goal[]> => {
  const snap = await getDocs(collection(firestore, 'schools', schoolId, 'goals'));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Goal))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
};

/** Delete a goal. */
export const deleteGoal = async (
  firestore: Firestore,
  schoolId: string,
  goalId: string
) => {
  const goalRef = doc(firestore, 'schools', schoolId, 'goals', goalId);
  try {
    await deleteDoc(goalRef);
  } catch (error) {
    reportFirestorePermissionError(error, {
      path: goalRef.path,
      operation: 'delete',
    });
    throw error;
  }
};
