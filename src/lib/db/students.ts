import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  writeBatch,
  runTransaction,
  getDoc,
  getDocs,
  Firestore,
  type DocumentData,
  type DocumentReference,
} from 'firebase/firestore';
import type { Student, Class, Achievement, Category, Badge, HistoryItem } from '../types';
import { reportFirestorePermissionError } from '@/firebase/error-emitter';
import { getReadableErrorMessage } from '@/lib/errorMessage';
import {
  removeUndefined,
  evaluateAchievements,
  evaluateBadges,
  applyCategoryPointsByPeriod,
  applyAchievementsAndBadges,
} from './helpers';

export { lookupStudentId } from './lookup';

// --- Student Mutations ---
export const addStudent = async (firestore: Firestore, schoolId: string, studentData: Omit<Student, 'id' | 'points' | 'lifetimePoints'>) => {
  const newStudentId = Math.floor(10000000 + Math.random() * 90000000).toString();
  const newStudent: Student = {
    ...studentData,
    id: newStudentId,
    nfcId: studentData.nfcId || newStudentId,
    createdAt: Date.now(),
    points: 0,
    lifetimePoints: 0,
    categoryPoints: {},
    categoryPointsByPeriod: {},
    earnedAchievements: [],
    earnedBadges: [],
  };
  const studentDocRef = doc(firestore, 'schools', schoolId, 'students', newStudent.id);
  try {
    await setDoc(studentDocRef, removeUndefined(newStudent as unknown as Record<string, unknown>));
  } catch (error) {
    reportFirestorePermissionError(error, {
      path: studentDocRef.path,
      operation: 'create',
      requestResourceData: newStudent,
    });
    throw error;
  }
};


export const updateStudent = async (firestore: Firestore, schoolId: string, student: Student) => {
  const studentDocRef = doc(firestore, 'schools', schoolId, 'students', student.id);

  try {
    await runTransaction(firestore, async (transaction) => {
      const studentDoc = await transaction.get(studentDocRef);
      if (!studentDoc.exists()) {
        throw new Error("Student not found");
      }
      const oldStudent = studentDoc.data() as Student;

      const pointsDifference = student.points - oldStudent.points;

      const newLifetimePoints = (oldStudent.lifetimePoints || oldStudent.points) + (pointsDifference > 0 ? pointsDifference : 0);

      const finalStudentData = { ...student, lifetimePoints: newLifetimePoints };

      transaction.update(studentDocRef, removeUndefined(finalStudentData as unknown as Record<string, unknown>));
    });
  } catch (error) {
    reportFirestorePermissionError(error, {
      path: studentDocRef.path,
      operation: 'update',
      requestResourceData: student,
    });
    throw error;
  }
};

export const deleteStudent = async (firestore: Firestore, schoolId: string, studentId: string) => {
  const studentDocRef = doc(firestore, 'schools', schoolId, 'students', studentId);
  try {
    await deleteDoc(studentDocRef);
  } catch (error) {
    reportFirestorePermissionError(error, {
      path: studentDocRef.path,
      operation: 'delete',
    });
    throw error;
  }
};

