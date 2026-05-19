import { doc, type Firestore, type Transaction } from 'firebase/firestore';
import type { House } from '../types';

/**
 * Adjust cached house totals when student points change (awards / deductions).
 * Lifetime only increases on positive deltas.
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

  const houseRef = doc(firestore, 'schools', schoolId, 'houses', houseId);
  const houseSnap = await transaction.get(houseRef);
  if (!houseSnap.exists()) return;

  const house = houseSnap.data() as House;
  const nextPoints = Math.max(0, (house.points ?? 0) + pointsDelta);
  const nextLifetime =
    pointsDelta > 0
      ? (house.lifetimePoints ?? 0) + pointsDelta
      : house.lifetimePoints ?? 0;

  transaction.update(houseRef, {
    points: nextPoints,
    lifetimePoints: nextLifetime,
  });
}
