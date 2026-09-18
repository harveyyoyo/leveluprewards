import { describe, expect, it } from 'vitest';
import {
  buildInitialLayout,
  buildRoomShapeLayout,
  changeClassroomGridSize,
  compactClassroomOccupiedDisplay,
  extractLayoutGroups,
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

describe('buildRoomShapeLayout', () => {
  const sampleStudents = Array.from({ length: 18 }, (_, i) => `student-${i}`);

  it('builds classic rows containing every student', () => {
    const layout = buildRoomShapeLayout('rows', sampleStudents);
    expect(layout.cells.filter(Boolean)).toHaveLength(18);
    expect(new Set(layout.cells.filter(Boolean)).size).toBe(18);
  });

  it('builds partner pairs with aisle gaps and places every student', () => {
    const layout = buildRoomShapeLayout('pairs', sampleStudents);
    expect(layout.cells.filter(Boolean)).toHaveLength(18);
    expect(new Set(layout.cells.filter(Boolean)).size).toBe(18);
    // Verify that aisle cells are empty
    expect(layout.cells[2]).toBeNull();
  });

  it('builds table pods (2x2 clusters) containing every student', () => {
    const layout = buildRoomShapeLayout('pods', sampleStudents);
    expect(layout.cells.filter(Boolean)).toHaveLength(18);
    expect(new Set(layout.cells.filter(Boolean)).size).toBe(18);
    // Verify that aisle cell between pods is empty
    expect(layout.cells[2]).toBeNull();
  });

  it('builds U-shape perimeter containing every student', () => {
    const layout = buildRoomShapeLayout('ushape', sampleStudents);
    expect(layout.cells.filter(Boolean)).toHaveLength(18);
    expect(new Set(layout.cells.filter(Boolean)).size).toBe(18);
    // Center cell in top row should be empty
    expect(layout.cells[1]).toBeNull();
  });

  it('extracts rows and table groups for group awards', () => {
    const layout = buildRoomShapeLayout('pods', sampleStudents);
    const groups = extractLayoutGroups(layout);
    expect(groups.length).toBeGreaterThan(0);
    const rows = groups.filter((g) => g.type === 'row');
    const tables = groups.filter((g) => g.type === 'table');
    expect(rows.length).toBeGreaterThan(0);
    expect(tables.length).toBeGreaterThan(0);
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
