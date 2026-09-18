import { describe, expect, it } from 'vitest';
import {
  buildInitialLayout,
  buildRoomShapeLayout,
  extractLayoutGroups,
  initialLayoutColumnCount,
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


