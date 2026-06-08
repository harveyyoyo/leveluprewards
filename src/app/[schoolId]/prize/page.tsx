
'use client';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Gift, Loader2 } from 'lucide-react';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useActiveStudentSession } from '@/hooks/useActiveStudentSession';
import type { StudentFoundMeta } from '@/components/student/StudentScanner';
import { appearanceVarsForSurface } from '@/lib/appearance';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { FaceMismatchBanner } from '@/components/student/FaceMismatchBanner';
import { PrizeDashboard } from './PrizeDashboard';
import { StudentKioskTransitionFlash } from '@/components/student/StudentKioskTransitionFlash';
import { useTranslation } from '@/components/providers/LocaleProvider';

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

export default function PrizePage() {
    const { loginState, isInitialized, schoolId } = useAppContext();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { settings } = useSettings();

    const { activeStudentId, setActiveStudentId, handleDone, loginMeta, setLoginMeta } = useActiveStudentSession();
    const [pendingStudentLogin, setPendingStudentLogin] = useState<{
        id: string;
        meta?: StudentFoundMeta | { source: 'manual' };
    } | null>(null);
    const playSound = useArcadeSound();
    const { t } = useTranslation();

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

    useEffect(() => {
        if (!schoolId || !activeStudentId) return;
        const linkedStudentId = searchParams.get('student')?.trim();
        if (!linkedStudentId || linkedStudentId !== activeStudentId) return;
        router.replace(`/${schoolId}/student?shop=prizes`, { scroll: false });
    }, [activeStudentId, router, schoolId, searchParams]);

    const handlePrizeSessionExit = useCallback(() => {
        playSound('swoosh');
        handleDone();
        if (schoolId) {
            router.replace(`/${schoolId}/student`);
        }
        toast({ title: t('student.kiosk.loggedOut'), description: t('student.kiosk.loggedOutDescription') });
    }, [handleDone, playSound, router, schoolId, t, toast]);

    const onScannerStudent = useCallback(
        (id: string, meta?: StudentFoundMeta) => {
            setPendingStudentLogin({ id, meta });
        },
        [],
    );

    useEffect(() => {
        if (!isInitialized || !schoolId) return;
        if (loginState === 'prizeClerk') {
            router.replace(`/${schoolId}/admin`);
        }
    }, [isInitialized, loginState, schoolId, router]);

    if (loginState === 'prizeClerk') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground p-6">
                <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                <p className="text-sm font-medium">{t('student.kiosk.openingPrizeDesk')}</p>
            </div>
        );
    }

    if (!isInitialized || !['student', 'teacher', 'admin', 'school', 'developer'].includes(loginState)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Button disabled variant="ghost" size="lg" className="text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t('student.kiosk.loading')}
                </Button>
            </div>
        );
    }

    if (activeStudentId) {
        return (
            <div className="flex min-h-0 w-full flex-1 flex-col">
                {loginMeta?.source === 'face' && (
                    <FaceMismatchBanner
                        studentId={activeStudentId}
                        confidence={loginMeta.confidence}
                        onResolved={handleDone}
                    />
                )}
                <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
                    <PrizeDashboard
                        studentId={activeStudentId}
                        onDone={handlePrizeSessionExit}
                        onRequestExit={handlePrizeSessionExit}
                    />
                </div>
            </div>
        );
    }

    if (pendingStudentLogin) {
        return <StudentKioskTransitionFlash title="Reward account found" message="Opening rewards..." />;
    }

    return (
        <TooltipProvider>
            <div
              className={cn("min-h-[80vh] flex flex-col items-center justify-center", settings.displayMode === 'app' && 'pb-24')}
              style={appearanceVarsForSurface(settings, 'prize') as CSSProperties}
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
