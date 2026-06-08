'use client';

import type { RefObject } from 'react';
import { AlertCircle, CheckCircle2, Loader2, ScanBarcode, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    className: 'border-primary/40 bg-primary/10 text-primary',
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
}) {
  const feedbackMeta = scanFeedback ? STATUS_META[scanFeedback.status] : null;

  return (
    <div
      className={cn(
        'rounded-xl border-2 border-dashed p-4 space-y-3 transition-colors',
        active ? 'border-primary/50 bg-primary/5' : 'border-muted bg-muted/30',
        className,
      )}
    >
      <Label htmlFor={inputId} className="flex items-center gap-2 text-sm font-bold">
        <ScanBarcode className="h-4 w-4 text-primary" aria-hidden />
        {scanFeedback ? 'Scan received' : 'Scan ready'}
      </Label>
      <p className="text-xs text-muted-foreground">
        {hint ??
          'Focus this field, then scan with your USB or Bluetooth barcode reader. Each scan ends with Enter.'}
      </p>

      {scanFeedback && feedbackMeta ? (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 space-y-1.5',
            feedbackMeta.className,
          )}
          role="status"
          aria-live="polite"
        >
          <p className="font-mono text-lg font-bold tracking-wide break-all">{scanFeedback.code}</p>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <StatusIcon kind={feedbackMeta.icon} />
            <span>{feedbackMeta.label}</span>
          </div>
          {scanFeedback.title ? (
            <p className="text-sm font-medium leading-snug">{scanFeedback.title}</p>
          ) : null}
          {scanFeedback.message ? (
            <p className="text-xs opacity-90 leading-relaxed">{scanFeedback.message}</p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-primary/30 bg-background/60 px-4 py-5 text-center">
          <p className="text-sm font-medium text-muted-foreground">Ready — scan a barcode</p>
        </div>
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
        placeholder={active ? 'Or type barcode and press Enter…' : 'Waiting…'}
        className="font-mono text-sm h-11 rounded-xl"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        disabled={!active}
        aria-label="Barcode reader scan field"
      />
    </div>
  );
}
