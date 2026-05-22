'use client';

import { ChevronRight, Clock } from 'lucide-react';

import { StudentActivityList } from '@/components/student-kiosk/StudentActivityList';
import { studentKioskCenterStackClass } from '@/components/student-kiosk/StudentKioskRedeemUI';
import { cn } from '@/lib/utils';

export function StudentKioskActivityPreview({
  schoolId,
  studentId,
  themed,
  onViewAll,
  className,
  variant = 'center',
}: {
  schoolId: string;
  studentId: string;
  themed?: boolean;
  onViewAll: () => void;
  className?: string;
  /** `sidebar` = right column under categories; `center` = redeem stack. */
  variant?: 'center' | 'sidebar';
}) {
  return (
    <button
      type="button"
      onClick={onViewAll}
      className={cn(
        'w-full shrink-0 rounded-xl border-2 p-3 text-left shadow-sm transition-colors hover:brightness-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        variant === 'center' ? studentKioskCenterStackClass : 'min-w-0',
        !themed && 'border-slate-200 bg-white/90 dark:border-slate-600 dark:bg-slate-900/90',
        className,
      )}
      style={
        themed
          ? {
              borderColor: 'color-mix(in srgb, var(--theme-primary) 40%, transparent)',
              backgroundColor: 'var(--theme-card)',
              color: 'var(--theme-text)',
            }
          : undefined
      }
      aria-label="View full recent activity"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest"
          style={themed ? { color: 'var(--theme-text)' } : undefined}
        >
          <Clock className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          Recent activity
        </p>
        <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
      </div>
      <div className="pointer-events-none -mx-1">
        <StudentActivityList
          schoolId={schoolId}
          studentId={studentId}
          themed={themed}
          preview
          maxItems={3}
        />
      </div>
      <p
        className="mt-2 text-center text-[10px] font-bold uppercase tracking-widest opacity-70"
        style={themed ? { color: 'var(--theme-text)' } : undefined}
      >
        Tap for full activity
      </p>
    </button>
  );
}
