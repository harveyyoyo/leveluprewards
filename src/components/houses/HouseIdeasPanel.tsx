'use client';

import Link from 'next/link';
import { Lightbulb, Sparkles, Trophy, Wand2, RefreshCw, Users, Tv, Link2, PenLine } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type HouseIdeasPanelProps = {
  linkedToStudentRewards: boolean;
  hasHouses: boolean;
  unassignedCount: number;
  sortingHref: string;
  onSetupWizard: () => void;
  onPopulateSample: () => void;
  onHallOfFame: () => void;
  onSync?: () => void;
  syncBusy?: boolean;
};

type HouseIdea = {
  id: string;
  icon: LucideIcon;
  title: string;
  detail: string;
};

const BASE_IDEAS: HouseIdea[] = [
  {
    id: 'wizard',
    icon: Sparkles,
    title: 'Run the setup wizard',
    detail: 'Starter themes, link to student rewards, roster assignment, and TV display in one flow.',
  },
  {
    id: 'sorting',
    icon: Wand2,
    title: 'Hold a sorting ceremony',
    detail: 'Pick each student’s house, then reveal on a big screen—great for the first week or new enrollments.',
  },
  {
    id: 'tv',
    icon: Tv,
    title: 'Lobby TV board',
    detail: 'Open House Hall of Fame in fullscreen on a gym or front-office display.',
  },
  {
    id: 'parents',
    icon: Users,
    title: 'Assign house parents',
    detail: 'Expand a house row and tag teachers as house parents for that team.',
  },
  {
    id: 'linked',
    icon: Link2,
    title: 'Daily awards count toward houses',
    detail: 'Keep “link house totals” on so teacher points and coupon redemptions update standings automatically.',
  },
  {
    id: 'manual',
    icon: PenLine,
    title: 'Spirit week house-only points',
    detail: 'Turn linking off and use +/- on each row for sports days or challenges without moving student wallets.',
  },
  {
    id: 'sync',
    icon: RefreshCw,
    title: 'Sync after roster changes',
    detail: 'After bulk assign or import, run Sync from students so house totals match current balances.',
  },
  {
    id: 'sample',
    icon: Sparkles,
    title: 'Try a theme pack',
    detail: 'Populate sample adds Phoenix/Tide-style teams—or pick Sports, Elements, or Yeshiva middot packs.',
  },
];

export function HouseIdeasPanel({
  linkedToStudentRewards,
  hasHouses,
  unassignedCount,
  sortingHref,
  onSetupWizard,
  onPopulateSample,
  onHallOfFame,
  onSync,
  syncBusy,
}: HouseIdeasPanelProps) {
  const ideas = BASE_IDEAS.filter((idea) => {
    if (idea.id === 'linked' && !linkedToStudentRewards) return false;
    if (idea.id === 'manual' && linkedToStudentRewards) return false;
    if (idea.id === 'sync' && (!linkedToStudentRewards || !hasHouses || !onSync)) return false;
    return true;
  });

  const actionFor = (id: string) => {
    switch (id) {
      case 'wizard':
        return (
          <Button type="button" size="sm" variant="secondary" className="rounded-lg h-8" onClick={onSetupWizard}>
            Open wizard
          </Button>
        );
      case 'sorting':
        return (
          <Button size="sm" variant="outline" className="rounded-lg h-8" asChild>
            <Link href={sortingHref} target="_blank" rel="noopener noreferrer">
              Sorting ceremony
            </Link>
          </Button>
        );
      case 'tv':
        return (
          <Button type="button" size="sm" variant="outline" className="rounded-lg h-8" onClick={onHallOfFame}>
            Hall of Fame settings
          </Button>
        );
      case 'sync':
        return onSync ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-lg h-8"
            disabled={syncBusy}
            onClick={onSync}
          >
            Sync from students
          </Button>
        ) : null;
      case 'sample':
        return (
          <Button type="button" size="sm" variant="outline" className="rounded-lg h-8" onClick={onPopulateSample}>
            Populate sample
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.04] to-muted/30 p-4 md:p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Lightbulb className="h-4 w-4" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">House ideas</p>
          <p className="text-xs text-muted-foreground">Ways schools use teams, points, and the TV board.</p>
        </div>
      </div>
      {unassignedCount > 0 && hasHouses ? (
        <p className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
          {unassignedCount} student{unassignedCount === 1 ? '' : 's'} still need a house—open the Rosters section and use
          Assign balanced, or run sorting ceremony.
        </p>
      ) : null}
      <ul className="grid gap-2 sm:grid-cols-2">
        {ideas.map((idea) => {
          const Icon = idea.icon;
          const action = actionFor(idea.id);
          return (
            <li
              key={idea.id}
              className={cn(
                'flex flex-col gap-2 rounded-xl border bg-card/70 p-3',
                idea.id === 'tv' && 'sm:col-span-2 lg:col-span-1',
              )}
            >
              <div className="flex items-start gap-2">
                <Icon className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground leading-tight">{idea.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{idea.detail}</p>
                </div>
              </div>
              {action ? <div className="pl-6">{action}</div> : null}
            </li>
          );
        })}
      </ul>
      {hasHouses ? (
        <p className="mt-3 text-[10px] text-muted-foreground">
          <Trophy className="inline h-3 w-3 mr-1 opacity-70" aria-hidden />
          Tip: edit house colors and emojis from the pencil icon on each row so the Hall of Fame matches your school
          spirit.
        </p>
      ) : null}
    </div>
  );
}
