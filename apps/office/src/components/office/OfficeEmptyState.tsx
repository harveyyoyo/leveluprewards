'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type OfficeEmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function OfficeEmptyState({ icon: Icon, title, description, action, className }: OfficeEmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center dark:border-slate-800 dark:bg-slate-900/40',
        className,
      )}
    >
      {Icon ? <Icon className="mx-auto h-8 w-8 text-teal-700/60 dark:text-teal-400/60" aria-hidden /> : null}
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
