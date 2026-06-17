'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { Loader2, ScanFace, X } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useFunctions } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { getReadableErrorMessage } from '@/lib/errorMessage';
import { cn } from '@/lib/utils';

interface FaceMismatchBannerProps {
  studentId: string;
  confidence?: number;
  /** Invoked after the face link is successfully removed, so the kiosk can sign the student out. */
  onResolved: () => void;
  className?: string;
}

/**
 * Compact notice after face sign-in. Lets the student unlink a wrong face match
 * without a modal — confirm inline, then sign out for retraining.
 */
export function FaceMismatchBanner({ studentId, confidence, onResolved, className }: FaceMismatchBannerProps) {
  const { schoolId } = useAppContext();
  const functions = useFunctions();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (dismissed) return null;

  const pct =
    typeof confidence === 'number' && Number.isFinite(confidence)
      ? Math.round(Math.max(0, Math.min(1, confidence)) * 100)
      : null;

  const removeFaceLink = async () => {
    if (!schoolId || !functions || !studentId || busy) return;
    setBusy(true);
    try {
      const del = httpsCallable(functions, 'deleteStudentFace');
      await del({ schoolId, studentId });
      onResolved();
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not remove face login',
        description: getReadableErrorMessage(e, 'Please try again.'),
      });
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto fixed right-3 top-3 z-[70] flex max-w-[min(100vw-1.5rem,17rem)] items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-50/90 px-2 py-1 shadow-sm backdrop-blur-sm dark:bg-amber-950/90',
        className,
      )}
    >
      <ScanFace className="h-3 w-3 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />

      {confirming ? (
        <>
          <p className="min-w-0 flex-1 text-[10px] font-medium leading-tight text-amber-950 dark:text-amber-100">
            Remove face link and sign out?
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void removeFaceLink()}
            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-label="Removing" /> : 'Remove'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(false)}
            className="shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold text-amber-800/80 hover:bg-amber-200/50 dark:text-amber-200/80 dark:hover:bg-amber-800/40"
          >
            Back
          </button>
        </>
      ) : (
        <>
          <p className="min-w-0 flex-1 truncate text-[10px] font-medium text-amber-950 dark:text-amber-100">
            Face sign-in{pct !== null ? ` · ${pct}%` : ''}
          </p>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-amber-900 underline-offset-2 hover:underline dark:text-amber-100"
          >
            Not you?
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setDismissed(true)}
            className="shrink-0 rounded p-0.5 text-amber-700/80 hover:bg-amber-200/50 dark:text-amber-300/80 dark:hover:bg-amber-800/50"
          >
            <X className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  );
}
