import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
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
  applyPointsByPeriod,
  applyAchievementsAndBadges,
} from './helpers';
import {
  readHouseRollupSnap,
  readHouseRollupSnaps,
  writeHousePointsRollup,
  writeHousePointsRollupsFromDeltas,
} from './housePoints';
import { ensureStudentHasClassPrimaryTeacher } from '@/lib/studentTeacherRoster';

export { lookupStudentId } from './lookup';

async function primaryTeacherIdForClass(
  firestore: Firestore,
  schoolId: string,
  classId: string,
): Promise<string | undefined> {
  const trimmed = classId.trim();
  if (!trimmed) return undefined;
  const classRef = doc(firestore, 'schools', schoolId, 'classes', trimmed);
  const classSnap = await getDoc(classRef);
  if (!classSnap.exists()) return undefined;
  const teacherId = ((classSnap.data() as Class).primaryTeacherId || '').trim();
  return teacherId || undefined;
}

function withPrimaryTeacherId(student: Student, primaryTeacherId: string): Student {
  const current = student.teacherIds || [];
  if (current.includes(primaryTeacherId)) return student;
  return { ...student, teacherIds: [...current, primaryTeacherId] };
}

// --- Student Mutations ---
export const addStudent = async (firestore: Firestore, schoolId: string, studentData: Omit<Student, 'id' | 'points' | 'lifetimePoints'>) => {
  const newStudentId = Math.floor(10000000 + Math.random() * 90000000).toString();
  let newStudent: Student = {
    ...studentData,
    id: newStudentId,
    nfcId: studentData.nfcId || newStudentId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    points: 0,
    lifetimePoints: 0,
    categoryPoints: {},
    pointsByPeriod: {},
    categoryPointsByPeriod: {},
    earnedAchievements: [],
    earnedBadges: [],
  };
  const classId = (newStudent.classId || '').trim();
  if (classId) {
    const primaryTeacherId = await primaryTeacherIdForClass(firestore, schoolId, classId);
    if (primaryTeacherId) {
      newStudent = withPrimaryTeacherId(newStudent, primaryTeacherId);
    }
  }
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

      let studentToWrite = student;
      const classId = (student.classId || '').trim();
      if (classId) {
        const classRef = doc(firestore, 'schools', schoolId, 'classes', classId);
        const classSnap = await transaction.get(classRef);
        if (classSnap.exists()) {
          const primaryTeacherId = ((classSnap.data() as Class).primaryTeacherId || '').trim();
          if (primaryTeacherId) {
            studentToWrite = withPrimaryTeacherId(student, primaryTeacherId);
          }
        }
      }

      const pointsDifference = studentToWrite.points - oldStudent.points;

      const newLifetimePoints = (oldStudent.lifetimePoints || oldStudent.points) + (pointsDifference > 0 ? pointsDifference : 0);

      const finalStudentData = { ...studentToWrite, lifetimePoints: newLifetimePoints, updatedAt: Date.now() };

      const payload = removeUndefined(finalStudentData as unknown as Record<string, unknown>) as Record<string, unknown>;
      // `theme: undefined` in the client object is stripped by removeUndefined; Firestore would otherwise keep the old theme.
      if (Object.prototype.hasOwnProperty.call(student, 'theme') && student.theme === undefined) {
        payload.theme = deleteField();
      }
      transaction.update(studentDocRef, payload as DocumentData);
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

export type AwardPointsOptions = {
  /** When true, skip syncing student goals after this award (avoids loops for goal-completion bonuses). */
  skipGoalSync?: boolean;
  /** When true, increment the student's house cached totals (requires `houseId` on student). */
  rollupHousePoints?: boolean;
};

export const awardPointsToStudent = async (
  firestore: Firestore,
  schoolId: string,
  studentId: string,
  points: number,
  description: string,
  allAchievements: Achievement[] = [],
  allCategories: Category[] = [],
  allBadges: Badge[] = [],
  options?: AwardPointsOptions,
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

      const houseSnap =
        options?.rollupHousePoints && studentData.houseId
          ? await readHouseRollupSnap(transaction, firestore, schoolId, studentData.houseId)
          : null;

      const newPoints = Number(studentData.points ?? 0) + points;
      const newLifetimePoints = (studentData.lifetimePoints || 0) + points;

      const categoryPointsUpdate = { ...studentData.categoryPoints };
      categoryPointsUpdate[description] = (categoryPointsUpdate[description] || 0) + points;

      const now = Date.now();
      const pointsByPeriodUpdate = applyPointsByPeriod(
        studentData.pointsByPeriod,
        points,
        now
      );
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
        pointsByPeriod: pointsByPeriodUpdate,
        categoryPointsByPeriod: categoryPointsByPeriodUpdate,
        earnedAchievements: result.earnedAchievements,
        earnedBadges: result.earnedBadges,
        updatedAt: now,
      });

      const activityRef = doc(collection(firestore, 'schools', schoolId, 'students', studentId, 'activities'));
      transaction.set(activityRef, { desc: description, amount: points, date: now });

      if (houseSnap) {
        writeHousePointsRollup(transaction, houseSnap, points + bonusTotal);
      }
    });

    if (!options?.skipGoalSync) {
      void import('@/lib/goalsProgress').then((m) =>
        m.syncGoalsForStudent(firestore, schoolId, studentId).catch(() => {}),
      );
    }

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
  allBadges: Badge[] = [],
  options?: AwardPointsOptions,
): Promise<{ success: boolean; message: string; count: number }> => {
  if (points <= 0) {
    return { success: false, message: "Points must be a positive number.", count: 0 };
  }
  if (!studentIds || studentIds.length === 0) {
    return { success: false, message: "No students selected.", count: 0 };
  }

  try {
    let processedCount = 0;
    // Process in chunks of 50 to safely stay under the 500 writes-per-transaction limit
    // (each student = 1 update + 1 main activity + N badge/achievement activities)
    const chunkSize = 50;
    const uniqueIds = [...new Set(studentIds)];
    
    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      const chunkIds = uniqueIds.slice(i, i + chunkSize);
      
      await runTransaction(firestore, async (transaction) => {
        const studentRefs = chunkIds.map(id => doc(firestore, 'schools', schoolId, 'students', id));
        const studentDocs = await Promise.all(studentRefs.map(ref => transaction.get(ref)));
        const houseDeltas = new Map<string, number>();
        const houseSnaps = options?.rollupHousePoints
          ? await readHouseRollupSnaps(
              transaction,
              firestore,
              schoolId,
              studentDocs
                .filter((d) => d.exists())
                .map((d) => (d.data() as Student).houseId)
                .filter((id): id is string => Boolean(id)),
            )
          : new Map();

        for (const studentDoc of studentDocs) {
          if (!studentDoc.exists()) continue;

          const studentData = studentDoc.data() as Student;
          const newPoints = Number(studentData.points ?? 0) + points;
          const newLifetimePoints = (studentData.lifetimePoints || 0) + points;
          const categoryPointsUpdate = { ...studentData.categoryPoints };
          categoryPointsUpdate[description] = (categoryPointsUpdate[description] || 0) + points;

          const now = Date.now();
          const pointsByPeriodUpdate = applyPointsByPeriod(studentData.pointsByPeriod, points, now);
          const categoryPointsByPeriodUpdate = applyCategoryPointsByPeriod(studentData.categoryPointsByPeriod, description, points, now);
          
          const result = applyAchievementsAndBadges(
            transaction, studentDoc.ref, studentData,
            newPoints, newLifetimePoints,
            categoryPointsUpdate, categoryPointsByPeriodUpdate,
            allAchievements, allCategories, allBadges,
            schoolId, studentDoc.id, firestore,
          );

          const totalAward = points + result.bonusTotal;
          transaction.update(studentDoc.ref, {
            points: newPoints + result.bonusTotal,
            lifetimePoints: newLifetimePoints + result.bonusTotal,
            categoryPoints: categoryPointsUpdate,
            pointsByPeriod: pointsByPeriodUpdate,
            categoryPointsByPeriod: categoryPointsByPeriodUpdate,
            earnedAchievements: result.earnedAchievements,
            earnedBadges: result.earnedBadges,
            updatedAt: now,
          });

          const mainActivityRef = doc(collection(studentDoc.ref, 'activities'));
          transaction.set(mainActivityRef, { desc: description, amount: points, date: now });

          if (options?.rollupHousePoints && studentData.houseId) {
            houseDeltas.set(
              studentData.houseId,
              (houseDeltas.get(studentData.houseId) ?? 0) + totalAward,
            );
          }
          
          processedCount++;
        }

        writeHousePointsRollupsFromDeltas(transaction, houseSnaps, houseDeltas);
      });
    }

    if (!options?.skipGoalSync && processedCount > 0) {
      void import('@/lib/goalsProgress').then((m) =>
        Promise.all(uniqueIds.map((id) => m.syncGoalsForStudent(firestore, schoolId, id))).catch(() => {}),
      );
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

export const deductPointsFromMultipleStudents = async (
  firestore: Firestore,
  schoolId: string,
  studentIds: string[],
  points: number,
  reason: string,
  options?: Pick<AwardPointsOptions, 'rollupHousePoints'>,
): Promise<{ success: boolean; message: string; count: number; }> => {
  if (points <= 0) {
    return { success: false, message: "Points to deduct must be a positive number.", count: 0 };
  }
  if (!studentIds || studentIds.length === 0) {
    return { success: false, message: "No students selected.", count: 0 };
  }

  try {
    let processedCount = 0;
    const chunkSize = 200; // Deductions are simpler: 1 update + 1 activity per student. (200 * 2 = 400 < 500)
    const uniqueIds = [...new Set(studentIds)];

    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      const chunkIds = uniqueIds.slice(i, i + chunkSize);
      
      await runTransaction(firestore, async (transaction) => {
        const studentRefs = chunkIds.map(id => doc(firestore, 'schools', schoolId, 'students', id));
        const studentDocs = await Promise.all(studentRefs.map(ref => transaction.get(ref)));
        const houseDeltas = new Map<string, number>();
        const houseSnaps = options?.rollupHousePoints
          ? await readHouseRollupSnaps(
              transaction,
              firestore,
              schoolId,
              studentDocs
                .filter((d) => d.exists())
                .map((d) => (d.data() as Student).houseId)
                .filter((id): id is string => Boolean(id)),
            )
          : new Map();

        for (const studentDoc of studentDocs) {
          if (!studentDoc.exists()) continue;

          const studentData = studentDoc.data() as Student;
          const newPoints = Math.max(0, studentData.points - points);

          const now = Date.now();
          transaction.update(studentDoc.ref, { points: newPoints, updatedAt: now });

          const activityRef = doc(collection(studentDoc.ref, 'activities'));
          transaction.set(activityRef, { desc: reason, amount: -points, date: now });

          if (options?.rollupHousePoints && studentData.houseId) {
            houseDeltas.set(
              studentData.houseId,
              (houseDeltas.get(studentData.houseId) ?? 0) - points,
            );
          }

          processedCount++;
        }

        writeHousePointsRollupsFromDeltas(transaction, houseSnaps, houseDeltas);
      });
    }

    if (processedCount > 0) {
      void import('@/lib/goalsProgress').then((m) =>
        Promise.all(uniqueIds.map((id) => m.syncGoalsForStudent(firestore, schoolId, id))).catch(() => {}),
      );
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

      const now = Date.now();
      transaction.update(studentRef, {
        points: 0,
        lifetimePoints: 0,
        categoryPoints: {},
        pointsByPeriod: {},
        categoryPointsByPeriod: {},
        earnedAchievements: [],
        earnedBadges: [],
        updatedAt: now,
      });

      const activityRef = doc(collection(firestore, 'schools', schoolId, 'students', studentId, 'activities'));
      transaction.set(activityRef, {
        desc: 'Progress purged by admin',
        amount: 0,
        date: now,
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

export const purgeStudentsProgress = async (
  firestore: Firestore,
  schoolId: string,
  studentIds: string[],
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;
  for (const studentId of studentIds) {
    try {
      await purgeStudentProgress(firestore, schoolId, studentId);
      success += 1;
    } catch {
      failed += 1;
    }
  }
  return { success, failed };
};

async function persistStudentDocuments(firestore: Firestore, schoolId: string, studentsToCreate: Student[]) {
  if (studentsToCreate.length === 0) return;
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

async function persistStudentUpdates(
  firestore: Firestore,
  schoolId: string,
  updates: Array<{ id: string; patch: Partial<Student> }>,
) {
  if (updates.length === 0) return;
  const BATCH_LIMIT = 499;
  try {
    for (let i = 0; i < updates.length; i += BATCH_LIMIT) {
      const chunk = updates.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(firestore);
      for (const u of chunk) {
        const ref = doc(firestore, 'schools', schoolId, 'students', u.id);
        batch.update(
          ref,
          removeUndefined({ ...u.patch, updatedAt: Date.now() } as unknown as Record<string, unknown>),
        );
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

/** Import students from structured rows (e.g. AI-parsed). Matches className to existing classes case-insensitively. */
export const importStudentsFromParsedRows = async (
  firestore: Firestore,
  schoolId: string,
  rows: {
    firstName: string;
    lastName: string;
    className?: string;
    middleName?: string;
    nickname?: string;
    birthday?: string;
    parentEmail?: string;
    parentPhone?: string;
    studentEmail?: string;
    studentPhone?: string;
  }[],
  currentStudents: Student[],
  allClasses: Class[],
  options?: { upsert?: boolean },
): Promise<{ success: number; failed: number; errors: string[] }> => {
  const errors: string[] = [];
  const existingNfcIds = new Set(currentStudents.map((s) => s.nfcId || s.id));
  const studentsToCreate: Student[] = [];
  let updatedCount = 0;
  const studentUpdates: Array<{ id: string; patch: Partial<Student> }> = [];

  const byNameKey = new Map<string, Student[]>();
  if (options?.upsert) {
    for (const s of currentStudents) {
      const k = `${(s.firstName || '').trim().toLowerCase()}|${(s.lastName || '').trim().toLowerCase()}`;
      if (!k || k === '|') continue;
      const arr = byNameKey.get(k) || [];
      arr.push(s);
      byNameKey.set(k, arr);
    }
  }

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const rawFn = (row.firstName || '').trim();
    const rawLn = (row.lastName || '').trim();
    const firstName = rawFn === '—' ? '' : rawFn;
    const lastName = rawLn === '—' ? '' : rawLn;
    const studentClassName = (row.className || '').trim();
    const middleName = (row.middleName || '').trim();
    const nickname = (row.nickname || '').trim();
    const birthday = (row.birthday || '').trim();
    const parentEmail = (row.parentEmail || '').trim();
    const parentPhone = (row.parentPhone || '').trim();
    const studentEmail = (row.studentEmail || '').trim();
    const studentPhone = (row.studentPhone || '').trim();

    if (!firstName || !lastName) {
      errors.push(`Row ${index + 1}: Missing first or last name.`);
      continue;
    }

    const nameKey = `${firstName.toLowerCase()}|${lastName.toLowerCase()}`;
    if (options?.upsert) {
      const matches = byNameKey.get(nameKey) || [];
      if (matches.length === 1) {
        const existing = matches[0];
        const classObj = allClasses.find(
          (c) => studentClassName && c.name.toLowerCase() === studentClassName.toLowerCase(),
        );

        // Only fill missing fields; do not overwrite existing data.
        const patch: Partial<Student> = {};
        if (middleName && !(existing.middleName || '').trim()) patch.middleName = middleName;
        if (nickname && !(existing.nickname || '').trim()) patch.nickname = nickname;
        if (birthday && !(existing.birthday || '').trim()) patch.birthday = birthday;
        if (parentEmail && !(existing.parentEmail || '').trim()) patch.parentEmail = parentEmail;
        if (parentPhone && !(existing.parentPhone || '').trim()) patch.parentPhone = parentPhone;
        if (studentEmail && !(existing.studentEmail || '').trim()) patch.studentEmail = studentEmail;
        if (studentPhone && !(existing.studentPhone || '').trim()) patch.studentPhone = studentPhone;
        if (classObj?.id && !(existing.classId || '').trim()) {
          patch.classId = classObj.id;
          const withTeacher = ensureStudentHasClassPrimaryTeacher({ ...existing, ...patch }, allClasses);
          if (withTeacher.teacherIds?.length) patch.teacherIds = withTeacher.teacherIds;
        }

        if (Object.keys(patch).length > 0) {
          studentUpdates.push({ id: existing.id, patch });
          updatedCount++;
        }
        continue;
      }
      if (matches.length > 1) {
        errors.push(`Row ${index + 1}: Multiple existing students match "${firstName} ${lastName}". Skipped update.`);
        continue;
      }
      // else: no match → create new student below.
    }

    let newStudentId: string;
    do {
      newStudentId = Math.floor(10000000 + Math.random() * 90000000).toString();
    } while (existingNfcIds.has(newStudentId));
    existingNfcIds.add(newStudentId);

    const classObj = allClasses.find(
      (c) => studentClassName && c.name.toLowerCase() === studentClassName.toLowerCase(),
    );

    studentsToCreate.push(
      ensureStudentHasClassPrimaryTeacher(
        {
          id: newStudentId,
          nfcId: newStudentId,
          firstName,
          lastName,
          ...(middleName ? { middleName } : {}),
          ...(nickname ? { nickname } : {}),
          ...(birthday ? { birthday } : {}),
          ...(parentEmail ? { parentEmail } : {}),
          ...(parentPhone ? { parentPhone } : {}),
          ...(studentEmail ? { studentEmail } : {}),
          ...(studentPhone ? { studentPhone } : {}),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          points: 0,
          lifetimePoints: 0,
          classId: classObj?.id || '',
          categoryPoints: {},
          pointsByPeriod: {},
          categoryPointsByPeriod: {},
          earnedAchievements: [],
          earnedBadges: [],
        },
        allClasses,
      ),
    );
  }

  await persistStudentUpdates(firestore, schoolId, studentUpdates);
  await persistStudentDocuments(firestore, schoolId, studentsToCreate);

  const successCount = studentsToCreate.length + updatedCount;
  const failedCount = Math.max(0, rows.length - studentsToCreate.length - updatedCount);
  return { success: successCount, failed: failedCount, errors };
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

  const header = (lines[0] || '').trim();
  const headerPartsRaw = header
    ? (header.includes(';') ? header.split(';') : header.split(',')).map((v) => v.trim().replace(/^"|"$/g, ''))
    : [];
  const headerParts = headerPartsRaw.map((h) => h.toLowerCase().replace(/\s+/g, ' ').trim());
  const hasHeader = headerParts.some((h) => h.includes('first')) && headerParts.some((h) => h.includes('last'));

  const colIndex = (names: string[]) => {
    for (let i = 0; i < headerParts.length; i++) {
      const h = headerParts[i];
      if (names.some((n) => h === n || h.includes(n))) return i;
    }
    return -1;
  };

  const idxFirst = hasHeader ? colIndex(['first name', 'firstname', 'first']) : 0;
  const idxLast = hasHeader ? colIndex(['last name', 'lastname', 'last']) : 1;
  const idxClass = hasHeader ? colIndex(['class name', 'classname', 'class', 'homeroom', 'section']) : 2;
  const idxMiddle = hasHeader ? colIndex(['middle name', 'middlename', 'middle']) : -1;
  const idxNick = hasHeader ? colIndex(['nickname', 'preferred name', 'preferredname']) : -1;
  const idxBirthday = hasHeader ? colIndex(['birthday', 'birthdate', 'date of birth', 'dateofbirth', 'dob']) : -1;
  const idxParentEmail = hasHeader ? colIndex(['parent email', 'guardian email', 'guardianemail', 'parentemail']) : -1;
  const idxParentPhone = hasHeader ? colIndex(['parent phone', 'guardian phone', 'guardianphone', 'parentphone']) : -1;
  const idxStudentEmail = hasHeader ? colIndex(['student email', 'studentemail']) : -1;
  const idxStudentPhone = hasHeader ? colIndex(['student phone', 'studentphone']) : -1;

  let dataLines = lines;
  if (hasHeader) dataLines = lines.slice(1);

  dataLines.forEach((row, index) => {
    if (!row.trim()) return;
    const delimiter = row.includes(';') ? ';' : ',';
    const values = row.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
    const firstName = values[idxFirst] || '';
    const lastName = values[idxLast] || '';
    const studentClassName = idxClass >= 0 ? (values[idxClass] || '') : '';
    const middleName = idxMiddle >= 0 ? (values[idxMiddle] || '') : '';
    const nickname = idxNick >= 0 ? (values[idxNick] || '') : '';
    const birthday = idxBirthday >= 0 ? (values[idxBirthday] || '') : '';
    const parentEmail = idxParentEmail >= 0 ? (values[idxParentEmail] || '') : '';
    const parentPhone = idxParentPhone >= 0 ? (values[idxParentPhone] || '') : '';
    const studentEmail = idxStudentEmail >= 0 ? (values[idxStudentEmail] || '') : '';
    const studentPhone = idxStudentPhone >= 0 ? (values[idxStudentPhone] || '') : '';

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
      ...(middleName ? { middleName } : {}),
      ...(nickname ? { nickname } : {}),
      ...(birthday ? { birthday } : {}),
      ...(parentEmail ? { parentEmail } : {}),
      ...(parentPhone ? { parentPhone } : {}),
      ...(studentEmail ? { studentEmail } : {}),
      ...(studentPhone ? { studentPhone } : {}),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      points: 0,
      lifetimePoints: 0,
      classId: classObj?.id || '',
      categoryPoints: {},
      pointsByPeriod: {},
      categoryPointsByPeriod: {},
      earnedAchievements: [],
      earnedBadges: [],
    };

    studentsToCreate.push(ensureStudentHasClassPrimaryTeacher(newStudent, allClasses));
    successCount++;
  });

  await persistStudentDocuments(firestore, schoolId, studentsToCreate);

  const failedCount = dataLines.length - successCount;
  return { success: successCount, failed: failedCount, errors };
};
