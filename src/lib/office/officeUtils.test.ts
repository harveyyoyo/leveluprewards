import { describe, expect, it } from 'vitest';
import {
  addMonthsToIsoDate,
  buildAnnouncementMailto,
  defaultDueDateIso,
  getOfficeStudentFullName,
  getOfficeStudentLabel,
  isInvoiceDueSoon,
  parseUsdToCents,
  splitCentsIntoInstallments,
  studentIdsWithGradesForTerm,
  studentsWithoutGradesForTerm,
  uniqueGradeSubjects,
} from './officeUtils';
import type { OfficeInvoice } from './types';
import type { OfficeGradeEntry, OfficeStudent } from './types';

describe('officeUtils', () => {
  it('getOfficeStudentLabel prefers nickname and guards missing fields', () => {
    expect(getOfficeStudentLabel({ firstName: 'Jane', lastName: 'Doe', nickname: 'JD' })).toBe('JD');
    expect(getOfficeStudentLabel({ firstName: 'Jane', lastName: 'Doe' })).toBe('Jane');
    expect(
      getOfficeStudentLabel({ firstName: undefined as unknown as string, lastName: undefined as unknown as string }),
    ).toBe('');
  });

  it('getOfficeStudentFullName never renders literal undefined', () => {
    expect(getOfficeStudentFullName({ firstName: 'Jane', lastName: 'Doe' })).toBe('Jane Doe');
    expect(getOfficeStudentFullName({ firstName: 'Jane', lastName: 'Doe', nickname: 'JD' })).toBe('JD Doe');
    expect(
      getOfficeStudentFullName({
        firstName: undefined as unknown as string,
        lastName: undefined as unknown as string,
      }),
    ).toBe('');
    expect(
      getOfficeStudentFullName({
        firstName: 'Jane',
        lastName: undefined as unknown as string,
      }),
    ).toBe('Jane');
    expect(
      getOfficeStudentFullName({
        firstName: undefined as unknown as string,
        lastName: 'Doe',
      }),
    ).toBe('Doe');
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

  it('addMonthsToIsoDate advances the month, rolling the year when needed', () => {
    expect(addMonthsToIsoDate('2026-01-15', 1)).toBe('2026-02-15');
    expect(addMonthsToIsoDate('2026-11-15', 3)).toBe('2027-02-15');
    expect(addMonthsToIsoDate('2026-01-15', 0)).toBe('2026-01-15');
  });

  it('splitCentsIntoInstallments divides evenly and puts the remainder on the last one', () => {
    expect(splitCentsIntoInstallments(1000, 4)).toEqual([250, 250, 250, 250]);
    expect(splitCentsIntoInstallments(1000, 3)).toEqual([333, 333, 334]);
    expect(splitCentsIntoInstallments(1000, 3).reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it('buildAnnouncementMailto puts recipients in bcc, not to', () => {
    const link = buildAnnouncementMailto({
      emails: ['a@x.com', 'b@x.com'],
      subject: 'Picture day',
      body: "Don't forget!",
    });
    expect(link.startsWith('mailto:?bcc=')).toBe(true);
    expect(link).toContain(encodeURIComponent('a@x.com,b@x.com'));
    expect(link).toContain(`subject=${encodeURIComponent('Picture day')}`);
  });
});
