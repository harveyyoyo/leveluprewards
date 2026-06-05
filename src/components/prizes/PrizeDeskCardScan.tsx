'use client';

import { useCallback, useState } from 'react';
import { doc } from 'firebase/firestore';
import { CheckCircle2, Gift, Loader2, ScanBarcode, User } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { usePrizeShelfWedgeScan } from '@/hooks/usePrizeShelfWedgeScan';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Prize, Student } from '@/lib/types';
import { resolvePrizeShelfScanForDesk } from '@/lib/prizes/prizeShelfScan';
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
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [lastPrizeName, setLastPrizeName] = useState<string | null>(null);

  const studentRef = schoolId ? doc(firestore, 'schools', schoolId, 'students', studentId) : null;
  const { data: student } = useDoc<Student>(studentRef);

  const handlePrizeScan = useCallback(
    async (raw: string) => {
      if (!schoolId || !student || isRedeeming) return;

      setIsRedeeming(true);
      try {
        const resolved = await resolvePrizeShelfScanForDesk(firestore, schoolId, raw, prizes);
        if ('error' in resolved) {
          playSound('error');
          toast({ variant: 'destructive', title: resolved.error.title, description: resolved.error.description });
          return;
        }

        const { prize } = resolved;
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
      }
    },
    [firestore, isRedeeming, playSound, prizes, redeemPrize, schoolId, student, toast],
  );

  usePrizeShelfWedgeScan({
    enabled: Boolean(student),
    busy: isRedeeming,
    onScan: handlePrizeScan,
  });

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
