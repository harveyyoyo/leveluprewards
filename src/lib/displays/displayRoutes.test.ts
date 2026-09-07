import { describe, expect, it } from 'vitest';
import {
  buildBulletinDisplayHref,
  buildDisplayHref,
  buildHallOfFameDisplayHref,
  buildSmartScreenDisplayHref,
  displaysFeatureEnabled,
  displaysRealmHref,
  displaysRealmOpenHref,
  normalizeStaffPortalTabValue,
  normalizeStaffPortalTabValues,
  parseDisplayView,
} from './displayRoutes';

describe('displayRoutes', () => {
  describe('normalizeStaffPortalTabValue', () => {
    it('maps legacy display tabs to displays', () => {
      expect(normalizeStaffPortalTabValue('bulletinboard')).toBe('displays');
      expect(normalizeStaffPortalTabValue('smart-screen')).toBe('displays');
      expect(normalizeStaffPortalTabValue('halloffame')).toBe('displays');
      expect(normalizeStaffPortalTabValue('raffle')).toBe('classroom');
      expect(normalizeStaffPortalTabValue('prizes')).toBe('prizes');
    });

    it('deduplicates mapped tab values', () => {
      expect(
        normalizeStaffPortalTabValues(['bulletinboard', 'smart-screen', 'displays', 'prizes']),
      ).toEqual(['displays', 'prizes']);
    });
  });

  describe('displaysFeatureEnabled', () => {
    it('respects the unified displaysEnabled setting when set', () => {
      expect(displaysFeatureEnabled({ displaysEnabled: true })).toBe(true);
      expect(displaysFeatureEnabled({ displaysEnabled: false })).toBe(false);
    });

    it('falls back to legacy flags when displaysEnabled is undefined', () => {
      expect(displaysFeatureEnabled({})).toBe(true);
      expect(displaysFeatureEnabled({ bulletinEnabled: true })).toBe(true);
      expect(displaysFeatureEnabled({ bulletinEnabled: false, smartScreenEnabled: true })).toBe(true);
      expect(displaysFeatureEnabled({ bulletinEnabled: false, enableClassLeaderboard: true })).toBe(true);
      expect(
        displaysFeatureEnabled({
          bulletinEnabled: false,
          smartScreenEnabled: false,
          enableClassLeaderboard: false,
        }),
      ).toBe(false);
    });
  });

  describe('parseDisplayView', () => {
    it('parses bulletin view aliases', () => {
      expect(parseDisplayView('bulletin')).toBe('bulletin');
      expect(parseDisplayView('bulletin-board')).toBe('bulletin');
      expect(parseDisplayView('board')).toBe('bulletin');
    });

    it('parses smart screen aliases', () => {
      expect(parseDisplayView('smart')).toBe('smart');
      expect(parseDisplayView('smart-screen')).toBe('smart');
    });

    it('parses hall of fame aliases', () => {
      expect(parseDisplayView('hall-of-fame')).toBe('hall-of-fame');
      expect(parseDisplayView('halloffame')).toBe('hall-of-fame');
      expect(parseDisplayView('fame')).toBe('hall-of-fame');
      expect(parseDisplayView('leaderboard')).toBe('hall-of-fame');
    });

    it('defaults to hall-of-fame for unknown or missing views', () => {
      expect(parseDisplayView(null)).toBe('hall-of-fame');
      expect(parseDisplayView(undefined)).toBe('hall-of-fame');
      expect(parseDisplayView('')).toBe('hall-of-fame');
      expect(parseDisplayView('unknown')).toBe('hall-of-fame');
    });
  });

  describe('route builders', () => {
    const schoolId = 'pine-crest';

    it('builds smart screen href', () => {
      expect(buildSmartScreenDisplayHref(schoolId)).toBe('/pine-crest/displays?view=smart');
      expect(buildSmartScreenDisplayHref(schoolId, { fullscreen: true })).toBe(
        '/pine-crest/displays?view=smart&fullscreen=1',
      );
    });

    it('builds bulletin display href', () => {
      expect(buildBulletinDisplayHref(schoolId)).toBe('/pine-crest/displays?view=bulletin');
      expect(buildBulletinDisplayHref(schoolId, { fullscreen: true })).toBe(
        '/pine-crest/displays?view=bulletin&fullscreen=1',
      );
    });

    it('builds hall of fame display href', () => {
      expect(buildHallOfFameDisplayHref(schoolId)).toBe('/pine-crest/displays?view=hall-of-fame');
      expect(buildHallOfFameDisplayHref(schoolId, { fullscreen: true })).toBe(
        '/pine-crest/displays?view=hall-of-fame&fullscreen=1',
      );
    });

    it('builds general display href by view', () => {
      expect(buildDisplayHref(schoolId, 'smart')).toBe('/pine-crest/displays?view=smart');
      expect(buildDisplayHref(schoolId, 'bulletin')).toBe('/pine-crest/displays?view=bulletin');
      expect(buildDisplayHref(schoolId, 'hall-of-fame')).toBe(
        '/pine-crest/displays?view=hall-of-fame',
      );
    });

    it('builds displays realm hrefs', () => {
      expect(displaysRealmHref('Pine-Crest ')).toBe('/pine-crest/displays-realm');
      expect(displaysRealmOpenHref('pine-crest')).toContain('/pine-crest/displays-realm');
    });
  });
});
