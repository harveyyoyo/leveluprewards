'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { motion } from 'framer-motion';
import { Library, BookOpen, Monitor, ArrowRight, Stamp, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/components/providers/SettingsProvider';
import { resolveLibraryTheme, type LibraryThemeId } from '@/lib/library/libraryThemes';
import { resolveLibraryHubCopy } from '@/lib/library/libraryHubCopy';
import { activateLibraryTour } from '@/lib/tours/startLibraryTour';
import { LibraryBackdrop } from './LibraryBackdrop';
import { LibraryHeaderBar, type LibraryHeaderNavTab } from './LibraryHeaderBar';
import { SiteFooter } from '@/components/layout/SiteFooter';

type HubDoorId = Exclude<LibraryHeaderNavTab, 'reports'>;

type HubCard = {
  id: HubDoorId;
  icon: ComponentType<{ className?: string }>;
  spine: string;
  tint: string;
  iconColor: string;
  /** Resting tilt in degrees on large screens — straightens out on hover. */
  tiltDeg: number;
};

const HUB_CARDS: HubCard[] = [
  {
    id: 'desk',
    icon: Library,
    spine: 'bg-[#38bdf8]',
    tint: 'bg-[#38bdf8]/10',
    iconColor: 'text-[#0369a1]',
    tiltDeg: -2,
  },
  {
    id: 'catalog',
    icon: BookOpen,
    spine: 'bg-[#6b9080]',
    tint: 'bg-[#6b9080]/10',
    iconColor: 'text-[#3f6552]',
    tiltDeg: 1,
  },
  {
    id: 'kiosk',
    icon: Monitor,
    spine: 'bg-[#f5b942]',
    tint: 'bg-[#f5b942]/10',
    iconColor: 'text-[#92400e]',
    tiltDeg: -1,
  },
];

/** Cards only tilt on large screens (matches the old `lg:` Tailwind breakpoint) — framer-motion
 * can't express that in the className itself since it owns `transform` once animated. */
function useIsLargeScreen() {
  const [isLarge, setIsLarge] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    setIsLarge(mql.matches);
    const onChange = () => setIsLarge(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isLarge;
}

export interface LibraryPortalHubProps {
  schoolName?: string;
  overdueCount?: number;
  catalogCount?: number;
  backToPortalHref: string;
  onSelect: (tab: LibraryHeaderNavTab) => void;
  onOpenSettings: () => void;
}

/**
 * The Library Portal Hub landing screen — storybook "doors" into the Librarian desk,
 * Catalog, and Student Kiosk. Colors come from the Ambiance theme; wording comes from
 * Settings → Theme & Atmosphere → Front page wording.
 */
export function LibraryPortalHub({
  schoolName = 'School Library',
  overdueCount = 0,
  catalogCount,
  backToPortalHref,
  onSelect,
  onOpenSettings,
}: LibraryPortalHubProps) {
  const { settings, updateSettings } = useSettings();
  const theme = resolveLibraryTheme(settings.libraryTheme as LibraryThemeId, settings.libraryBoxOpacity);
  const copy = resolveLibraryHubCopy(settings.libraryHubCopy);
  const isLargeScreen = useIsLargeScreen();

  const cardText = {
    desk: {
      title: copy.deskTitle,
      tagline: copy.deskTagline,
      description: copy.deskDescription,
      badge: overdueCount > 0 ? `${overdueCount} Overdue` : copy.deskBadge,
    },
    catalog: {
      title: copy.catalogTitle,
      tagline: copy.catalogTagline,
      description: copy.catalogDescription,
      badge:
        catalogCount != null ? `${catalogCount} ${copy.catalogCopiesLabel}`.trim() : copy.catalogBadge,
    },
    kiosk: {
      title: copy.kioskTitle,
      tagline: copy.kioskTagline,
      description: copy.kioskDescription,
      badge: copy.kioskBadge,
    },
  } as const;

  return (
    <div className={cn('library-readable relative flex h-dvh max-h-dvh w-full flex-col overflow-hidden animate-in fade-in duration-300', theme.classes.wrapper)}>
      <LibraryBackdrop theme={theme} />
      <LibraryHeaderBar
        theme={theme}
        schoolName={schoolName}
        productLabel={copy.headerProduct}
        backToPortalHref={backToPortalHref}
        activeTab="hub"
        onNavigate={onSelect}
        onHome={() => {}}
        onOpenSettings={onOpenSettings}
      />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 min-h-0 flex-col items-center justify-center overflow-y-auto px-4 sm:px-6 py-12 lg:py-24 text-center">
        <h1 className="text-[1.75rem] leading-[1.15] lg:text-5xl font-black lg:leading-[1.05]">
          <span className="block sm:inline">{copy.welcomeLead}</span>
          {copy.welcomeHighlight ? (
            <span className="relative mt-1 sm:mt-0 sm:ml-3 inline-block">
              {copy.welcomeHighlight}
              <svg
                aria-hidden
                viewBox="0 0 200 12"
                className={cn('absolute -bottom-2 left-0 h-3 w-full', theme.classes.accent)}
                preserveAspectRatio="none"
              >
                <path
                  d="M2 8 C40 2, 70 10, 110 5 S180 2, 198 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          ) : null}
        </h1>
        <motion.div
          className="mt-16 lg:mt-24 grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08 } },
          }}
        >
          {HUB_CARDS.map((card) => {
            const Icon = card.icon;
            const text = cardText[card.id];
            return (
              <motion.button
                key={card.id}
                type="button"
                layoutId={`library-hub-${card.id}`}
                data-intro-tour={`library-hub-${card.id}`}
                onClick={() => onSelect(card.id)}
                variants={{
                  hidden: { opacity: 0, y: 18, rotate: 0 },
                  show: {
                    opacity: 1,
                    y: 0,
                    rotate: isLargeScreen ? card.tiltDeg : 0,
                    transition: { type: 'spring', stiffness: 280, damping: 24 },
                  },
                }}
                whileHover={{ y: -8, rotate: 0, transition: { duration: 0.3 } }}
                className={cn(
                  'group relative rounded-[22px] border-2 p-1 text-left shadow-lg',
                  theme.classes.card,
                )}
              >
                <span aria-hidden className={cn('absolute inset-y-5 left-0 w-2 rounded-full', card.spine)} />
                <div className={cn('rounded-[17px] border border-current/15 p-2.5 lg:p-5', card.tint)}>
                  <div className="flex items-start justify-between">
                    <span
                      className={cn(
                        'grid h-8 w-8 lg:h-11 lg:w-11 place-items-center rounded-xl lg:rounded-2xl border-2 shadow-sm transition-transform duration-300 group-hover:-rotate-6',
                        theme.classes.card,
                      )}
                    >
                      <Icon className={cn('h-4 w-4 lg:h-6 lg:w-6', card.iconColor)} />
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 lg:py-1 text-[10px] font-bold uppercase tracking-widest',
                        card.id === 'desk' && overdueCount > 0
                          ? 'border-rose-300 bg-rose-100 text-rose-700'
                          : theme.classes.badge,
                      )}
                    >
                      <Stamp className="h-3 w-3" />
                      {text.badge}
                    </span>
                  </div>

                  <h3 className="mt-1 lg:mt-3 text-base lg:text-2xl font-black">{text.title}</h3>
                  <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.18em] opacity-50">{text.tagline}</p>
                  <p className="mt-0.5 lg:mt-2 text-xs lg:text-sm leading-relaxed opacity-75 lg:line-clamp-2">{text.description}</p>

                  <span
                    className={cn(
                      'mt-1.5 lg:mt-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold transition-transform group-hover:translate-x-1',
                      theme.classes.button,
                    )}
                  >
                    {copy.enterLabel}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        <button
          type="button"
          onClick={() => activateLibraryTour(updateSettings)}
          className="mt-8 lg:mt-12 inline-flex items-center gap-1.5 text-xs font-bold underline decoration-dotted underline-offset-4 opacity-60 transition-opacity hover:opacity-100"
        >
          <Compass className="h-3.5 w-3.5" />
          Take a quick tour
        </button>

      </main>
      <SiteFooter />
    </div>
  );
}
