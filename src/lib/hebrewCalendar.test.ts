import { describe, expect, it } from 'vitest';
import {
  formatCivilDateLabel,
  formatTodayHebrewDate,
  getUpcomingJewishHolidays,
} from './hebrewCalendar';

describe('hebrewCalendar', () => {
  it('formats a Hebrew date string', () => {
    const label = formatTodayHebrewDate(new Date('2026-06-07T12:00:00'));
    expect(label.length).toBeGreaterThan(3);
    expect(label).toMatch(/[א-ת]/);
  });

  it('formats a civil date label', () => {
    expect(formatCivilDateLabel(new Date('2026-06-07T12:00:00'))).toContain('2026');
  });

  it('returns upcoming holidays in chronological order', () => {
    const holidays = getUpcomingJewishHolidays({
      from: new Date('2026-06-07T12:00:00'),
      daysAhead: 180,
      limit: 3,
    });
    expect(holidays.length).toBeGreaterThan(0);
    expect(holidays[0]?.nameEn.length).toBeGreaterThan(2);
    for (let i = 1; i < holidays.length; i += 1) {
      expect(holidays[i]!.date.getTime()).toBeGreaterThanOrEqual(holidays[i - 1]!.date.getTime());
    }
  });
});
