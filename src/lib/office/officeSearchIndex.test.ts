import { describe, expect, it } from 'vitest';
import { buildOfficeSearchIndex, filterOfficeSearchIndex } from './officeSearchIndex';
import type { OfficeStudent } from './types';

describe('officeSearchIndex', () => {
  it('indexes student notes and filters by haystack', () => {
    const students: OfficeStudent[] = [
      {
        id: 's1',
        firstName: 'Miri',
        lastName: 'Levi',
        notes: 'rides bus 12',
        updatedAt: 0,
      },
    ];
    const index = buildOfficeSearchIndex({
      students,
      families: [],
      classes: [],
      teachers: [],
      billingAccounts: [],
      invoices: [],
      gradeEntries: [],
      classNameById: new Map(),
      teacherNameById: new Map(),
      studentLabelById: new Map([['s1', 'Miri Levi']]),
    });
    const hits = filterOfficeSearchIndex(index, 'bus 12');
    expect(hits).toHaveLength(1);
    expect(hits[0]?.kind).toBe('student');
  });
});
