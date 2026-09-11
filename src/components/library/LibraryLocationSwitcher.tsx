'use client';

import { motion } from 'framer-motion';
import { BookOpen, Library } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  libraryLocationKindLabel,
  libraryLocationLabel,
  type LibraryLocation,
} from '@/lib/library/libraryLocations';
import { cn } from '@/lib/utils';

const listMotion = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemMotion = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 320, damping: 26 } },
};

export function LibraryLocationSwitcher({
  locations,
  activeId,
  onChange,
  classNames,
  compact = false,
}: {
  locations: LibraryLocation[];
  activeId: string;
  onChange: (id: string) => void;
  classNames?: Record<string, string>;
  compact?: boolean;
}) {
  if (locations.length <= 1) {
    const only = locations[0];
    if (!only) return null;
    return (
      <p className={cn('text-sm text-muted-foreground', classNames?.label)}>
        {libraryLocationLabel(only, classNames?.[only.id])}
      </p>
    );
  }

  return (
    <div className={cn('space-y-2', classNames?.root)}>
      {!compact ? (
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Which library?
        </Label>
      ) : null}
      <motion.div
        className={cn('flex flex-wrap gap-2', classNames?.list)}
        variants={listMotion}
        initial="hidden"
        animate="show"
      >
        {locations.map((location) => {
          const selected = location.id === activeId;
          return (
            <motion.button
              key={location.id}
              type="button"
              layoutId={`library-location-${location.id}`}
              variants={itemMotion}
              onClick={() => onChange(location.id)}
              aria-pressed={selected}
              className={cn(
                'relative rounded-full border px-3 py-1.5 text-left text-sm font-semibold shadow-sm transition-colors',
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground hover:border-primary/50',
              )}
            >
              <span className="flex items-center gap-1.5">
                {location.kind === 'classroom' ? (
                  <BookOpen className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Library className="h-3.5 w-3.5" aria-hidden />
                )}
                {libraryLocationLabel(location, classNames?.[location.id])}
              </span>
              {!compact ? (
                <span className={cn('block text-[10px] font-medium', selected ? 'opacity-80' : 'text-muted-foreground')}>
                  {libraryLocationKindLabel(location.kind)}
                </span>
              ) : null}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
