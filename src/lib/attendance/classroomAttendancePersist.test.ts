import { describe, expect, it } from 'vitest';
import { classroomAttendanceLogIdsForStudents } from './classroomAttendancePersist';

describe('classroomAttendanceLogIdsForStudents', () => {
  it('collects today’s check-in records for this class only', () => {
    const records = new Map([
      ['maya', { logId: 'log-maya' }],
      ['sam', { logId: 'log-sam' }],
      ['other-class', { logId: 'log-other' }],
    ]);
    expect(classroomAttendanceLogIdsForStudents(records, ['maya', 'sam', ''])).toEqual([
      'log-maya',
      'log-sam',
    ]);
  });
});
