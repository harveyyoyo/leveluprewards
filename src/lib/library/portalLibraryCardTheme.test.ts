import { describe, expect, it } from 'vitest';
import { resolveLibraryTheme } from './libraryThemes';
import {
  LIBRARY_HUB_BACKGROUND_SRC,
  portalLibraryCardAccent,
  portalLibraryCardIconForeground,
  portalLibraryCardTrim,
  portalLibraryCardWash,
} from './portalLibraryCardTheme';

describe('portalLibraryCardTheme', () => {
  it('uses the shared library hall picture', () => {
    expect(LIBRARY_HUB_BACKGROUND_SRC).toBe('/library-hub-background.jpg');
  });

  it('pulls accent and trim from the school library theme', () => {
    const theme = resolveLibraryTheme('grand_athenaeum');
    expect(portalLibraryCardAccent(theme)).toBe(theme.swatches.primary);
    expect(portalLibraryCardTrim(theme)).toBe(theme.swatches.secondary);
    expect(portalLibraryCardWash(theme)).toContain(theme.swatches.bg);
    expect(portalLibraryCardWash(theme)).toContain(theme.swatches.primary);
  });

  it('uses a dark icon on bright night-theme badges', () => {
    const night = resolveLibraryTheme('night_desk');
    expect(portalLibraryCardIconForeground(night)).toBe(night.swatches.bg);
    expect(portalLibraryCardIconForeground(resolveLibraryTheme('classic_oak'))).toBe('#ffffff');
  });

  it('keeps a lighter wash on cozy themes so the hall picture can show through', () => {
    const wash = portalLibraryCardWash(resolveLibraryTheme('grand_athenaeum'));
    expect(wash).toMatch(/#[0-9a-f]{6}59/i);
    expect(wash).toContain('transparent');
  });

  it('washes dark themes more heavily so the light photo does not wash them out', () => {
    const midnight = resolveLibraryTheme('midnight_archive');
    expect(portalLibraryCardWash(midnight)).toContain(midnight.swatches.bg);
    expect(portalLibraryCardWash(midnight)).toMatch(/#[0-9a-f]{6}ee/i);
  });
});
