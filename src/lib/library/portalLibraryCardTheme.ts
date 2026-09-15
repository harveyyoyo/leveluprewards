import type { LibraryTheme } from '@/lib/library/libraryThemes';

/** Same reading-hall picture used behind every Library screen. */
export const LIBRARY_HUB_BACKGROUND_SRC = '/library-hub-background.jpg';

/** Icon color on the theme-primary badge — dark themes use bright primaries. */
export function portalLibraryCardIconForeground(theme: LibraryTheme): string {
  return theme.tone === 'dark' ? theme.swatches.bg : '#ffffff';
}

/**
 * Theme wash over the library photo so title and body stay readable
 * while the card still feels like the school's Library look.
 */
export function portalLibraryCardWash(theme: LibraryTheme): string {
  const { bg, primary } = theme.swatches;
  if (theme.tone === 'dark') {
    return [
      `linear-gradient(180deg, ${bg}d4 0%, ${bg}c2 42%, ${bg}ee 100%)`,
      `linear-gradient(135deg, ${primary}4d 0%, transparent 58%)`,
    ].join(', ');
  }
  return [
    `linear-gradient(180deg, ${bg}59 0%, ${bg}8a 48%, ${bg}d6 100%)`,
    `linear-gradient(135deg, ${primary}2e 0%, transparent 55%)`,
  ].join(', ');
}

export function portalLibraryCardAccent(theme: LibraryTheme): string {
  return theme.swatches.primary;
}

export function portalLibraryCardTrim(theme: LibraryTheme): string {
  return theme.swatches.secondary;
}
