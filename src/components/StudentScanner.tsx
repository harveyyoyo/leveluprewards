'use client';

import { useState, useEffect, useRef, useCallback, RefObject, useMemo } from 'react';
import { httpsCallable } from 'firebase/functions';
import { Nfc, Type, Camera, GraduationCap, User, ScanFace } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useToast } from '@/hooks/use-toast';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { cn } from '@/lib/utils';
import { useFunctions, useUser } from '@/firebase';
import { useAuth } from '@/components/providers/AuthProvider';
import { useFaceDescriptor } from '@/hooks/useFaceDescriptor';
import { getReadableErrorMessage, OFFLINE_USER_MESSAGE } from '@/lib/errorMessage';
import {
    getStudentSignInThrottleStatus,
    recordStudentSignIn,
} from '@/lib/studentSignInThrottle';

export type StudentFoundMeta = { source: 'face'; confidence?: number };

interface StudentScannerProps {
    /** Optional second arg when the student was identified by face (for kiosk banners / session UX). */
    onStudentFound: (studentId: string, meta?: StudentFoundMeta) => void;
    title?: string;
    description?: string;
    icon?: React.ReactNode;
    isActive?: boolean;
}

function getStudentLookupFailure(error: unknown, user: unknown, isUserLoading: boolean) {
    const err = (error ?? {}) as { code?: string; message?: string };
    const code = String(err.code ?? '').toLowerCase();
    const codeTail = code.split('/').pop() ?? '';
    const message = String(err.message ?? '').trim();
    const lowerMessage = message.toLowerCase();

    if (isUserLoading) {
        return {
            title: 'Account Still Connecting',
            description: 'Wait a few seconds for the account connection to finish, then scan the student ID again.',
        };
    }

    if (!user || codeTail === 'unauthenticated') {
        return {
            title: 'Account Not Signed In',
            description: 'Refresh this page. If this keeps happening, ask an admin to enable Anonymous sign-in in Firebase Auth, then try again.',
        };
    }

    if (lowerMessage.includes('school entry required')) {
        return {
            title: 'School Entry Required',
            description: 'Open the school link again or re-enter the school entry code on this device, then scan the student ID.',
        };
    }

    if (codeTail === 'permission-denied' || lowerMessage.includes('missing or insufficient permissions')) {
        return {
            title: 'Account Permission Issue',
            description: 'Sign out, then sign in through the correct school, teacher, admin, or prize desk account before scanning again.',
        };
    }

    return {
        title: 'Student Lookup Failed',
        description: getReadableErrorMessage(error, 'Could not look up student.'),
    };
}

