import { describe, expect, it } from 'vitest';
import { buildOfficeDemoSeed } from './seedOfficeDemoData';

describe('buildOfficeDemoSeed', () => {
  const students = [
    { id: '100', firstName: 'Emily', lastName: 'Smith', classId: 'sc1' },
    { id: '101', firstName: 'Jacob', lastName: 'Johnson', classId: 'sc2' },
    { id: '102', firstName: 'Sophia', lastName: 'Williams', classId: 'sc1' },
  ];
  const classes = [
    { id: 'sc1', name: 'Grade 5' },
    { id: 'sc2', name: 'Grade 6' },
  ];

  it('mirrors roster and creates grades and billing', () => {
    const payload = buildOfficeDemoSeed({ variant: 'schoolabc', students, classes });
    expect(payload.officeTeachers.length).toBeGreaterThan(0);
    expect(payload.officeStudents).toHaveLength(3);
    expect(payload.officeStudents.every((s) => s.teacherId)).toBe(true);
    expect(payload.officeClasses).toHaveLength(2);
    expect(payload.gradeEntries.length).toBeGreaterThan(0);
    expect(payload.billingAccounts.length).toBeGreaterThan(0);
    expect(payload.invoices.length).toBeGreaterThan(payload.billingAccounts.length);
    expect(payload.staffAccounts).toEqual([
      expect.objectContaining({
        id: 'demo_office_staff',
        username: 'office',
        passcode: '1234',
        role: 'office',
        roles: ['office'],
      }),
    ]);
  });

  it('uses yeshiva subjects for yeshiva variant', () => {
    const payload = buildOfficeDemoSeed({
      variant: 'yeshiva',
      students: [{ id: '100', firstName: 'Shmuel', lastName: 'Goldstein', classId: 'yc1' }],
      classes: [{ id: 'yc1', name: 'Shiur Aleph' }],
    });
    expect(payload.gradeEntries.some((g) => g.subject === 'Gemara')).toBe(true);
    expect(payload.gradeEntries.some((g) => g.subject === 'Math')).toBe(false);
  });
});