export const awardPointsToStudent = async (
  firestore: Firestore,
  schoolId: string,
  studentId: string,
  points: number,
  description: string,
  allAchievements: Achievement[] = [],
  allCategories: Category[] = [],
  allBadges: Badge[] = []
): Promise<{ success: boolean; message: string; bonusTotal?: number }> => {
  if (points <= 0) {
    return { success: false, message: "Points must be a positive number." };
  }
  const studentRef = doc(firestore, 'schools', schoolId, 'students', studentId);

  try {
    let bonusTotal = 0;
    await runTransaction(firestore, async (transaction) => {
      const studentDoc = await transaction.get(studentRef);
      if (!studentDoc.exists()) {
        throw new Error("Student not found.");
      }
      const studentData = studentDoc.data() as Student;

      const newPoints = studentData.points + points;
      const newLifetimePoints = (studentData.lifetimePoints || 0) + points;

      const categoryPointsUpdate = { ...studentData.categoryPoints };
      categoryPointsUpdate[description] = (categoryPointsUpdate[description] || 0) + points;

      const now = Date.now();
      const categoryPointsByPeriodUpdate = applyCategoryPointsByPeriod(
        studentData.categoryPointsByPeriod,
        description,
        points,
        now
      );

      const result = applyAchievementsAndBadges(
        transaction, studentRef, studentData,
        newPoints, newLifetimePoints,
        categoryPointsUpdate, categoryPointsByPeriodUpdate,
        allAchievements, allCategories, allBadges,
        schoolId, studentId, firestore,
      );
      bonusTotal = result.bonusTotal;

      transaction.update(studentRef, {
        points: newPoints + bonusTotal,
        lifetimePoints: newLifetimePoints + bonusTotal,
        categoryPoints: categoryPointsUpdate,
        categoryPointsByPeriod: categoryPointsByPeriodUpdate,
        earnedAchievements: result.earnedAchievements,
        earnedBadges: result.earnedBadges,
      });

      const activityRef = doc(collection(firestore, 'schools', schoolId, 'students', studentId, 'activities'));
      transaction.set(activityRef, { desc: description, amount: points, date: Date.now() });
    });

    return { success: true, message: bonusTotal > 0 ? `Points awarded! Unlocked ${bonusTotal} bonus points from achievements.` : "Points awarded successfully.", bonusTotal };
  } catch (error: unknown) {
    reportFirestorePermissionError(error, {
      path: studentRef.path,
      operation: 'update',
      requestResourceData: { studentId, points, description },
    });
    const fallback = (error instanceof Error && error.message) || 'An unknown error occurred.';
    return { success: false, message: getReadableErrorMessage(error, fallback) };
  }
};

export const awardPointsToMultipleStudents = async (
  firestore: Firestore,
  schoolId: string,
  studentIds: string[],
  points: number,
  description: string,
  allAchievements: Achievement[] = [],
  allCategories: Category[] = [],
  allBadges: Badge[] = []
): Promise<{ success: boolean; message: string; count: number }> => {
  if (points <= 0) {
    return { success: false, message: "Points must be a positive number.", count: 0 };
  }
  if (!studentIds || studentIds.length === 0) {
    return { success: false, message: "No students selected.", count: 0 };
  }

  try {
    const studentRefs = studentIds.map(id => doc(firestore, 'schools', schoolId, 'students', id));
    const studentDocs = await Promise.all(studentRefs.map(ref => getDoc(ref)));

    // Collect all write operations so we can chunk them.
    type WriteOp = {
      ref: DocumentReference;
      type: 'update' | 'set';
      data: DocumentData;
    };
    const allOps: WriteOp[] = [];
    let processedCount = 0;

    for (const studentDoc of studentDocs) {
      if (!studentDoc.exists()) continue;

      const studentData = studentDoc.data() as Student;

      const newPoints = studentData.points + points;
      const newLifetimePoints = (studentData.lifetimePoints || 0) + points;

      const categoryPointsUpdate = { ...studentData.categoryPoints };
      categoryPointsUpdate[description] = (categoryPointsUpdate[description] || 0) + points;

      const now = Date.now();
      const categoryPointsByPeriodUpdate = applyCategoryPointsByPeriod(
        studentData.categoryPointsByPeriod,
        description,
        points,
        now
      );
      const updatedStudentForBadges: Student = {
        ...studentData,
        categoryPoints: categoryPointsUpdate,
        categoryPointsByPeriod: categoryPointsByPeriodUpdate,
      };
      const newBadges = evaluateBadges(updatedStudentForBadges, allBadges, allCategories);
      const earnedBadges = [...(studentData.earnedBadges || [])];
      for (const b of newBadges) {
        earnedBadges.push({ badgeId: b.badgeId, periodKey: b.periodKey, earnedAt: b.earnedAt });
        const badgeInfo = allBadges.find(x => x.id === b.badgeId);
        const badgeActivityRef = doc(collection(studentDoc.ref, 'activities'));
        allOps.push({
          ref: badgeActivityRef, type: 'set', data: {
            desc: `Badge earned: ${badgeInfo?.name || 'Unknown'}`,
            amount: 0, date: b.earnedAt,
          },
        });
      }

      // Evaluate achievements
      const updatedStudentForEval: Student = {
        ...studentData,
        points: newPoints,
        lifetimePoints: newLifetimePoints,
        categoryPoints: categoryPointsUpdate
      };

      const newAchievements = evaluateAchievements(updatedStudentForEval, allAchievements, allCategories);
      const earnedAchievements = [...(studentData.earnedAchievements || [])];
      let bonusTotal = 0;

      for (const ach of newAchievements) {
        earnedAchievements.push({ achievementId: ach.achievementId, earnedAt: ach.earnedAt });
        bonusTotal += ach.bonusPoints;

        const achInfo = allAchievements.find(a => a.id === ach.achievementId);
        const achievementActivityRef = doc(collection(studentDoc.ref, 'activities'));
        allOps.push({
          ref: achievementActivityRef, type: 'set', data: {
            desc: `Achievement Unlocked: ${achInfo?.name || 'Unknown'}`,
            amount: ach.bonusPoints, date: Date.now(),
          },
        });
      }

      allOps.push({
        ref: studentDoc.ref, type: 'update', data: {
          points: newPoints + bonusTotal,
          lifetimePoints: newLifetimePoints + bonusTotal,
          categoryPoints: categoryPointsUpdate,
          categoryPointsByPeriod: categoryPointsByPeriodUpdate,
          earnedAchievements,
          earnedBadges
        },
      });

      const mainActivityRef = doc(collection(studentDoc.ref, 'activities'));
      allOps.push({ ref: mainActivityRef, type: 'set', data: { desc: description, amount: points, date: Date.now() } });

      processedCount++;
    }

    // Chunk writes to respect the 500-operation Firestore batch limit.
    const BATCH_LIMIT = 450;
    for (let i = 0; i < allOps.length; i += BATCH_LIMIT) {
      const batch = writeBatch(firestore);
      const chunk = allOps.slice(i, i + BATCH_LIMIT);
      for (const op of chunk) {
        if (op.type === 'update') batch.update(op.ref, op.data);
        else batch.set(op.ref, op.data);
      }
      await batch.commit();
    }

    return { success: true, message: `Successfully awarded points.`, count: processedCount };

  } catch (error: unknown) {
    reportFirestorePermissionError(error, {
      path: `schools/${schoolId}/students`,
      operation: 'write',
      requestResourceData: { studentIds, points, description },
    });
    const fallback = (error instanceof Error && error.message) || 'An unknown error occurred.';
    return { success: false, message: getReadableErrorMessage(error, fallback), count: 0 };
  }
};

