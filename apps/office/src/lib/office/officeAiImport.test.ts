import { describe, expect, it } from 'vitest';
import { normalizeOfficeAiSnapshot, totalOfficeSnapshotItems } from '@/lib/office/officeAiImport';

describe('normalizeOfficeAiSnapshot', () => {
  it('extracts classes, students, and grades from a mixed payload', () => {
    const snap = normalizeOfficeAiSnapshot({
      classes: [{ name: '3A' }],
      students: [{ firstName: 'Ada', lastName: 'Lovelace', className: '3A' }],
      grades: [
        {
          studentName: 'Ada Lovelace',
          termLabel: 'Fall 2026',
          subject: 'Math',
          letterGrade: 'A',
          numericGrade: 95,
        },
      ],
      billingAccounts: [{ familyName: 'Lovelace', studentNames: ['Ada Lovelace'], amount: 1200 }],
      invoices: [{ familyName: 'Lovelace', label: 'Tuition', amount: 500, dueDate: '2026-09-01' }],
    });

    expect(snap.classes).toHaveLength(1);
    expect(snap.students?.[0]?.firstName).toBe('Ada');
    expect(snap.grades?.[0]?.subject).toBe('Math');
    expect(snap.billingAccounts?.[0]?.familyName).toBe('Lovelace');
    expect(snap.invoices?.[0]?.amountCents).toBe(50000);
    expect(totalOfficeSnapshotItems(snap)).toBeGreaterThan(4);
  });
});
