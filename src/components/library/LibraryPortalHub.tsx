'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { Library, BookOpen, Monitor, Settings, ArrowUpRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import LevelUpLogoMark from '@/components/logos/Logo';

type HubCard = {
  id: 'desk' | 'catalog' | 'kiosk';
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
};

const HUB_CARDS: HubCard[] = [
  {
    id: 'desk',
    title: 'Librarian',
    description: 'Look up books and patrons, and manage loans from the library desk.',
    icon: Library,
    accent: 'bg-blue-500',
  },
  {
    id: 'catalog',
    title: 'Catalog',
    description: 'Browse every copy, print spine labels, and audit the collection.',
    icon: BookOpen,
    accent: 'bg-emerald-500',
  },
  {
    id: 'kiosk',
    title: 'Student Kiosk',
    description: 'Let students scan their own ID to borrow and return books.',
    icon: Monitor,
    accent: 'bg-amber-500',
  },
];

export interface LibraryPortalHubProps {
  schoolName?: string;
  overdueCount?: number;
  backToPortalHref: string;
  onSelect: (tab: 'desk' | 'catalog' | 'kiosk') => void;
  onOpenSettings: () => void;
}

export function LibraryPortalHub({ schoolName = 'School Library', overdueCount = 0, backToPortalHref, onSelect, onOpenSettings }: LibraryPortalHubProps) {
  return (
    <div className="min-h-dvh w-full flex flex-col items-center justify-center px-4 py-10 sm:py-16 relative">
      <Link
        href={backToPortalHref}
        title="Back to LevelUp"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 h-11 w-11 rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden p-2 transition-all hover:border-primary/50 hover:-translate-y-0.5"
      >
        <LevelUpLogoMark className="h-full w-full" />
      </Link>

      <button
        type="button"
        onClick={onOpenSettings}
        title="Policies & Settings"
        aria-label="Policies & Settings"
        className="absolute top-4 right-4 sm:top-6 sm:right-6 h-11 w-11 rounded-2xl border border-border/80 bg-card shadow-xs flex items-center justify-center text-muted-foreground transition-all hover:border-primary/50 hover:text-primary hover:-translate-y-0.5"
      >
        <Settings className="h-5 w-5" />
      </button>

      <div className="text-center mb-8 sm:mb-12 space-y-2">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">{schoolName}</p>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">Library</h1>
        <p className="text-sm text-muted-foreground">Where would you like to go?</p>
      </div>

      <div className="grid w-full max-w-4xl grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {HUB_CARDS.map((card) => {
          const Icon = card.icon;
          const showOverdueBadge = card.id === 'desk' && overdueCount > 0;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelect(card.id)}
              className={cn(
                'group relative flex flex-col items-center text-center gap-3 rounded-3xl border-2 border-border/70 bg-card p-6 sm:p-8 shadow-sm transition-all duration-200',
                'hover:-translate-y-1 hover:shadow-xl hover:border-primary/50',
              )}
            >
              {showOverdueBadge && (
                <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 text-[10px] font-black text-rose-600 dark:text-rose-400">
                  <Clock className="h-3 w-3" />
                  {overdueCount} overdue
                </span>
              )}
              <div
                className={cn(
                  'flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl shadow-md transition-transform duration-200 group-hover:scale-105',
                  card.accent,
                )}
              >
                <Icon className="h-8 w-8 sm:h-9 sm:w-9 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-black tracking-tight text-foreground">{card.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-snug">{card.description}</p>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground/60 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
