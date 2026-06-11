'use client';

import { useMemo } from 'react';
import type { SyncStatus } from '@/components/providers/AuthProvider';
import { useTranslation } from '@/components/providers/LocaleProvider';
import { useFirestoreSyncAlert } from '@/hooks/useFirestoreSyncAlert';
import { cn } from '@/lib/utils';

function SyncStatusDot({ syncStatus }: { syncStatus: SyncStatus }) {
  const ping =
    syncStatus === 'offline' ? (
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
    ) : null;

  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      {ping}
      <span
        className={cn(
          'relative inline-flex h-full w-full rounded-full',
          syncStatus === 'offline' ? 'bg-red-500' : 'bg-slate-400',
        )}
      />
    </span>
  );
}

export type KioskFirestoreSyncBannerProps = {
  className?: string;
  /** When true, reserves vertical space so fixed content below is not covered. */
  withSpacer?: boolean;
};

export function KioskFirestoreSyncBanner({ className, withSpacer = false }: KioskFirestoreSyncBannerProps) {
  const { show, syncStatus } = useFirestoreSyncAlert();
  const { t } = useTranslation();

  const message = useMemo(() => {
    switch (syncStatus) {
      case 'offline':
        return t('header.sync.offline');
      case 'error':
        return t('header.sync.error');
      default:
        return null;
    }
  }, [syncStatus, t]);

  if (!show || !message) return null;

  const isOffline = syncStatus === 'offline';

  return (
    <>
      <div
        className={cn(
          'no-print fixed inset-x-0 top-0 z-[190] flex items-center justify-center gap-2 border-b px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-center shadow-lg backdrop-blur-sm sm:gap-2.5 sm:px-4',
          isOffline
            ? 'border-red-600/60 bg-red-950/95 text-red-50'
            : 'border-slate-500/50 bg-slate-900/95 text-slate-100',
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <SyncStatusDot syncStatus={syncStatus} />
        <p className="text-[11px] font-semibold leading-snug sm:text-xs">{message}</p>
      </div>
      {withSpacer ? <div className="h-10 shrink-0" aria-hidden /> : null}
    </>
  );
}
