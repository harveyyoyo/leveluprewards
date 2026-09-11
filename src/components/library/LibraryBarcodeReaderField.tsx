'use client';

import type { RefObject } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2, ScanBarcode, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type LibraryScanFeedbackStatus =
  | 'looking_up'
  | 'identified'
  | 'ai_guess'
  | 'needs_title'
  | 'blocked'
  | 'duplicate'
  | 'error';

export type LibraryScanFeedback = {
  code: string;
  status: LibraryScanFeedbackStatus;
  title?: string;
  message?: string;
};

const STATUS_META: Record<
  LibraryScanFeedbackStatus,
  { label: string; className: string; icon: 'spinner' | 'check' | 'sparkles' | 'alert' }
> = {
  looking_up: {
    label: 'Looking up…',
    className: 'border-primary/40 bg-ring/10 text-ring',
    icon: 'spinner',
  },
  identified: {
    label: 'Book identified',
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    icon: 'check',
  },
  ai_guess: {
    label: 'AI best guess — confirm below',
    className: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-400',
    icon: 'sparkles',
  },
  needs_title: {
    label: 'Needs title',
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300',
    icon: 'alert',
  },
  blocked: {
    label: 'Wrong barcode',
    className: 'border-destructive/40 bg-destructive/10 text-destructive',
    icon: 'alert',
  },
  duplicate: {
    label: 'Already in catalog',
    className: 'border-destructive/40 bg-destructive/10 text-destructive',
    icon: 'alert',
  },
  error: {
    label: 'Lookup failed',
    className: 'border-destructive/40 bg-destructive/10 text-destructive',
    icon: 'alert',
  },
};

function StatusIcon({ kind }: { kind: (typeof STATUS_META)[LibraryScanFeedbackStatus]['icon'] }) {
  if (kind === 'spinner') return <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />;
  if (kind === 'check') return <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />;
  if (kind === 'sparkles') return <Sparkles className="h-4 w-4 shrink-0" aria-hidden />;
  return <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />;
}

export function LibraryBarcodeReaderField({
  inputId = 'library-barcode-reader-input',
  inputRef,
  scanBuffer,
  onScanBufferChange,
  onSubmit,
  active,
  hint,
  scanFeedback,
  className,
  showIcon = true,
  showEnterHint = true,
  showSweep = true,
  placeholder,
}: {
  inputId?: string;
  inputRef: RefObject<HTMLInputElement | null>;
  scanBuffer: string;
  onScanBufferChange: (value: string) => void;
  onSubmit: () => void;
  active: boolean;
  hint?: string;
  scanFeedback?: LibraryScanFeedback | null;
  className?: string;
  showIcon?: boolean;
  showEnterHint?: boolean;
  showSweep?: boolean;
  placeholder?: string;
}) {
  const feedbackMeta = scanFeedback ? STATUS_META[scanFeedback.status] : null;

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Scanner Input Row */}
      <div className="relative flex items-center">
        {showIcon && (
          <ScanBarcode
            className={cn(
              'absolute left-2.5 z-10 h-3.5 w-3.5 pointer-events-none',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
            aria-hidden
          />
        )}
        <Input
          id={inputId}
          ref={inputRef as RefObject<HTMLInputElement>}
          type="text"
          value={scanBuffer}
          onChange={(e) => onScanBufferChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder={
            placeholder !== undefined
              ? placeholder
              : active
                ? 'Scan barcode with reader wedge or type code & press Enter…'
                : 'Reader paused — click Resume reader…'
          }
          className={cn(
            showIcon ? 'pl-8' : 'pl-3',
            showEnterHint ? 'pr-20' : 'pr-3',
            'font-mono text-xs h-9 rounded-xl border transition-all',
            active
              ? 'border-primary/50 bg-background shadow-xs focus-visible:ring-1 focus-visible:ring-primary'
              : 'border-muted bg-muted/40 text-muted-foreground',
          )}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={!active}
          aria-label="Barcode reader scan field"
        />
        {active && showSweep ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl" aria-hidden>
            <motion.div
              className="absolute inset-y-0 w-24 -ml-12 bg-gradient-to-r from-transparent via-primary/25 to-transparent"
              initial={{ left: '0%' }}
              animate={{ left: '100%' }}
              transition={{ type: 'spring', stiffness: 24, damping: 22, repeat: Infinity, repeatType: 'mirror' }}
            />
            <motion.div
              className="absolute top-[18%] bottom-[18%] w-px -ml-px bg-primary/80 shadow-[0_0_8px_2px_hsl(var(--primary)/0.5)]"
              initial={{ left: '0%' }}
              animate={{ left: '100%' }}
              transition={{ type: 'spring', stiffness: 24, damping: 22, repeat: Infinity, repeatType: 'mirror' }}
            />
          </div>
        ) : null}
        {showEnterHint ? (
          <div className="absolute right-2 z-10 flex items-center pointer-events-none">
            <span className="text-[10px] font-mono text-muted-foreground/80 bg-muted px-1.5 py-0.5 rounded">
              Enter ↵
            </span>
          </div>
        ) : null}
      </div>

      {/* Compact Scan Feedback Pill (Only shown when there is feedback) */}
      {scanFeedback && feedbackMeta && (
        <div
          className={cn(
            'flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1 text-xs transition-all shadow-2xs animate-in fade-in-50 duration-150',
            feedbackMeta.className,
          )}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 min-w-0 truncate">
            <StatusIcon kind={feedbackMeta.icon} />
            <span className="font-mono font-bold shrink-0">{scanFeedback.code}</span>
            <span className="text-[11px] opacity-75 shrink-0">· {feedbackMeta.label}</span>
            {scanFeedback.title && (
              <span className="font-semibold truncate">· &quot;{scanFeedback.title}&quot;</span>
            )}
            {scanFeedback.message && !scanFeedback.title && (
              <span className="text-[11px] opacity-90 truncate">· {scanFeedback.message}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
