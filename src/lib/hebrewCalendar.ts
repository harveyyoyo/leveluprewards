import { HDate, HebrewCalendar, flags, type Event } from '@hebcal/core';

export type HebrewHolidayEntry = {
  id: string;
  nameEn: string;
  nameHe: string;
  date: Date;
  hebrewDate: string;
};

const HOLIDAY_MASK =
  flags.CHAG | flags.MINOR_FAST | flags.MAJOR_FAST | flags.MODERN_HOLIDAY;

function eventKey(event: Event): string {
  const hd = event.getDate();
  return `${event.basename()}:${hd.getFullYear()}-${hd.getMonth()}-${hd.getDate()}`;
}

function toHolidayEntry(event: Event): HebrewHolidayEntry {
  const hd = event.getDate();
  const greg = hd.greg();
  return {
    id: eventKey(event),
    nameEn: event.render('en'),
    nameHe: event.render('he'),
    date: greg,
    hebrewDate: hd.renderGematriya(true),
  };
}

/** Today's Hebrew date with gematria, e.g. כ״ב סיון תשפ״ו */
export function formatTodayHebrewDate(date: Date = new Date()): string {
  return new HDate(date).renderGematriya(true);
}

/** Gregorian weekday + civil date for pairing with the Hebrew date on displays. */
export function formatCivilDateLabel(date: Date = new Date(), locale = 'en-US'): string {
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Upcoming major Jewish holidays within the next `daysAhead` days. */
export function getUpcomingJewishHolidays(options?: {
  from?: Date;
  daysAhead?: number;
  limit?: number;
}): HebrewHolidayEntry[] {
  const from = options?.from ?? new Date();
  const daysAhead = options?.daysAhead ?? 120;
  const limit = options?.limit ?? 4;

  const start = new HDate(from);
  const end = start.add(daysAhead);

  const events = HebrewCalendar.calendar({
    start: start.greg(),
    end: end.greg(),
    candlelighting: false,
    sedrot: false,
    omer: false,
    mask: HOLIDAY_MASK,
  });

  const today = start.abs();
  const seen = new Set<string>();
  const holidays: HebrewHolidayEntry[] = [];

  for (const event of events) {
    if (!event.getCategories().includes('holiday')) continue;
    if (event.getDate().abs() < today) continue;

    const key = eventKey(event);
    if (seen.has(key)) continue;
    seen.add(key);

    holidays.push(toHolidayEntry(event));
    if (holidays.length >= limit) break;
  }

  return holidays;
}
