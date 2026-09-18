import { describe, expect, it } from 'vitest';
import {
  buildInitialLayout,
  changeClassroomGridSize,
  compactClassroomOccupiedDisplay,
  initialLayoutColumnCount,
  visualLayoutPositions,
} from '@/lib/classroomSeatingChart';

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

describe('changeClassroomGridSize', () => {
  it('moves leftover students to overflow instead of dropping them', () => {
    const layout = buildInitialLayout(['a', 'b', 'c', 'd'], 2);
    const result = changeClassroomGridSize(layout, 1, 2);
    expect(result.layout.cells.filter(Boolean)).toHaveLength(2);
    expect(result.overflowIds.sort()).toEqual(['c', 'd']);
    expect(result.displacedIds.sort()).toEqual(['c', 'd']);
  });

  it('uses leftover empty seats before putting anyone in overflow', () => {
    const layout = {
      rows: 2,
      cols: 2,
      cells: ['a', null, 'b', 'c'],
    };
    const result = changeClassroomGridSize(layout, 1, 2);
    expect(result.layout.cells.filter(Boolean)).toHaveLength(2);
    expect(result.overflowIds).toHaveLength(1);
    expect(['a', 'b', 'c']).toEqual(expect.arrayContaining(result.layout.cells.filter(Boolean) as string[]));
  });

  it('fills empty seats from the waiting list when the room grows', () => {
    const layout = { rows: 1, cols: 2, cells: ['a', 'b'] };
    const result = changeClassroomGridSize(layout, 2, 2, ['c', 'd']);
    expect(result.layout.cells.filter(Boolean)).toEqual(['a', 'b', 'c', 'd']);
    expect(result.overflowIds).toEqual([]);
  });
});

describe('compactClassroomOccupiedDisplay', () => {
  it('drops empty seats so the last student is not left beside ghost boxes', () => {
    const layout = { rows: 2, cols: 4, cells: ['a', 'b', 'c', 'd', 'david', null, null, null] };
    const compact = compactClassroomOccupiedDisplay(
      visualLayoutPositions(layout, false),
      layout.cells,
      layout.cols,
    );
    expect(compact.cells).toHaveLength(5);
    expect(compact.cols).toBe(4);
    expect(compact.rows).toBe(2);
    expect(compact.cells.map((cell) => layout.cells[cell.cellIndex])).toEqual([
      'a',
      'b',
      'c',
      'd',
      'david',
    ]);
  });
});
