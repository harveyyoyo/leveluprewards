import { describe, expect, it } from 'vitest';
import {
  filterOfficeStudents,
  officeGradeScore,
  officeStudentRidesBus,
  officeTopGradeStudentIds,
  type OfficeStudentListFilters,
} from '@/lib/office/officeAssistantLists';
import { findTeacherByAskedName, officeTeacherNameMatches } from '@/lib/office/officeAssistantView';
import type { OfficeFamily, OfficeGradeEntry, OfficeStudent } from '@/lib/office/types';

const grade = (studentId: string, g: Partial<OfficeGradeEntry>): OfficeGradeEntry =>
  ({ id: `${studentId}-${Math.random()}`, studentId, termLabel: 'Fall', subject: 'Math', updatedAt: 0, ...g }) as OfficeGradeEntry;

const student = (id: string, s: Partial<OfficeStudent> = {}): OfficeStudent =>
  ({ id, firstName: id, lastName: 'Test', updatedAt: 0, ...s }) as OfficeStudent;

const filters = (f: Partial<OfficeStudentListFilters>): OfficeStudentListFilters => ({
  rosterFilter: 'all',
  classFilter: 'all',
  homeroomFilter: 'all',
  query: '',
  teacherText: '',
  addressText: '',
  lastStarts: '',
  firstStarts: '',
  birthMonth: null,
  idsFilter: null,
  ...f,
});

const data = (d: Partial<Parameters<typeof filterOfficeStudents>[2]> = {}) => ({
  classNameById: new Map<string, string>(),
  teacherNameById: new Map<string, string>(),
  gradedForTerm: new Set<string>(),
  failingForTerm: new Set<string>(),
  topGradesForTerm: new Set<string>(),
  billingAccounts: [],
  familyById: new Map<string, OfficeFamily>(),
  ...d,
});

describe('top grades', () => {
  it('reads letters as scores', () => {
    expect(officeGradeScore({ letterGrade: 'A-' })).toBe(91);
    expect(officeGradeScore({ letterGrade: 'b+' })).toBe(88);
    expect(officeGradeScore({ letterGrade: 'A', numericGrade: 80 })).toBe(80);
    expect(officeGradeScore({ letterGrade: 'P' })).toBeNull();
  });

  it('keeps students averaging 90 or more this term', () => {
    const ids = officeTopGradeStudentIds(
      [
        grade('a', { letterGrade: 'A' }),
        grade('a', { letterGrade: 'A-', subject: 'English' }),
        grade('b', { letterGrade: 'A' }),
        grade('b', { letterGrade: 'B-', subject: 'English' }),
        grade('c', { numericGrade: 99, termLabel: 'Spring' }),
        grade('d', { numericGrade: 95, archived: true }),
      ],
      'Fall',
    );
    expect([...ids]).toEqual(['a']);
  });
});

describe('bus riders', () => {
  it('counts the student’s own route, the Transportation choice, or the family’s route', () => {
    expect(officeStudentRidesBus(student('a', { transportMode: 'bus' } as Partial<OfficeStudent>), undefined)).toBe(true);
    expect(officeStudentRidesBus(student('b', { busRoute: 'Route 3' }), undefined)).toBe(true);
    expect(officeStudentRidesBus(student('c'), { busRoute: 'Route 1' } as OfficeFamily)).toBe(true);
    expect(officeStudentRidesBus(student('d'), { busRoute: ' ' } as OfficeFamily)).toBe(false);
  });

  it('filters the roster to bus riders', () => {
    const family = { id: 'f1', busRoute: 'North' } as OfficeFamily;
    const list = filterOfficeStudents(
      [student('a', { familyId: 'f1' }), student('b')],
      filters({ rosterFilter: 'bus' }),
      data({ familyById: new Map([['f1', family]]) }),
    );
    expect(list.map((s) => s.id)).toEqual(['a']);
  });
});

describe('teacher names', () => {
  it('matches with or without a title', () => {
    expect(officeTeacherNameMatches('Mr. Smith', 'Smith')).toBe(true);
    expect(officeTeacherNameMatches('Mr. Smith', 'Mr Smith')).toBe(true);
    expect(officeTeacherNameMatches('John Smith', 'Mr. Smith')).toBe(true);
    expect(officeTeacherNameMatches('Rabbi Cohen', 'Rabbi Levi')).toBe(false);
    expect(officeTeacherNameMatches('Rabbi Cohen', 'Rabbi')).toBe(true);
  });

  it('finds no teacher for a name the school does not have', () => {
    const teachers = new Map([
      ['t1', 'Rabbi Cohen'],
      ['t2', 'Rav Goldberg'],
    ]);
    expect(findTeacherByAskedName(teachers, 'Mr. Smith')).toBeUndefined();
    expect(findTeacherByAskedName(teachers, 'Goldberg')).toBe('t2');
  });
});
