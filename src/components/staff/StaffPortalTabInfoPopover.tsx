'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, Clock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type StaffPortalTabInfoSection = {
  title: string;
  accent?: 'default' | 'emerald' | 'amber';
  icon?: LucideIcon;
  body?: React.ReactNode;
  bullets?: string[];
};

const ACCENT_BOX_CLASS: Record<NonNullable<StaffPortalTabInfoSection['accent']>, string> = {
  default: 'border-border/60 bg-muted/40',
  emerald: 'border-emerald-500/30 bg-emerald-500/5',
  amber: 'border-amber-500/30 bg-amber-500/5',
};

const ACCENT_TITLE_CLASS: Record<NonNullable<StaffPortalTabInfoSection['accent']>, string> = {
  default: 'text-foreground',
  emerald: 'text-emerald-700 dark:text-emerald-300',
  amber: 'text-amber-700 dark:text-amber-300',
};

function TabInfoSection({ section }: { section: StaffPortalTabInfoSection }) {
  const accent = section.accent ?? 'default';
  const Icon =
    section.icon ??
    (accent === 'emerald' ? CheckCircle2 : accent === 'amber' ? Clock : undefined);

  return (
    <div className={cn('space-y-1.5 rounded-xl border p-3', ACCENT_BOX_CLASS[accent])}>
      <p className={cn('flex items-center gap-1.5 text-sm font-semibold', ACCENT_TITLE_CLASS[accent])}>
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
        {section.title}
      </p>
      {section.body ? (
        <div className="text-sm leading-relaxed text-muted-foreground">{section.body}</div>
      ) : null}
      {section.bullets?.length ? (
        <ul className="space-y-1 text-sm leading-relaxed text-muted-foreground">
          {section.bullets.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function staffPortalTabInfoSection(
  body: React.ReactNode,
  title = 'What is this for?',
): StaffPortalTabInfoSection {
  return { title, body, accent: 'default' };
}

export function StaffPortalTabInfoPopover({
  sections,
  ariaLabel = 'Section help',
  align = 'start',
  className,
}: {
  sections: StaffPortalTabInfoSection[];
  ariaLabel?: string;
  align?: 'start' | 'center' | 'end';
  className?: string;
}) {
  if (!sections.length) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:bg-transparent hover:text-foreground',
            className,
          )}
          aria-label={ariaLabel}
        >
          <Info className="h-4 w-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[250] w-[min(20rem,calc(100vw-2rem))] space-y-3 p-3"
        align={align}
      >
        {sections.map((section) => (
          <TabInfoSection key={section.title} section={section} />
        ))}
      </PopoverContent>
    </Popover>
  );
}
