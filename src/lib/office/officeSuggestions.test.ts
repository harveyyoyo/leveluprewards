import { describe, expect, it } from 'vitest';
import { officeUsedValues } from '@/lib/office/officeSuggestions';

describe('officeUsedValues', () => {
  it('lists each answer once, most used first, ignoring case, spacing and blanks', () => {
    const rows = [{ v: 'Spanish' }, { v: 'english' }, { v: ' English ' }, { v: 'English' }, { v: '' }, { v: null }, { v: 'spanish' }, { v: 'Hebrew' }];
    expect(officeUsedValues(rows, (r) => r.v)).toEqual(['english', 'Spanish', 'Hebrew']);
  });

  it('adds everyday answers after the school’s own, without repeating one', () => {
    expect(officeUsedValues([{ v: 'spanish' }], (r) => r.v, 30, ['English', 'Spanish', 'French'])).toEqual([
      'spanish',
      'English',
      'French',
    ]);
  });
});
