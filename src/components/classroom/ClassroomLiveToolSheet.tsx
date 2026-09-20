'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

export function ClassroomLiveToolSheet({
  open,
  title,
  layoutId,
  onClose,
  children,
  wide = false,
  extraWide = false,
  tone = 'default',
  headerActions,
}: {
  open: boolean;
  title: string;
  layoutId: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  extraWide?: boolean;
  tone?: 'default' | 'raffle';
  headerActions?: ReactNode;
}) {
  const raffle = tone === 'raffle';
  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          key={layoutId}
          layoutId={layoutId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={`${layoutId}-title`}
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={spring}
          className={cn(
            'absolute inset-y-0 right-0 z-30 flex flex-col overflow-hidden border-l shadow-2xl',
            raffle ? 'border-rose-900/20 bg-rose-50' : 'border-black/10 bg-white',
            extraWide
              ? 'w-[min(40rem,calc(100%-3.5rem))]'
              : wide
                ? 'w-[min(36rem,calc(100%-3.5rem))]'
                : 'w-[min(26rem,calc(100%-3.5rem))]',
          )}
        >
          <div
            className={cn(
              'flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2.5',
              raffle ? 'border-rose-800/20 bg-rose-600 text-white' : 'border-slate-200',
            )}
          >
            <p
              id={`${layoutId}-title`}
              className={cn('text-sm font-black', raffle ? 'text-white' : 'text-slate-900')}
            >
              {raffle ? <span aria-hidden>🎟️ </span> : null}
              {title}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              {headerActions}
              <button
                type="button"
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-xl border',
                  raffle
                    ? 'border-white/25 bg-white/15 text-white hover:bg-white/25'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
                )}
                aria-label={`Close ${title}`}
                onClick={onClose}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
