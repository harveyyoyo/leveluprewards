import { doc, setDoc, updateDoc, deleteDoc, Firestore } from 'firebase/firestore';
import type { Achievement } from '../types';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { removeUndefined } from './helpers';

export const addAchievement = async (firestore: Firestore, schoolId: string, achievementData: Omit<Achievement, 'id'>) => {
  const newId = `ach_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const newAchievement: Achievement = { ...achievementData, id: newId };
  const achievementDocRef = doc(firestore, 'schools', schoolId, 'achievements', newAchievement.id);
  try {
    await setDoc(achievementDocRef, removeUndefined(newAchievement as unknown as Record<string, unknown>));
  } catch (error) {
    reportFirestorePermissionError(error, { path: achievementDocRef.path, operation: 'create', requestResourceData: newAchievement });
    throw error;
  }
};

export const updateAchievement = async (firestore: Firestore, schoolId: string, achievement: Achievement) => {
  const achievementDocRef = doc(firestore, 'schools', schoolId, 'achievements', achievement.id);
  try {
    await updateDoc(achievementDocRef, removeUndefined({ ...achievement } as unknown as Record<string, unknown>));
  } catch (error) {
    reportFirestorePermissionError(error, { path: achievementDocRef.path, operation: 'update', requestResourceData: achievement });
    throw error;
  }
};

export const deleteAchievement = async (firestore: Firestore, schoolId: string, achievementId: string) => {
  const achievementDocRef = doc(firestore, 'schools', schoolId, 'achievements', achievementId);
  try {
    await deleteDoc(achievementDocRef);
  } catch (error) {
    reportFirestorePermissionError(error, { path: achievementDocRef.path, operation: 'delete' });
    throw error;
  }
};
