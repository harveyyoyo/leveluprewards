import type { DocumentData, DocumentReference, Firestore, Transaction } from 'firebase-admin/firestore';
import { applyCategoryPointsByPeriod, applyPointsByPeriod } from '@/lib/db/helpers';

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

function studentDisplayName(data: DocumentData, fallbackId: string): string {
  return (
    [data.nickname || data.firstName, data.lastName].filter(Boolean).join(' ').trim() || fallbackId
  );
}

function writeClassroomAwardLog(
  tx: Transaction,
  schoolRef: DocumentReference,
  meta: ClassroomAwardMeta,
  studentId: string,
  data: DocumentData,
  signedDelta: number,
  description: string,
  now: number,
): void {
  const logRef = schoolRef.collection('classroomAwards').doc();
  tx.set(logRef, {
    studentId,
    studentName: studentDisplayName(data, studentId),
    classId: meta.classId ?? data.classId ?? null,
    className: meta.className ?? null,
    teacherId: meta.teacherId,
    teacherName: meta.teacherName,
    points: signedDelta,
    description,
    createdAt: now,
  });
}

async function applyHousePointsRollupAdmin(
  tx: Transaction,
  db: Firestore,
  schoolId: string,
  houseId: string,
  pointsDelta: number,
): Promise<void> {
  if (!houseId || pointsDelta === 0) return;
  const houseRef = db.collection('schools').doc(schoolId).collection('houses').doc(houseId);
  const houseSnap = await tx.get(houseRef);
  if (!houseSnap.exists) return;
  const house = houseSnap.data()!;
  const nextPoints = Math.max(0, Number(house.points ?? 0) + pointsDelta);
  const nextLifetime =
    pointsDelta > 0
      ? Number(house.lifetimePoints ?? 0) + pointsDelta
      : Number(house.lifetimePoints ?? 0);
  tx.update(houseRef, { points: nextPoints, lifetimePoints: nextLifetime });
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

        writeClassroomAwardLog(tx, schoolRef, meta, id, data, signedDelta, desc, now);

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

export type RewardsPointsAdminOptions = {
  rollupHousePoints?: boolean;
};

/** Server-side Rewards balance updates from the classroom chart (Admin SDK). */
export async function applyRewardsPointsAdmin(
  db: Firestore,
  schoolId: string,
  studentIds: string[],
  signedDelta: number,
  description: string,
  meta: ClassroomAwardMeta,
  options?: RewardsPointsAdminOptions,
): Promise<{ success: boolean; message: string; count: number }> {
  if (!signedDelta || !Number.isFinite(signedDelta)) {
    return { success: false, message: 'Invalid points amount.', count: 0 };
  }

  const uniqueIds = sanitizeStudentIds(studentIds);
  if (uniqueIds.length === 0) {
    return { success: false, message: 'No valid students selected.', count: 0 };
  }

  const desc = description.trim();
  if (!desc) {
    return { success: false, message: 'A description is required.', count: 0 };
  }

  const logDesc = classroomActivityDescription(desc);
  const now = Date.now();
  let processedCount = 0;
  const chunkSize = signedDelta > 0 ? 80 : 200;
  const rollupHousePoints = options?.rollupHousePoints === true;

  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunkIds = uniqueIds.slice(i, i + chunkSize);
    await db.runTransaction(async (tx) => {
      const schoolRef = db.collection('schools').doc(schoolId);
      const reads: { id: string; ref: DocumentReference; data: DocumentData }[] = [];
      const houseDeltas = new Map<string, number>();

      for (const id of chunkIds) {
        const ref = schoolRef.collection('students').doc(id);
        const snap = await tx.get(ref);
        if (snap.exists) {
          reads.push({ id, ref, data: snap.data()! });
        }
      }

      for (const { id, ref, data } of reads) {
        if (signedDelta > 0) {
          const currentPoints = Number(data.points ?? 0);
          const newPoints = currentPoints + signedDelta;
          const newLifetime = Number(data.lifetimePoints ?? 0) + signedDelta;
          const categoryPoints = {
            ...((data.categoryPoints as Record<string, number> | undefined) ?? {}),
          };
          categoryPoints[desc] = (categoryPoints[desc] || 0) + signedDelta;
          const pointsByPeriodUpdate = applyPointsByPeriod(
            data.pointsByPeriod as Record<string, number> | undefined,
            signedDelta,
            now,
          );
          const categoryPointsByPeriodUpdate = applyCategoryPointsByPeriod(
            data.categoryPointsByPeriod as Record<string, Record<string, number>> | undefined,
            desc,
            signedDelta,
            now,
          );

          tx.update(ref, {
            points: newPoints,
            lifetimePoints: newLifetime,
            categoryPoints,
            pointsByPeriod: pointsByPeriodUpdate,
            categoryPointsByPeriod: categoryPointsByPeriodUpdate,
            updatedAt: now,
          });

          if (rollupHousePoints && data.houseId) {
            houseDeltas.set(
              String(data.houseId),
              (houseDeltas.get(String(data.houseId)) ?? 0) + signedDelta,
            );
          }
        } else {
          const magnitude = Math.abs(signedDelta);
          const newPoints = Math.max(0, Number(data.points ?? 0) - magnitude);
          tx.update(ref, { points: newPoints, updatedAt: now });

          if (rollupHousePoints && data.houseId) {
            houseDeltas.set(
              String(data.houseId),
              (houseDeltas.get(String(data.houseId)) ?? 0) - magnitude,
            );
          }
        }

        const activityRef = ref.collection('activities').doc();
        tx.set(activityRef, {
          desc,
          amount: signedDelta,
          date: now,
        });

        writeClassroomAwardLog(tx, schoolRef, meta, id, data, signedDelta, logDesc, now);
        processedCount += 1;
      }

      if (rollupHousePoints) {
        for (const [houseId, delta] of houseDeltas) {
          await applyHousePointsRollupAdmin(tx, db, schoolId, houseId, delta);
        }
      }
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
}
