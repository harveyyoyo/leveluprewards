import { doc, type DocumentReference, type Firestore, type Transaction } from 'firebase/firestore';
import type { House } from '../types';

export type HouseRollupSnap = {
  ref: DocumentReference;
  data: House;
};

/** Read house totals during the transaction read phase (before any writes). */
export async function readHouseRollupSnap(
  transaction: Transaction,
  firestore: Firestore,
  schoolId: string,
  houseId: string,
): Promise<HouseRollupSnap | null> {
  const houseRef = doc(firestore, 'schools', schoolId, 'houses', houseId);
  const houseSnap = await transaction.get(houseRef);
  if (!houseSnap.exists()) return null;
  return { ref: houseRef, data: houseSnap.data() as House };
}

export async function readHouseRollupSnaps(
  transaction: Transaction,
  firestore: Firestore,
  schoolId: string,
  houseIds: Iterable<string>,
): Promise<Map<string, HouseRollupSnap>> {
  const map = new Map<string, HouseRollupSnap>();
  for (const houseId of [...new Set(houseIds)].filter((id) => id.trim().length > 0)) {
    const snap = await readHouseRollupSnap(transaction, firestore, schoolId, houseId);
    if (snap) map.set(houseId, snap);
  }
  return map;
}

/** Apply a pre-read house snapshot during the transaction write phase. */
export function writeHousePointsRollup(
  transaction: Transaction,
  snap: HouseRollupSnap,
  pointsDelta: number,
): void {
  if (pointsDelta === 0) return;

  const nextPoints = Math.max(0, (snap.data.points ?? 0) + pointsDelta);
  const nextLifetime =
    pointsDelta > 0
      ? (snap.data.lifetimePoints ?? 0) + pointsDelta
      : snap.data.lifetimePoints ?? 0;

  transaction.update(snap.ref, {
    points: nextPoints,
    lifetimePoints: nextLifetime,
  });
}

export function writeHousePointsRollupsFromDeltas(
  transaction: Transaction,
  snaps: Map<string, HouseRollupSnap>,
  deltas: Map<string, number>,
): void {
  for (const [houseId, delta] of deltas) {
    const snap = snaps.get(houseId);
    if (snap) writeHousePointsRollup(transaction, snap, delta);
  }
}

/**
 * Adjust cached house totals when student points change (awards / deductions).
 * Lifetime only increases on positive deltas.
 *
 * @deprecated Prefer readHouseRollupSnap + writeHousePointsRollup so house reads
 * happen before other transaction writes.
 */
export async function applyHousePointsRollupInTransaction(
  transaction: Transaction,
  firestore: Firestore,
  schoolId: string,
  houseId: string | undefined,
  pointsDelta: number,
  rollupEnabled: boolean,
): Promise<void> {
  if (!rollupEnabled || !houseId || pointsDelta === 0) return;
  const snap = await readHouseRollupSnap(transaction, firestore, schoolId, houseId);
  if (snap) writeHousePointsRollup(transaction, snap, pointsDelta);
}
