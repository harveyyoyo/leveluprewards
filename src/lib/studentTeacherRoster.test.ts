import { describe, it, expect } from 'vitest';
import { ensureStudentHasClassPrimaryTeacher } from './studentTeacherRoster';
import type { Student } from './types';

describe('ensureStudentHasClassPrimaryTeacher', () => {
  const classes = [
    { id: 'c1', name: 'Homeroom A', primaryTeacherId: 't1' },
    { id: 'c2', name: 'Homeroom B', primaryTeacherId: 't2' },
    { id: 'c3', name: 'Unassigned teacher' },
  ];

  const base: Student = {
    id: 's1',
    firstName: 'Sam',
    lastName: 'Lee',
    points: 0,
    lifetimePoints: 0,
    nfcId: 's1',
  };

  it('adds the class primary teacher when missing', () => {
    const result = ensureStudentHasClassPrimaryTeacher({ ...base, classId: 'c1' }, classes);
    expect(result.teacherIds).toEqual(['t1']);
  });

  it('does not duplicate an existing teacher link', () => {
    const result = ensureStudentHasClassPrimaryTeacher(
      { ...base, classId: 'c1', teacherIds: ['t1', 't9'] },
      classes,
    );
    expect(result.teacherIds).toEqual(['t1', 't9']);
  });

  it('leaves student unchanged without a class', () => {
    const result = ensureStudentHasClassPrimaryTeacher(base, classes);
    expect(result).toBe(base);
  });

  it('leaves student unchanged when class has no primary teacher', () => {
    const input = { ...base, classId: 'c3' };
    const result = ensureStudentHasClassPrimaryTeacher(input, classes);
    expect(result).toBe(input);
    expect(result.teacherIds).toBeUndefined();
  });
});
