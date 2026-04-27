/**
 * School calendar clock in an IANA time zone, used for attendance periods
 * and duplicate session keys. Keeps client fallback and Cloud Functions
 * consistent when `attendanceTimeZone` is set on the school config doc.
 *
 * A copy for Cloud Functions lives in `functions/src/schoolDayClock.ts` (keep in sync).
 */

export type DayOfWeekKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export interface SchoolDayClock {
  dayOfWeekKey: DayOfWeekKey;
  minutesSinceMidnight: number;
  year: number;
  month: number;
  day: number;
}

const JS_DAY_TO_KEY: DayOfWeekKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const LONG_WEEKDAY_TO_KEY: Record<string, DayOfWeekKey> = {
  Sunday: 'sun',
  Monday: 'mon',
  Tuesday: 'tue',
  Wednesday: 'wed',
  Thursday: 'thu',
  Friday: 'fri',
  Saturday: 'sat',
};

function clockFromLocalDate(d: Date): SchoolDayClock {
  return {
    dayOfWeekKey: JS_DAY_TO_KEY[d.getDay()] ?? 'mon',
    minutesSinceMidnight: d.getHours() * 60 + d.getMinutes(),
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}

function clockFromUtcDate(d: Date): SchoolDayClock {
  return {
    dayOfWeekKey: JS_DAY_TO_KEY[d.getUTCDay()] ?? 'mon',
    minutesSinceMidnight: d.getUTCHours() * 60 + d.getUTCMinutes(),
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

/**
 * @param timeZone IANA name (e.g. `America/Chicago`) or empty/undefined
 * @param whenUnset If `timeZone` is empty/invalid: `local` = device local (client),
 *                  `utc` = UTC (server default when not configured, legacy).
 */
export function getSchoolDayClock(
  nowMs: number,
  timeZone: string | undefined | null,
  opts?: { whenUnset: 'local' | 'utc' }
): SchoolDayClock {
  const whenUnset = opts?.whenUnset ?? 'local';
  const d = new Date(nowMs);
  const raw = (timeZone && String(timeZone).trim()) || '';
  if (!raw) {
    return whenUnset === 'utc' ? clockFromUtcDate(d) : clockFromLocalDate(d);
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: raw }).format(d);
  } catch {
    return whenUnset === 'utc' ? clockFromUtcDate(d) : clockFromLocalDate(d);
  }

  const tz = raw;
  const weekdayLong = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(d);
  const dayOfWeekKey = LONG_WEEKDAY_TO_KEY[weekdayLong] ?? 'mon';

  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  const [ys, ms, ds] = ymd.split('-');
  const year = Number(ys);
  const month = Number(ms);
  const day = Number(ds);

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  } as Intl.DateTimeFormatOptions).formatToParts(d);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const minutesSinceMidnight = (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0);

  return {
    dayOfWeekKey,
    minutesSinceMidnight,
    year: Number.isFinite(year) ? year : d.getFullYear(),
    month: Number.isFinite(month) ? month : d.getMonth() + 1,
    day: Number.isFinite(day) ? day : d.getDate(),
  };
}

export function getSuggestedTimeZoneId(): string | undefined {
  if (typeof Intl === 'undefined' || typeof Intl.DateTimeFormat !== 'function') return undefined;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/** Curated for selects; any valid IANA ID can still be stored in config. */
export const ATTENDANCE_TIMEZONE_OPTIONS: { id: string; label: string }[] = [
  { id: 'UTC', label: 'UTC' },
  { id: 'America/Halifax', label: 'Atlantic (Halifax)' },
  { id: 'America/New_York', label: 'Eastern (New York)' },
  { id: 'America/Chicago', label: 'Central (Chicago)' },
  { id: 'America/Denver', label: 'Mountain (Denver)' },
  { id: 'America/Phoenix', label: 'Arizona (Phoenix)' },
  { id: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
  { id: 'America/Anchorage', label: 'Alaska (Anchorage)' },
  { id: 'Pacific/Honolulu', label: 'Hawaii' },
  { id: 'Europe/London', label: 'UK (London)' },
  { id: 'Europe/Paris', label: 'Central Europe (Paris)' },
  { id: 'Asia/Tokyo', label: 'Japan (Tokyo)' },
  { id: 'Asia/Singapore', label: 'Singapore' },
  { id: 'Australia/Sydney', label: 'Australia (Sydney)' },
];
