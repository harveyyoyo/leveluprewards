import { describe, expect, it } from 'vitest';
import type { Category } from '@/lib/types';
import {
  activeIncentivesList,
  incentiveAssignedToSurface,
  incentiveCategoriesForSurface,
  incentivesForSurface,
  incentivesVisibleOnSurface,
  type IncentiveListItem,
} from '@/lib/incentives/incentiveSurfaces';

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
  it('uses explicit displaySurfaces when present', () => {
    const row: IncentiveListItem = {
      id: 'a',
      title: 'Test',
      description: '',
      value: 1,
      createdAt: 0,
      displaySurfaces: { bulletinBoard: true, studentKiosk: false },
    };
    expect(incentiveAssignedToSurface(row, 'bulletinBoard')).toBe(true);
    expect(incentiveAssignedToSurface(row, 'studentKiosk')).toBe(false);
    expect(incentiveAssignedToSurface(row, 'smartScreen')).toBe(false);
  });

  it('treats empty displaySurfaces as unassigned', () => {
    const row: IncentiveListItem = {
      id: 'a',
      title: 'Test',
      description: '',
      value: 1,
      createdAt: 0,
      displaySurfaces: {},
    };
    expect(incentiveAssignedToSurface(row, 'bulletinBoard')).toBe(false);
  });

  it('falls back to legacy active flag for old rows', () => {
    const active: IncentiveListItem = {
      id: 'a',
      title: 'Test',
      description: '',
      value: 1,
      createdAt: 0,
      active: true,
    };
    const inactive: IncentiveListItem = {
      id: 'b',
      title: 'Hidden',
      description: '',
      value: 1,
      createdAt: 0,
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
    const rows: IncentiveListItem[] = [
      { id: 'a', title: 'Old', description: '', value: 1, displaySurfaces: { bulletinBoard: true }, createdAt: 1 },
      { id: 'b', title: 'Hidden', description: '', value: 1, displaySurfaces: {}, createdAt: 99 },
      { id: 'c', title: 'New', description: '', value: 1, displaySurfaces: { bulletinBoard: true }, createdAt: 50 },
    ];
    expect(incentivesForSurface(rows, 'bulletinBoard').map((r) => r.id)).toEqual(['c', 'a']);
  });
});

describe('incentiveCategoriesForSurface', () => {
  it('only includes categories flagged as incentives and assigned to that surface', () => {
    const categories: Category[] = [
      {
        id: 'a',
        name: 'Homework Hero',
        points: 50,
        showAsIncentive: true,
        displaySurfaces: { bulletinBoard: true },
      },
      {
        id: 'b',
        name: 'Academics',
        points: 10,
        displaySurfaces: { bulletinBoard: true },
      },
      {
        id: 'c',
        name: 'Kiosk only',
        points: 5,
        showAsIncentive: true,
        displaySurfaces: { studentKiosk: true },
      },
    ];
    expect(incentiveCategoriesForSurface(categories, 'bulletinBoard').map((r) => r.id)).toEqual(['a']);
    expect(incentiveCategoriesForSurface(categories, 'studentKiosk').map((r) => r.title)).toEqual(['Kiosk only']);
  });
});

describe('activeIncentivesList', () => {
  it('delegates to bulletin board surface filtering', () => {
    const rows: IncentiveListItem[] = [
      { id: 'a', title: 'Board', description: '', value: 1, createdAt: 0, displaySurfaces: { bulletinBoard: true } },
      { id: 'b', title: 'Kiosk only', description: '', value: 1, createdAt: 0, displaySurfaces: { studentKiosk: true } },
    ];
    expect(activeIncentivesList(rows).map((r) => r.id)).toEqual(['a']);
  });
});
