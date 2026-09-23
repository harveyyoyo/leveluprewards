import type { OfficeClass, OfficeScheduleBlock } from '@/lib/office/types';

/** 0 = Sunday … 6 = Saturday (matches `Date.getDay()`). Shown Sunday-first for a school week. */
export const OFFICE_WEEK_DAYS = [
  { day: 0, short: 'Sun', long: 'Sunday' },
  { day: 1, short: 'Mon', long: 'Monday' },
  { day: 2, short: 'Tue', long: 'Tuesday' },
  { day: 3, short: 'Wed', long: 'Wednesday' },
  { day: 4, short: 'Thu', long: 'Thursday' },
  { day: 5, short: 'Fri', long: 'Friday' },
  { day: 6, short: 'Sat', long: 'Saturday' },
] as const;

/** "09:05" → minutes after midnight; NaN when malformed. */
export function scheduleMinutes(time: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return Number.NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return Number.NaN;
  return h * 60 + min;
}

/** "13:30" → "1:30 PM". */
export function formatScheduleTime(time: string): string {
  const total = scheduleMinutes(time);
  if (Number.isNaN(total)) return time;
  const h = Math.floor(total / 60);
  const min = total % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(min).padStart(2, '0')} ${suffix}`;
}

/** "Mon, Wed" / "Mon–Fri" / "Every day". */
export function formatScheduleDays(days: number[]): string {
  const sorted = Array.from(new Set(days)).sort((a, b) => a - b);
  if (sorted.length === 7) return 'Every day';
  const isRun = sorted.length >= 3 && sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  const short = (d: number) => OFFICE_WEEK_DAYS[d]?.short ?? '?';
  if (isRun) return `${short(sorted[0])}–${short(sorted[sorted.length - 1])}`;
  return sorted.map(short).join(', ');
}

export function formatScheduleBlockTime(block: Pick<OfficeScheduleBlock, 'startTime' | 'endTime'>): string {
  return `${formatScheduleTime(block.startTime)}–${formatScheduleTime(block.endTime)}`;
}

/** Problems with a block before saving, in plain words; empty when it's fine. */
export function validateScheduleBlock(
  block: Pick<OfficeScheduleBlock, 'subject' | 'days' | 'startTime' | 'endTime'>,
): string | null {
  if (!block.subject.trim()) return 'Add a subject or name for this time.';
  if (block.days.length === 0) return 'Pick at least one day.';
  const start = scheduleMinutes(block.startTime);
  const end = scheduleMinutes(block.endTime);
  if (Number.isNaN(start) || Number.isNaN(end)) return 'Enter a start and end time.';
  if (end <= start) return 'The end time must be after the start time.';
  return null;
}

function overlaps(a: Pick<OfficeScheduleBlock, 'days' | 'startTime' | 'endTime'>, b: Pick<OfficeScheduleBlock, 'days' | 'startTime' | 'endTime'>) {
  if (!a.days.some((d) => b.days.includes(d))) return false;
  return scheduleMinutes(a.startTime) < scheduleMinutes(b.endTime) && scheduleMinutes(b.startTime) < scheduleMinutes(a.endTime);
}

export type ScheduleConflict = { className: string; block: OfficeScheduleBlock };

/** Other blocks (in any class) where the same teacher is already booked at an overlapping time. */
export function findTeacherScheduleConflicts(
  classes: OfficeClass[],
  candidate: Pick<OfficeScheduleBlock, 'id' | 'teacherId' | 'days' | 'startTime' | 'endTime'>,
): ScheduleConflict[] {
  if (!candidate.teacherId) return [];
  const conflicts: ScheduleConflict[] = [];
  for (const cls of classes) {
    for (const block of cls.schedule ?? []) {
      if (block.id === candidate.id || block.teacherId !== candidate.teacherId) continue;
      if (overlaps(block, candidate)) conflicts.push({ className: cls.name, block });
    }
  }
  return conflicts;
}

/** Sorted by first day, then start time. */
export function sortScheduleBlocks<T extends Pick<OfficeScheduleBlock, 'days' | 'startTime'>>(blocks: T[]): T[] {
  return blocks.slice().sort((a, b) => {
    const da = Math.min(...a.days);
    const db = Math.min(...b.days);
    if (da !== db) return da - db;
    return scheduleMinutes(a.startTime) - scheduleMinutes(b.startTime);
  });
}

export type TeacherWeekItem = { day: number; className: string; classId: string; block: OfficeScheduleBlock };

/** One teacher's week, day by day, each day sorted by time. */
export function teacherWeek(classes: OfficeClass[], teacherId: string): Array<{ day: number; items: TeacherWeekItem[] }> {
  const byDay = new Map<number, TeacherWeekItem[]>();
  for (const cls of classes) {
    for (const block of cls.schedule ?? []) {
      if (block.teacherId !== teacherId) continue;
      for (const day of block.days) {
        const list = byDay.get(day) ?? [];
        list.push({ day, className: cls.name, classId: cls.id, block });
        byDay.set(day, list);
      }
    }
  }
  return OFFICE_WEEK_DAYS.filter((d) => byDay.has(d.day)).map((d) => ({
    day: d.day,
    items: byDay.get(d.day)!.sort((a, b) => scheduleMinutes(a.block.startTime) - scheduleMinutes(b.block.startTime)),
  }));
}
