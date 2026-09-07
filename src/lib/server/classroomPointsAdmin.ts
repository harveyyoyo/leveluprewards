import type { DocumentData, DocumentReference, Firestore, Transaction } from 'firebase-admin/firestore';
import { classroomAwardCategoryKey } from '@/lib/classroom/classroomRewardCategories';
import { applyCategoryPointsByPeriod, applyPointsByPeriod } from '@/lib/db/helpers';

// At most 3 writes per student and 1 per house: 120 students stay below 500 writes.
export const MAX_CLASSROOM_AWARD_STUDENTS = 120;

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

type HouseRollupAdminSnap = {
  ref: DocumentReference;
  data: DocumentData;
};

async function readHouseRollupAdmin(
  tx: Transaction,
  db: Firestore,
  schoolId: string,
  houseId: string,
): Promise<HouseRollupAdminSnap | null> {
  const houseRef = db.collection('schools').doc(schoolId).collection('houses').doc(houseId);
  const houseSnap = await tx.get(houseRef);
  if (!houseSnap.exists) return null;
  return { ref: houseRef, data: houseSnap.data()! };
}

async function readHouseRollupSnapsAdmin(
  tx: Transaction,
  db: Firestore,
  schoolId: string,
  houseIds: Iterable<string>,
): Promise<Map<string, HouseRollupAdminSnap>> {
  const map = new Map<string, HouseRollupAdminSnap>();
  for (const houseId of [...new Set(houseIds)].filter((id) => id.trim().length > 0)) {
    const snap = await readHouseRollupAdmin(tx, db, schoolId, houseId);
    if (snap) map.set(houseId, snap);
  }
  return map;
}

function writeHousePointsRollupAdmin(
  tx: Transaction,
  snap: HouseRollupAdminSnap,
  pointsDelta: number,
): void {
  if (pointsDelta === 0) return;
  const house = snap.data;
  const nextPoints = Math.max(0, Number(house.points ?? 0) + pointsDelta);
  const nextLifetime =
    pointsDelta > 0
      ? Number(house.lifetimePoints ?? 0) + pointsDelta
      : Number(house.lifetimePoints ?? 0);
  tx.update(snap.ref, { points: nextPoints, lifetimePoints: nextLifetime });
}

function writeHouseRollupsFromDeltasAdmin(
  tx: Transaction,
  snaps: Map<string, HouseRollupAdminSnap>,
  deltas: Map<string, number>,
): void {
  for (const [houseId, delta] of deltas) {
    const snap = snaps.get(houseId);
    if (snap) writeHousePointsRollupAdmin(tx, snap, delta);
  }
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
  if (uniqueIds.length > MAX_CLASSROOM_AWARD_STUDENTS) {
    return { success: false, message: 'Select at most 120 students per award.', count: 0 };
  }

  const desc = classroomActivityDescription(description);
  const now = Date.now();
  const processedCount = await db.runTransaction(async (tx) => {
    let committedCount = 0;
    const schoolRef = db.collection('schools').doc(schoolId);
    const reads: { id: string; ref: DocumentReference; data: DocumentData }[] = [];

    for (const id of uniqueIds) {
      const ref = schoolRef.collection('students').doc(id);
      const snap = await tx.get(ref);
      if (snap.exists) {
        reads.push({ id, ref, data: snap.data()! });
      }
    }

    for (const { id, ref, data } of reads) {
      const current = Number(data.classroomPoints ?? 0);
      const next = Math.max(0, current + signedDelta);
      // Use the clamped delta so period totals stay in sync with the balance.
      const appliedDelta = next - current;
      const periodUpdate = applyPointsByPeriod(
        data.classroomPointsByPeriod as Record<string, number> | undefined,
        appliedDelta,
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
        amount: appliedDelta,
        date: now,
        classroomOnly: true,
      });

      writeClassroomAwardLog(tx, schoolRef, meta, id, data, appliedDelta, desc, now);

      committedCount += 1;
    }
    return committedCount;
  });

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
  if (uniqueIds.length > MAX_CLASSROOM_AWARD_STUDENTS) {
    return { success: false, message: 'Select at most 120 students per award.', count: 0 };
  }

  const desc = description.trim();
  if (!desc) {
    return { success: false, message: 'A description is required.', count: 0 };
  }

  const logDesc = classroomActivityDescription(desc);
  const now = Date.now();
  const rollupHousePoints = options?.rollupHousePoints === true;

  const processedCount = await db.runTransaction(async (tx) => {
    let committedCount = 0;
    const schoolRef = db.collection('schools').doc(schoolId);
    const reads: { id: string; ref: DocumentReference; data: DocumentData }[] = [];
    const houseDeltas = new Map<string, number>();

    for (const id of uniqueIds) {
      const ref = schoolRef.collection('students').doc(id);
      const snap = await tx.get(ref);
      if (snap.exists) {
        reads.push({ id, ref, data: snap.data()! });
      }
    }

    const houseSnaps = rollupHousePoints
      ? await readHouseRollupSnapsAdmin(
          tx,
          db,
          schoolId,
          reads.map((r) => r.data.houseId).filter((id): id is string => Boolean(id)),
        )
      : new Map();

    for (const { id, ref, data } of reads) {
      const currentPoints = Number(data.points ?? 0);
      const appliedDelta = Math.max(0, currentPoints + signedDelta) - currentPoints;
      if (signedDelta > 0) {
        const newPoints = currentPoints + signedDelta;
        const newLifetime = Number(data.lifetimePoints ?? 0) + signedDelta;
        const categoryKey = classroomAwardCategoryKey(meta.teacherId, desc);
        const categoryPoints = {
          ...((data.categoryPoints as Record<string, number> | undefined) ?? {}),
        };
        categoryPoints[categoryKey] = (categoryPoints[categoryKey] || 0) + signedDelta;
        const pointsByPeriodUpdate = applyPointsByPeriod(
          data.pointsByPeriod as Record<string, number> | undefined,
          signedDelta,
          now,
        );
        const categoryPointsByPeriodUpdate = applyCategoryPointsByPeriod(
          data.categoryPointsByPeriod as Record<string, Record<string, number>> | undefined,
          categoryKey,
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
        const newPoints = currentPoints + appliedDelta;
        tx.update(ref, { points: newPoints, updatedAt: now });

        if (rollupHousePoints && data.houseId) {
          houseDeltas.set(
            String(data.houseId),
            (houseDeltas.get(String(data.houseId)) ?? 0) + appliedDelta,
          );
        }
      }

      const activityRef = ref.collection('activities').doc();
      tx.set(activityRef, {
        desc,
        amount: appliedDelta,
        date: now,
      });

      writeClassroomAwardLog(tx, schoolRef, meta, id, data, appliedDelta, logDesc, now);
      committedCount += 1;
    }

    writeHouseRollupsFromDeltasAdmin(tx, houseSnaps, houseDeltas);
    return committedCount;
  });

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
