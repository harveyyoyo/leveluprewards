import type { DocumentData, DocumentReference, Firestore } from 'firebase-admin/firestore';
import { applyPointsByPeriod } from '@/lib/db/helpers';

export type ClassroomAwardMeta = {
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

function sanitizeStudentIds(studentIds: string[]): string[] {
  return [...new Set(studentIds.map((id) => id.trim()).filter((id) => id.length > 0 && !id.includes('/')))];
}

/** Server-side classroom points (Admin SDK — not limited by client security rules). */
export async function applyClassroomPointsAdmin(
  db: Firestore,
  schoolId: string,
  studentIds: string[],
  signedDelta: number,
  description: string,
  meta: ClassroomAwardMeta,
): Promise<{ success: boolean; message: string; count: number }> {
  if (!signedDelta || !Number.isFinite(signedDelta)) {
    return { success: false, message: 'Invalid points amount.', count: 0 };
  }

  const uniqueIds = sanitizeStudentIds(studentIds);
  if (uniqueIds.length === 0) {
    return { success: false, message: 'No valid students selected.', count: 0 };
  }

  const desc = classroomActivityDescription(description);
  const now = Date.now();
  let processedCount = 0;
  const chunkSize = 80;

  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunkIds = uniqueIds.slice(i, i + chunkSize);
    await db.runTransaction(async (tx) => {
      const schoolRef = db.collection('schools').doc(schoolId);
      const reads: { id: string; ref: DocumentReference; data: DocumentData }[] = [];

      for (const id of chunkIds) {
        const ref = schoolRef.collection('students').doc(id);
        const snap = await tx.get(ref);
        if (snap.exists) {
          reads.push({ id, ref, data: snap.data()! });
        }
      }

      for (const { id, ref, data } of reads) {
        const current = Number(data.classroomPoints ?? 0);
        const next = Math.max(0, current + signedDelta);
        const periodUpdate = applyPointsByPeriod(
          data.classroomPointsByPeriod as Record<string, number> | undefined,
          signedDelta,
          now,
        );

        tx.update(ref, {
          classroomPoints: next,
          classroomPointsByPeriod: periodUpdate,
          updatedAt: now,
        });

        const activityRef = ref.collection('activities').doc();
        tx.set(activityRef, {
          desc,
          amount: signedDelta,
          date: now,
          classroomOnly: true,
        });

        const studentName =
          [data.nickname || data.firstName, data.lastName].filter(Boolean).join(' ').trim() || id;

        const logRef = schoolRef.collection('classroomAwards').doc();
        tx.set(logRef, {
          studentId: id,
          studentName,
          classId: meta.classId ?? data.classId ?? null,
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
}
