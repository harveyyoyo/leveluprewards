import { describe, expect, it } from 'vitest';
import {
  defaultDueDateIso,
  getOfficeStudentFullName,
  getOfficeStudentLabel,
  isInvoiceDueSoon,
  parseUsdToCents,
  studentIdsWithGradesForTerm,
  studentsWithoutGradesForTerm,
  uniqueGradeSubjects,
} from './officeUtils';
import type { OfficeInvoice } from './types';
import type { OfficeGradeEntry, OfficeStudent } from './types';

describe('officeUtils', () => {
  it('getOfficeStudentFullName avoids literal undefined on legacy rows', () => {
    expect(
      getOfficeStudentFullName({
        firstName: 'Ada',
        lastName: undefined as unknown as string,
        nickname: null,
      }),
    ).toBe('Ada');
    expect(
      getOfficeStudentFullName({
        firstName: 'undefined',
        lastName: 'Cohen',
        nickname: null,
      }),
    ).toBe('Cohen');
    expect(
      getOfficeStudentFullName({
        firstName: 'Miri',
        lastName: 'Levi',
        nickname: 'Mimi',
      }),
    ).toBe('Mimi');
  });

  it('getOfficeStudentLabel prefers nickname then first name', () => {
    expect(getOfficeStudentLabel({ firstName: 'Ada', lastName: 'Lovelace', nickname: 'Ace' })).toBe('Ace');
    expect(getOfficeStudentLabel({ firstName: 'Ada', lastName: 'Lovelace', nickname: null })).toBe('Ada');
  });

  it('parseUsdToCents accepts valid amounts', () => {
    expect(parseUsdToCents('10')).toBe(1000);
    expect(parseUsdToCents('10.50')).toBe(1050);
    expect(parseUsdToCents('bad')).toBeNull();
    expect(parseUsdToCents('-1')).toBeNull();
  });

  it('defaultDueDateIso returns future ISO date', () => {
    const due = defaultDueDateIso(7);
    expect(due).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(due >= new Date().toISOString().slice(0, 10)).toBe(true);
  });

  it('studentsWithoutGradesForTerm excludes graded students', () => {
    const students: OfficeStudent[] = [
      { id: 'a', firstName: 'A', lastName: 'One', updatedAt: 0 },
      { id: 'b', firstName: 'B', lastName: 'Two', updatedAt: 0 },
    ];
    const entries: OfficeGradeEntry[] = [
      {
        id: 'g1',
        studentId: 'a',
        termLabel: 'Fall 2026',
        subject: 'Math',
        updatedAt: 0,
      },
    ];
    const missing = studentsWithoutGradesForTerm(students, entries, 'Fall 2026');
    expect(missing).toHaveLength(1);
    expect(missing[0].id).toBe('b');
  });

  it('studentIdsWithGradesForTerm returns graded student ids', () => {
    const set = studentIdsWithGradesForTerm(
      [{ id: '1', studentId: 'a', termLabel: 'Fall', subject: 'X', updatedAt: 0 }],
      'Fall',
    );
    expect(set.has('a')).toBe(true);
    expect(set.has('b')).toBe(false);
  });

  it('isInvoiceDueSoon detects open invoices due within window', () => {
    const today = new Date('2026-05-21');
    const inv: OfficeInvoice = {
      id: '1',
      accountId: 'a',
      label: 'Tuition',
      amountCents: 1000,
      dueDate: '2026-05-25',
      status: 'sent',
      createdAt: 0,
    };
    expect(isInvoiceDueSoon(inv, 7, today)).toBe(true);
    expect(isInvoiceDueSoon({ ...inv, dueDate: '2026-06-01' }, 7, today)).toBe(false);
  });

  it('uniqueGradeSubjects merges defaults and entries', () => {
    const subjects = uniqueGradeSubjects([
      { id: '1', studentId: 'a', termLabel: 'T', subject: 'Chumash', updatedAt: 0 },
    ]);
    expect(subjects).toContain('Math');
    expect(subjects).toContain('Chumash');
  });
});
