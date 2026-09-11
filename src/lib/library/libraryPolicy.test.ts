import { describe, expect, it } from 'vitest';
import {
  computeCappedLateFee,
  computeChargeableLateDays,
  getLibraryPolicyFromSettings,
  isLibraryPillarEnabled,
  isLibraryStandaloneSelfCheckoutEnabled,
  isLibraryStudentKioskCheckoutEnabled,
  resolveStudentMaxCheckouts,
} from './libraryPolicy';

describe('library student checkout settings', () => {
  it('disables kiosk checkout when library pillar is off', () => {
    expect(isLibraryStudentKioskCheckoutEnabled({ payLibrary: false })).toBe(false);
    expect(isLibraryStandaloneSelfCheckoutEnabled({ payLibrary: false, libraryAutoStudentPortalEnabled: true })).toBe(
      false,
    );
  });

  it('defaults kiosk checkout on when library pillar is on', () => {
    expect(isLibraryPillarEnabled({})).toBe(true);
    expect(isLibraryStudentKioskCheckoutEnabled({})).toBe(true);
    expect(isLibraryStudentKioskCheckoutEnabled({ libraryStudentKioskCheckoutEnabled: true })).toBe(true);
  });

  it('respects explicit kiosk and standalone toggles', () => {
    expect(isLibraryStudentKioskCheckoutEnabled({ libraryStudentKioskCheckoutEnabled: false })).toBe(false);
    expect(isLibraryStandaloneSelfCheckoutEnabled({ libraryAutoStudentPortalEnabled: true })).toBe(true);
    expect(isLibraryStandaloneSelfCheckoutEnabled({})).toBe(true);
    expect(isLibraryStandaloneSelfCheckoutEnabled({ libraryAutoStudentPortalEnabled: false })).toBe(false);
  });
});

describe('getLibraryPolicyFromSettings', () => {
  it('defaults max checkouts to 3', () => {
    const policy = getLibraryPolicyFromSettings({});
    expect(policy.maxCheckoutsPerStudent).toBe(3);
  });

  it('respects explicit max checkouts including 0 for unlimited', () => {
    expect(getLibraryPolicyFromSettings({ libraryMaxCheckoutsPerStudent: 5 }).maxCheckoutsPerStudent).toBe(5);
    expect(getLibraryPolicyFromSettings({ libraryMaxCheckoutsPerStudent: 0 }).maxCheckoutsPerStudent).toBe(0);
  });

  it('maps smart circulation and hardware scanning settings', () => {
    const policy = getLibraryPolicyFromSettings({
      libraryAutoDetectCirculation: true,
      libraryCameraScanEnabled: true,
      libraryGracePeriodDays: 3,
      libraryMaxRenewals: 4,
      libraryKioskAllowDropBoxReturn: true,
      libraryMaxFineCap: 25,
    });
    expect(policy.autoDetectCirculation).toBe(true);
    expect(policy.cameraScanEnabled).toBe(true);
    expect(policy.gracePeriodDays).toBe(3);
    expect(policy.maxRenewals).toBe(4);
    expect(policy.kioskAllowDropBoxReturn).toBe(true);
    expect(policy.maxFineCap).toBe(25);
  });

  it('defaults allowIsbnCheckout to true and respects explicit toggle', () => {
    expect(getLibraryPolicyFromSettings({}).allowIsbnCheckout).toBe(true);
    expect(getLibraryPolicyFromSettings({ libraryAllowIsbnCheckout: true }).allowIsbnCheckout).toBe(true);
    expect(getLibraryPolicyFromSettings({ libraryAllowIsbnCheckout: false }).allowIsbnCheckout).toBe(false);
  });
});

describe('late fee grace and cap', () => {
  it('does not charge during the grace period', () => {
    expect(computeChargeableLateDays(2, 3)).toBe(0);
    expect(computeCappedLateFee(2, 2, 3, 20)).toBe(0);
  });

  it('charges only the days after grace and honors the max fine cap', () => {
    expect(computeChargeableLateDays(5, 2)).toBe(3);
    expect(computeCappedLateFee(5, 2, 2, 20)).toBe(6);
    expect(computeCappedLateFee(30, 2, 0, 10)).toBe(10);
  });
});

describe('resolveStudentMaxCheckouts', () => {
  it('falls back to school policy default when student has no custom limit', () => {
    expect(resolveStudentMaxCheckouts(null, 3)).toBe(3);
    expect(resolveStudentMaxCheckouts(undefined, 4)).toBe(4);
    expect(resolveStudentMaxCheckouts({}, 5)).toBe(5);
    expect(resolveStudentMaxCheckouts({ libraryMaxCheckouts: null }, 3)).toBe(3);
    expect(resolveStudentMaxCheckouts({ libraryMaxCheckouts: undefined }, 3)).toBe(3);
  });

  it('respects student custom checkout limit when set', () => {
    expect(resolveStudentMaxCheckouts({ libraryMaxCheckouts: 5 }, 3)).toBe(5);
    expect(resolveStudentMaxCheckouts({ libraryMaxCheckouts: 10 }, 3)).toBe(10);
    expect(resolveStudentMaxCheckouts({ libraryMaxCheckouts: 1 }, 3)).toBe(1);
  });

  it('allows 0 for custom unlimited checkouts', () => {
    expect(resolveStudentMaxCheckouts({ libraryMaxCheckouts: 0 }, 3)).toBe(0);
  });
});
