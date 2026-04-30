import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
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
