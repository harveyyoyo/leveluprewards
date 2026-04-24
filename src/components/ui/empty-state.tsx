'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: LucideIcon;
  };
  /** Secondary action (e.g. "Learn more"). */
  secondaryAction?: {
    label: string;
    onClick?: () => void;
  };
  /** Makes the card smaller (for inline/empty lists vs page-level). */
  compact?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Consistent empty state: icon in a soft-tinted circle, bold title, calmer
 * description, then a primary "Add first X" CTA. Use everywhere a list or
 * dashboard has nothing to show so the UI teaches the next step instead of
 * leaving a lonely "No X yet." paragraph.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4 gap-3' : 'py-14 px-6 gap-4',
        className
      )}
      role="status"
    >
      {Icon && (
        <div
          className={cn(
            'rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center',
            compact ? 'h-12 w-12' : 'h-16 w-16'
          )}
          aria-hidden="true"
        >
          <Icon className={cn(compact ? 'h-6 w-6' : 'h-8 w-8')} />
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <p className={cn('font-bold text-foreground', compact ? 'text-base' : 'text-lg')}>
          {title}
        </p>
        {description && (
          <p
            className={cn(
              'text-muted-foreground leading-relaxed',
              compact ? 'text-xs' : 'text-sm'
            )}
          >
            {description}
          </p>
        )}
      </div>
      {children}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-2 mt-1">
          {action && (
            action.href ? (
              <Button asChild className="font-bold rounded-xl">
                <a href={action.href}>
                  {action.icon && <action.icon className="mr-2 h-4 w-4" aria-hidden="true" />}
                  {action.label}
                </a>
              </Button>
            ) : (
              <Button onClick={action.onClick} className="font-bold rounded-xl">
                {action.icon && <action.icon className="mr-2 h-4 w-4" aria-hidden="true" />}
                {action.label}
              </Button>
            )
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick} className="rounded-xl">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
