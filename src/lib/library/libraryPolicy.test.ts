import { describe, expect, it } from 'vitest';
import {
  getLibraryPolicyFromSettings,
  isLibraryPillarEnabled,
  isLibraryStandaloneSelfCheckoutEnabled,
  isLibraryStudentKioskCheckoutEnabled,
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
});
