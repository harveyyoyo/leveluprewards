import { describe, expect, it } from 'vitest';
import { prizeCardColorForId } from './prizeCardColor';
import { CATEGORY_COLOR_PALETTE } from './utils';

describe('prizeCardColorForId', () => {
  it('returns a palette color for any prize id', () => {
    const c = prizeCardColorForId('p_test_abc');
    expect(CATEGORY_COLOR_PALETTE).toContain(c);
  });

  it('is stable for the same id', () => {
    expect(prizeCardColorForId('p_1')).toBe(prizeCardColorForId('p_1'));
  });
});
