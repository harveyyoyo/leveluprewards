import { describe, expect, it } from 'vitest';
import {
  classroomAttendanceSourceTag,
  isClassroomCardScanSource,
  normalizeClassroomAttendanceSource,
} from './classroomAttendanceSource';

describe('classroomAttendanceSource', () => {
  it('defaults to card scan', () => {
    expect(normalizeClassroomAttendanceSource(undefined)).toBe('card-scan');
    expect(isClassroomCardScanSource('card-scan')).toBe(true);
    expect(classroomAttendanceSourceTag('card-scan')).toMatch(/card scan active/i);
  });

  it('accepts manual roll call', () => {
    expect(normalizeClassroomAttendanceSource('manual')).toBe('manual');
    expect(classroomAttendanceSourceTag('manual')).toMatch(/manual roll call/i);
  });
});
