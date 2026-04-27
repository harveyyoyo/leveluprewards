"use strict";
/**
 * KEEP IN SYNC with src/lib/attendance/resolveSettings.ts (Cloud Functions bundle).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EARLY_SIGN_IN_WINDOW_MINUTES = exports.DEFAULT_ATTENDANCE_SETTINGS = void 0;
exports.resolveAttendanceSettingsForSignIn = resolveAttendanceSettingsForSignIn;
const schoolDayClock_1 = require("./schoolDayClock");
exports.DEFAULT_ATTENDANCE_SETTINGS = {
    pointsForSignIn: 1,
    pointsForOnTime: 5,
    onTimeWindowMinutes: 5,
    schedule: [],
};
exports.EARLY_SIGN_IN_WINDOW_MINUTES = 10;
function toFiniteNumber(value, fallback) {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    return Number.isFinite(n) ? n : fallback;
}
function hasPointFields(raw) {
    if (!raw)
        return false;
    const a = raw.pointsForSignIn;
    const b = raw.pointsForOnTime;
    const isNumeric = (v) => typeof v === 'number' ? Number.isFinite(v) : typeof v === 'string' ? Number.isFinite(Number(v)) : false;
    return isNumeric(a) || isNumeric(b);
}
function resolveRulePeriod(rule, periods) {
    if (rule.customPeriod)
        return rule.customPeriod;
    const slot = periods.find((p) => p.id === rule.periodId);
    return slot ? { label: slot.label, startTime: slot.startTime, endTime: slot.endTime } : null;
}
function normalizeConfig(raw) {
    if (!hasPointFields(raw))
        return null;
    const r = raw;
    const enabledClassIds = Array.isArray(r.enabledClassIds) ? r.enabledClassIds : undefined;
    return {
        pointsForSignIn: toFiniteNumber(r.pointsForSignIn, exports.DEFAULT_ATTENDANCE_SETTINGS.pointsForSignIn),
        pointsForOnTime: toFiniteNumber(r.pointsForOnTime, exports.DEFAULT_ATTENDANCE_SETTINGS.pointsForOnTime),
        onTimeWindowMinutes: toFiniteNumber(r.onTimeWindowMinutes, exports.DEFAULT_ATTENDANCE_SETTINGS.onTimeWindowMinutes),
        enabledClassIds: (enabledClassIds === null || enabledClassIds === void 0 ? void 0 : enabledClassIds.length) ? enabledClassIds : undefined,
        classPeriodAssignments: r.classPeriodAssignments && typeof r.classPeriodAssignments === 'object'
            ? r.classPeriodAssignments
            : undefined,
        classPeriodAssignmentsByDay: r.classPeriodAssignmentsByDay && typeof r.classPeriodAssignmentsByDay === 'object'
            ? r.classPeriodAssignmentsByDay
            : undefined,
        categoryId: typeof r.categoryId === 'string' ? r.categoryId : undefined,
        schedule: Array.isArray(r.schedule) ? r.schedule : [],
        attendanceTimeZone: typeof r.attendanceTimeZone === 'string' && String(r.attendanceTimeZone).trim()
            ? String(r.attendanceTimeZone).trim()
            : undefined,
    };
}
function normalizeTeacherConfig(raw, teacherId) {
    const base = normalizeConfig(raw);
    return base ? Object.assign(Object.assign({}, base), { teacherId }) : null;
}
function normalizeSchoolConfig(raw) {
    return normalizeConfig(raw);
}
function resolveAttendanceSettingsForSignIn(input) {
    var _a, _b;
    const { nowMs, student, classes, periods, teacherRewards, teacherConfigRaw, schoolConfigRaw } = input;
    const studentClassId = (student.classId || '').trim();
    const classForStudent = studentClassId ? classes.find((c) => c.id === studentClassId) : undefined;
    const teacherId = ((classForStudent === null || classForStudent === void 0 ? void 0 : classForStudent.primaryTeacherId) || '').trim() || undefined;
    const schoolTimeZone = schoolConfigRaw && typeof schoolConfigRaw['attendanceTimeZone'] === 'string'
        ? String(schoolConfigRaw['attendanceTimeZone']).trim() || undefined
        : undefined;
    const withSchoolTz = (s) => schoolTimeZone ? Object.assign(Object.assign({}, s), { attendanceTimeZone: schoolTimeZone }) : Object.assign(Object.assign({}, s), { attendanceTimeZone: s.attendanceTimeZone });
    const nowMinutes = (0, schoolDayClock_1.getSchoolDayClock)(nowMs, schoolTimeZone, { whenUnset: 'utc' }).minutesSinceMidnight;
    const parse = (hhmm) => {
        const [h, m] = hhmm.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    };
    const enabledRules = teacherRewards.filter((r) => r.enabled);
    const matchingRule = enabledRules.find((r) => {
        if (!studentClassId || r.classId !== studentClassId)
            return false;
        const period = resolveRulePeriod(r, periods);
        if (!period)
            return false;
        const start = parse(period.startTime);
        const end = parse(period.endTime);
        return nowMinutes >= start - exports.EARLY_SIGN_IN_WINDOW_MINUTES && nowMinutes <= end;
    });
    if (matchingRule && teacherId) {
        const period = resolveRulePeriod(matchingRule, periods);
        if (period) {
            const slotId = matchingRule.periodId || `custom_${matchingRule.id}`;
            const settings = {
                pointsForSignIn: matchingRule.pointsForSignIn,
                pointsForOnTime: matchingRule.pointsForOnTime,
                onTimeWindowMinutes: (_a = matchingRule.onTimeWindowMinutes) !== null && _a !== void 0 ? _a : 15,
                enabledClassIds: [studentClassId],
                classPeriodAssignments: { [studentClassId]: slotId },
                schedule: [
                    {
                        id: slotId,
                        label: period.label,
                        startTime: period.startTime,
                        endTime: period.endTime,
                    },
                ],
                categoryId: matchingRule.categoryId,
                teacherId,
            };
            return { ok: true, settings: withSchoolTz(settings), source: 'reward_rule' };
        }
    }
    let legacy = null;
    let source = 'default';
    if (teacherId) {
        const t = normalizeTeacherConfig(teacherConfigRaw, teacherId);
        if (t) {
            legacy = t;
            source = 'teacher_legacy';
        }
    }
    if (!legacy) {
        const s = normalizeSchoolConfig(schoolConfigRaw);
        if (s) {
            legacy = s;
            source = 'school_legacy';
        }
    }
    if (!legacy) {
        legacy = teacherId
            ? Object.assign(Object.assign({}, exports.DEFAULT_ATTENDANCE_SETTINGS), { teacherId }) : Object.assign({}, exports.DEFAULT_ATTENDANCE_SETTINGS);
    }
    const schedule = Array.isArray(periods) && periods.length > 0 ? periods : (_b = legacy.schedule) !== null && _b !== void 0 ? _b : [];
    return { ok: true, settings: withSchoolTz(Object.assign(Object.assign({}, legacy), { schedule })), source };
}
//# sourceMappingURL=attendanceResolveCore.js.map