export const deductPointsFromMultipleStudents = async (firestore: Firestore, schoolId: string, studentIds: string[], points: number, reason: string): Promise<{ success: boolean; message: string; count: number; }> => {
  if (points <= 0) {
    return { success: false, message: "Points to deduct must be a positive number.", count: 0 };
  }
  if (!studentIds || studentIds.length === 0) {
    return { success: false, message: "No students selected.", count: 0 };
  }

  try {
    const studentRefs = studentIds.map(id => doc(firestore, 'schools', schoolId, 'students', id));
    const studentDocs = await Promise.all(studentRefs.map(ref => getDoc(ref)));

    // Chunk writes to respect the 500-operation Firestore batch limit.
    type WriteOp = {
      ref: DocumentReference;
      type: 'update' | 'set';
      data: DocumentData;
    };
    const allOps: WriteOp[] = [];
    let processedCount = 0;

    for (const studentDoc of studentDocs) {
      if (!studentDoc.exists()) continue;

      const studentData = studentDoc.data() as Student;

      const newPoints = Math.max(0, studentData.points - points);

      allOps.push({ ref: studentDoc.ref, type: 'update', data: { points: newPoints } });

      const activityRef = doc(collection(studentDoc.ref, 'activities'));
      allOps.push({ ref: activityRef, type: 'set', data: { desc: reason, amount: -points, date: Date.now() } });

      processedCount++;
    }

    const BATCH_LIMIT = 450;
    for (let i = 0; i < allOps.length; i += BATCH_LIMIT) {
      const batch = writeBatch(firestore);
      const chunk = allOps.slice(i, i + BATCH_LIMIT);
      for (const op of chunk) {
        if (op.type === 'update') batch.update(op.ref, op.data);
        else batch.set(op.ref, op.data);
      }
      await batch.commit();
    }

    return { success: true, message: `Successfully deducted points.`, count: processedCount };

  } catch (error: unknown) {
    reportFirestorePermissionError(error, {
      path: `schools/${schoolId}/students`,
      operation: 'write',
      requestResourceData: { studentIds, points, reason },
    });
    const fallback = (error instanceof Error && error.message) || 'An unknown error occurred.';
    return { success: false, message: getReadableErrorMessage(error, fallback), count: 0 };
  }
}

