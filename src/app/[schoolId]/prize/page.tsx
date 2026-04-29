
'use client';
import type { CSSProperties } from 'react';
import { useCallback, useEffect } from 'react';
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

const StudentScanner = dynamic(
    () => import('@/components/StudentScanner').then((m) => m.StudentScanner),
    { ssr: false },
);

export default function PrizePage() {
    const { loginState, isInitialized } = useAppContext();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { settings } = useSettings();

    const { activeStudentId, setActiveStudentId, handleDone, loginMeta, setLoginMeta } = useActiveStudentSession();
    const playSound = useArcadeSound();

    useEffect(() => {
        const linkedStudentId = searchParams.get('student')?.trim();
        if (!linkedStudentId || activeStudentId === linkedStudentId) return;
        setActiveStudentId(linkedStudentId);
        setLoginMeta({ source: 'manual' });
    }, [activeStudentId, searchParams, setActiveStudentId, setLoginMeta]);

    const handlePrizeSessionExit = useCallback(() => {
        playSound('swoosh');
        handleDone();
        toast({ title: 'Logged Out', description: 'Returning to prize portal home.' });
    }, [handleDone, playSound, toast]);

    const onScannerStudent = useCallback(
        (id: string, meta?: StudentFoundMeta) => {
            setActiveStudentId(id);
            if (meta?.source === 'face') {
                setLoginMeta({ source: 'face', confidence: meta.confidence });
            } else {
                setLoginMeta(null);
            }
        },
        [setActiveStudentId, setLoginMeta],
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
                    title="Prize Redemption"
                    description="Choose how to identify the student below."
                    icon={<Gift className="w-10 h-10" />}
                />
            </div>
        </TooltipProvider>
    );
}
