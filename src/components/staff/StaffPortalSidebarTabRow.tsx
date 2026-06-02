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
    <div className={cn('flex w-full min-w-0 items-stretch gap-0.5', wrapperClassName)} {...wrapperProps}>
      <TabsTrigger
        value={value}
        className={cn(triggerClassName, removable && 'min-w-0 flex-1 pr-1')}
        style={triggerStyle}
        title={title}
      >
        {children}
      </TabsTrigger>
      {removable && onRemove ? (
        <button
          type="button"
          className="inline-flex h-9 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