export const purgeStudentProgress = async (firestore: Firestore, schoolId: string, studentId: string) => {
  const studentRef = doc(firestore, 'schools', schoolId, 'students', studentId);
  try {
    await runTransaction(firestore, async (transaction) => {
      const studentDoc = await transaction.get(studentRef);
      if (!studentDoc.exists()) {
        throw new Error("Student not found");
      }

      transaction.update(studentRef, {
        points: 0,
        lifetimePoints: 0,
        categoryPoints: {},
        categoryPointsByPeriod: {},
        earnedAchievements: [],
        earnedBadges: [],
      });

      const activityRef = doc(collection(firestore, 'schools', schoolId, 'students', studentId, 'activities'));
      transaction.set(activityRef, {
        desc: 'Progress purged by admin',
        amount: 0,
        date: Date.now(),
      } as HistoryItem);
    });
  } catch (error) {
    reportFirestorePermissionError(error, {
      path: studentRef.path,
      operation: 'update',
      requestResourceData: { studentId, action: 'purgeProgress' },
    });
    throw error;
  }
};

export const uploadStudents = async (firestore: Firestore, schoolId: string, csvContent: string, currentStudents: Student[], allClasses: Class[]): Promise<{ success: number, failed: number, errors: string[] }> => {
  const lines = csvContent.replace(/\r\n/g, '\n').split('\n').filter(line => line.trim() !== '');
  const errors: string[] = [];

  if (lines.length === 0) {
    return { success: 0, failed: 0, errors: ['File is empty.'] };
  }

  const existingNfcIds = new Set(currentStudents.map(s => s.nfcId || s.id));
  let successCount = 0;
  const studentsToCreate: Student[] = [];

  let dataLines = lines;
  if (lines[0].toLowerCase().includes('first')) {
    dataLines = lines.slice(1);
  }

  dataLines.forEach((row, index) => {
    if (!row.trim()) return;
    const delimiter = row.includes(';') ? ';' : ',';
    const values = row.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
    const [firstName, lastName, studentClassName] = values;

    if (!firstName || !lastName) {
      errors.push(`Row ${index + 2}: Missing first or last name.`);
      return;
    }

    let newStudentId;
    do {
      newStudentId = Math.floor(10000000 + Math.random() * 90000000).toString();
    } while (existingNfcIds.has(newStudentId));
    existingNfcIds.add(newStudentId);

    const classObj = allClasses.find(c => studentClassName && c.name.toLowerCase() === studentClassName.toLowerCase());

    const newStudent: Student = {
      id: newStudentId,
      nfcId: newStudentId,
      firstName,
      lastName,
      createdAt: Date.now(),
      points: 0,
      lifetimePoints: 0,
      classId: classObj?.id || '',
      categoryPoints: {},
      categoryPointsByPeriod: {},
      earnedAchievements: [],
      earnedBadges: [],
    };

    studentsToCreate.push(newStudent);
    successCount++;
  });

  // Chunk batch operations to respect the 500-operation Firestore limit
  if (studentsToCreate.length > 0) {
    const BATCH_LIMIT = 499;
    try {
      for (let i = 0; i < studentsToCreate.length; i += BATCH_LIMIT) {
        const chunk = studentsToCreate.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(firestore);
        for (const student of chunk) {
          const studentDocRef = doc(firestore, 'schools', schoolId, 'students', student.id);
          batch.set(studentDocRef, removeUndefined(student as unknown as Record<string, unknown>));
        }
        await batch.commit();
      }
    } catch (error) {
      reportFirestorePermissionError(error, {
        path: `schools/${schoolId}/students`,
        operation: 'write',
      });
      throw error;
    }
  }

  const failedCount = dataLines.length - successCount;
  return { success: successCount, failed: failedCount, errors };
};
