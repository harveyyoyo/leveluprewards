'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Megaphone, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DisplayView } from '@/lib/displays/displayRoutes';

type DisplayViewSwitcherProps = {
  schoolId: string;
  activeView: DisplayView;
  bulletinEnabled: boolean;
  smartScreenEnabled: boolean;
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
}: DisplayViewSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!pathname?.includes('/displays')) return null;
  if (!bulletinEnabled && !smartScreenEnabled) return null;
  if (bulletinEnabled && smartScreenEnabled) {
    const current = new URLSearchParams(searchParams.toString());
    return (
      <nav
        aria-label="Display view"
        className="pointer-events-auto fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/20 bg-black/55 p-1 shadow-2xl backdrop-blur-md"
      >
        <Link
          href={buildSwitchHref(schoolId, 'smart', current)}
          className={cn(
            'flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition-colors',
            activeView === 'smart' ? 'bg-white text-black' : 'text-white/80 hover:text-white',
          )}
        >
          <Monitor className="h-4 w-4" aria-hidden />
          Smart Screen
        </Link>
        <Link
          href={buildSwitchHref(schoolId, 'bulletin', current)}
          className={cn(
            'flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition-colors',
            activeView === 'bulletin' ? 'bg-white text-black' : 'text-white/80 hover:text-white',
          )}
        >
          <Megaphone className="h-4 w-4" aria-hidden />
          Bulletin
        </Link>
      </nav>
    );
  }

  return null;
}
