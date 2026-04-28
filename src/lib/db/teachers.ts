import { doc, setDoc, updateDoc, deleteDoc, deleteField, Firestore, writeBatch } from 'firebase/firestore';
import type { Teacher } from '../types';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { removeUndefined } from './helpers';

export type UpdateTeacherOptions = { clearTeacherBudget?: boolean };

export const addTeacher = async (firestore: Firestore, schoolId: string, teacherData: Omit<Teacher, 'id'>) => {
  const newId = `t_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const newTeacher: Teacher = { ...teacherData, id: newId };
  const teacherDocRef = doc(firestore, 'schools', schoolId, 'teachers', newTeacher.id);
  try {
    await setDoc(teacherDocRef, removeUndefined(newTeacher as unknown as Record<string, unknown>));
  } catch (error) {
    reportFirestorePermissionError(error, { path: teacherDocRef.path, operation: 'create', requestResourceData: newTeacher });
    throw error;
  }
};

export const updateTeacher = async (
  firestore: Firestore,
  schoolId: string,
  updatedTeacher: Teacher,
  options?: UpdateTeacherOptions,
) => {
  const teacherDocRef = doc(firestore, 'schools', schoolId, 'teachers', updatedTeacher.id);
  const payload: Record<string, unknown> = { ...updatedTeacher };
  if (options?.clearTeacherBudget) {
    payload.monthlyBudget = deleteField();
    payload.budgetPeriod = deleteField();
    payload.budgetWindowKey = deleteField();
    payload.spentThisMonth = deleteField();
  }
  try {
    await updateDoc(teacherDocRef, removeUndefined(payload as unknown as Record<string, unknown>));
  } catch (error) {
    reportFirestorePermissionError(error, { path: teacherDocRef.path, operation: 'update', requestResourceData: updatedTeacher });
    throw error;
  }
};

export const deleteTeacher = async (firestore: Firestore, schoolId: string, teacherId: string) => {
  const teacherDocRef = doc(firestore, 'schools', schoolId, 'teachers', teacherId);
  try {
    await deleteDoc(teacherDocRef);
  } catch (error) {
    reportFirestorePermissionError(error, { path: teacherDocRef.path, operation: 'delete' });
    throw error;
  }
};

function slugifyUsername(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24);
  return base || 'teacher';
}

function allocateUsername(base: string, taken: Set<string>): string {
  let candidate = base.toLowerCase().slice(0, 24);
  let n = 2;
  while (taken.has(candidate)) {
    const suffix = String(n++);
    candidate = `${base.toLowerCase().slice(0, Math.max(1, 24 - suffix.length))}${suffix}`;
  }
  taken.add(candidate);
  return candidate;
}

/** Import teachers from CSV: Full Name, Username, Passcode (header optional). Username and passcode are generated when omitted; usernames must stay unique. */
export const uploadTeachersFromCsv = async (
  firestore: Firestore,
  schoolId: string,
  csvContent: string,
  currentTeachers: Teacher[],
): Promise<{ success: number; failed: number; errors: string[] }> => {
  const lines = csvContent.replace(/\r\n/g, '\n').split('\n').filter((line) => line.trim() !== '');
  const errors: string[] = [];

  if (lines.length === 0) {
    return { success: 0, failed: 0, errors: ['File is empty.'] };
  }

  const takenLower = new Set(
    currentTeachers
      .map((t) => (t.username || '').trim().toLowerCase())
      .filter(Boolean),
  );

  let dataLines = lines;
  const head = lines[0].toLowerCase();
  const headerStripped =
    head.includes('name') && (head.includes('user') || head.includes('login') || head.includes('pass'));
  if (headerStripped) {
    dataLines = lines.slice(1);
  }

  const teachersToCreate: Teacher[] = [];

  dataLines.forEach((row, index) => {
    const rowLabel = headerStripped ? index + 2 : index + 1;
    if (!row.trim()) return;
    const delimiter = row.includes(';') ? ';' : ',';
    const values = row.split(delimiter).map((v) => v.trim().replace(/^"|"$/g, ''));
    const fullName = (values[0] || '').trim();
    let username = (values[1] || '').trim();
    let passcode = (values[2] || '').trim();

    if (!fullName) {
      errors.push(`Row ${rowLabel}: Missing full name.`);
      return;
    }

    if (!username) {
      const base = slugifyUsername(fullName);
      username = allocateUsername(base, takenLower);
    } else {
      const key = username.toLowerCase();
      if (takenLower.has(key)) {
        errors.push(`Row ${rowLabel}: Username "${username}" is already in use.`);
        return;
      }
      takenLower.add(key);
    }

    if (!passcode) {
      passcode = String(Math.floor(1000 + Math.random() * 9000));
    }

    const newId = `t_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`;
    teachersToCreate.push({
      id: newId,
      name: fullName,
      username,
      passcode,
    });
  });

  if (teachersToCreate.length > 0) {
    const BATCH_LIMIT = 499;
    try {
      for (let i = 0; i < teachersToCreate.length; i += BATCH_LIMIT) {
        const chunk = teachersToCreate.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(firestore);
        for (const t of chunk) {
          const teacherDocRef = doc(firestore, 'schools', schoolId, 'teachers', t.id);
          batch.set(teacherDocRef, removeUndefined(t as unknown as Record<string, unknown>));
        }
        await batch.commit();
      }
    } catch (error) {
      reportFirestorePermissionError(error, {
        path: `schools/${schoolId}/teachers`,
        operation: 'write',
      });
      throw error;
    }
  }

  const successCount = teachersToCreate.length;
  const nonemptyLines = dataLines.filter((r) => r.trim()).length;
  const failedCount = nonemptyLines - successCount;
  return { success: successCount, failed: failedCount, errors };
};
