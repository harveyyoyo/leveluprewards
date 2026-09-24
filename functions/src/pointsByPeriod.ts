/**
 * KEEP IN SYNC with getPeriodKeys / applyPointsByPeriod / applyCategoryPointsByPeriod
 * in src/lib/db/helpers.ts. Same keys, but built from a calendar date (the school's
 * day) instead of the server's own clock, which runs on UTC.
 */

export interface CalendarDate {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
}

export function getPeriodKeysForDate(date: CalendarDate): {
  day: string;
  week: string;
  month: string;
  semester: string;
  year: string;
  all_time: string;
} {
  const y = date.year;
  const m = date.month;
  const day = `${y}-${String(m).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
  const month = `${y}-${String(m).padStart(2, "0")}`;
  const semester = m <= 6 ? `${y}-H1` : `${y}-H2`;
  const year = String(y);

  // ISO week logic
  const d2 = new Date(Date.UTC(y, m - 1, date.day));
  const dayNum = d2.getUTCDay() || 7;
  d2.setUTCDate(d2.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d2.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d2.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const week = `${d2.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;

  return { day, week, month, semester, year, all_time: "all" };
}

export function applyPointsByPeriod(
  current: Record<string, number> | undefined | null,
  points: number,
  date: CalendarDate
): Record<string, number> {
  const keys = getPeriodKeysForDate(date);
  const periodKeys = [keys.day, keys.week, keys.month, keys.semester, keys.year, keys.all_time];
  const next = { ...(current || {}) } as Record<string, number>;
  for (const key of periodKeys) {
    next[key] = (next[key] || 0) + points;
  }
  return next;
}

export function applyCategoryPointsByPeriod(
  current: Record<string, Record<string, number>> | undefined | null,
  categoryName: string,
  points: number,
  date: CalendarDate
): Record<string, Record<string, number>> {
  const keys = getPeriodKeysForDate(date);
  const periodKeys = [keys.month, keys.semester, keys.year, keys.all_time];
  const next = { ...(current || {}) } as Record<string, Record<string, number>>;
  for (const key of periodKeys) {
    next[key] = { ...(next[key] || {}) };
    next[key][categoryName] = (next[key][categoryName] || 0) + points;
  }
  return next;
}
