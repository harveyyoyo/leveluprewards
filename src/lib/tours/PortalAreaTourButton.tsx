'use client';

import { HelpCircle } from 'lucide-react';
import type { KeyboardEvent, MouseEvent } from 'react';

import { cn } from '@/lib/utils';

import { isPortalTourLaunchArea, portalTourIdForArea, type PortalTourId } from './startPortalTour';

type PortalAreaTourButtonProps = {
  areaId: string;
  /** Compact hub cards use a smaller chip; default cards use the standard chip. */
  layout?: 'compact' | 'default';
  onLaunchTour: (tourId: PortalTourId) => void;
};

export function launchPortalAreaTourFromEvent(
  areaId: string,
  e: MouseEvent | KeyboardEvent,
  onLaunchTour: (tourId: PortalTourId) => void,
): void {
  e.preventDefault();
  e.stopPropagation();
  const tourId = portalTourIdForArea(areaId);
  if (tourId) onLaunchTour(tourId);
}

export function PortalAreaTourButton({ areaId, layout = 'default', onLaunchTour }: PortalAreaTourButtonProps) {
  if (!isPortalTourLaunchArea(areaId)) return null;

  const compact = layout === 'compact';

  return (
    <div className={cn('pointer-events-auto', compact ? 'pt-1 z-20' : 'pt-2')}>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          'inline-flex cursor-pointer items-center rounded-md bg-secondary/40 font-bold text-secondary-foreground shadow-sm transition-all hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
          compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        )}
        onClick={(e) => launchPortalAreaTourFromEvent(areaId, e, onLaunchTour)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            launchPortalAreaTourFromEvent(areaId, e, onLaunchTour);
          }
        }}
      >
        <HelpCircle className={cn('text-secondary-foreground', compact ? 'mr-1 h-3 w-3' : 'mr-1.5 h-3.5 w-3.5')} />
        {compact ? 'Welcome Tour' : 'Portal Tour'}
      </div>
    </div>
  );
}
