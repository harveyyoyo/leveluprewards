import { doc, getDoc, type Firestore } from 'firebase/firestore';
import type { Student } from '@/lib/types';
import { startRecessCheckout, endRecessCheckout } from '@/lib/db/recess';
import { parseRecessPassScanCode } from '@/lib/recess/recessPassScanCode';
import type { RecessReason } from '@/lib/types';

export type RecessPassScanResult =
  | { action: 'not_pass' }
  | { action: 'checkout'; reason: RecessReason }
  | { action: 'checkin'; reason: RecessReason; durationMs: number; overLimit: boolean };

/**
 * Student kiosk: scan a physical recess pass at the coupon scanner.
 * - Not checked out → check out for that pass reason.
 * - Already out → scan any recess pass again to check back in.
 */
export async function performRecessPassScan(
  firestore: Firestore,
  schoolId: string,
  student: Student,
  rawCode: string,
  maxMinutes: number,
): Promise<RecessPassScanResult> {
  const reason = parseRecessPassScanCode(rawCode);
  if (!reason) return { action: 'not_pass' };

  const activeRef = doc(firestore, 'schools', schoolId, 'recessActive', student.id);
  const activeSnap = await getDoc(activeRef);

  if (activeSnap.exists()) {
    const log = await endRecessCheckout(firestore, schoolId, student.id, maxMinutes);
    return {
      action: 'checkin',
      reason: log?.reason ?? reason,
      durationMs: log?.durationMs ?? 0,
      overLimit: log?.overLimit ?? false,
    };
  }

  await startRecessCheckout(firestore, schoolId, student, {
    reason,
    classId: student.classId,
    staffName: 'Recess pass scan',
  });
  return { action: 'checkout', reason };
}
