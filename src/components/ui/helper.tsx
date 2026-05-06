
'use client';

import React from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useSettings } from '../providers/SettingsProvider';
import { cn } from '@/lib/utils';

interface HelperProps {
  content: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  iconClassName?: string;
  iconSize?: number;
  children: React.ReactNode;
}

export function Helper({ children, content, side = 'right', className, iconClassName, iconSize = 16 }: HelperProps) {
  const { settings } = useSettings();

  if (!settings.enableHelperMode) {
    return <>{children}</>;
  }

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      {children}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn("text-muted-foreground/50 hover:text-muted-foreground transition-colors focus:outline-none", iconClassName)}
          >
            <HelpCircle style={{ width: iconSize, height: iconSize }} />
          </button>
        </PopoverTrigger>
        <PopoverContent side={side} className="max-w-xs z-[101] text-sm p-3 bg-background border-2 shadow-xl w-auto">
          {content}
        </PopoverContent>
      </Popover>
    </div>
  );
}
