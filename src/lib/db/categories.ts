import { doc, setDoc, updateDoc, deleteDoc, Firestore } from 'firebase/firestore';
import type { Category, CategoryRubricLevel } from '../types';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { removeUndefined } from './helpers';
import { getRandomColor } from '../utils';

export const addCategory = async (
  firestore: Firestore,
  schoolId: string,
  categoryData: { name: string; points: number; color?: string; teacherId?: string; rubricLevels?: CategoryRubricLevel[] },
): Promise<Category> => {
  const newId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const newCategory: Category = { ...categoryData, id: newId, color: categoryData.color || getRandomColor() };
  const categoryDocRef = doc(firestore, 'schools', schoolId, 'categories', newCategory.id);
  try {
    await setDoc(categoryDocRef, removeUndefined(newCategory as unknown as Record<string, unknown>));
  } catch (error) {
    reportFirestorePermissionError(error, { path: categoryDocRef.path, operation: 'create', requestResourceData: newCategory });
    throw error;
  }
  return newCategory;
};

export const updateCategory = async (firestore: Firestore, schoolId: string, updatedCategory: Category) => {
  const categoryDocRef = doc(firestore, 'schools', schoolId, 'categories', updatedCategory.id);
  try {
    await updateDoc(categoryDocRef, removeUndefined({ ...updatedCategory } as unknown as Record<string, unknown>));
  } catch (error) {
    reportFirestorePermissionError(error, { path: categoryDocRef.path, operation: 'update', requestResourceData: updatedCategory });
    throw error;
  }
};

export const deleteCategory = async (firestore: Firestore, schoolId: string, categoryId: string) => {
  const categoryDocRef = doc(firestore, 'schools', schoolId, 'categories', categoryId);
  try {
    await deleteDoc(categoryDocRef);
  } catch (error) {
    reportFirestorePermissionError(error, { path: categoryDocRef.path, operation: 'delete' });
    throw error;
  }
};
