/**
 * Mirrors src/lib/couponRedemptionRules.ts for server-side redemption (kept separate because functions bundle does not import app src).
 */

export function normalizeRedemptionScope(coupon: any): "school" | "creator" | "classes" | "teachers" {
  const s = coupon?.redemptionScope;
  if (s === "creator" || s === "classes" || s === "teachers") return s;
  return "school";
}

export function studentMayRedeemCouponData(
  coupon: any,
  student: any,
  classPrimaryTeacherId?: string | null
): { ok: boolean; message?: string } {
  const scope = normalizeRedemptionScope(coupon);
  if (scope === "school") return { ok: true };

  if (scope === "creator") {
    const tid = typeof coupon?.createdByTeacherId === "string" ? coupon.createdByTeacherId : "";
    if (!tid) return { ok: true };
    const teachers = Array.isArray(student?.teacherIds) ? (student.teacherIds as string[]) : [];
    if (teachers.includes(tid)) return { ok: true };
    const classId = typeof student?.classId === "string" ? student.classId : "";
    if (classId && classPrimaryTeacherId === tid) return { ok: true };
    return {
      ok: false,
      message: "This coupon is only for students on the issuing teacher’s roster.",
    };
  }

  if (scope === "classes") {
    const ids = Array.isArray(coupon?.allowedClassIds)
      ? (coupon.allowedClassIds as unknown[]).filter((x): x is string => typeof x === "string" && x.length > 0)
      : [];
    if (ids.length === 0) {
      return { ok: false, message: "This coupon is not set up correctly (no classes)." };
    }
    const sid = typeof student?.classId === "string" ? student.classId : "";
    if (!sid || !ids.includes(sid)) {
      return { ok: false, message: "This coupon is only for students in selected classes." };
    }
    return { ok: true };
  }

  if (scope === "teachers") {
    const ids = Array.isArray(coupon?.allowedTeacherIds)
      ? (coupon.allowedTeacherIds as unknown[]).filter((x): x is string => typeof x === "string" && x.length > 0)
      : [];
    if (ids.length === 0) {
      return { ok: false, message: "This coupon is not set up correctly (no teachers)." };
    }
    const st = new Set(Array.isArray(student?.teacherIds) ? (student.teacherIds as string[]) : []);
    for (const id of ids) {
      if (st.has(id)) return { ok: true };
    }
    if (classPrimaryTeacherId && ids.includes(classPrimaryTeacherId)) return { ok: true };
    return {
      ok: false,
      message: "This coupon is only for students linked to selected teachers.",
    };
  }

  return { ok: true };
}
