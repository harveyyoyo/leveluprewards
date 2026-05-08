
'use client';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Gift, Loader2 } from 'lucide-react';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useActiveStudentSession } from '@/hooks/useActiveStudentSession';
import type { StudentFoundMeta } from '@/components/StudentScanner';
import { rainbowTripletForNavId, complementTripletForNavId } from '@/lib/rainbowNav';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { FaceMismatchBanner } from '@/components/FaceMismatchBanner';
import { PrizeDashboard } from './PrizeDashboard';
import { StudentKioskTransitionFlash } from '@/components/StudentKioskTransitionFlash';

const StudentScanner = dynamic(
    () =>
        import('@/components/StudentScanner')
            .then((m) => m.StudentScanner)
            .catch((err) => {
                if (typeof window !== 'undefined' && (err.message?.includes('Loading chunk') || err.name === 'ChunkLoadError')) {
                    window.location.reload();
                }
                throw err;
            }),
    { ssr: false },
);

export default function PrizePage() {
    const { loginState, isInitialized } = useAppContext();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { settings } = useSettings();

    const { activeStudentId, setActiveStudentId, handleDone, loginMeta, setLoginMeta } = useActiveStudentSession();
    const [pendingStudentLogin, setPendingStudentLogin] = useState<{
        id: string;
        meta?: StudentFoundMeta | { source: 'manual' };
    } | null>(null);
    const playSound = useArcadeSound();

    useEffect(() => {
        const linkedStudentId = searchParams.get('student')?.trim();
        if (!linkedStudentId || activeStudentId === linkedStudentId || pendingStudentLogin?.id === linkedStudentId) return;
        setPendingStudentLogin({ id: linkedStudentId, meta: { source: 'manual' } });
    }, [activeStudentId, pendingStudentLogin?.id, searchParams]);

    useEffect(() => {
        if (!pendingStudentLogin) return;
        const timerId = window.setTimeout(() => {
            setActiveStudentId(pendingStudentLogin.id);
            const meta = pendingStudentLogin.meta;
            if (meta?.source === 'face') {
                setLoginMeta({ source: 'face', confidence: meta.confidence });
            } else if (meta?.source === 'manual') {
                setLoginMeta({ source: 'manual' });
            } else {
                setLoginMeta(null);
            }
            setPendingStudentLogin(null);
        }, 900);
        return () => window.clearTimeout(timerId);
    }, [pendingStudentLogin, setActiveStudentId, setLoginMeta]);

    const handlePrizeSessionExit = useCallback(() => {
        playSound('swoosh');
        handleDone();
        toast({ title: 'Logged Out', description: 'Returning to prize portal home.' });
    }, [handleDone, playSound, toast]);

    const onScannerStudent = useCallback(
        (id: string, meta?: StudentFoundMeta) => {
            setPendingStudentLogin({ id, meta });
        },
        [],
    );

    if (!isInitialized || !['student', 'teacher', 'admin', 'school', 'developer', 'prizeClerk'].includes(loginState)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Button disabled variant="ghost" size="lg" className="text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Loading Kiosk...
                </Button>
            </div>
        );
    }

    if (activeStudentId) {
        return (
            <>
                {loginMeta?.source === 'face' && (
                    <FaceMismatchBanner
                        studentId={activeStudentId}
                        confidence={loginMeta.confidence}
                        onResolved={handleDone}
                    />
                )}
                <PrizeDashboard
                    studentId={activeStudentId}
                    onDone={handleDone}
                    onRequestExit={handlePrizeSessionExit}
                />
            </>
        );
    }

    if (pendingStudentLogin) {
        return <StudentKioskTransitionFlash title="Reward account found" message="Opening rewards..." />;
    }

    return (
        <TooltipProvider>
            <div
              className={cn("min-h-[80vh] flex flex-col items-center justify-center", settings.displayMode === 'app' && 'pb-24')}
              style={{
                ['--primary' as string]: rainbowTripletForNavId('prize', settings.colorScheme),
                ['--chart-1' as string]: rainbowTripletForNavId('prize', settings.colorScheme),
                ['--chart-2' as string]: complementTripletForNavId('prize', settings.colorScheme),
                ['--chart-3' as string]: rainbowTripletForNavId('prize', settings.colorScheme),
                ['--chart-4' as string]: complementTripletForNavId('prize', settings.colorScheme),
                ['--chart-5' as string]: rainbowTripletForNavId('prize', settings.colorScheme),
                ['--ring' as string]: complementTripletForNavId('prize', settings.colorScheme),
              } as CSSProperties}
            >
                <StudentScanner
                    onStudentFound={onScannerStudent}
        title="Rewards Shop"
                    description="Choose how to identify the student below."
                    icon={<Gift className="w-10 h-10" />}
                />
            </div>
        </TooltipProvider>
    );
}
