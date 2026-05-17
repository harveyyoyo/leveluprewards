'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { doc } from 'firebase/firestore';
import { CheckCircle2, Gift, Loader2, ScanBarcode, User } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Prize, Student } from '@/lib/types';
import { lookupPrizeByScanCode } from '@/lib/db/lookup';
import { isPrizeScanCode, normalizeScanInput } from '@/lib/prizeScanCode';
import { getReadableErrorMessage } from '@/lib/errorMessage';
import { getStudentNickname } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function PrizeDeskCardScan({
  studentId,
  prizes,
  onClearStudent,
  onOpenCatalog,
  className,
}: {
  studentId: string;
  prizes: Prize[];
  onClearStudent: () => void;
  onOpenCatalog: () => void;
  className?: string;
}) {
  const firestore = useFirestore();
  const { schoolId, redeemPrize } = useAppContext();
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [scanBuffer, setScanBuffer] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [lastPrizeName, setLastPrizeName] = useState<string | null>(null);

  const studentRef = schoolId ? doc(firestore, 'schools', schoolId, 'students', studentId) : null;
  const { data: student } = useDoc<Student>(studentRef);

  const handlePrizeScan = useCallback(
    async (raw: string) => {
      if (!schoolId || !student || isRedeeming) return;
      const code = normalizeScanInput(raw);
      if (!isPrizeScanCode(code)) {
        playSound('error');
        toast({
          variant: 'destructive',
          title: 'Not a prize card',
          description: 'Scan the barcode on the reward shelf card (starts with PZ).',
        });
        return;
      }

      setIsRedeeming(true);
      try {
        const prizeId = await lookupPrizeByScanCode(firestore, schoolId, code);
        if (!prizeId) {
          playSound('error');
          toast({ variant: 'destructive', title: 'Prize not found', description: 'This card is not in the rewards catalog.' });
          return;
        }
        const prize = prizes.find((p) => p.id === prizeId);
        if (!prize) {
          playSound('error');
          toast({ variant: 'destructive', title: 'Prize unavailable', description: 'This reward is not active in the shop.' });
          return;
        }
        if (!prize.inStock) {
          playSound('error');
          toast({ variant: 'destructive', title: 'Out of stock', description: `${prize.name} is not available right now.` });
          return;
        }

        const result = await redeemPrize(student.id, prize, 1, undefined, { markFulfilled: true });
        if (!result.success) {
          throw new Error(result.message || 'Could not redeem this prize.');
        }

        playSound('login');
        setLastPrizeName(prize.name);
        toast({
          title: 'Prize delivered',
          description: `${getStudentNickname(student)} received ${prize.name}.`,
        });
      } catch (e) {
        playSound('error');
        toast({
          variant: 'destructive',
          title: 'Redemption failed',
          description: getReadableErrorMessage(e, 'Could not record this prize.'),
        });
      } finally {
        setIsRedeeming(false);
        setScanBuffer('');
        scanInputRef.current?.focus();
      }
    },
    [firestore, isRedeeming, playSound, prizes, redeemPrize, schoolId, student, toast],
  );

  useEffect(() => {
    const t = setTimeout(() => scanInputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [studentId]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (document.visibilityState !== 'visible' || isRedeeming) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const ignored = ['Escape', 'Tab', 'Shift', 'CapsLock', 'Control', 'Alt', 'Meta'];
      if (ignored.includes(e.key) || /^F\d+$/.test(e.key)) return;
      const active = document.activeElement;
      if (active?.tagName === 'INPUT' && active !== scanInputRef.current) {
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const buf = scanBuffer.trim();
        if (buf) void handlePrizeScan(buf);
        setScanBuffer('');
        return;
      }

      if (e.key.length === 1) {
        e.preventDefault();
        setScanBuffer((prev) => prev + e.key);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handlePrizeScan, isRedeeming, scanBuffer]);

  const displayName = student
    ? `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() || 'Student'
    : '…';

  return (
    <Card className={cn('border-primary/30 shadow-md', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ScanBarcode className="h-5 w-5 text-primary" aria-hidden />
          Scan prize card
        </CardTitle>
        <CardDescription>
          Student identified. Scan the reward shelf card to deliver the prize (points deducted, marked received).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
          <User className="h-8 w-8 text-primary shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student</p>
            <p className="font-bold truncate">{displayName}</p>
            {student?.nfcId != null && (
              <p className="text-xs text-muted-foreground">ID #{String(student.nfcId)}</p>
            )}
          </div>
          {isRedeeming && <Loader2 className="h-5 w-5 animate-spin ml-auto text-muted-foreground" />}
          {!isRedeeming && lastPrizeName && (
            <CheckCircle2 className="h-6 w-6 text-green-600 ml-auto shrink-0" aria-hidden />
          )}
        </div>

        {lastPrizeName && !isRedeeming && (
          <p className="text-sm text-green-700 dark:text-green-400 font-medium">
            Last delivered: {lastPrizeName}. Scan another prize card or clear the student.
          </p>
        )}

        <input
            ref={scanInputRef}
            type="text"
            value={scanBuffer}
            onChange={(e) => setScanBuffer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handlePrizeScan(scanBuffer);
                setScanBuffer('');
              }
            }}
            className="sr-only"
            aria-label="Prize card scanner input"
            autoComplete="off"
          />

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onOpenCatalog} className="gap-2">
            <Gift className="h-4 w-4" aria-hidden />
            Browse catalog
          </Button>
          <Button type="button" variant="secondary" onClick={onClearStudent}>
            Next student
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
