import { describe, expect, it } from 'vitest';
import {
  buildPodiumDisplaySlots,
  clampHallOfFamePodiumSize,
  normalizeHallOfFameSortBy,
  normalizeHouseHallOfFameSortBy,
  hallOfFameUsesClientSideStudentRanking,
  parseHallOfFameSearchParams,
  parseHallOfFameUrlRankTypePin,
  resolveHallOfFameDisplayConfig,
  hallOfFameGridColumnClass,
} from './hallOfFameUrlConfig';

describe('clampHallOfFamePodiumSize', () => {
  it('snaps invalid values to 1, 3, or 5', () => {
    expect(clampHallOfFamePodiumSize(0)).toBe(1);
    expect(clampHallOfFamePodiumSize(2)).toBe(3);
    expect(clampHallOfFamePodiumSize(4)).toBe(5);
    expect(clampHallOfFamePodiumSize(1)).toBe(1);
    expect(clampHallOfFamePodiumSize(3)).toBe(3);
    expect(clampHallOfFamePodiumSize(5)).toBe(5);
    expect(clampHallOfFamePodiumSize(undefined)).toBe(3);
  });
});

describe('buildPodiumDisplaySlots', () => {
  it('returns empty when there are no items', () => {
    expect(buildPodiumDisplaySlots([], 3)).toEqual([]);
  });

  it('orders one-slot podium as champion only', () => {
    expect(buildPodiumDisplaySlots(['first'], 1)).toEqual([{ item: 'first', place: 1 }]);
  });

  it('orders three-slot podium as 2nd, 1st, 3rd', () => {
    expect(buildPodiumDisplaySlots(['first', 'second', 'third'], 3)).toEqual([
      { item: 'second', place: 2 },
      { item: 'first', place: 1 },
      { item: 'third', place: 3 },
    ]);
  });

  it('orders five-slot podium as 4th, 2nd, 1st, 3rd, 5th', () => {
    expect(buildPodiumDisplaySlots(['a', 'b', 'c', 'd', 'e'], 5)).toEqual([
      { item: 'd', place: 4 },
      { item: 'b', place: 2 },
      { item: 'a', place: 1 },
      { item: 'c', place: 3 },
      { item: 'e', place: 5 },
    ]);
  });

  it('clamps legacy podium sizes before building slots', () => {
    expect(buildPodiumDisplaySlots(['first', 'second'], 2)).toEqual([
      { item: 'second', place: 2 },
      { item: 'first', place: 1 },
    ]);
  });
});

describe('parseHallOfFameSearchParams', () => {
  it('returns settings defaults when query string is empty', () => {
    const config = parseHallOfFameSearchParams(new URLSearchParams(), {
      hallOfFameRankType: 'students',
      hallOfFameSortBy: 'points',
    });
    expect(config.locked).toBe(false);
    expect(config.rankType).toBe('students');
    expect(config.sortBy).toBe('points');
  });

  it('locks to houses when rankType=houses is in the URL', () => {
    const params = new URLSearchParams({
      fullscreen: '1',
      rankType: 'houses',
      sortBy: 'lifetimePoints',
      scope: 'all',
      podiumSize: '3',
    });
    const config = parseHallOfFameSearchParams(params, { hallOfFameRankType: 'students' });
    expect(config.locked).toBe(true);
    expect(config.rankType).toBe('houses');
    expect(config.sortBy).toBe('lifetimePoints');
    expect(config.scope).toBe('all');
    expect(config.podiumSize).toBe(3);
  });

  it('supports legacy house-standings view param', () => {
    const params = new URLSearchParams({ view: 'house-standings', sortBy: 'points' });
    const config = parseHallOfFameSearchParams(params);
    expect(config.locked).toBe(true);
    expect(config.rankType).toBe('houses');
  });

  it('normalizes sortBy typos from the URL', () => {
    const params = new URLSearchParams({ sortBy: 'lifeTimePoints' });
    const config = parseHallOfFameSearchParams(params);
    expect(config.sortBy).toBe('lifetimePoints');
  });
});

