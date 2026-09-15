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
  const { bg, primary, secondary } = theme.swatches;
  if (theme.tone === 'dark') {
    return [
      `linear-gradient(165deg, ${bg}f4 0%, ${bg}e0 46%, ${primary}66 100%)`,
      `linear-gradient(0deg, ${bg}d9, ${bg}c4)`,
    ].join(', ');
  }
  return [
    `linear-gradient(165deg, ${bg}f2 6%, ${bg}c2 48%, ${primary}2e 100%)`,
    `linear-gradient(0deg, ${bg}b8, ${secondary}1f)`,
  ].join(', ');
}

export function portalLibraryCardAccent(theme: LibraryTheme): string {
  return theme.swatches.primary;
}

export function portalLibraryCardTrim(theme: LibraryTheme): string {
  return theme.swatches.secondary;
}
