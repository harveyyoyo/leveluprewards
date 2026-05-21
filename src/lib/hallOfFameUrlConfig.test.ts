import { describe, expect, it } from 'vitest';
import { parseHallOfFameSearchParams } from './hallOfFameUrlConfig';

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
});
