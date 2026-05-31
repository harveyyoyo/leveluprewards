'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAppContext } from '@/components/AppProvider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { Gift, Loader2, LogOut } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { appearanceVarsForSurface } from '@/lib/appearance';
import { PrizeDashboard } from '@/app/[schoolId]/prize/PrizeDashboard';
import type { StudentFoundMeta } from '@/components/student/StudentScanner';
import type { Prize } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { PrizeDeskCardScan } from '@/components/prizes/PrizeDeskCardScan';
import { withUnifiedAiFunPrize } from '@/lib/aiJokePrize';

const StudentScanner = dynamic(
  () =>
    import('@/components/student/StudentScanner')
      .then((m) => m.StudentScanner)
      .catch((err) => {
        if (typeof window !== 'undefined' && (err.message?.includes('Loading chunk') || err.name === 'ChunkLoadError')) {
          window.location.reload();
        }
        throw err;
      }),
  { ssr: false },
);

/** Scan-in + redeem flow for desk staff — student card, then prize shelf card. */
export function AdminPrizeDeskPanel({ className }: { className?: string }) {
  const { logout, userName, schoolId } = useAppContext();
  const { settings } = useSettings();
  const firestore = useFirestore();
  const isGraphic = settings.graphicMode === 'graphics';
  const playSound = useArcadeSound();
  const { toast } = useToast();
  const [deskStudentId, setDeskStudentId] = useState<string | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const prizesQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'prizes') : null),
    [firestore, schoolId],
  );
  const { data: prizesRaw } = useCollection<Prize>(prizesQuery);
  const prizes = useMemo(
    () =>
      withUnifiedAiFunPrize(prizesRaw, {
        enablePrizeAiSurprise: settings.enablePrizeAiSurprise === true,
        defaultPoints: settings.prizeAiSurpriseDefaultPoints,
      }),
    [prizesRaw, settings.enablePrizeAiSurprise, settings.prizeAiSurpriseDefaultPoints],
  );

  const onScannerStudent = useCallback((id: string, _meta?: StudentFoundMeta) => {
    setDeskStudentId(id);
    setCatalogOpen(false);
  }, []);

  const handleDone = useCallback(() => {
    setDeskStudentId(null);
    setCatalogOpen(false);
  }, []);

  const handlePrizeSessionExit = useCallback(() => {
    playSound('swoosh');
    handleDone();
    toast({ title: 'Session cleared', description: 'Scan the next student when ready.' });
  }, [handleDone, playSound, toast]);

  const handleStaffLogout = () => {
    playSound('swoosh');
    handleDone();
    logout({ staffNavigateTo: 'portal' });
  };

  if (deskStudentId && catalogOpen) {
    return (
      <div className={cn('min-h-0 flex flex-col', className)}>
        <Suspense
          fallback={
            <div className="min-h-[40vh] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <PrizeDashboard studentId={deskStudentId} onDone={handleDone} onRequestExit={handlePrizeSessionExit} />
        </Suspense>
      </div>
    );
  }

  if (deskStudentId) {
    return (
      <div className={cn('flex flex-col gap-4', className)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-semibold text-foreground">{userName || 'Prize desk'}</span>
          </p>
          <Button variant="outline" size="sm" onClick={handleStaffLogout} className="gap-2 shrink-0">
            <LogOut className="w-4 h-4" aria-hidden />
            End desk shift
          </Button>
        </div>
        <PrizeDeskCardScan
          studentId={deskStudentId}
          prizes={prizes}
          onClearStudent={handleDone}
          onOpenCatalog={() => setCatalogOpen(true)}
        />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-semibold text-foreground">{userName || 'Prize desk'}</span>
        </p>
        <Button variant="outline" size="sm" onClick={handleStaffLogout} className="gap-2 shrink-0">
          <LogOut className="w-4 h-4" aria-hidden />
          End desk shift
        </Button>
      </div>
      <TooltipProvider>
        <div
          className={cn(
            'w-full rounded-2xl border bg-card/80 p-4 shadow-sm',
            isGraphic ? 'backdrop-blur-xl' : '',
          )}
          style={appearanceVarsForSurface(settings, 'prize')}
        >
          <StudentScanner
            onStudentFound={onScannerStudent}
            title="Prize desk"
            description="Scan the student ID card, then scan the prize shelf card to deliver the reward."
            icon={<Gift className="w-10 h-10" />}
          />
        </div>
      </TooltipProvider>
    </div>
  );
}
