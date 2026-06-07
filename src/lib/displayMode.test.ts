import { describe, expect, it } from 'vitest';
import {
  isCompactDisplayMode,
  isDockItemOnDisplayMode,
  isPortalAreaOnDisplayMode,
  normalizeDisplayModePreference,
  resolveDisplayMode,
} from './displayMode';

describe('displayMode', () => {
  it('normalizes stored preferences', () => {
    expect(normalizeDisplayModePreference('mobile')).toBe('mobile');
    expect(normalizeDisplayModePreference('unknown')).toBe('auto');
  });

  it('resolves auto by viewport', () => {
    expect(
      resolveDisplayMode('auto', { isPhone: true, isTabletOrMobile: true }),
    ).toBe('mobile');
    expect(
      resolveDisplayMode('auto', { isPhone: false, isTabletOrMobile: true }),
    ).toBe('app');
    expect(
      resolveDisplayMode('auto', { isPhone: false, isTabletOrMobile: false }),
    ).toBe('web');
  });

  it('keeps explicit preferences', () => {
    expect(
      resolveDisplayMode('mobile', { isPhone: false, isTabletOrMobile: false }),
    ).toBe('mobile');
    expect(
      resolveDisplayMode('app', { isPhone: true, isTabletOrMobile: true }),
    ).toBe('app');
  });

  it('treats app and mobile as compact chrome', () => {
    expect(isCompactDisplayMode('app')).toBe(true);
    expect(isCompactDisplayMode('mobile')).toBe(true);
    expect(isCompactDisplayMode('web')).toBe(false);
  });

  it('limits mobile portal and dock destinations', () => {
    expect(isPortalAreaOnDisplayMode('admin', 'mobile')).toBe(false);
    expect(isPortalAreaOnDisplayMode('print', 'mobile')).toBe(true);
    expect(isPortalAreaOnDisplayMode('redeem', 'mobile')).toBe(true);
    expect(isDockItemOnDisplayMode('admin', 'mobile')).toBe(false);
    expect(isDockItemOnDisplayMode('print', 'app')).toBe(true);
  });
});
