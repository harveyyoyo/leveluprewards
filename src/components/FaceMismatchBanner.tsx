'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { ScanFace, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/components/AppProvider';
import { useFunctions } from '@/firebase';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { useToast } from '@/hooks/use-toast';
import { getReadableErrorMessage } from '@/lib/errorMessage';

interface FaceMismatchBannerProps {
  studentId: string;
  confidence?: number;
  /** Invoked after the face link is successfully removed, so the kiosk can sign the student out. */
  onResolved: () => void;
}

/**
 * Floating banner shown after a face-based sign-in. Lets the real student
 * remove the incorrect face enrollment (which can happen when the model is
 * confused by similar-looking students) so it can be retrained later.
 */
export function FaceMismatchBanner({ studentId, confidence, onResolved }: FaceMismatchBannerProps) {
  const { schoolId } = useAppContext();
  const functions = useFunctions();
  const confirm = useConfirm();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (dismissed) return null;

  const pct =
    typeof confidence === 'number' && Number.isFinite(confidence)
      ? Math.round(Math.max(0, Math.min(1, confidence)) * 100)
      : null;

  const handleWrongFace = async () => {
    if (!schoolId || !functions || !studentId) return;
    const ok = await confirm({
      title: 'Wrong face ID?',
      description:
        "We'll unlink the face from this student so it can be retrained later. You'll be signed out of this kiosk.",
      confirmLabel: 'Remove & sign out',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const del = httpsCallable(functions, 'deleteStudentFace');
      await del({ schoolId, studentId });
      toast({
        title: 'Face login removed',
        description: 'The student can retrain on the kiosk to fix this.',
      });
      onResolved();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Could not remove face login',
        description: getReadableErrorMessage(e, 'Please try again.'),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92vw] rounded-2xl border border-amber-500/50 bg-amber-50/95 dark:bg-amber-900/80 backdrop-blur shadow-lg px-4 py-3 flex items-center gap-3 animate-in slide-in-from-top-2 fade-in duration-300">
      <ScanFace className="w-5 h-5 text-amber-700 dark:text-amber-200 shrink-0" />
      <div className="flex-1 text-left min-w-0">
        <p className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-100">
          Signed in by face{pct !== null ? ` · ${pct}% match` : ''}
        </p>
        <p className="text-[11px] text-amber-800 dark:text-amber-200/90 leading-snug">
          Not you? Remove the wrong face link so it can be retrained.
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={busy}
        onClick={handleWrongFace}
        className="h-8 rounded-lg font-black uppercase tracking-wider text-[10px] whitespace-nowrap"
      >
        Wrong face ID
      </Button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="p-1 rounded-md text-amber-700 hover:bg-amber-200/60 dark:text-amber-200 dark:hover:bg-amber-800/50"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
