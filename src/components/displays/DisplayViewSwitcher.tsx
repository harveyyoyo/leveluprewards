'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Megaphone, Monitor, Trophy, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DisplayView } from '@/lib/displays/displayRoutes';

type DisplayViewSwitcherProps = {
  schoolId: string;
  activeView: DisplayView;
  bulletinEnabled: boolean;
  smartScreenEnabled: boolean;
  hallOfFameEnabled: boolean;
};

type SwitcherOption = {
  view: DisplayView;
  label: string;
  icon: LucideIcon;
};

function buildSwitchHref(
  schoolId: string,
  view: DisplayView,
  searchParams: URLSearchParams,
): string {
  const params = new URLSearchParams(searchParams.toString());
  params.set('view', view);
  return `/${schoolId}/displays?${params.toString()}`;
}

export function DisplayViewSwitcher({
  schoolId,
  activeView,
  bulletinEnabled,
  smartScreenEnabled,
  hallOfFameEnabled,
}: DisplayViewSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!pathname?.includes('/displays')) return null;

  const options: SwitcherOption[] = [];
  if (smartScreenEnabled) options.push({ view: 'smart', label: 'Smart Screen', icon: Monitor });
  if (bulletinEnabled) options.push({ view: 'bulletin', label: 'Bulletin', icon: Megaphone });
  if (hallOfFameEnabled) options.push({ view: 'hall-of-fame', label: 'Hall of Fame', icon: Trophy });

  // Only show the switcher when there is more than one display to switch between.
  if (options.length < 2) return null;

  const current = new URLSearchParams(searchParams.toString());

  return (
    <nav
      aria-label="Display view"
      className="pointer-events-auto fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-50 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-0.5 rounded-full border border-white/20 bg-black/55 p-1 shadow-2xl backdrop-blur-md sm:gap-1"
    >
      {options.map(({ view, label, icon: Icon }) => (
        <Link
          key={view}
          href={buildSwitchHref(schoolId, view, current)}
          aria-label={label}
          title={label}
          className={cn(
            'flex size-11 shrink-0 items-center justify-center gap-2 rounded-full text-xs font-black uppercase tracking-wide transition-colors sm:h-auto sm:w-auto sm:px-4 sm:py-2',
            activeView === view ? 'bg-white text-black' : 'text-white/80 hover:text-white',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
