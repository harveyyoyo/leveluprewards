'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudentKioskTransitionFlashProps {
  title?: string;
  message?: string;
  className?: string;
}

export function StudentKioskTransitionFlash({
  title = 'Student found',
  message = 'Loading your screen...',
  className,
}: StudentKioskTransitionFlashProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-[250] flex items-center justify-center bg-background text-foreground',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="absolute inset-0 rounded-full bg-primary/20 motion-safe:animate-ping" aria-hidden />
          <CheckCircle2 className="relative h-12 w-12" aria-hidden />
        </div>
        <div className="space-y-2">
          <p className="text-3xl font-black tracking-tight">{title}</p>
          <p className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
