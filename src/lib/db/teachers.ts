import { doc, setDoc, updateDoc, deleteDoc, Firestore } from 'firebase/firestore';
import type { Teacher } from '../types';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { removeUndefined } from './helpers';

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

export const updateTeacher = async (firestore: Firestore, schoolId: string, updatedTeacher: Teacher) => {
  const teacherDocRef = doc(firestore, 'schools', schoolId, 'teachers', updatedTeacher.id);
  try {
    await updateDoc(teacherDocRef, removeUndefined({ ...updatedTeacher } as unknown as Record<string, unknown>));
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
