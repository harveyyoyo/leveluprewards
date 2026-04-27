import { describe, it, expect } from 'vitest';
import {
  resolveAttendanceSettingsForSignIn,
  DEFAULT_ATTENDANCE_SETTINGS,
} from './resolveSettings';

describe('resolveAttendanceSettingsForSignIn', () => {
  const student = { id: 's1', classId: 'c1', firstName: 'A', lastName: 'B' };
  const classes = [{ id: 'c1', primaryTeacherId: 't1' }];
  const periods = [{ id: 'p1', label: 'Period 1', startTime: '08:00', endTime: '09:00' }];

  it('uses matching reward rule when now is inside window', () => {
    const nowMs = new Date('2026-01-05T08:30:00Z').getTime();
    const r = resolveAttendanceSettingsForSignIn({
      nowMs,
      student,
      classes,
      periods,
      teacherRewards: [
        {
          id: 'r1',
          enabled: true,
          classId: 'c1',
          periodId: 'p1',
          pointsForSignIn: 5,
          pointsForOnTime: 2,
          onTimeWindowMinutes: 10,
        },
      ],
      teacherConfigRaw: null,
      schoolConfigRaw: null,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.source).toBe('reward_rule');
      expect(r.settings.pointsForSignIn).toBe(5);
      expect(r.settings.teacherId).toBe('t1');
    }
  });

  it('uses the school time zone even when the school config only stores timezone', () => {
    const nowMs = Date.UTC(2026, 0, 5, 13, 30); // 8:30 AM in America/New_York
    const r = resolveAttendanceSettingsForSignIn({
      nowMs,
      student,
      classes,
      periods,
      teacherRewards: [
        {
          id: 'r1',
          enabled: true,
          classId: 'c1',
          periodId: 'p1',
          pointsForSignIn: 5,
          pointsForOnTime: 2,
          onTimeWindowMinutes: 10,
        },
      ],
      teacherConfigRaw: null,
      schoolConfigRaw: { attendanceTimeZone: 'America/New_York' },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.source).toBe('reward_rule');
      expect(r.settings.attendanceTimeZone).toBe('America/New_York');
    }
  });

  it('ignores disabled reward rules and falls through to defaults', () => {
    const nowMs = new Date('2026-01-05T08:30:00Z').getTime();
    const r = resolveAttendanceSettingsForSignIn({
      nowMs,
      student,
      classes,
      periods,
      teacherRewards: [
        {
          id: 'r1',
          enabled: false,
          classId: 'c1',
          periodId: 'p1',
          pointsForSignIn: 50,
          pointsForOnTime: 20,
          onTimeWindowMinutes: 10,
        },
      ],
      teacherConfigRaw: null,
      schoolConfigRaw: null,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.source).toBe('default');
      expect(r.settings.pointsForSignIn).toBe(DEFAULT_ATTENDANCE_SETTINGS.pointsForSignIn);
    }
  });

  it('matches custom reward periods without a universal period id', () => {
    const nowMs = new Date('2026-01-05T10:15:00Z').getTime();
    const r = resolveAttendanceSettingsForSignIn({
      nowMs,
      student,
      classes,
      periods,
      teacherRewards: [
        {
          id: 'custom1',
          enabled: true,
          classId: 'c1',
          customPeriod: { label: 'Advisory', startTime: '10:00', endTime: '10:30' },
          pointsForSignIn: 4,
          pointsForOnTime: 1,
          onTimeWindowMinutes: 5,
        },
      ],
      teacherConfigRaw: null,
      schoolConfigRaw: null,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.source).toBe('reward_rule');
      expect(r.settings.schedule[0]).toMatchObject({ id: 'custom_custom1', label: 'Advisory' });
    }
  });

  it('falls back to school legacy when no rule matches', () => {
    const nowMs = new Date('2026-01-05T12:00:00').getTime();
    const r = resolveAttendanceSettingsForSignIn({
      nowMs,
      student,
      classes,
      periods,
      teacherRewards: [
        {
          id: 'r1',
          enabled: true,
          classId: 'c1',
          periodId: 'p1',
          pointsForSignIn: 5,
          pointsForOnTime: 2,
          onTimeWindowMinutes: 10,
        },
      ],
      teacherConfigRaw: null,
      schoolConfigRaw: {
        pointsForSignIn: 1,
        pointsForOnTime: 0,
        onTimeWindowMinutes: 15,
      },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.source).toBe('school_legacy');
      expect(r.settings.pointsForSignIn).toBe(1);
    }
  });

  it('legacy config still works when no periods are configured', () => {
    const nowMs = Date.now();
    const r = resolveAttendanceSettingsForSignIn({
      nowMs,
      student,
      classes,
      periods: [],
      teacherRewards: [],
      teacherConfigRaw: null,
      schoolConfigRaw: { pointsForSignIn: 3, pointsForOnTime: 0, onTimeWindowMinutes: 15 },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.source).toBe('school_legacy');
      expect(r.settings.pointsForSignIn).toBe(3);
      expect(r.settings.schedule).toEqual([]);
    }
  });

  it('empty teacher config does not shadow school config', () => {
    // Regression: a teacher doc that only stored a schedule / teacherId (no
    // explicit point fields) used to win resolution and force points to 0.
    const nowMs = new Date('2026-01-05T12:00:00').getTime();
    const r = resolveAttendanceSettingsForSignIn({
      nowMs,
      student,
      classes,
      periods,
      teacherRewards: [],
      teacherConfigRaw: { teacherId: 't1', schedule: [] },
      schoolConfigRaw: { pointsForSignIn: 7, pointsForOnTime: 3, onTimeWindowMinutes: 15 },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.source).toBe('school_legacy');
      expect(r.settings.pointsForSignIn).toBe(7);
    }
  });

  it('teacher config with explicit points wins over school config', () => {
    const nowMs = new Date('2026-01-05T12:00:00').getTime();
    const r = resolveAttendanceSettingsForSignIn({
      nowMs,
      student,
      classes,
      periods,
      teacherRewards: [],
      teacherConfigRaw: { pointsForSignIn: 2, pointsForOnTime: 4, onTimeWindowMinutes: 10 },
      schoolConfigRaw: { pointsForSignIn: 7, pointsForOnTime: 3, onTimeWindowMinutes: 15 },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.source).toBe('teacher_legacy');
      expect(r.settings.pointsForSignIn).toBe(2);
      expect(r.settings.teacherId).toBe('t1');
    }
  });

  it('falls back to built-in defaults when nothing is configured anywhere', () => {
    const nowMs = new Date('2026-01-05T12:00:00').getTime();
    const r = resolveAttendanceSettingsForSignIn({
      nowMs,
      student,
      classes,
      periods: [],
      teacherRewards: [],
      teacherConfigRaw: null,
      schoolConfigRaw: null,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.source).toBe('default');
      expect(r.settings.pointsForSignIn).toBe(DEFAULT_ATTENDANCE_SETTINGS.pointsForSignIn);
      expect(r.settings.pointsForOnTime).toBe(DEFAULT_ATTENDANCE_SETTINGS.pointsForOnTime);
      expect(r.settings.onTimeWindowMinutes).toBe(DEFAULT_ATTENDANCE_SETTINGS.onTimeWindowMinutes);
    }
  });
});
