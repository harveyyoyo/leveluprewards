import { describe, expect, it } from 'vitest';
import { attendanceRecordsSince } from './classroomAttendancePersist';

describe('attendanceRecordsSince', () => {
  const records = new Map([
    ['maya', { logId: 'log-maya', signedInAt: 1_000 }],
    ['sam', { logId: 'log-sam', signedInAt: 5_000 }],
  ]);

  it('keeps every check-in when the class was never restarted', () => {
    expect(attendanceRecordsSince(records, undefined)).toBe(records);
  });

  it('hides check-ins from before "Start new class"', () => {
    expect([...attendanceRecordsSince(records, 2_000).keys()]).toEqual(['sam']);
  });
});
