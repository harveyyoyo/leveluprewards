import type { LibraryTheme } from '@/lib/library/libraryThemes';
import { LIBRARY_HUB_BACKGROUND_SRC, portalLibraryCardWash } from '@/lib/library/portalLibraryCardTheme';

/**
 * Decorative reading-hall photo + theme wash for the Library door on the
 * school "Where to?" page. Hidden from assistive tech.
 */
export function PortalLibraryCardBackdrop({ theme }: { theme: LibraryTheme }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="portal-library-card-photo absolute inset-0 bg-cover"
        style={{
          backgroundImage: `url(${LIBRARY_HUB_BACKGROUND_SRC})`,
          backgroundPosition: '52% 38%',
        }}
      />
      <div className="absolute inset-0" style={{ background: portalLibraryCardWash(theme) }} />
      <span
        className="absolute inset-y-4 left-0 w-1.5 rounded-full shadow-sm"
        style={{ backgroundColor: theme.swatches.primary }}
      />
    </div>
  );
}
