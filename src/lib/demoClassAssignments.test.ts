import { describe, expect, it } from 'vitest';
import { SCHOOL_DATA } from './schoolData';
import { YESHIVA_DATA } from './yeshivaData';

describe.each([['School ABC', SCHOOL_DATA], ['Yeshiva', YESHIVA_DATA]] as const)('%s demo teaching roster', (_, data) => {
  it('gives every teacher a populated class and links each student to its teacher', () => {
    const classes = data.classes!;
    const teachers = data.teachers!;
    const students = data.students!;
    for (const teacher of teachers) {
      const assigned = classes.filter((cls) => cls.primaryTeacherId === teacher.id);
      expect(assigned.length).toBeGreaterThan(0);
      for (const cls of assigned) {
        const roster = students.filter((student) => student.classId === cls.id);
        expect(roster.length).toBeGreaterThan(0);
        for (const student of roster) expect(student.teacherIds).toContain(teacher.id);
      }
    }
    expect(classes.every((cls) => teachers.some((teacher) => teacher.id === cls.primaryTeacherId))).toBe(true);
  });
});
