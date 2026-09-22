import type { Coupon, CouponRedemptionScope, Student } from '../types';
import { STAFF_REUSABLE_COUPON_PRINT_NOTE } from './reusableCoupon';

export function normalizeRedemptionScope(
  coupon: Pick<Coupon, 'redemptionScope'>
): CouponRedemptionScope {
  const s = coupon.redemptionScope;
  if (s === 'creator' || s === 'classes' || s === 'teachers' || s === 'students') return s;
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

  if (scope === 'students') {
    const ids = (coupon.allowedStudentIds || []).filter(Boolean);
    if (ids.length === 0) {
      return { ok: false, message: 'This coupon is not set up correctly (no students).' };
    }
    if (!ids.includes(student.id)) {
      return { ok: false, message: 'This coupon is only for selected students.' };
    }
    return { ok: true };
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
  if (scope === 'students') {
    const n = coupon.allowedStudentIds?.length ?? 0;
    return n ? `Redeem: ${n} selected student(s) only` : 'Redeem: selected students';
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
  studentNamesInOrder?: string[];
  maxLength?: number;
  reusable?: boolean;
}): string | undefined {
  /** Short enough to fit one line on the physical coupon (em-scaled cell). */
  const max = input.maxLength ?? 72;
  let scopeNote: string | undefined;
  if (input.scope === 'school') {
    scopeNote = undefined;
  } else if (input.scope === 'creator') {
    const name = input.issuingTeacherDisplayName.trim() || 'Issuing teacher';
    scopeNote = `Redeem only on ${name}'s roster.`;
  } else if (input.scope === 'classes') {
    const names = input.classNamesInOrder.filter(Boolean);
    if (names.length === 0) scopeNote = 'Redeem only in selected classes.';
    else {
      const lead = names.slice(0, 4).join(', ');
      const extra = names.length > 4 ? ` (+${names.length - 4} more)` : '';
      scopeNote = `Redeem only if your class is: ${lead}${extra}`;
    }
  } else if (input.scope === 'students') {
    const names = (input.studentNamesInOrder || []).filter(Boolean);
    if (names.length === 0) scopeNote = 'Redeem only for selected students.';
    else {
      const lead = names.slice(0, 3).join(', ');
      const extra = names.length > 3 ? ` (+${names.length - 3} more)` : '';
      scopeNote = `Redeem only for: ${lead}${extra}`;
    }
  } else {
    const names = input.teacherNamesInOrder.filter(Boolean);
    if (names.length === 0) scopeNote = 'Redeem only for students of selected teachers.';
    else {
      const lead = names.slice(0, 3).join(', ');
      const extra = names.length > 3 ? ` (+${names.length - 3} more)` : '';
      scopeNote = `Redeem only if assigned to: ${lead}${extra}`;
    }
  }

  const reusableLead = input.reusable ? STAFF_REUSABLE_COUPON_PRINT_NOTE : undefined;
  const parts = [reusableLead, scopeNote].filter(Boolean);
  if (parts.length === 0) return undefined;
  const s = parts.join(' ');
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 3))}...`;
}
