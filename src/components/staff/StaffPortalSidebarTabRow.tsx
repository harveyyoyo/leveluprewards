'use client';

import type { ComponentProps, ReactNode } from 'react';
import { X } from 'lucide-react';
import { TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type StaffPortalSidebarTabRowProps = {
  value: string;
  triggerClassName?: string;
  triggerStyle?: ComponentProps<typeof TabsTrigger>['style'];
  title?: string;
  removable?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
  /** Wrap trigger + remove (e.g. draggable shell in admin). */
  wrapperClassName?: string;
  wrapperProps?: Omit<ComponentProps<'div'>, 'className' | 'children'>;
  children: ReactNode;
};

export function StaffPortalSidebarTabRow({
  value,
  triggerClassName,
  triggerStyle,
  title,
  removable = false,
  onRemove,
  removeLabel,
  wrapperClassName,
  wrapperProps,
  children,
}: StaffPortalSidebarTabRowProps) {
  return (
    <div
      className={cn('group/tab-row relative w-full min-w-0', wrapperClassName)}
      {...wrapperProps}
    >
      <TabsTrigger
        value={value}
        className={cn(triggerClassName, removable && 'pr-9')}
        style={triggerStyle}
        title={title}
      >
        {children}
      </TabsTrigger>
      {removable && onRemove ? (
        <button
          type="button"
          className={cn(
            'absolute right-1.5 top-1/2 z-10 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-all',
            'opacity-0 pointer-events-none group-hover/tab-row:opacity-100 group-hover/tab-row:pointer-events-auto',
            'group-focus-within/tab-row:opacity-100 group-focus-within/tab-row:pointer-events-auto',
            'hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          aria-label={removeLabel ?? 'Remove tab from sidebar'}
          title={removeLabel ?? 'Remove from sidebar'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
