import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Firestore,
} from 'firebase/firestore';
import type { Class, Student } from '../types';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { removeUndefined } from './helpers';

export const addClass = async (firestore: Firestore, schoolId: string, classData: Omit<Class, 'id'>) => {
  const newId = `c_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const newClass: Class = { ...classData, id: newId };
  const classDocRef = doc(firestore, 'schools', schoolId, 'classes', newClass.id);
  try {
    await setDoc(classDocRef, removeUndefined(newClass as unknown as Record<string, unknown>));
  } catch (error) {
    reportFirestorePermissionError(error, { path: classDocRef.path, operation: 'create', requestResourceData: newClass });
    throw error;
  }
};

export const updateClass = async (firestore: Firestore, schoolId: string, updatedClass: Class) => {
  const classDocRef = doc(firestore, 'schools', schoolId, 'classes', updatedClass.id);
  try {
    await updateDoc(classDocRef, removeUndefined({ ...updatedClass } as unknown as Record<string, unknown>));
  } catch (error) {
    reportFirestorePermissionError(error, { path: classDocRef.path, operation: 'update', requestResourceData: updatedClass });
    throw error;
  }
};

export const deleteClass = async (firestore: Firestore, schoolId: string, classId: string, students: Student[]) => {
  const batch = writeBatch(firestore);

  const studentsToUpdate = students.filter(s => s.classId === classId);
  studentsToUpdate.forEach(student => {
    const studentRef = doc(firestore, 'schools', schoolId, 'students', student.id);
    batch.update(studentRef, { classId: '' });
  });

  const classRef = doc(firestore, 'schools', schoolId, 'classes', classId);
  batch.delete(classRef);

  try {
    await batch.commit();
  } catch (error) {
    reportFirestorePermissionError(error, { path: `schools/${schoolId}/classes`, operation: 'write' });
    throw error;
  }
};

/** Import class groups from CSV: one column `Class Name` (header optional) or a single name per line. Skips duplicates (case-insensitive). */
export const uploadClassesFromCsv = async (
  firestore: Firestore,
  schoolId: string,
  csvContent: string,
  currentClasses: Class[],
): Promise<{ success: number; failed: number; errors: string[] }> => {
  const lines = csvContent.replace(/\r\n/g, '\n').split('\n').filter((line) => line.trim() !== '');
  const errors: string[] = [];

  if (lines.length === 0) {
    return { success: 0, failed: 0, errors: ['File is empty.'] };
  }

  const existingLower = new Set(currentClasses.map((c) => c.name.trim().toLowerCase()));
  let dataLines = lines;
  const head = lines[0].toLowerCase();
  const headerStripped = head.includes('class') && head.includes('name');
  if (headerStripped) {
    dataLines = lines.slice(1);
  }

  const classesToCreate: Class[] = [];
  const seenInFile = new Set<string>();

  dataLines.forEach((row, index) => {
    const rowLabel = headerStripped ? index + 2 : index + 1;
    if (!row.trim()) return;
    const delimiter = row.includes(';') ? ';' : ',';
    const values = row.split(delimiter).map((v) => v.trim().replace(/^"|"$/g, ''));
    const name = (values[0] || '').trim();
    if (!name) {
      errors.push(`Row ${rowLabel}: Missing class name.`);
      return;
    }
    const key = name.toLowerCase();
    if (existingLower.has(key) || seenInFile.has(key)) {
      return;
    }
    seenInFile.add(key);
    existingLower.add(key);
    const newId = `c_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`;
    classesToCreate.push({ id: newId, name });
  });

  if (classesToCreate.length > 0) {
    const BATCH_LIMIT = 499;
    try {
      for (let i = 0; i < classesToCreate.length; i += BATCH_LIMIT) {
        const chunk = classesToCreate.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(firestore);
        for (const c of chunk) {
          const ref = doc(firestore, 'schools', schoolId, 'classes', c.id);
          batch.set(ref, removeUndefined(c as unknown as Record<string, unknown>));
        }
        await batch.commit();
      }
    } catch (error) {
      reportFirestorePermissionError(error, {
        path: `schools/${schoolId}/classes`,
        operation: 'write',
      });
      throw error;
    }
  }

  const successCount = classesToCreate.length;
  const nonemptyLines = dataLines.filter((r) => r.trim()).length;
  const failedCount = nonemptyLines - successCount;
  return { success: successCount, failed: failedCount, errors };
};
