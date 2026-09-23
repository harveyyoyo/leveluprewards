import { describe, expect, it } from 'vitest';
import {
  findTeacherScheduleConflicts,
  formatScheduleDays,
  formatScheduleTime,
  teacherWeek,
  validateScheduleBlock,
} from '@/lib/office/officeSchedule';
import type { OfficeClass } from '@/lib/office/types';

const classes: OfficeClass[] = [
  {
    id: 'c1',
    name: 'Grade 5',
    updatedAt: 0,
    schedule: [{ id: 'b1', subject: 'Math', teacherId: 't1', days: [1, 3], startTime: '09:00', endTime: '09:45' }],
  },
  {
    id: 'c2',
    name: 'Grade 6',
    updatedAt: 0,
    schedule: [{ id: 'b2', subject: 'Science', teacherId: 't1', days: [2], startTime: '10:00', endTime: '10:45' }],
  },
];

describe('officeSchedule', () => {
  it('formats times and days in plain words', () => {
    expect(formatScheduleTime('13:05')).toBe('1:05 PM');
    expect(formatScheduleTime('00:30')).toBe('12:30 AM');
    expect(formatScheduleDays([1, 2, 3, 4, 5])).toBe('Mon–Fri');
    expect(formatScheduleDays([3, 1])).toBe('Mon, Wed');
  });

  it('rejects an end time before the start time', () => {
    expect(validateScheduleBlock({ subject: 'Math', days: [1], startTime: '10:00', endTime: '09:00' })).toMatch(/after/);
    expect(validateScheduleBlock({ subject: 'Math', days: [1], startTime: '09:00', endTime: '10:00' })).toBeNull();
  });

  it('finds a teacher booked twice at an overlapping time, but not back-to-back', () => {
    const clash = findTeacherScheduleConflicts(classes, {
      id: 'new',
      teacherId: 't1',
      days: [3],
      startTime: '09:30',
      endTime: '10:00',
    });
    expect(clash.map((c) => c.className)).toEqual(['Grade 5']);

    const backToBack = findTeacherScheduleConflicts(classes, {
      id: 'new',
      teacherId: 't1',
      days: [1],
      startTime: '09:45',
      endTime: '10:30',
    });
    expect(backToBack).toEqual([]);
  });

  it("builds a teacher's week day by day", () => {
    const week = teacherWeek(classes, 't1');
    expect(week.map((d) => d.day)).toEqual([1, 2, 3]);
    expect(week[1].items[0].className).toBe('Grade 6');
  });
});
