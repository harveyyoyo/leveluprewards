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
      className="pointer-events-auto fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/20 bg-black/55 p-1 shadow-2xl backdrop-blur-md"
    >
      {options.map(({ view, label, icon: Icon }) => (
        <Link
          key={view}
          href={buildSwitchHref(schoolId, view, current)}
          className={cn(
            'flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition-colors',
            activeView === view ? 'bg-white text-black' : 'text-white/80 hover:text-white',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