describe('resolveHallOfFameDisplayConfig', () => {
  it('follows saved settings for podium size and layout', () => {
    const config = resolveHallOfFameDisplayConfig({
      hallOfFameRankType: 'students',
      hallOfFamePodiumSize: 2,
      hallOfFameLayout: 'portrait',
      hallOfFameAutoScroll: true,
    });
    expect(config.podiumSize).toBe(3);
    expect(config.layout).toBe('portrait');
    expect(config.autoScroll).toBe(true);
  });

  it('uses house settings when rank type is pinned to houses', () => {
    const config = resolveHallOfFameDisplayConfig(
      {
        hallOfFameRankType: 'students',
        hallOfFamePodiumSize: 3,
        houseHallOfFamePodiumSize: 1,
        houseHallOfFameLayout: 'portrait',
      },
      'houses',
    );
    expect(config.rankType).toBe('houses');
    expect(config.podiumSize).toBe(1);
    expect(config.layout).toBe('portrait');
  });

  it('updates when admin changes podium in settings', () => {
    const before = resolveHallOfFameDisplayConfig({ hallOfFamePodiumSize: 1 });
    const after = resolveHallOfFameDisplayConfig({ hallOfFamePodiumSize: 5 });
    expect(before.podiumSize).toBe(1);
    expect(after.podiumSize).toBe(5);
  });
});

describe('hallOfFameGridColumnClass', () => {
  it('uses fixed column count on fullscreen monitors', () => {
    expect(hallOfFameGridColumnClass(4, false, true)).toBe('grid-cols-4');
    expect(hallOfFameGridColumnClass(2, false, true)).toBe('grid-cols-2');
  });

  it('forces one column in portrait layout', () => {
    expect(hallOfFameGridColumnClass(4, true, true)).toBe('grid-cols-1');
  });
});

describe('normalizeHouseHallOfFameSortBy', () => {
  it('rejects category sorts inherited from the general hall of fame settings', () => {
    expect(normalizeHouseHallOfFameSortBy('Academic Excellence', false)).toBe('lifetimePoints');
    expect(normalizeHouseHallOfFameSortBy('Academic Excellence', true)).toBe('lifetimePoints');
  });

  it('allows period sorts only when student rollup is enabled', () => {
    expect(normalizeHouseHallOfFameSortBy('period_day', true)).toBe('period_day');
    expect(normalizeHouseHallOfFameSortBy('period_day', false)).toBe('lifetimePoints');
  });
});

describe('hallOfFameUsesClientSideStudentRanking', () => {
  it('is true for period and category sorts', () => {
    expect(hallOfFameUsesClientSideStudentRanking('period_week')).toBe(true);
    expect(hallOfFameUsesClientSideStudentRanking('Kindness')).toBe(true);
    expect(hallOfFameUsesClientSideStudentRanking('lifetimePoints')).toBe(false);
  });
});

describe('parseHallOfFameUrlRankTypePin', () => {
  it('pins houses from rankType query param', () => {
    expect(parseHallOfFameUrlRankTypePin(new URLSearchParams({ rankType: 'houses' }))).toBe('houses');
  });

  it('returns null when no rank pin is present', () => {
    expect(parseHallOfFameUrlRankTypePin(new URLSearchParams({ fullscreen: '1' }))).toBeNull();
  });
});

describe('normalizeHallOfFameSortBy', () => {
  it('maps common typos and casing variants', () => {
    expect(normalizeHallOfFameSortBy('lifeTimePoints')).toBe('lifetimePoints');
    expect(normalizeHallOfFameSortBy('LIFETIME_POINTS')).toBe('lifetimePoints');
    expect(normalizeHallOfFameSortBy('currentPoints')).toBe('points');
  });
});
