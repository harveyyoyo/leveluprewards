import { describe, expect, it } from 'vitest';
import { formatBathroomElapsed, isBathroomOverLimit } from './formatBathroomElapsed';

describe('formatBathroomElapsed', () => {
  it('formats minutes and seconds', () => {
    expect(formatBathroomElapsed(0)).toBe('0:00');
    expect(formatBathroomElapsed(65_000)).toBe('1:05');
    expect(formatBathroomElapsed(300_000)).toBe('5:00');
  });

  it('detects over-limit trips', () => {
    expect(isBathroomOverLimit(4 * 60 * 1000, 5)).toBe(false);
    expect(isBathroomOverLimit(5 * 60 * 1000 + 1, 5)).toBe(true);
    expect(isBathroomOverLimit(10_000, 0)).toBe(false);
  });
});
