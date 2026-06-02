import { describe, expect, it } from 'vitest';
import { withSampleCategoryColors } from './sampleCategoryColors';

describe('withSampleCategoryColors', () => {
  it('assigns distinct colors when missing', () => {
    const out = withSampleCategoryColors([
      { id: 'a', name: 'One', points: 5 },
      { id: 'b', name: 'Two', points: 10 },
    ]);
    expect(out[0].color).toBeTruthy();
    expect(out[1].color).toBeTruthy();
    expect(out[0].color).not.toBe(out[1].color);
  });

  it('keeps explicit colors', () => {
    const out = withSampleCategoryColors([
      { id: 'a', name: 'One', points: 5, color: '#111111' },
      { id: 'b', name: 'Two', points: 10 },
    ]);
    expect(out[0].color).toBe('#111111');
    expect(out[1].color).not.toBe('#111111');
  });
});
