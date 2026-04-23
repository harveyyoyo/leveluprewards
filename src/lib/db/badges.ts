import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
  Firestore,
} from 'firebase/firestore';
import type { Badge, Category, Student } from '../types';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { removeUndefined, evaluateBadges } from './helpers';

export const addBadge = async (firestore: Firestore, schoolId: string, badgeData: Omit<Badge, 'id'>) => {
  const newId = `badge_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const newBadge: Badge = { ...badgeData, id: newId, enabled: badgeData.enabled ?? true };
  const badgeDocRef = doc(firestore, 'schools', schoolId, 'badges', newBadge.id);
  try {
    await setDoc(badgeDocRef, removeUndefined(newBadge as unknown as Record<string, unknown>));

    // After creating a new badge, retro-apply it to all students who already qualify.
    const studentsSnap = await getDocs(collection(firestore, 'schools', schoolId, 'students'));
    if (!studentsSnap.empty) {
      const categoriesSnap = await getDocs(collection(firestore, 'schools', schoolId, 'categories'));
      const categories = categoriesSnap.docs.map(d => d.data() as Category);

      const BATCH_LIMIT = 450;
      let batch = writeBatch(firestore);
      let writeCount = 0;

      for (const studentDoc of studentsSnap.docs) {
        const studentData = studentDoc.data() as Student;
        const newEarned = evaluateBadges(studentData, [newBadge], categories);
        if (!newEarned.length) continue;

        const earnedBadges = [...(studentData.earnedBadges || [])];
        for (const b of newEarned) {
          earnedBadges.push({ badgeId: b.badgeId, periodKey: b.periodKey, earnedAt: b.earnedAt });
          const badgeActivityRef = doc(collection(studentDoc.ref, 'activities'));
          batch.set(badgeActivityRef, {
            desc: `Badge earned: ${newBadge.name}`,
            amount: 0,
            date: b.earnedAt,
          });
          writeCount += 2;
        }

        batch.update(studentDoc.ref, { earnedBadges });
        writeCount += 1;

        if (writeCount >= BATCH_LIMIT) {
          await batch.commit();
          batch = writeBatch(firestore);
          writeCount = 0;
        }
      }

      if (writeCount > 0) {
        await batch.commit();
      }
    }
  } catch (error) {
    reportFirestorePermissionError(error, { path: badgeDocRef.path, operation: 'create', requestResourceData: newBadge });
    throw error;
  }
};

export const updateBadge = async (firestore: Firestore, schoolId: string, badge: Badge) => {
  const badgeDocRef = doc(firestore, 'schools', schoolId, 'badges', badge.id);
  try {
    await updateDoc(badgeDocRef, removeUndefined({ ...badge } as unknown as Record<string, unknown>));
  } catch (error) {
    reportFirestorePermissionError(error, { path: badgeDocRef.path, operation: 'update', requestResourceData: badge });
    throw error;
  }
};

export const deleteBadge = async (firestore: Firestore, schoolId: string, badgeId: string) => {
  const badgeDocRef = doc(firestore, 'schools', schoolId, 'badges', badgeId);
  try {
    await deleteDoc(badgeDocRef);
  } catch (error) {
    reportFirestorePermissionError(error, { path: badgeDocRef.path, operation: 'delete' });
    throw error;
  }
};
