'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Home, Library, BookOpen, Monitor, Settings, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import LevelUpLogoMark from '@/components/logos/Logo';
import type { LibraryTheme } from '@/lib/library/libraryThemes';

export type LibraryHeaderTab = 'hub' | 'desk' | 'catalog' | 'kiosk' | 'reports' | 'settings';
export type LibraryHeaderNavTab = 'desk' | 'catalog' | 'kiosk' | 'reports';

// Reports isn't a top-nav tab — it's opened from a link on the Librarian page.
const NAV_TABS = [
  { id: 'desk', label: 'Librarian', icon: Library, activeColor: '#2563eb' },
  { id: 'catalog', label: 'Catalog', icon: BookOpen, activeColor: '#059669' },
  { id: 'kiosk', label: 'Kiosk', icon: Monitor, activeColor: '#d97706' },
] as const;

/**
 * The one header bar used across every Library screen (front door, Librarian desk,
 * Catalog, Kiosk, and Settings) — same logo lockup, same tab row, same Home and
 * Settings buttons everywhere, just tinted by the school's chosen theme.
 */
export function LibraryHeaderBar({
  theme,
  schoolName,
  productLabel = 'Library',
  backToPortalHref,
  chooseLibraryHref,
  activeTab,
  onNavigate,
  onHome,
  onOpenSettings,
  onOpenGuide,
  children,
}: {
  theme: LibraryTheme;
  schoolName: string;
  productLabel?: string;
  backToPortalHref: string;
  /** When a school has more than one library, the logo/name link opens the "which library"
   * picker instead of leaving the library section entirely. */
  chooseLibraryHref?: string;
  activeTab: LibraryHeaderTab;
  onNavigate: (tab: LibraryHeaderNavTab) => void;
  onHome: () => void;
  onOpenSettings: () => void;
  onOpenGuide?: () => void;
  /** Extra content rendered below the main row. */
  children?: ReactNode;
}) {
  return (
    <div className={cn('relative z-10 w-full border-b backdrop-blur-md px-2 sm:px-6 py-2.5 sm:py-3 space-y-2', theme.classes.header)}>
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href={backToPortalHref}
            title="Back to LevelUp"
            className="group flex items-center shrink-0"
          >
            <span
              className={cn(
                'grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl border-2 p-1 shadow-sm transition-transform group-hover:-translate-y-0.5',
                theme.classes.card,
              )}
            >
              <LevelUpLogoMark className="h-full w-full" />
            </span>
          </Link>
          <Link
            href={chooseLibraryHref || backToPortalHref}
            title={chooseLibraryHref ? 'Switch library' : 'Back to LevelUp'}
            className="hidden sm:flex flex-col leading-tight"
          >
            <span className="font-black text-base">{schoolName}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] opacity-70">{productLabel}</span>
          </Link>
          <button
            type="button"
            onClick={onHome}
            title="Library Home"
            aria-label="Library Home"
            className={cn(
              'flex items-center py-1.5 px-2 sm:px-0 transition-colors',
              activeTab === 'hub' && 'text-primary',
            )}
            style={{ color: activeTab === 'hub' ? theme.swatches.primary : theme.swatches.text }}
          >
            <Home className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
          </button>
        </div>

        <div className="library-header-nav library-readable flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto sm:gap-3 md:gap-6">
          {NAV_TABS.map(({ id, label, icon: TabIcon, activeColor }) => (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              title={label}
              aria-label={label}
              className="flex items-center gap-1.5 sm:gap-2 py-1.5 px-2 sm:px-0 text-sm sm:text-base font-black tracking-tight transition-colors"
              style={{ color: activeTab === id ? activeColor : theme.swatches.text }}
            >
              <TabIcon className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
              <span className="hidden lg:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenGuide && (
            <button
              type="button"
              onClick={onOpenGuide}
              title="Library Guide & Handbook"
              aria-label="Library Guide"
              className={cn(
                'h-9 px-3 rounded-full border-2 flex items-center gap-1.5 shadow-sm transition-all hover:-translate-y-0.5 text-xs font-bold shrink-0',
                theme.classes.card,
              )}
            >
              <Compass className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Guide</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            title="Library settings"
            aria-label="Library settings"
            className={cn(
              'h-9 w-9 rounded-full border-2 flex items-center justify-center shadow-sm transition-all hover:-translate-y-0.5 shrink-0',
              theme.classes.card,
              activeTab === 'settings' && 'text-primary',
            )}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
