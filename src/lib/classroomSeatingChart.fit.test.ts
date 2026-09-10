import { describe, expect, it } from 'vitest';
import {
  classroomDeskVisualScale,
  fitClassroomSeatingGrid,
} from './classroomSeatingChart';

describe('fitClassroomSeatingGrid', () => {
  it('keeps square desks and is limited by width', () => {
    const fit = fitClassroomSeatingGrid({
      containerWidth: 500,
      containerHeight: 400,
      rows: 4,
      cols: 5,
      gap: 8,
    });
    expect(fit.cellSize).toBe(93);
    expect(fit.gridWidth).toBe(93 * 5 + 32);
    expect(fit.gridHeight).toBe(93 * 4 + 24);
    expect(fit.gridWidth).toBeLessThanOrEqual(500);
    expect(fit.gridHeight).toBeLessThanOrEqual(400);
  });

  it('shrinks desks when the window is short instead of stretching them', () => {
    const fit = fitClassroomSeatingGrid({
      containerWidth: 800,
      containerHeight: 240,
      rows: 4,
      cols: 5,
      gap: 4,
    });
    expect(fit.cellSize).toBe(57);
    expect(fit.gridWidth).toBeLessThan(800);
    expect(fit.gridHeight).toBeLessThanOrEqual(240);
  });

  it('still fits inside a very small window', () => {
    const fit = fitClassroomSeatingGrid({
      containerWidth: 200,
      containerHeight: 160,
      rows: 4,
      cols: 5,
      gap: 4,
    });
    expect(fit.cellSize).toBeGreaterThan(0);
    expect(fit.gridWidth).toBeLessThanOrEqual(200);
    expect(fit.gridHeight).toBeLessThanOrEqual(160);
  });
});

describe('classroomDeskVisualScale', () => {
  it('uses smaller labels for smaller desks', () => {
    expect(classroomDeskVisualScale(60)).toBe('sm');
    expect(classroomDeskVisualScale(80)).toBe('md');
    expect(classroomDeskVisualScale(120)).toBe('lg');
  });
});
