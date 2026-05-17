import { doc, getDoc, type Firestore } from 'firebase/firestore';
import { lookupStudentId } from '@/lib/db/lookup';
import { isCouponScanCode, normalizeCouponCodeInput } from '@/lib/couponScanCode';
import { isPrizeScanCode } from '@/lib/prizeScanCode';
import { loadCouponSnapshot } from '@/lib/couponCache';

export type ScanMismatchAlert = {
  title: string;
  description: string;
};

/** Student scanned a coupon (or prize card) at kiosk login instead of their ID card. */
export async function scanMismatchAtStudentLogin(
  firestore: Firestore | null | undefined,
  schoolId: string,
  rawCode: string,
): Promise<ScanMismatchAlert | null> {
  const trimmed = rawCode.trim();
  if (!trimmed) return null;

  if (isCouponScanCode(trimmed)) {
    const code = normalizeCouponCodeInput(trimmed);
    let knownCoupon = false;
    if (firestore && schoolId) {
      try {
        const snap = await getDoc(doc(firestore, 'schools', schoolId, 'coupons', code));
        knownCoupon = snap.exists();
      } catch {
        // ignore — format-based hint still helps
      }
    }
    if (!knownCoupon && schoolId) {
      knownCoupon = Boolean(loadCouponSnapshot(schoolId)?.couponsByCode[code]);
    }

    if (knownCoupon) {
      return {
        title: "That's a coupon code",
        description:
          'Sign in with your student card first. After you are logged in, use Redeem Coupon to add your points.',
      };
    }
    return {
      title: 'That looks like a coupon code',
      description:
        'Coupon codes are the 6-digit number on your reward slip. Sign in with your student card here, then redeem the coupon after login.',
    };
  }

  if (isPrizeScanCode(trimmed)) {
    return {
      title: "That's a prize shelf card",
      description:
        'Prize shelf barcodes start with PZ and are used in the rewards shop after you sign in. Scan your student card here to log in.',
    };
  }

  return null;
}

/** Student scanned their card (or a prize barcode) in the coupon redemption field. */
export async function scanMismatchAtCouponRedeem(
  firestore: Firestore | null | undefined,
  schoolId: string,
  rawCode: string,
): Promise<ScanMismatchAlert | null> {
  const trimmed = rawCode.trim();
  if (!trimmed || !schoolId) return null;

  if (firestore) {
    try {
      const studentId = await lookupStudentId(firestore, schoolId, trimmed);
      if (studentId) {
        return {
          title: "That's your student card",
          description:
            'Use your card at the login screen to sign in. After you are logged in, enter coupon codes in the Redeem Coupon section.',
        };
      }
    } catch {
      // fall through to format hints
    }
  }

  if (isPrizeScanCode(trimmed)) {
    return {
      title: "That's a prize shelf card",
      description:
        'Shelf barcodes start with PZ. Open the rewards shop to redeem prizes — coupon codes are 6-digit numbers on reward slips.',
    };
  }

  return null;
}
