import { describe, expect, it } from 'vitest';
import { parseOfficeGradesCsv, parseOfficeStudentsCsv } from '@/lib/office/officeCsvImport';

describe('parseOfficeStudentsCsv', () => {
  it('parses first/last and optional class', () => {
    const csv = 'First,Last,Class\nAda,Lovelace,3A\n';
    const { rows, errors } = parseOfficeStudentsCsv(csv);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ firstName: 'Ada', lastName: 'Lovelace', className: '3A' });
  });
});

describe('parseOfficeGradesCsv', () => {
  it('requires student, term, subject', () => {
    const { rows, errors } = parseOfficeGradesCsv('Student,Term\nBob,Fall\n');
    expect(rows).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('parses grade rows', () => {
    const csv = 'Student,Term,Subject,Letter,Percent\nAda Lovelace,Fall 2026,Math,A,95\n';
    const { rows, errors } = parseOfficeGradesCsv(csv);
    expect(errors).toHaveLength(0);
    expect(rows[0]).toMatchObject({
      studentName: 'Ada Lovelace',
      termLabel: 'Fall 2026',
      subject: 'Math',
      letterGrade: 'A',
      numericGrade: 95,
    });
  });
});
