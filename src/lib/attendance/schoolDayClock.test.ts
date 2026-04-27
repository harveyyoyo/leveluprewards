import { describe, it, expect } from 'vitest';
import { getSchoolDayClock } from './schoolDayClock';

/** Jan 1, 2025 9:00 AM UTC */
const t = 1735722000000;

describe('getSchoolDayClock', () => {
  it('uses IANA time zone for minutes and date', () => {
    const c = getSchoolDayClock(t, 'America/New_York', { whenUnset: 'utc' });
    expect(c.year).toBe(2025);
    expect(c.month).toBe(1);
    expect(c.day).toBe(1);
    expect(c.minutesSinceMidnight).toBe(4 * 60);
  });

  it('falls back to utc when whenUnset=utc and no zone', () => {
    const c = getSchoolDayClock(t, undefined, { whenUnset: 'utc' });
    expect(c.minutesSinceMidnight).toBe(9 * 60);
  });
});
