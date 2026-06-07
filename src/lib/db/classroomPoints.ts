import {
  collection,
  doc,
  runTransaction,
  type Firestore,
} from 'firebase/firestore';
import type { Student } from '@/lib/types';
import { classroomAwardCategoryKey } from '@/lib/classroom/classroomRewardCategories';
import { applyCategoryPointsByPeriod, applyPointsByPeriod } from '@/lib/db/helpers';
import {
  readHouseRollupSnaps,
  writeHousePointsRollupsFromDeltas,
} from '@/lib/db/housePoints';
import { getReadableErrorMessage } from '@/lib/errorMessage';

export type ClassroomPointsMeta = {
  classId?: string;
  className?: string;
  teacherId: string;
  teacherName: string;
};

function classroomActivityDescription(description: string): string {
  const trimmed = description.trim();
  if (/^classroom\b/i.test(trimmed)) return trimmed;
  return `Classroom — ${trimmed}`;
}

/**
 * Record classroom points without touching Rewards balances (`points`, kiosk, prizes).
 * Updates `classroomPoints`, period totals, student activity log, and school audit log.
 */
export async function applyClassroomPointsToStudents(
  firestore: Firestore,
  schoolId: string,
  studentIds: string[],
  signedDelta: number,
  description: string,
  meta: ClassroomPointsMeta,
): Promise<{ success: boolean; message: string; count: number }> {
  if (!signedDelta || !Number.isFinite(signedDelta)) {
    return { success: false, message: 'Invalid points amount.', count: 0 };
  }
  if (!studentIds?.length) {
    return { success: false, message: 'No students selected.', count: 0 };
  }

  const uniqueIds = [...new Set(studentIds)].filter((id) => id.trim().length > 0 && !id.includes('/'));
  if (uniqueIds.length === 0) {
    return { success: false, message: 'No valid students selected.', count: 0 };
  }
  const desc = classroomActivityDescription(description);
  const chunkSize = 80;
  let processedCount = 0;

  try {
    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      const chunkIds = uniqueIds.slice(i, i + chunkSize);
      await runTransaction(firestore, async (transaction) => {
        const studentRefs = chunkIds.map((id) =>
          doc(firestore, 'schools', schoolId, 'students', id),
        );
        const studentDocs = await Promise.all(studentRefs.map((ref) => transaction.get(ref)));

        for (const studentDoc of studentDocs) {
          if (!studentDoc.exists()) continue;
          const studentData = studentDoc.data() as Student;
          const now = Date.now();
          const current = studentData.classroomPoints ?? 0;
          const next = Math.max(0, current + signedDelta);
          const periodUpdate = applyPointsByPeriod(
            studentData.classroomPointsByPeriod,
            signedDelta,
            now,
          );

          transaction.update(studentDoc.ref, {
            classroomPoints: next,
            classroomPointsByPeriod: periodUpdate,
            updatedAt: now,
          });

          const activityRef = doc(collection(studentDoc.ref, 'activities'));
          transaction.set(activityRef, {
            desc,
            amount: signedDelta,
            date: now,
            classroomOnly: true,
          });

          const logRef = doc(collection(firestore, 'schools', schoolId, 'classroomAwards'));
          transaction.set(logRef, {
            studentId: studentDoc.id,
            studentName:
              [studentData.nickname || studentData.firstName, studentData.lastName]
                .filter(Boolean)
                .join(' ')
                .trim() || studentDoc.id,
            classId: meta.classId ?? studentData.classId ?? null,
            className: meta.className ?? null,
            teacherId: meta.teacherId,
            teacherName: meta.teacherName,
            points: signedDelta,
            description: desc,
            createdAt: now,
          });

          processedCount += 1;
        }
      });
    }

    return {
      success: processedCount > 0,
      message:
        processedCount > 0
          ? `Classroom points recorded for ${processedCount} student(s).`
          : 'No students found.',
      count: processedCount,
    };
  } catch (error: unknown) {
    const fallback = (error instanceof Error && error.message) || 'Could not save classroom points.';
    return { success: false, message: getReadableErrorMessage(error, fallback), count: 0 };
  }
}

export type RewardsPointsClientOptions = {
  rollupHousePoints?: boolean;
};

