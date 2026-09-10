'use client';

import { ScanBarcode } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AnimatedScannerLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  active?: boolean;
  label?: string;
  showLabel?: boolean;
  showStatusDot?: boolean;
  className?: string;
}

export function AnimatedScannerLogo({
  size = 'md',
  active = true,
  label = 'Barcode Reader Ready',
  showLabel = true,
  showStatusDot = true,
  className,
}: AnimatedScannerLogoProps) {
  const sizeMap = {
    sm: {
      wrapper: 'h-6 w-6',
      icon: 'h-3.5 w-3.5',
      badge: 'p-1 rounded-lg',
      laserH: 'h-[1.5px]',
      dot: 'h-1.5 w-1.5',
      text: 'text-xs',
    },
    md: {
      wrapper: 'h-8 w-8',
      icon: 'h-4 w-4',
      badge: 'p-1.5 rounded-xl',
      laserH: 'h-[2px]',
      dot: 'h-2 w-2',
      text: 'text-xs',
    },
    lg: {
      wrapper: 'h-12 w-12',
      icon: 'h-6 w-6',
      badge: 'p-2.5 rounded-2xl',
      laserH: 'h-[2.5px]',
      dot: 'h-2.5 w-2.5',
      text: 'text-sm font-semibold',
    },
    hero: {
      wrapper: 'h-16 w-16',
      icon: 'h-9 w-9',
      badge: 'p-3.5 rounded-2xl',
      laserH: 'h-[3px]',
      dot: 'h-3 w-3',
      text: 'text-base font-bold',
    },
  };

  const s = sizeMap[size];

  return (
    <div
      className={cn('inline-flex items-center gap-2 select-none', className)}
      role="status"
      aria-label={label || 'Barcode scanner ready'}
    >
      <div className={cn('relative flex items-center justify-center shrink-0', s.wrapper)}>
        {/* Pulsing Radar Ring */}
        {active && (
          <span
            className="absolute -inset-1 rounded-2xl bg-primary/25 animate-ping opacity-40 pointer-events-none"
            aria-hidden="true"
          />
        )}

        {/* Scanner Badge Container */}
        <div
          className={cn(
            'relative flex items-center justify-center overflow-hidden border transition-all duration-300 shadow-sm',
            s.badge,
            active
              ? 'border-primary/50 bg-primary/10 text-primary ring-2 ring-primary/20 shadow-[0_0_12px_rgba(var(--primary),0.15)]'
              : 'border-muted bg-muted/40 text-muted-foreground opacity-60'
          )}
        >
          {/* Main Barcode Icon */}
          <ScanBarcode
            className={cn(
              s.icon,
              active ? 'text-primary transition-colors' : 'text-muted-foreground'
            )}
            aria-hidden="true"
          />

          {/* Sweeping Optical Laser Beam */}
          {active && (
            <div className="pointer-events-none absolute inset-x-0.5 inset-y-0 overflow-hidden">
              <div
                className={cn(
                  'absolute inset-x-0 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_1.5px_rgba(239,68,68,0.9)] dark:via-red-400 animate-scanner-laser',
                  s.laserH
                )}
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        {/* Small Active Indicator Dot */}
        {showStatusDot && active && (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse',
              s.dot
            )}
            aria-hidden="true"
          />
        )}
      </div>

      {showLabel && label && (
        <span
          className={cn(
            'font-bold tracking-tight transition-colors',
            active ? 'text-foreground/90' : 'text-muted-foreground',
            s.text
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}
