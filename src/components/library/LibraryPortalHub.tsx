'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { Library, BookOpen, Monitor, Settings, ArrowRight, Sparkles, Stamp } from 'lucide-react';
import { cn } from '@/lib/utils';
import LevelUpLogoMark from '@/components/logos/Logo';
import { useSettings } from '@/components/providers/SettingsProvider';
import { resolveLibraryTheme, type LibraryThemeId } from '@/lib/library/libraryThemes';
import { resolveLibraryHubCopy } from '@/lib/library/libraryHubCopy';

type HubCardId = 'desk' | 'catalog' | 'kiosk';

type HubCard = {
  id: HubCardId;
  icon: ComponentType<{ className?: string }>;
  spine: string;
  tint: string;
  iconColor: string;
  tilt: string;
};

const HUB_CARDS: HubCard[] = [
  {
    id: 'desk',
    icon: Library,
    spine: 'bg-[#38bdf8]',
    tint: 'bg-[#38bdf8]/10',
    iconColor: 'text-[#0369a1]',
    tilt: '-rotate-2',
  },
  {
    id: 'catalog',
    icon: BookOpen,
    spine: 'bg-[#6b9080]',
    tint: 'bg-[#6b9080]/10',
    iconColor: 'text-[#3f6552]',
    tilt: 'rotate-1',
  },
  {
    id: 'kiosk',
    icon: Monitor,
    spine: 'bg-[#f5b942]',
    tint: 'bg-[#f5b942]/10',
    iconColor: 'text-[#92400e]',
    tilt: '-rotate-1',
  },
];

export interface LibraryPortalHubProps {
  schoolName?: string;
  overdueCount?: number;
  catalogCount?: number;
  backToPortalHref: string;
  onSelect: (tab: HubCardId) => void;
  onOpenSettings: () => void;
}

/**
 * The Library Portal Hub landing screen — three storybook "doors" into the Librarian desk,
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
  const { settings } = useSettings();
  const theme = resolveLibraryTheme(settings.libraryTheme as LibraryThemeId);
  const copy = resolveLibraryHubCopy(settings.libraryHubCopy);
  const eyebrow = copy.eyebrow || schoolName;

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
    <div className={cn('relative min-h-dvh w-full overflow-x-hidden', theme.classes.wrapper)}>
      <div className="relative z-10 mx-auto flex max-w-4xl items-center justify-between px-4 sm:px-6 pt-6 sm:pt-8">
        <Link href={backToPortalHref} title="Back to LevelUp" className="flex items-center gap-3 group">
          <span
            className={cn(
              'grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 p-1.5 shadow-md transition-transform group-hover:-translate-y-0.5',
              theme.classes.card,
            )}
          >
            <LevelUpLogoMark className="h-full w-full" />
          </span>
          <span className="hidden sm:flex flex-col leading-tight">
            <span className="font-black text-base">{schoolName}</span>
            <span className={cn('text-[10px] font-bold uppercase tracking-[0.28em] opacity-70')}>
              {copy.headerProduct}
            </span>
          </span>
        </Link>

        <button
          type="button"
          onClick={onOpenSettings}
          title="Library settings"
          aria-label="Library settings"
          className={cn(
            'h-11 w-11 rounded-full border-2 flex items-center justify-center shadow-sm transition-all hover:-translate-y-0.5',
            theme.classes.card,
          )}
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      <main className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 pb-16 sm:pb-20 pt-8 sm:pt-14 text-center">
        <p
          className={cn(
            'inline-flex max-w-full items-center gap-2 rounded-full border-2 px-3 sm:px-4 py-1 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] sm:tracking-[0.3em]',
            theme.classes.badge,
          )}
        >
          <Sparkles className={cn('h-3.5 w-3.5 shrink-0', theme.classes.accent)} />
          <span className="truncate">{eyebrow}</span>
        </p>
        <h1 className="mt-4 sm:mt-5 text-[1.75rem] leading-[1.15] sm:text-5xl lg:text-6xl font-black sm:leading-[1.05]">
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
        {copy.intro ? (
          <p className="mx-auto mt-6 max-w-md text-base opacity-70">{copy.intro}</p>
        ) : null}

        <div className="mt-8 sm:mt-14 grid gap-5 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {HUB_CARDS.map((card) => {
            const Icon = card.icon;
            const text = cardText[card.id];
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onSelect(card.id)}
                className={cn(
                  'group relative rounded-[26px] border-2 p-1.5 text-left shadow-lg transition-transform duration-300 max-sm:rotate-0',
                  theme.classes.card,
                  card.tilt,
                  'hover:-translate-y-2 hover:rotate-0',
                )}
              >
                <span aria-hidden className={cn('absolute inset-y-6 left-0 w-2 rounded-full', card.spine)} />
                <div className={cn('rounded-[20px] border border-current/15 p-5 sm:p-6', card.tint)}>
                  <div className="flex items-start justify-between">
                    <span
                      className={cn(
                        'grid h-14 w-14 place-items-center rounded-2xl border-2 shadow-sm transition-transform duration-300 group-hover:-rotate-6',
                        theme.classes.card,
                      )}
                    >
                      <Icon className={cn('h-7 w-7', card.iconColor)} />
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest',
                        card.id === 'desk' && overdueCount > 0
                          ? 'border-rose-300 bg-rose-100 text-rose-700'
                          : theme.classes.badge,
                      )}
                    >
                      <Stamp className="h-3 w-3" />
                      {text.badge}
                    </span>
                  </div>

                  <h3 className="mt-5 sm:mt-6 text-2xl sm:text-3xl font-black">{text.title}</h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] opacity-50">{text.tagline}</p>
                  <p className="mt-4 text-sm leading-relaxed opacity-75">{text.description}</p>

                  <span
                    className={cn(
                      'mt-7 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-transform group-hover:translate-x-1',
                      theme.classes.button,
                    )}
                  >
                    {copy.enterLabel}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {copy.footer ? (
          <p className="mt-10 sm:mt-16 px-2 text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] opacity-45">{copy.footer}</p>
        ) : null}
      </main>
    </div>
  );
}
