
'use client';

import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSettings } from '../providers/SettingsProvider';
import { cn } from '@/lib/utils';

interface HelperProps {
  /** Short explanation of what this section does and how to use it. */
  content: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  iconClassName?: string;
  iconSize?: number;
  children: React.ReactNode;
}

function HelperTooltipBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-xs space-y-1.5 text-sm leading-relaxed text-popover-foreground">
      {children}
    </div>
  );
}

export function Helper({
  children,
  content,
  side = 'top',
  className,
  iconClassName,
  iconSize = 16,
}: HelperProps) {
  const { settings } = useSettings();

  if (!settings.enableHelperMode) {
    return <>{children}</>;
  }

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      {children}
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Section help"
            className={cn(
              'cursor-help text-muted-foreground/50 transition-colors hover:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm',
              iconClassName,
            )}
          >
            <HelpCircle style={{ width: iconSize, height: iconSize }} aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          sideOffset={6}
          className="z-[101] max-w-xs border-2 p-3 shadow-xl"
        >
          <HelperTooltipBody>{content}</HelperTooltipBody>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
