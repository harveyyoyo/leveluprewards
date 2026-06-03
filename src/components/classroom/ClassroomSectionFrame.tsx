'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Section body inside Classroom Management — no nested card. */
export function ClassroomSectionFrame({
  title,
  titleBelow,
  description,
  icon: Icon,
  children,
  className,
  headerExtra,
}: {
  title: string;
  titleBelow?: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  headerExtra?: ReactNode;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-3 border-b border-border/40 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h3 className="flex items-center gap-2 text-lg font-black tracking-tight text-foreground">
            {Icon ? <Icon className="h-5 w-5 shrink-0 text-violet-500" aria-hidden /> : null}
            {title}
          </h3>
          {titleBelow ? <div className="pt-1">{titleBelow}</div> : null}
          {description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {headerExtra ? <div className="shrink-0">{headerExtra}</div> : null}
      </div>
      {children}
    </section>
  );
}
