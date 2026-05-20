import {
  collection,
  doc,
  getDocs,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type { Class, Student } from '@/lib/types';
import type { OfficeClass, OfficeStudent } from '@/lib/office/types';

export type ImportRewardsRosterResult = {
  students: number;
  classes: number;
};

/**
 * One-time snapshot from rewards roster into office collections.
 * Does not keep syncing — office data stays separate after import.
 */
export async function importRewardsRosterToOffice(
  firestore: Firestore,
  schoolId: string,
): Promise<ImportRewardsRosterResult> {
  const school = schoolId.trim().toLowerCase();
  const now = Date.now();

  const [classSnap, studentSnap] = await Promise.all([
    getDocs(collection(firestore, 'schools', school, 'classes')),
    getDocs(collection(firestore, 'schools', school, 'students')),
  ]);

  const batch = writeBatch(firestore);
  let classes = 0;
  let students = 0;

  for (const classDoc of classSnap.docs) {
    const data = classDoc.data() as Class;
    const payload: Omit<OfficeClass, 'id'> = {
      name: data.name?.trim() || 'Class',
      updatedAt: now,
    };
    batch.set(doc(firestore, 'schools', school, 'officeClasses', classDoc.id), payload);
    classes += 1;
  }

  for (const studentDoc of studentSnap.docs) {
    const data = studentDoc.data() as Student;
    const payload: Omit<OfficeStudent, 'id'> = {
      firstName: data.firstName?.trim() || 'Student',
      lastName: data.lastName?.trim() || '',
      nickname: data.nickname?.trim() || null,
      classId: data.classId ?? null,
      teacherName: null,
      notes: null,
      updatedAt: now,
    };
    batch.set(doc(firestore, 'schools', school, 'officeStudents', studentDoc.id), payload);
    students += 1;
  }

  await batch.commit();
  return { students, classes };
}