/** Client fallback for classroom chart awards when Rewards balances should update. */
export async function applyRewardsPointsToStudents(
  firestore: Firestore,
  schoolId: string,
  studentIds: string[],
  signedDelta: number,
  description: string,
  meta: ClassroomPointsMeta,
  options?: RewardsPointsClientOptions,
): Promise<{ success: boolean; message: string; count: number }> {
  if (!signedDelta || !Number.isFinite(signedDelta)) {
    return { success: false, message: 'Invalid points amount.', count: 0 };
  }
  if (!studentIds?.length) {
    return { success: false, message: 'No students selected.', count: 0 };
  }

  const desc = description.trim();
  if (!desc) {
    return { success: false, message: 'A description is required.', count: 0 };
  }

  const uniqueIds = [...new Set(studentIds)].filter((id) => id.trim().length > 0 && !id.includes('/'));
  if (uniqueIds.length === 0) {
    return { success: false, message: 'No valid students selected.', count: 0 };
  }

  const logDesc = classroomActivityDescription(desc);
  const chunkSize = signedDelta > 0 ? 80 : 200;
  let processedCount = 0;
  const rollupHousePoints = options?.rollupHousePoints === true;

  try {
    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      const chunkIds = uniqueIds.slice(i, i + chunkSize);
      await runTransaction(firestore, async (transaction) => {
        const studentRefs = chunkIds.map((id) =>
          doc(firestore, 'schools', schoolId, 'students', id),
        );
        const studentDocs = await Promise.all(studentRefs.map((ref) => transaction.get(ref)));
        const houseDeltas = new Map<string, number>();
        const houseSnaps = rollupHousePoints
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
          const now = Date.now();

          if (signedDelta > 0) {
            const newPoints = Number(studentData.points ?? 0) + signedDelta;
            const newLifetime = (studentData.lifetimePoints || 0) + signedDelta;
            const categoryKey = classroomAwardCategoryKey(meta.teacherId, desc);
            const categoryPointsUpdate = { ...studentData.categoryPoints };
            categoryPointsUpdate[categoryKey] = (categoryPointsUpdate[categoryKey] || 0) + signedDelta;
            const pointsByPeriodUpdate = applyPointsByPeriod(studentData.pointsByPeriod, signedDelta, now);
            const categoryPointsByPeriodUpdate = applyCategoryPointsByPeriod(
              studentData.categoryPointsByPeriod,
              categoryKey,
              signedDelta,
              now,
            );

            transaction.update(studentDoc.ref, {
              points: newPoints,
              lifetimePoints: newLifetime,
              categoryPoints: categoryPointsUpdate,
              pointsByPeriod: pointsByPeriodUpdate,
              categoryPointsByPeriod: categoryPointsByPeriodUpdate,
              updatedAt: now,
            });

            if (rollupHousePoints && studentData.houseId) {
              houseDeltas.set(
                studentData.houseId,
                (houseDeltas.get(studentData.houseId) ?? 0) + signedDelta,
              );
            }
          } else {
            const magnitude = Math.abs(signedDelta);
            const newPoints = Math.max(0, Number(studentData.points ?? 0) - magnitude);
            transaction.update(studentDoc.ref, { points: newPoints, updatedAt: now });

            if (rollupHousePoints && studentData.houseId) {
              houseDeltas.set(
                studentData.houseId,
                (houseDeltas.get(studentData.houseId) ?? 0) - magnitude,
              );
            }
          }

          const activityRef = doc(collection(studentDoc.ref, 'activities'));
          transaction.set(activityRef, { desc, amount: signedDelta, date: now });

          const logRef = doc(collection(firestore, 'schools', schoolId, 'classroomAwards'));
          transaction.set(logRef, {
            studentId: studentDoc.id,
            studentName:
              [studentData.nickname || studentData.firstName, studentData.lastName]
                .filter(Boolean)
                .join(' ')
                .trim() || studentDoc.id,
            classId: meta.classId ?? studentData.classId ?? null,
            className: meta.className ?? null,
            teacherId: meta.teacherId,
            teacherName: meta.teacherName,
            points: signedDelta,
            description: logDesc,
            createdAt: now,
          });

          processedCount += 1;
        }

        writeHousePointsRollupsFromDeltas(transaction, houseSnaps, houseDeltas);
      });
    }

    return {
      success: processedCount > 0,
      message:
        processedCount > 0
          ? signedDelta > 0
            ? `Points awarded to ${processedCount} student(s).`
            : `Points deducted for ${processedCount} student(s).`
          : 'No students found.',
      count: processedCount,
    };
  } catch (error: unknown) {
    const fallback = (error instanceof Error && error.message) || 'Could not award points.';
    return { success: false, message: getReadableErrorMessage(error, fallback), count: 0 };
  }
}
