import { describe, expect, it } from 'vitest';
import type { Class, Student, Teacher } from './types';

describe('multi-teacher class assignments', () => {
  const teachers: Teacher[] = [
    { id: 't1', name: 'Mrs. Davis', email: 'davis@example.com' },
    { id: 't2', name: 'Mr. Smith', email: 'smith@example.com' },
    { id: 't3', name: 'Ms. Taylor', email: 'taylor@example.com' },
  ];

  const classA: Class = {
    id: 'c1',
    name: 'Grade 5A',
    primaryTeacherId: 't1',
    teacherIds: ['t1', 't2'],
  };

  const students: Student[] = [
    {
      id: 's1',
      nfcId: 'nfc-s1',
      firstName: 'Alice',
      lastName: 'Johnson',
      points: 10,
      lifetimePoints: 10,
      classId: 'c1',
      teacherIds: ['t1', 't2'],
    },
    {
      id: 's2',
      nfcId: 'nfc-s2',
      firstName: 'Bob',
      lastName: 'Miller',
      points: 5,
      lifetimePoints: 5,
      classId: 'c1',
      teacherIds: ['t1', 't2'],
    },
  ];

  it('recognizes class for both primary and co-teachers', () => {
    // Both Mrs. Davis and Mr. Smith should see Class A
    const classesForTeacher1 = [classA].filter(
      (c) => c.primaryTeacherId === 't1' || c.teacherIds?.includes('t1'),
    );
    const classesForTeacher2 = [classA].filter(
      (c) => c.primaryTeacherId === 't2' || c.teacherIds?.includes('t2'),
    );
    const classesForTeacher3 = [classA].filter(
      (c) => c.primaryTeacherId === 't3' || c.teacherIds?.includes('t3'),
    );

    expect(classesForTeacher1.map((c) => c.id)).toContain('c1');
    expect(classesForTeacher2.map((c) => c.id)).toContain('c1');
    expect(classesForTeacher3.length).toBe(0);
  });

  it('links students to both teachers in the class roster', () => {
    for (const student of students) {
      expect(student.teacherIds).toContain('t1');
      expect(student.teacherIds).toContain('t2');
      expect(student.teacherIds).not.toContain('t3');
    }
  });

  it('supports adding and removing co-teachers cleanly', () => {
    // Add t3 as an additional co-teacher
    const updatedTeacherIds = Array.from(new Set([...(classA.teacherIds || []), 't3']));
    const updatedClass: Class = {
      ...classA,
      primaryTeacherId: updatedTeacherIds[0],
      teacherIds: updatedTeacherIds,
    };
    expect(updatedClass.teacherIds).toEqual(['t1', 't2', 't3']);
    expect(updatedClass.primaryTeacherId).toBe('t1');

    // Remove t1: t2 becomes the primary teacher
    const afterRemovalIds = (updatedClass.teacherIds || []).filter((id) => id !== 't1');
    const classAfterRemoval: Class = {
      ...updatedClass,
      primaryTeacherId: afterRemovalIds[0],
      teacherIds: afterRemovalIds,
    };
    expect(classAfterRemoval.teacherIds).toEqual(['t2', 't3']);
    expect(classAfterRemoval.primaryTeacherId).toBe('t2');
  });
});
