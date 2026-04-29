import type { Coupon, CouponRedemptionScope, Student } from './types';

export function normalizeRedemptionScope(
  coupon: Pick<Coupon, 'redemptionScope'>
): 'school' | 'creator' | 'classes' | 'teachers' {
  const s = coupon.redemptionScope;
  if (s === 'creator' || s === 'classes' || s === 'teachers') return s;
  return 'school';
}

/** Restricted coupons cannot be validated offline; require online redemption. */
export function couponRequiresOnlineRedemption(coupon: Pick<Coupon, 'redemptionScope'>): boolean {
  return normalizeRedemptionScope(coupon) !== 'school';
}

export function studentMayRedeemCoupon(
  coupon: Coupon,
  student: Student,
  classPrimaryTeacherId?: string | null
): { ok: boolean; message?: string } {
  const scope = normalizeRedemptionScope(coupon);
  if (scope === 'school') return { ok: true };

  if (scope === 'creator') {
    const tid = coupon.createdByTeacherId;
    if (!tid) return { ok: true };
    const teachers = student.teacherIds || [];
    if (teachers.includes(tid)) return { ok: true };
    if (student.classId && classPrimaryTeacherId === tid) return { ok: true };
    return {
      ok: false,
      message: 'This coupon is only for students on the issuing teacher’s roster.',
    };
  }

  if (scope === 'classes') {
    const ids = (coupon.allowedClassIds || []).filter(Boolean);
    if (ids.length === 0) {
      return { ok: false, message: 'This coupon is not set up correctly (no classes).' };
    }
    if (!student.classId || !ids.includes(student.classId)) {
      return { ok: false, message: 'This coupon is only for students in selected classes.' };
    }
    return { ok: true };
  }

  if (scope === 'teachers') {
    const ids = (coupon.allowedTeacherIds || []).filter(Boolean);
    if (ids.length === 0) {
      return { ok: false, message: 'This coupon is not set up correctly (no teachers).' };
    }
    const st = new Set(student.teacherIds || []);
    for (const id of ids) {
      if (st.has(id)) return { ok: true };
    }
    if (classPrimaryTeacherId && ids.includes(classPrimaryTeacherId)) return { ok: true };
    return {
      ok: false,
      message: 'This coupon is only for students linked to selected teachers.',
    };
  }

  return { ok: true };
}

export function describeCouponRedemptionSummary(coupon: Coupon): string | null {
  const scope = normalizeRedemptionScope(coupon);
  if (scope === 'school') return null;
  if (scope === 'creator') return 'Redeem: issuing teacher’s students only';
  if (scope === 'classes') {
    const n = coupon.allowedClassIds?.length ?? 0;
    return n ? `Redeem: ${n} selected class(es) only` : 'Redeem: selected classes';
  }
  const n = coupon.allowedTeacherIds?.length ?? 0;
  return n ? `Redeem: ${n} selected teacher(s) only` : 'Redeem: selected teachers';
}

/** Short text for the physical coupon; prefers stored note from print time, else generic summary. */
export function couponRedemptionLabelForPrint(coupon: Coupon): string | undefined {
  const explicit = coupon.redemptionPrintNote?.trim();
  if (explicit) return explicit;
  return describeCouponRedemptionSummary(coupon) ?? undefined;
}

/** Build the note stored on each coupon when the teacher prints (includes class/teacher names). */
export function buildRedemptionPrintNote(input: {
  scope: CouponRedemptionScope;
  issuingTeacherDisplayName: string;
  classNamesInOrder: string[];
  teacherNamesInOrder: string[];
  maxLength?: number;
}): string | undefined {
  const max = input.maxLength ?? 118;
  if (input.scope === 'school') return undefined;

  let s: string;
  if (input.scope === 'creator') {
    const name = input.issuingTeacherDisplayName.trim() || 'Issuing teacher';
    s = `Redeem only on ${name}'s roster.`;
  } else if (input.scope === 'classes') {
    const names = input.classNamesInOrder.filter(Boolean);
    if (names.length === 0) s = 'Redeem only in selected classes.';
    else {
      const lead = names.slice(0, 4).join(', ');
      const extra = names.length > 4 ? ` (+${names.length - 4} more)` : '';
      s = `Redeem only if your class is: ${lead}${extra}`;
    }
  } else {
    const names = input.teacherNamesInOrder.filter(Boolean);
    if (names.length === 0) s = 'Redeem only for students of selected teachers.';
    else {
      const lead = names.slice(0, 3).join(', ');
      const extra = names.length > 3 ? ` (+${names.length - 3} more)` : '';
      s = `Redeem only if assigned to: ${lead}${extra}`;
    }
  }

  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 3))}...`;
}
