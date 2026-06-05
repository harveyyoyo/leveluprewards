import { describe, expect, it } from 'vitest';
import {
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
