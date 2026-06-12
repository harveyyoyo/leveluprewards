import { describe, expect, it } from 'vitest';
import {
  activeIncentivesList,
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

describe('activeIncentivesList', () => {
  it('filters inactive and sorts newest first', () => {
    const rows: BulletinBoardIncentiveRecord[] = [
      { id: 'a', title: 'Old', description: '', points: 1, active: true, createdAt: 1 },
      { id: 'b', title: 'Hidden', description: '', points: 1, active: false, createdAt: 99 },
      { id: 'c', title: 'New', description: '', points: 1, active: true, createdAt: 50 },
    ];
    expect(activeIncentivesList(rows).map((r) => r.id)).toEqual(['c', 'a']);
  });
});
