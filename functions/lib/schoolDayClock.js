"use strict";
/**
 * KEEP IN SYNC with src/lib/attendance/schoolDayClock.ts (Cloud Functions bundle).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSchoolDayClock = getSchoolDayClock;
const JS_DAY_TO_KEY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const LONG_WEEKDAY_TO_KEY = {
    Sunday: "sun",
    Monday: "mon",
    Tuesday: "tue",
    Wednesday: "wed",
    Thursday: "thu",
    Friday: "fri",
    Saturday: "sat",
};
function clockFromLocalDate(d) {
    var _a;
    return {
        dayOfWeekKey: (_a = JS_DAY_TO_KEY[d.getDay()]) !== null && _a !== void 0 ? _a : "mon",
        minutesSinceMidnight: d.getHours() * 60 + d.getMinutes(),
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
    };
}
function clockFromUtcDate(d) {
    var _a;
    return {
        dayOfWeekKey: (_a = JS_DAY_TO_KEY[d.getUTCDay()]) !== null && _a !== void 0 ? _a : "mon",
        minutesSinceMidnight: d.getUTCHours() * 60 + d.getUTCMinutes(),
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
    };
}
function getSchoolDayClock(nowMs, timeZone, opts) {
    var _a, _b, _c, _d, _e, _f;
    const whenUnset = (_a = opts === null || opts === void 0 ? void 0 : opts.whenUnset) !== null && _a !== void 0 ? _a : "local";
    const d = new Date(nowMs);
    const raw = (timeZone && String(timeZone).trim()) || "";
    if (!raw) {
        return whenUnset === "utc" ? clockFromUtcDate(d) : clockFromLocalDate(d);
    }
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: raw }).format(d);
    }
    catch (_g) {
        return whenUnset === "utc" ? clockFromUtcDate(d) : clockFromLocalDate(d);
    }
    const tz = raw;
    const weekdayLong = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long" }).format(d);
    const dayOfWeekKey = (_b = LONG_WEEKDAY_TO_KEY[weekdayLong]) !== null && _b !== void 0 ? _b : "mon";
    const ymd = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(d);
    const [ys, ms, ds] = ymd.split("-");
    const year = Number(ys);
    const month = Number(ms);
    const day = Number(ds);
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        hourCycle: "h23",
    }).formatToParts(d);
    const hour = Number((_d = (_c = parts.find((p) => p.type === "hour")) === null || _c === void 0 ? void 0 : _c.value) !== null && _d !== void 0 ? _d : "0");
    const minute = Number((_f = (_e = parts.find((p) => p.type === "minute")) === null || _e === void 0 ? void 0 : _e.value) !== null && _f !== void 0 ? _f : "0");
    const minutesSinceMidnight = (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0);
    return {
        dayOfWeekKey,
        minutesSinceMidnight,
        year: Number.isFinite(year) ? year : d.getFullYear(),
        month: Number.isFinite(month) ? month : d.getMonth() + 1,
        day: Number.isFinite(day) ? day : d.getDate(),
    };
}
//# sourceMappingURL=schoolDayClock.js.map