import { doc, setDoc, updateDoc, deleteDoc, Firestore } from 'firebase/firestore';
import type { BonusSpinType } from '../types';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { removeUndefined } from './helpers';

export const addBonusSpinType = async (
  firestore: Firestore,
  schoolId: string,
  data: Omit<BonusSpinType, 'id'>
) => {
  const newId = `spin_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const spinType: BonusSpinType = { ...data, id: newId };
  const ref = doc(firestore, 'schools', schoolId, 'bonusSpinTypes', spinType.id);
  try {
    await setDoc(ref, removeUndefined(spinType as unknown as Record<string, unknown>));
  } catch (error) {
    reportFirestorePermissionError(error, { path: ref.path, operation: 'create', requestResourceData: spinType });
    throw error;
  }
  return newId;
};

export const updateBonusSpinType = async (firestore: Firestore, schoolId: string, spinType: BonusSpinType) => {
  const ref = doc(firestore, 'schools', schoolId, 'bonusSpinTypes', spinType.id);
  try {
    await updateDoc(ref, removeUndefined({ ...spinType } as unknown as Record<string, unknown>));
  } catch (error) {
    reportFirestorePermissionError(error, { path: ref.path, operation: 'update', requestResourceData: spinType });
    throw error;
  }
};

export const deleteBonusSpinType = async (firestore: Firestore, schoolId: string, spinTypeId: string) => {
  const ref = doc(firestore, 'schools', schoolId, 'bonusSpinTypes', spinTypeId);
  try {
    await deleteDoc(ref);
  } catch (error) {
    reportFirestorePermissionError(error, { path: ref.path, operation: 'delete' });
    throw error;
  }
};
