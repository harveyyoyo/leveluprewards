import { doc, getDoc, type Firestore } from 'firebase/firestore';
import { lookupStudentId } from '@/lib/db/lookup';
import { isCouponScanCode, normalizeCouponCodeInput } from '@/lib/coupons/couponScanCode';
import { isPrizeScanCode } from '@/lib/prizes/prizeScanCode';
import { isPrizeVoucherScanCode } from '@/lib/prizes/prizeVoucherScanCode';
import { loadCouponSnapshot } from '@/lib/coupons/couponCache';

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

  if (isPrizeVoucherScanCode(trimmed)) {
    return {
      title: "That's a pickup voucher",
      description:
        'Sign in with your student card first, then scan this voucher at the pickup kiosk to collect your prize.',
    };
  }

  if (isPrizeScanCode(trimmed)) {
    return {
      title: "That's a prize shelf card",
      description:
        'Sign in with your student card first. After you are logged in, scan the prize shelf card again to redeem that reward.',
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

  if (isPrizeVoucherScanCode(trimmed)) {
    return {
      title: "That's a pickup voucher",
      description:
        'Pickup vouchers start with VR. Scan the barcode on your printed slip here to collect the prize at this kiosk.',
    };
  }

  if (isPrizeScanCode(trimmed)) {
    return {
      title: "That's a prize shelf card",
      description:
        'Prize shelf barcodes start with PZ. Scan the prize card while you are signed in to redeem it, or tap a reward in the shop.',
    };
  }

  return null;
}
