import { describe, expect, it } from 'vitest';
import { buildInitialLayout, initialLayoutColumnCount } from '@/lib/classroomSeatingChart';

describe('initialLayoutColumnCount', () => {
  it('keeps a regular class on 5 columns', () => {
    expect(initialLayoutColumnCount(12)).toBe(5);
    expect(initialLayoutColumnCount(20)).toBe(5);
  });

  it('widens the grid for larger all-student rosters', () => {
    expect(initialLayoutColumnCount(30)).toBe(7);
    expect(initialLayoutColumnCount(50)).toBe(10);
    expect(initialLayoutColumnCount(120)).toBe(12);
  });
});

describe('buildInitialLayout', () => {
  it('places every student when using a wider all-students grid', () => {
    const ids = Array.from({ length: 24 }, (_, i) => `s${i}`);
    const cols = initialLayoutColumnCount(ids.length);
    const layout = buildInitialLayout(ids, cols);
    expect(layout.cols).toBe(7);
    expect(layout.cells.filter(Boolean)).toHaveLength(24);
  });
});
