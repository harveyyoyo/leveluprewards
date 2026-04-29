"use strict";
/**
 * Mirrors src/lib/couponRedemptionRules.ts for server-side redemption (kept separate because functions bundle does not import app src).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeRedemptionScope = normalizeRedemptionScope;
exports.studentMayRedeemCouponData = studentMayRedeemCouponData;
function normalizeRedemptionScope(coupon) {
    const s = coupon === null || coupon === void 0 ? void 0 : coupon.redemptionScope;
    if (s === "creator" || s === "classes" || s === "teachers")
        return s;
    return "school";
}
function studentMayRedeemCouponData(coupon, student, classPrimaryTeacherId) {
    const scope = normalizeRedemptionScope(coupon);
    if (scope === "school")
        return { ok: true };
    if (scope === "creator") {
        const tid = typeof (coupon === null || coupon === void 0 ? void 0 : coupon.createdByTeacherId) === "string" ? coupon.createdByTeacherId : "";
        if (!tid)
            return { ok: true };
        const teachers = Array.isArray(student === null || student === void 0 ? void 0 : student.teacherIds) ? student.teacherIds : [];
        if (teachers.includes(tid))
            return { ok: true };
        const classId = typeof (student === null || student === void 0 ? void 0 : student.classId) === "string" ? student.classId : "";
        if (classId && classPrimaryTeacherId === tid)
            return { ok: true };
        return {
            ok: false,
            message: "This coupon is only for students on the issuing teacher’s roster.",
        };
    }
    if (scope === "classes") {
        const ids = Array.isArray(coupon === null || coupon === void 0 ? void 0 : coupon.allowedClassIds)
            ? coupon.allowedClassIds.filter((x) => typeof x === "string" && x.length > 0)
            : [];
        if (ids.length === 0) {
            return { ok: false, message: "This coupon is not set up correctly (no classes)." };
        }
        const sid = typeof (student === null || student === void 0 ? void 0 : student.classId) === "string" ? student.classId : "";
        if (!sid || !ids.includes(sid)) {
            return { ok: false, message: "This coupon is only for students in selected classes." };
        }
        return { ok: true };
    }
    if (scope === "teachers") {
        const ids = Array.isArray(coupon === null || coupon === void 0 ? void 0 : coupon.allowedTeacherIds)
            ? coupon.allowedTeacherIds.filter((x) => typeof x === "string" && x.length > 0)
            : [];
        if (ids.length === 0) {
            return { ok: false, message: "This coupon is not set up correctly (no teachers)." };
        }
        const st = new Set(Array.isArray(student === null || student === void 0 ? void 0 : student.teacherIds) ? student.teacherIds : []);
        for (const id of ids) {
            if (st.has(id))
                return { ok: true };
        }
        if (classPrimaryTeacherId && ids.includes(classPrimaryTeacherId))
            return { ok: true };
        return {
            ok: false,
            message: "This coupon is only for students linked to selected teachers.",
        };
    }
    return { ok: true };
}
//# sourceMappingURL=couponRedemption.js.map