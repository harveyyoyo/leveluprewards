import { describe, expect, it } from 'vitest';
import { formatCreditCardPan } from './CreditCardChrome';

describe('formatCreditCardPan', () => {
  it('pads a short student id into 4000 plus 12 digits', () => {
    expect(formatCreditCardPan('1234')).toBe('4000 0000 0000 1234');
  });

  it('keeps the last 12 digits of a longer scan code', () => {
    expect(formatCreditCardPan('ABC987654321000')).toBe('4000 9876 5432 1000');
  });
});
