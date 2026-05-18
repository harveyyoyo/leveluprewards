import { describe, expect, it } from 'vitest';
import {
  isKioskPortraitDisplay,
  portalChooseGridClass,
  portalChooseTitleClass,
} from './kioskPortraitLayout';

describe('kioskPortraitLayout', () => {
  it('isKioskPortraitDisplay is true only when setting is on', () => {
    expect(isKioskPortraitDisplay(undefined)).toBe(false);
    expect(isKioskPortraitDisplay({})).toBe(false);
    expect(isKioskPortraitDisplay({ kioskPortraitDisplay: false })).toBe(false);
    expect(isKioskPortraitDisplay({ kioskPortraitDisplay: true })).toBe(true);
    expect(isKioskPortraitDisplay({ studentPortalPortraitDisplay: true })).toBe(true);
  });

  it('portal portrait helpers return extra classes when enabled', () => {
    expect(portalChooseTitleClass(true, true)).toContain('text-4xl');
    expect(portalChooseTitleClass(false, true)).toBe('');
    expect(portalChooseGridClass(true)).toContain('max-w-');
    expect(portalChooseGridClass(false)).toBe('');
  });
});
