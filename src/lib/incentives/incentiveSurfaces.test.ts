import { describe, expect, it } from 'vitest';
import {
  activeIncentivesList,
  incentiveAssignedToSurface,
  incentivesForSurface,
  incentivesVisibleOnSurface,
} from '@/lib/incentives/incentiveSurfaces';
import type { BulletinBoardIncentiveRecord } from '@/lib/bulletinBoard';

describe('incentivesVisibleOnSurface', () => {
  it('defaults hallway surfaces on and student surfaces off', () => {
    expect(incentivesVisibleOnSurface({}, 'bulletinBoard')).toBe(true);
    expect(incentivesVisibleOnSurface({}, 'smartScreen')).toBe(true);
    expect(incentivesVisibleOnSurface({}, 'studentKiosk')).toBe(false);
    expect(incentivesVisibleOnSurface({}, 'studentPortal')).toBe(false);
  });

  it('respects explicit false and true overrides', () => {
    expect(
      incentivesVisibleOnSurface({ incentivesShowOnBulletinBoard: false }, 'bulletinBoard'),
    ).toBe(false);
    expect(
      incentivesVisibleOnSurface({ incentivesShowOnStudentKiosk: true }, 'studentKiosk'),
    ).toBe(true);
  });
});

describe('incentiveAssignedToSurface', () => {
  it('uses explicit surfaces when present', () => {
    const row: BulletinBoardIncentiveRecord = {
      id: 'a',
      title: 'Test',
      description: '',
      points: 1,
      surfaces: { bulletinBoard: true, studentKiosk: false },
    };
    expect(incentiveAssignedToSurface(row, 'bulletinBoard')).toBe(true);
    expect(incentiveAssignedToSurface(row, 'studentKiosk')).toBe(false);
    expect(incentiveAssignedToSurface(row, 'smartScreen')).toBe(false);
  });

  it('treats empty surfaces as unassigned', () => {
    const row: BulletinBoardIncentiveRecord = {
      id: 'a',
      title: 'Test',
      description: '',
      points: 1,
      surfaces: {},
    };
    expect(incentiveAssignedToSurface(row, 'bulletinBoard')).toBe(false);
  });

  it('falls back to legacy active flag for old rows', () => {
    const active: BulletinBoardIncentiveRecord = {
      id: 'a',
      title: 'Test',
      description: '',
      points: 1,
      active: true,
    };
    const inactive: BulletinBoardIncentiveRecord = {
      id: 'b',
      title: 'Hidden',
      description: '',
      points: 1,
      active: false,
    };
    expect(incentiveAssignedToSurface(active, 'bulletinBoard')).toBe(true);
    expect(incentiveAssignedToSurface(active, 'smartScreen')).toBe(true);
    expect(incentiveAssignedToSurface(active, 'studentKiosk')).toBe(false);
    expect(incentiveAssignedToSurface(inactive, 'bulletinBoard')).toBe(false);
  });
});

describe('incentivesForSurface', () => {
  it('filters and sorts newest first', () => {
    const rows: BulletinBoardIncentiveRecord[] = [
      { id: 'a', title: 'Old', description: '', points: 1, surfaces: { bulletinBoard: true }, createdAt: 1 },
      { id: 'b', title: 'Hidden', description: '', points: 1, surfaces: {}, createdAt: 99 },
      { id: 'c', title: 'New', description: '', points: 1, surfaces: { bulletinBoard: true }, createdAt: 50 },
    ];
    expect(incentivesForSurface(rows, 'bulletinBoard').map((r) => r.id)).toEqual(['c', 'a']);
  });
});

describe('activeIncentivesList', () => {
  it('delegates to bulletin board surface filtering', () => {
    const rows: BulletinBoardIncentiveRecord[] = [
      { id: 'a', title: 'Board', description: '', points: 1, surfaces: { bulletinBoard: true } },
      { id: 'b', title: 'Kiosk only', description: '', points: 1, surfaces: { studentKiosk: true } },
    ];
    expect(activeIncentivesList(rows).map((r) => r.id)).toEqual(['a']);
  });
});
