import { describe, expect, it } from 'vitest';
import { resolveLegacyModePreference, shouldUseAutomaticLegacyMode } from './legacyMode';

describe('legacy mode resolver', () => {
  it('keeps saved legacy mode on', () => {
    expect(resolveLegacyModePreference(true, {})).toBe(true);
  });

  it('automatically enables legacy mode for explicit accessibility or data-saving preferences', () => {
    expect(shouldUseAutomaticLegacyMode({ prefersReducedMotion: true })).toBe(true);
    expect(shouldUseAutomaticLegacyMode({ saveData: true })).toBe(true);
  });

  it('automatically enables legacy mode for old browser engines', () => {
    expect(shouldUseAutomaticLegacyMode({ isOldBrowser: true })).toBe(true);
  });

  it('requires both weak cpu and low memory for low-power device fallback', () => {
    expect(shouldUseAutomaticLegacyMode({ hardwareConcurrency: 2, deviceMemory: 2 })).toBe(true);
    expect(shouldUseAutomaticLegacyMode({ hardwareConcurrency: 2, deviceMemory: 8 })).toBe(false);
    expect(shouldUseAutomaticLegacyMode({ hardwareConcurrency: 8, deviceMemory: 2 })).toBe(false);
  });

  it('leaves normal devices in the saved modern mode', () => {
    expect(
      resolveLegacyModePreference(false, {
        hardwareConcurrency: 8,
        deviceMemory: 8,
        prefersReducedMotion: false,
        saveData: false,
      }),
    ).toBe(false);
  });
});
