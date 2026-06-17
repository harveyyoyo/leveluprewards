import { describe, expect, it } from 'vitest';
import { advanceOfficeClassName, planOfficeClassPromotion } from './officeClassPromotion';

describe('advanceOfficeClassName', () => {
  it('bumps Grade N labels', () => {
    expect(advanceOfficeClassName('Grade 5')).toEqual({ kind: 'next', nextName: 'Grade 6' });
    expect(advanceOfficeClassName('Grade 10')).toEqual({ kind: 'next', nextName: 'Grade 11' });
    expect(advanceOfficeClassName('Grade 5A')).toEqual({ kind: 'next', nextName: 'Grade 6A' });
    expect(advanceOfficeClassName('Grade 5 B')).toEqual({ kind: 'next', nextName: 'Grade 6 B' });
  });

  it('promotes early childhood labels', () => {
    expect(advanceOfficeClassName('Pre-K')).toEqual({ kind: 'next', nextName: 'Kindergarten' });
    expect(advanceOfficeClassName('Pre-K A')).toEqual({ kind: 'next', nextName: 'Kindergarten A' });
    expect(advanceOfficeClassName('Kindergarten')).toEqual({ kind: 'next', nextName: 'Grade 1' });
    expect(advanceOfficeClassName('Kindergarten B')).toEqual({ kind: 'next', nextName: 'Grade 1 B' });
    expect(advanceOfficeClassName('K')).toEqual({ kind: 'next', nextName: 'Grade 1' });
  });

  it('bumps ordinal grade labels', () => {
    expect(advanceOfficeClassName('1st Grade')).toEqual({ kind: 'next', nextName: '2nd Grade' });
    expect(advanceOfficeClassName('3rd Grade A')).toEqual({ kind: 'next', nextName: '4th Grade A' });
    expect(advanceOfficeClassName('11th Grade')).toEqual({ kind: 'next', nextName: '12th Grade' });
  });

  it('skips graduating and unknown labels', () => {
    expect(advanceOfficeClassName('Grade 12')).toEqual({
      kind: 'skip',
      reason: 'Graduating grade — rename manually',
    });
    expect(advanceOfficeClassName('Homeroom A').kind).toBe('skip');
  });
});

describe('planOfficeClassPromotion', () => {
  it('builds a sorted promotion plan', () => {
    const plan = planOfficeClassPromotion([
      { id: 'c2', name: 'Grade 6' },
      { id: 'c1', name: 'Grade 5' },
      { id: 'c3', name: 'Grade 12' },
    ]);
    expect(plan.changes).toEqual([
      { classId: 'c1', currentName: 'Grade 5', nextName: 'Grade 6' },
      { classId: 'c2', currentName: 'Grade 6', nextName: 'Grade 7' },
    ]);
    expect(plan.skipped).toHaveLength(1);
    expect(plan.skipped[0].classId).toBe('c3');
  });
});
