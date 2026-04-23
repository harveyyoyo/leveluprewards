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
