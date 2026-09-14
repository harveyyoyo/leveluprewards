import type { LibraryTheme } from '@/lib/library/libraryThemes';

/**
 * Photo backdrop shown behind every Library screen — a warm reading-room illustration,
 * dimmed with a theme-tinted scrim so text and cards on top stay easy to read.
 * Purely decorative (aria-hidden) so it never affects text contrast.
 */
export function LibraryBackdrop({ theme }: { theme: LibraryTheme }) {
  const isDark = theme.tone === 'dark';

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0 bg-cover bg-center transition-[background-position] duration-500 ease-out"
        style={{ backgroundImage: 'url(/library-hub-background.jpg)' }}
      />
      <div
        className="absolute inset-0 transition-[background] duration-500 ease-out"
        style={{
          background: isDark
            ? `linear-gradient(180deg, ${theme.swatches.bg}cc, ${theme.swatches.bg}b3 45%, ${theme.swatches.bg}e6)`
            : `linear-gradient(180deg, ${theme.swatches.bg}b3, ${theme.swatches.bg}99 45%, ${theme.swatches.bg}d9)`,
        }}
      />
    </div>
  );
}