export function StudentScanner({
    onStudentFound,
    title = "Student Identification",
    description = "TAP CARD OR SCAN TO UNLOCK",
    icon = <GraduationCap className="w-8 h-8" />,
    isActive = true,
}: StudentScannerProps) {
    const { schoolId } = useAppContext();
    const functions = useFunctions();
    const { user, isUserLoading } = useUser();
    const { loginState, studentKioskSessionEstablished, studentKioskSessionError } = useAuth();
    const { toast } = useToast();
    const playSound = useArcadeSound();
    const { settings } = useSettings();
    const isGraphic = settings.graphicMode === 'graphics';
    const { captureFaceDescriptor, ensureFaceApiReady } = useFaceDescriptor();
    const FACE_MATCH_MIN_CONFIDENCE = 0.9;

    const [nfcId, setNfcId] = useState('');
    const nfcInputRef = useRef<HTMLInputElement>(null);
    const throttleConfigRef = useRef({
        enabled: !!settings.studentSignInThrottleEnabled,
        maxAttempts: settings.studentSignInThrottleMaxAttempts ?? 10,
        windowMin: settings.studentSignInThrottleWindowMin ?? 2,
    });
    throttleConfigRef.current = {
        enabled: !!settings.studentSignInThrottleEnabled,
        maxAttempts: settings.studentSignInThrottleMaxAttempts ?? 10,
        windowMin: settings.studentSignInThrottleWindowMin ?? 2,
    };
    const [loginTab, setLoginTab] = useState('nfc');
    const [hasCameraPermission, setHasCameraPermission] = useState(true);

    // Face login state (kiosk)
    const faceVideoRef = useRef<HTMLVideoElement>(null);
    const faceStreamRef = useRef<MediaStream | null>(null);
    const faceMatchInFlightRef = useRef(false);
    const faceLoopCancelRef = useRef(false);
    const [faceStatus, setFaceStatus] = useState<string | null>(null);

    const cardEnabled = settings.kioskLoginTabCardEnabled !== false;
    const typeEnabled = settings.kioskLoginTabTypeEnabled !== false;
    const qrEnabled = settings.kioskLoginTabScanEnabled !== false;
    const faceEnabled = settings.kioskLoginTabFaceEnabled === true;

    const availableLoginTabs = useMemo(() => {
        const tabs: string[] = [];
        if (cardEnabled) tabs.push('nfc');
        if (typeEnabled) tabs.push('manual');
        if (qrEnabled) tabs.push('camera');
        if (faceEnabled) tabs.push('face');
        // Safety: never allow "no tabs" UX.
        if (!tabs.length) tabs.push('nfc');
        return tabs;
    }, [cardEnabled, typeEnabled, qrEnabled, faceEnabled]);

    const stopFaceCamera = useCallback(() => {
        const stream = faceStreamRef.current;
        if (stream) {
            for (const t of stream.getTracks()) t.stop();
        }
        faceStreamRef.current = null;
        const video = faceVideoRef.current;
        if (video) {
            try { video.pause(); } catch {}
            video.srcObject = null;
        }
    }, []);

    const waitForFaceVideoElement = useCallback(async (): Promise<HTMLVideoElement | null> => {
        for (let attempt = 0; attempt < 20; attempt++) {
            const video = faceVideoRef.current;
            if (video) return video;
            await new Promise<void>((resolve) => {
                if (typeof window === 'undefined') {
                    resolve();
                    return;
                }
                window.requestAnimationFrame(() => resolve());
            });
        }
        return faceVideoRef.current;
    }, []);

    useEffect(() => {
        return () => {
            stopFaceCamera();
        };
    }, [stopFaceCamera]);

    const startFaceCamera = useCallback(async (): Promise<HTMLVideoElement | null> => {
        const video = await waitForFaceVideoElement();
        if (!video) return null;
        try {
            if (!faceStreamRef.current) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                    audio: false,
                });
                faceStreamRef.current = stream;
            }
            if (video.srcObject !== faceStreamRef.current) {
                video.srcObject = faceStreamRef.current;
            }
            
            try {
                await video.play();
            } catch (playErr: any) {
                const benign =
                    playErr?.name === 'AbortError' ||
                    /interrupted by a new load request/i.test(String(playErr?.message ?? ''));
                if (!benign) throw playErr;
            }

            // Wait for dimensions to be available. If they are already > 0, we are good.
            if (video.videoWidth <= 0) {
                await new Promise<void>((resolve, reject) => {
                    const timeout = window.setTimeout(() => {
                        cleanup();
                        reject(new Error('Camera preview never started (timeout).'));
                    }, 10000);

                    const onReady = () => {
                        if (video.videoWidth > 0) {
                            cleanup();
                            resolve();
                        }
                    };

                    const cleanup = () => {
                        window.clearTimeout(timeout);
                        video.removeEventListener('loadedmetadata', onReady);
                        video.removeEventListener('canplay', onReady);
                        video.removeEventListener('playing', onReady);
                    };

                    video.addEventListener('loadedmetadata', onReady);
                    video.addEventListener('canplay', onReady);
                    video.addEventListener('playing', onReady);
                    
                    // Final safety check in case it fired just now
                    if (video.videoWidth > 0) onReady();
                });
            }

            return video;
        } catch (e: any) {
            const denied =
                e?.name === 'NotAllowedError' ||
                e?.name === 'PermissionDeniedError' ||
                /denied|permission/i.test(String(e?.message || ''));
            toast({
                variant: 'destructive',
                title: 'Camera Error',
                description: denied
                    ? 'Allow camera access for this site, then try again.'
                    : e?.message || 'Camera access is required for face login.',
            });
            return null;
        }
    }, [toast, waitForFaceVideoElement]);

    // Face tab: open camera and continuously try to match (no sign-in button).
    useEffect(() => {
        if (!isActive || loginTab !== 'face' || !faceEnabled || !schoolId || !functions) {
            return;
        }

        faceLoopCancelRef.current = false;
        const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

        const run = async () => {
            try {
                if (isUserLoading || !user) {
                    setFaceStatus('Connecting…');
                    await sleep(350);
                }
                if (faceLoopCancelRef.current) return;

                setFaceStatus('Starting camera…');
                const video = await startFaceCamera();
                if (faceLoopCancelRef.current) return;
                
                if (!video) {
                    setFaceStatus('Camera unavailable');
                    return;
                }

                setFaceStatus('Initializing AI…');
                await ensureFaceApiReady();

                setFaceStatus('Look at the camera');

                while (!faceLoopCancelRef.current) {
                    if (faceMatchInFlightRef.current) {
                        await sleep(200);
                        continue;
                    }
                    faceMatchInFlightRef.current = true;
                    try {
                        setFaceStatus('Looking for a face…');
                        const descriptor = await captureFaceDescriptor(video);
                        if (!descriptor || faceLoopCancelRef.current) {
                            await sleep(700);
                            continue;
                        }

                        setFaceStatus('Matching…');
                        const match = httpsCallable(functions, 'matchStudentFace');
                        const res = await match({
                            schoolId,
                            descriptor: descriptor.map((n) => Number(n)),
                        });
                        if (faceLoopCancelRef.current) break;

                        const data = res.data as any;
                        const studentId = typeof data?.studentId === 'string' ? data.studentId : '';
                        const confidence = typeof data?.confidence === 'number' ? data.confidence : null;
                        const ambiguous = data?.ambiguous === true;

                        if (studentId && typeof confidence === 'number' && confidence >= FACE_MATCH_MIN_CONFIDENCE) {
                            const throttle = getStudentSignInThrottleStatus(
                                schoolId,
                                studentId,
                                throttleConfigRef.current,
                            );
                            if (throttle.frozen && throttle.secondsRemaining > 0) {
                                const remaining = throttle.secondsRemaining;
                                playSound('error');
                                setFaceStatus(`Please wait ${remaining}s — you just signed in`);
                                await sleep(1600);
                                if (!faceLoopCancelRef.current) setFaceStatus('Look at the camera');
                                continue;
                            }
                            recordStudentSignIn(schoolId, studentId);
                            playSound('login');
                            onStudentFound(studentId, { source: 'face', confidence: confidence ?? undefined });
                            setFaceStatus(null);
                            stopFaceCamera();
                            return;
                        }

                        setFaceStatus(
                            ambiguous
                                ? 'Unclear match — use card or QR, or try again'
                                : typeof confidence === 'number'
                                  ? `Not recognized (${Math.round(confidence * 100)}%) — keep trying`
                                  : 'Not recognized — keep trying',
                        );
                        await sleep(1600);
                        if (!faceLoopCancelRef.current) setFaceStatus('Look at the camera');
                    } catch (e: any) {
                        playSound('error');
                        toast({
                            variant: 'destructive',
                            title: 'Face sign-in failed',
                            description: getReadableErrorMessage(e, 'Could not sign in by face.'),
                        });
                        await sleep(1200);
                        if (!faceLoopCancelRef.current) setFaceStatus('Look at the camera');
                    } finally {
                        faceMatchInFlightRef.current = false;
                    }
                    await sleep(350);
                }
            } finally {
                if (faceLoopCancelRef.current) {
                    stopFaceCamera();
                }
            }
        };

        void run();

        return () => {
            faceLoopCancelRef.current = true;
            stopFaceCamera();
        };
    }, [
        isActive,
        loginTab,
        faceEnabled,
        schoolId,
        functions,
        isUserLoading,
        user,
        startFaceCamera,
        ensureFaceApiReady,
        captureFaceDescriptor,
        toast,
        playSound,
        onStudentFound,
        stopFaceCamera,
    ]);

    const handleLookup = useCallback(async (rawId: string) => {
        if (!rawId?.trim() || !schoolId || !functions) return;

        if (loginState === 'student') {
            if (studentKioskSessionError) {
                playSound('error');
                toast({
                    variant: 'destructive',
                    title: 'Kiosk Not Ready',
                    description: studentKioskSessionError,
                });
                setNfcId('');
                return;
            }
            if (!studentKioskSessionEstablished) {
                playSound('error');
                toast({
                    variant: 'destructive',
                    title: 'Still Connecting',
                    description: 'Wait a moment for this kiosk to finish connecting, then scan or enter the student ID again.',
                });
                setNfcId('');
                return;
            }
        }

        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Offline',
                description: OFFLINE_USER_MESSAGE,
            });
            setNfcId('');
            return;
        }

        const badgeId = rawId.trim();
        const runLookup = () => {
            const lookup = httpsCallable(functions, 'lookupStudentByBadge');
            return lookup({ schoolId, badgeId });
        };

        const onSuccess = (data: { studentId?: unknown }) => {
            const finalStudentId = typeof data.studentId === 'string' ? data.studentId : null;
            if (finalStudentId) {
                const throttle = getStudentSignInThrottleStatus(
                    schoolId,
                    finalStudentId,
                    throttleConfigRef.current,
                );
                if (throttle.frozen && throttle.secondsRemaining > 0) {
                    const remaining = throttle.secondsRemaining;
                    playSound('error');
                    toast({
                        variant: 'destructive',
                        title: 'Please Wait',
                        description: `You just signed in. Try again in ${remaining} second${remaining === 1 ? '' : 's'}.`,
                    });
                    return;
                }
                recordStudentSignIn(schoolId, finalStudentId);
                playSound('login');
                onStudentFound(finalStudentId);
            } else {
                playSound('error');
                toast({
                    variant: 'destructive',
                    title: 'Student Not Found',
                    description: 'The provided ID does not match any student.',
                });
            }
        };

        try {
            const res = await runLookup();
            onSuccess(res.data as { studentId?: unknown });
        } catch (error) {
            const failure = getStudentLookupFailure(error, user, isUserLoading);
            // Any signed-in role can hit this if `kioskMembers` was never written (e.g. admin testing `/student`
            // without a prior student session). `enterSchoolKioskSession` registers the current UID for lookups.
            const isSchoolEntry =
                failure.title === 'School Entry Required' && !!user && !isUserLoading;
            const canRetrySchoolEntry =
                typeof navigator === 'undefined' || navigator.onLine !== false;
            if (isSchoolEntry && canRetrySchoolEntry) {
                try {
                    const enter = httpsCallable(functions, 'enterSchoolKioskSession');
                    await enter({ schoolId: schoolId.trim().toLowerCase() });
                    const res2 = await runLookup();
                    onSuccess(res2.data as { studentId?: unknown });
                } catch (error2) {
                    const failure2 = getStudentLookupFailure(error2, user, isUserLoading);
                    playSound('error');
                    toast({
                        variant: 'destructive',
                        title: failure2.title,
                        description: failure2.description,
                    });
                }
            } else {
                playSound('error');
                toast({
                    variant: 'destructive',
                    title: failure.title,
                    description: failure.description,
                });
            }
        }
        setNfcId('');
    }, [
        functions,
        schoolId,
        user,
        isUserLoading,
        playSound,
        onStudentFound,
        toast,
        loginState,
        studentKioskSessionEstablished,
        studentKioskSessionError,
    ]);

    const { videoRef, hasCameraPermission: hookHasPermission } = useBarcodeScanner(
        isActive && loginTab === 'camera' && qrEnabled,
        (code) => handleLookup(code),
        (err) => {
            setHasCameraPermission(false);
            if (loginTab === 'camera') setLoginTab('nfc');
            toast({ variant: 'destructive', title: 'Camera Error', description: err });
        }
    );

    useEffect(() => { setHasCameraPermission(hookHasPermission); }, [hookHasPermission]);

    const tabsColsClass = useMemo(() => {
        const n = availableLoginTabs.length;
        if (n >= 4) return 'grid-cols-4';
        if (n === 3) return 'grid-cols-3';
        return 'grid-cols-2';
    }, [availableLoginTabs.length]);

    useEffect(() => {
        if (!availableLoginTabs.includes(loginTab)) {
            setLoginTab(availableLoginTabs[0] || 'nfc');
        }
    }, [availableLoginTabs, loginTab]);

    useEffect(() => {
        if (!qrEnabled && loginTab === 'camera') {
            setLoginTab(cardEnabled ? 'nfc' : typeEnabled ? 'manual' : 'nfc');
        }
    }, [qrEnabled, loginTab, cardEnabled, typeEnabled]);

    useEffect(() => {
        if (isActive && loginTab === 'nfc') {
            const timer = setTimeout(() => nfcInputRef.current?.focus(), 100);

            // Global keydown listener to hijack input for the scanner
            const handleGlobalKeyDown = (e: KeyboardEvent) => {
                // Ignore if the page is hidden
                if (document.visibilityState !== 'visible') {
                    return;
                }

                // Ignore system keys, navigation shortcuts, or modifiers
                if (e.ctrlKey || e.altKey || e.metaKey) return;
                
                // Ignore specific utility or navigation keys
                const ignoredKeys = ['Escape', 'Tab', 'Shift', 'CapsLock', 'Control', 'Alt', 'Meta'];
                if (ignoredKeys.includes(e.key) || /^F\d+$/.test(e.key)) {
                    return;
                }

                // Ignore if they are typing in another input element explicitly
                if (
                    document.activeElement?.tagName === 'INPUT' &&
                    document.activeElement !== nfcInputRef.current &&
                    (document.activeElement as HTMLInputElement).type !== 'hidden'
                ) {
                    return;
                }

                // Focus the hidden field so typing goes there
                if (nfcInputRef.current && document.activeElement !== nfcInputRef.current) {
                    nfcInputRef.current.focus();
                }
            };

            window.addEventListener('keydown', handleGlobalKeyDown);

            return () => {
                clearTimeout(timer);
                window.removeEventListener('keydown', handleGlobalKeyDown);
            };
        }
    }, [isActive, loginTab]);

    return (
        <div className={cn(
            "w-full max-w-md rounded-[2.5rem] p-4 transition-all duration-700 relative z-10 [@media(max-height:720px)]:max-w-sm [@media(max-height:720px)]:rounded-3xl [@media(max-height:720px)]:p-3",
            isGraphic ? 'bg-card/90 backdrop-blur-2xl border border-border shadow-xl shadow-primary/10' : 'bg-card shadow-lg border border-border'
        )}>
            {/* Mascot Decoration for Graphic Mode */}
            {isGraphic && (
                <div className="absolute -top-8 -left-8 w-24 h-24 bg-chart-3/10 rounded-full blur-3xl pointer-events-none" />
            )}

            <div className={cn(
                "p-2 text-center relative z-10 [@media(max-height:720px)]:p-1.5",
                isGraphic ? 'border-b border-border' : 'bg-muted/30 border-b border-border'
            )}>
                {/* Kiosk lock removed */}
                <div className="mx-auto mb-1 flex items-center justify-center transition-all duration-500">
                    {icon}
                </div>
            </div>

            <div className="p-3 [@media(max-height:720px)]:p-2">
                <Tabs defaultValue="nfc" className="w-full" value={loginTab} onValueChange={setLoginTab}>
                    <TabsList className={cn("grid w-full p-1 rounded-xl mb-4 [@media(max-height:720px)]:mb-2", tabsColsClass, isGraphic ? 'bg-muted/50' : 'bg-muted/50')}>
                        {cardEnabled && (
                            <TabsTrigger value="nfc" onClick={() => nfcInputRef.current?.focus()} className="flex-1 sm:flex-initial rounded-xl font-black text-[9px] sm:text-[10px] px-1 sm:px-3 py-1.5 uppercase tracking-wider sm:tracking-widest hover:bg-card hover:text-card-foreground hover:shadow-md data-[state=active]:bg-card data-[state=active]:shadow-md transition-all">
                                <Nfc className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" /> Card
                            </TabsTrigger>
                        )}
                        {typeEnabled && (
                            <TabsTrigger value="manual" className="flex-1 sm:flex-initial rounded-xl font-black text-[9px] sm:text-[10px] px-1 sm:px-3 py-1.5 uppercase tracking-wider sm:tracking-widest hover:bg-card hover:text-card-foreground hover:shadow-md data-[state=active]:bg-card data-[state=active]:shadow-md transition-all">
                                <Type className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" /> Type
                            </TabsTrigger>
                        )}
                        {qrEnabled && (
                        <TabsTrigger value="camera" className="flex-1 sm:flex-initial rounded-xl font-black text-[9px] sm:text-[10px] px-1 sm:px-3 py-1.5 uppercase tracking-wider sm:tracking-widest hover:bg-card hover:text-card-foreground hover:shadow-md data-[state=active]:bg-card data-[state=active]:shadow-md transition-all">
                            <Camera className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" /> Scan
                        </TabsTrigger>
                        )}
                        {faceEnabled && (
                            <TabsTrigger value="face" className="flex-1 sm:flex-initial rounded-xl font-black text-[9px] sm:text-[10px] px-1 sm:px-3 py-1.5 uppercase tracking-wider sm:tracking-widest hover:bg-card hover:text-card-foreground hover:shadow-md data-[state=active]:bg-card data-[state=active]:shadow-md transition-all">
                                <ScanFace className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" /> Face
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="nfc" className="text-center">
                        <div className="py-6 space-y-4 [@media(max-height:720px)]:space-y-2 [@media(max-height:720px)]:py-3">
                            <div className="relative w-24 h-24 mx-auto flex items-center justify-center [@media(max-height:720px)]:h-20 [@media(max-height:720px)]:w-20">
                                <div className={cn("absolute inset-0 rounded-full animate-ping opacity-25", isGraphic ? 'bg-primary' : 'bg-muted-foreground')}></div>
                                <div className={cn("w-20 h-20 rounded-full flex items-center justify-center border-4 relative z-10 shadow-xl transition-all [@media(max-height:720px)]:h-16 [@media(max-height:720px)]:w-16", isGraphic ? 'bg-background border-primary text-primary' : 'bg-card border-slate-800 dark:border-slate-200 text-slate-800 dark:text-slate-200')}>
                                    <Nfc className="w-10 h-10 [@media(max-height:720px)]:h-8 [@media(max-height:720px)]:w-8" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className={cn("font-black text-xl sm:text-2xl [@media(max-height:720px)]:text-lg", isGraphic ? 'text-foreground' : 'text-foreground')}>
                                    {loginState === 'student' && studentKioskSessionError
                                        ? 'Check-in Unavailable'
                                        : loginState === 'student' && !studentKioskSessionEstablished
                                          ? 'Connecting…'
                                          : 'System Ready'}
                                </p>
                                <p className="text-muted-foreground text-sm sm:text-base font-semibold [@media(max-height:720px)]:text-xs">
                                    {loginState === 'student' && studentKioskSessionError
                                        ? studentKioskSessionError
                                        : loginState === 'student' && !studentKioskSessionEstablished
                                          ? 'This device is registering with the school. Please wait.'
                                          : 'Please scan your card'}
                                </p>
                            </div>
                            <Input
                                ref={nfcInputRef}
                                type="text"
                                className="absolute -top-[9999px] -left-[9999px]"
                                value={nfcId}
                                onChange={(e) => setNfcId(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleLookup(nfcId)}
                                autoFocus
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="manual">
                        <div className="space-y-3 py-1">
                            <div className={cn("flex items-center gap-4 p-3 rounded-2xl border border-dashed transition-all hover:border-primary/50", isGraphic ? 'bg-background/50' : 'bg-secondary/50')}>
                                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", isGraphic ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary')}>
                                    <User className="w-4 h-4" />
                                </div>
                                <div className="flex-grow text-left">
                                    <Label className={cn("text-[10px] font-bold uppercase tracking-widest opacity-60", isGraphic ? 'text-foreground' : 'text-foreground')}>Manual Entry</Label>
                                    <p className={cn("text-xs font-medium", isGraphic ? 'text-muted-foreground' : 'text-muted-foreground')}>Enter your Student ID</p>
                                </div>
                            </div>
                            <div className="py-4 [@media(max-height:720px)]:py-2">
                                <Input
                                    value={nfcId}
                                    onChange={e => setNfcId(e.target.value)}
                                    className={cn("h-16 text-3xl font-black text-center tracking-[0.5em] rounded-2xl transition-all", isGraphic ? 'bg-background/50 border-border text-foreground' : 'border-border bg-muted/30 text-foreground')}
                                    placeholder="----"
                                    autoFocus
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">Use the ID on your student card or ask a teacher.</p>
                            <Button onClick={() => handleLookup(nfcId)} className={cn("w-full h-12 rounded-xl font-black text-base uppercase tracking-widest shadow-lg transition-all active:scale-95 text-primary-foreground", isGraphic ? 'bg-primary hover:bg-primary/90' : 'bg-primary hover:bg-primary/90')}>
                                Identify Student
                            </Button>
                        </div>
                    </TabsContent>

                    {qrEnabled && (
                    <TabsContent value="camera">
                        <div className="py-2 space-y-4 [@media(max-height:720px)]:space-y-2">
                            <div className="relative w-full aspect-video max-h-[220px] [@media(max-height:720px)]:max-h-[160px] border-2 border-border rounded-xl overflow-hidden shadow-xl bg-black">
                                <video ref={videoRef as RefObject<HTMLVideoElement>} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-3/4 h-3/4 border-2 border-white/30 rounded-[1.5rem] border-dashed animate-pulse" />
                                </div>
                                {!hasCameraPermission && (
                                    <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                                        <Camera className="w-12 h-12 text-destructive mb-4" />
                                        <p className="text-foreground font-bold">Camera access required</p>
                                        <p className="text-muted-foreground text-xs mt-2">Please enable camera in settings</p>
                                    </div>
                                )}
                            </div>
                            <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">Position barcode within the frame</p>
                        </div>
                    </TabsContent>
                    )}

                    {faceEnabled && (
                        <TabsContent value="face">
                            <div className="py-2 space-y-4 [@media(max-height:720px)]:space-y-2">
                                <div className="relative w-full aspect-video max-h-[220px] [@media(max-height:720px)]:max-h-[160px] border-2 border-border rounded-xl overflow-hidden shadow-xl bg-black">
                                    <video ref={faceVideoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
                                </div>

                                {faceStatus && (
                                    <p className="text-center text-xs font-black uppercase tracking-widest text-muted-foreground">
                                        {faceStatus}
                                    </p>
                                )}

                                <p className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Allow camera access. We sign you in automatically when we recognize your face.
                                </p>
                            </div>
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </div>
    );
}
