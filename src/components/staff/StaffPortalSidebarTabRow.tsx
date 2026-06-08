'use client';

import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import { X } from 'lucide-react';
import { TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { staffPortalTabTriggerActiveClassName } from './staffPortalNavStyles';

type StaffPortalSidebarTabRowProps = {
  value: string;
  triggerClassName?: string;
  triggerStyle?: CSSProperties;
  title?: string;
  removable?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
  /** Plain-button mode (sidebar outside Radix Tabs). */
  isActive?: boolean;
  onSelect?: () => void;
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
  isActive = false,
  onSelect,
  wrapperClassName,
  wrapperProps,
  children,
}: StaffPortalSidebarTabRowProps) {
  const triggerClasses = cn(triggerClassName, removable && 'pr-9');

  return (
    <div
      className={cn('group/tab-row relative w-full min-w-0', wrapperClassName)}
      data-intro-tour={`staff-tab-${value}`}
      {...wrapperProps}
    >
      {onSelect ? (
        <button
          type="button"
          role="tab"
          aria-selected={isActive}
          aria-controls={`tabpanel-${value}`}
          tabIndex={isActive ? 0 : -1}
          className={cn(
            triggerClasses,
            isActive && !triggerStyle && staffPortalTabTriggerActiveClassName(),
            isActive && triggerStyle && 'font-bold shadow-sm',
          )}
          style={triggerStyle}
          title={title}
          onClick={onSelect}
        >
          {children}
        </button>
      ) : (
        <TabsTrigger
          value={value}
          className={triggerClasses}
          style={triggerStyle}
          title={title}
        >
          {children}
        </TabsTrigger>
      )}
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
