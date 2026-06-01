import {
  collection,
  doc,
  runTransaction,
  type Firestore,
} from 'firebase/firestore';
import type { Student } from '@/lib/types';
import { applyPointsByPeriod } from '@/lib/db/helpers';
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
