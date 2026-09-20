import { describe, expect, it } from 'vitest';
import {
  classroomHallPassByStudent,
  classroomWhosOutDisplayName,
  classroomWhosOutPassLabel,
  classroomWhosOutShowsPassType,
  mergeClassroomWhosOutPasses,
} from './classroomWhosOutPasses';

describe('classroomWhosOutPasses', () => {
  it('labels known recess reasons in everyday words', () => {
    expect(classroomWhosOutPassLabel('nurse')).toBe('Nurse');
    expect(classroomWhosOutPassLabel('office')).toBe('Office');
    expect(classroomWhosOutPassLabel('break')).toBe('Break');
    expect(classroomWhosOutPassLabel('water')).toBe('Water');
    expect(classroomWhosOutPassLabel('bathroom')).toBe('Bathroom');
    expect(classroomWhosOutPassLabel('library')).toBe('Library');
  });

  it('merges recess and classroom bathroom passes, preferring the typed recess pass', () => {
    const merged = mergeClassroomWhosOutPasses({
      recess: new Map([
        [
          'maya',
          {
            studentId: 'maya',
            studentName: 'Maya',
            reason: 'nurse',
            startedAt: 100,
          },
        ],
      ]),
      bathroom: new Map([
        ['maya', { studentId: 'maya', studentName: 'Maya', startedAt: 50 }],
        ['sam', { studentId: 'sam', studentName: 'Sam', startedAt: 80 }],
      ]),
      nameFor: (_id, fallback) => fallback || 'Student',
      recessMaxMinutes: 10,
      bathroomMaxMinutes: 5,
    });

    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({ studentId: 'sam', passLabel: 'Bathroom', source: 'bathroom' });
    expect(merged[1]).toMatchObject({ studentId: 'maya', passLabel: 'Nurse', source: 'recess' });
    expect(classroomWhosOutShowsPassType(merged)).toBe(true);
    expect(classroomWhosOutDisplayName(merged[1]!, true)).toBe('Maya — Nurse');
  });

  it('maps hall passes by student so desks match the header', () => {
    const lookup = classroomHallPassByStudent([
      {
        studentId: 'sam',
        studentName: 'Sam',
        passLabel: 'Bathroom',
        source: 'bathroom',
        maxMinutes: 5,
        startedAt: 80,
      },
    ]);
    expect(lookup.get('sam')?.passLabel).toBe('Bathroom');
    expect(lookup.has('maya')).toBe(false);
  });
});
