
'use client';

import { useState, useEffect, useRef, useCallback, RefObject } from 'react';
import { Nfc, Type, Camera, GraduationCap, User as UserIcon, ScanFace, Loader2, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useFunctions, useFirebase } from '@/firebase';
import { useSettings } from '@/components/providers/SettingsProvider';
import { lookupStudentId } from '@/lib/db';
import { getReadableErrorMessage } from '@/lib/errorMessage';
import { useToast } from '@/hooks/use-toast';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { cn } from '@/lib/utils';
import { httpsCallable } from 'firebase/functions';
import { onAuthStateChanged, type Auth, type User } from 'firebase/auth';

/** Wait until Firebase Auth has a user (e.g. anonymous kiosk session) or timeout. */
function waitForFirebaseAuthUser(auth: Auth, timeoutMs: number): Promise<User | null> {
    if (auth.currentUser) return Promise.resolve(auth.currentUser);
    return new Promise((resolve) => {
        const tid = window.setTimeout(() => {
            unsub();
            resolve(auth.currentUser);
        }, timeoutMs);
        const unsub = onAuthStateChanged(auth, () => {
            if (auth.currentUser) {
                window.clearTimeout(tid);
                unsub();
                resolve(auth.currentUser);
            }
        });
    });
}

interface StudentScannerProps {
    onStudentFound: (studentId: string) => void;
    title?: string;
    description?: string;
    icon?: React.ReactNode;
    isActive?: boolean;
}

export function StudentScanner({
    onStudentFound,
    title = "Student Identification",
    description = "TAP CARD OR SCAN TO UNLOCK",
    icon = <GraduationCap className="w-8 h-8" />,
    isActive = true,
}: StudentScannerProps) {
    const { schoolId } = useAppContext();
    const firestore = useFirestore();
    const functions = useFunctions();
    const { auth } = useFirebase();
    const { toast } = useToast();
    const playSound = useArcadeSound();
    const { settings } = useSettings();
    const isGraphic = settings.graphicMode === 'graphics';

    const [nfcId, setNfcId] = useState('');
    const nfcInputRef = useRef<HTMLInputElement>(null);
    const [loginTab, setLoginTab] = useState('nfc');
    const [hasCameraPermission, setHasCameraPermission] = useState(true);

    const [faceIdInput, setFaceIdInput] = useState('');
    const [faceBusy, setFaceBusy] = useState(false);
    const [faceStatus, setFaceStatus] = useState<string | null>(null);
    const faceVideoRef = useRef<HTMLVideoElement>(null);
    const faceStreamRef = useRef<MediaStream | null>(null);

    const handleLookup = useCallback(async (rawId: string) => {
        if (!rawId?.trim() || !schoolId) return;

        try {
            const finalStudentId = await lookupStudentId(firestore, schoolId, rawId.trim());
            if (finalStudentId) {
                playSound('login');
                onStudentFound(finalStudentId);
            } else {
                playSound('error');
                toast({
                    variant: 'destructive',
                    title: 'Student Not Found',
                    description: 'The provided ID does not match any student.'
                });
            }
        } catch (error) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not look up student.'
            });
        }
        setNfcId('');
    }, [firestore, schoolId, playSound, onStudentFound, toast]);

    // FaceAPI models are loaded from CDN to avoid large binaries in-repo.
    const FACE_API_MODEL_BASE_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model/';
    const faceApiReadyRef = useRef<Promise<any> | null>(null);
    const ensureFaceApiReady = useCallback(() => {
        if (faceApiReadyRef.current) return faceApiReadyRef.current;
        faceApiReadyRef.current = (async () => {
            const faceapi = await import('@vladmandic/face-api');
            // Load minimum set needed for recognition descriptor.
            await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_MODEL_BASE_URL);
            await faceapi.nets.faceLandmark68TinyNet.loadFromUri(FACE_API_MODEL_BASE_URL);
            await faceapi.nets.faceRecognitionNet.loadFromUri(FACE_API_MODEL_BASE_URL);
            return faceapi;
        })();
        return faceApiReadyRef.current;
    }, []);

    const waitForFacePreviewElement = useCallback(async (): Promise<HTMLVideoElement> => {
        for (let i = 0; i < 50; i++) {
            const v = faceVideoRef.current;
            if (v) return v;
            await new Promise((r) => setTimeout(r, 40));
        }
        throw new Error('Open the Face tab and wait a moment, then try again.');
    }, []);

    const waitForVideoFrame = useCallback(async (video: HTMLVideoElement) => {
        if (video.videoWidth > 0 && video.videoHeight > 0) return;
        await new Promise<void>((resolve, reject) => {
            const ms = 10000;
            const t = window.setTimeout(() => {
                video.onloadedmetadata = null;
                reject(new Error('Camera preview never started. Check another app is not using the camera.'));
            }, ms);
            video.onloadedmetadata = () => {
                window.clearTimeout(t);
                video.onloadedmetadata = null;
                resolve();
            };
        });
        if (video.videoWidth <= 0 || video.videoHeight <= 0) {
            throw new Error('Camera has no picture yet. Try again in a second.');
        }
    }, []);

    const startFaceCamera = useCallback(async () => {
        const video = await waitForFacePreviewElement();
        try {
            if (!faceStreamRef.current) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                    audio: false,
                });
                faceStreamRef.current = stream;
                video.srcObject = stream;
            } else if (video.srcObject !== faceStreamRef.current) {
                video.srcObject = faceStreamRef.current;
            }
            await video.play();
            await waitForVideoFrame(video);
        } catch (e: any) {
            const denied =
                e?.name === 'NotAllowedError' ||
                e?.name === 'PermissionDeniedError' ||
                /denied|permission/i.test(String(e?.message || ''));
            setFaceStatus(denied ? 'Camera permission denied.' : 'Camera error.');
            toast({
                variant: 'destructive',
                title: 'Camera Error',
                description: denied
                    ? 'Allow camera access for this site, then try again.'
                    : e?.message || 'Camera access is required for face login.',
            });
            throw e instanceof Error ? e : new Error('Camera could not start.');
        }
    }, [toast, waitForFacePreviewElement, waitForVideoFrame]);

    const stopFaceCamera = useCallback(() => {
        const stream = faceStreamRef.current;
        if (stream) {
            for (const t of stream.getTracks()) t.stop();
        }
        faceStreamRef.current = null;
    }, []);

    useEffect(() => {
        // Only run the face camera when the Face tab is active.
        if (!settings.enableFaceLogin) return;
        if (loginTab === 'face') {
            void startFaceCamera();
        } else {
            stopFaceCamera();
            setFaceStatus(null);
        }
        return () => {
            // Component unmount cleanup
            stopFaceCamera();
        };
    }, [loginTab, settings.enableFaceLogin, startFaceCamera, stopFaceCamera]);

    const captureFaceDescriptor = useCallback(async (): Promise<number[] | null> => {
        const video = faceVideoRef.current;
        if (!video || video.videoWidth <= 0) return null;
        const faceapi = await ensureFaceApiReady();
        // Slightly lenient threshold so typical classroom lighting still registers a face.
        const detection = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.35 }))
            .withFaceLandmarks(true)
            .withFaceDescriptor();
        if (!detection?.descriptor) return null;
        return Array.from(detection.descriptor as Float32Array);
    }, [ensureFaceApiReady]);

    const averageDescriptor = useCallback((vectors: number[][]): number[] | null => {
        if (!vectors.length) return null;
        const dim = vectors[0]?.length ?? 0;
        if (dim !== 128) return null;
        const acc = new Array(dim).fill(0);
        for (const v of vectors) {
            if (!Array.isArray(v) || v.length !== dim) return null;
            for (let i = 0; i < dim; i++) acc[i] += v[i];
        }
        for (let i = 0; i < dim; i++) acc[i] /= vectors.length;
        return acc;
    }, []);

    const handleFaceTrain = useCallback(async () => {
        if (!schoolId) return;
        const rawId = faceIdInput.trim();
        if (!rawId) {
            toast({ variant: 'destructive', title: 'Student ID required', description: 'Enter your student ID first.' });
            return;
        }
        setFaceBusy(true);
        setFaceStatus('Loading face models…');
        try {
            const finalStudentId = await lookupStudentId(firestore, schoolId, rawId);
            if (!finalStudentId) {
                playSound('error');
                toast({ variant: 'destructive', title: 'Student Not Found', description: 'That ID does not match a student.' });
                return;
            }

            setFaceStatus('Look at the camera…');
            await startFaceCamera();
            const samples: number[][] = [];
            for (let i = 0; i < 3; i++) {
                setFaceStatus(`Hold still… scan ${i + 1} of 3 (this can take a few seconds)`);
                const d = await captureFaceDescriptor();
                if (d) samples.push(d);
                await new Promise((r) => setTimeout(r, 220));
            }
            const descriptor = averageDescriptor(samples);
            if (!descriptor) {
                playSound('error');
                toast({ variant: 'destructive', title: 'No face detected', description: 'Make sure your face is centered and well-lit.' });
                return;
            }

            const descriptorPayload = descriptor.map((n) => Number(n));
            if (descriptorPayload.length !== 128 || descriptorPayload.some((n) => !Number.isFinite(n))) {
                playSound('error');
                toast({
                    variant: 'destructive',
                    title: 'Face scan was unclear',
                    description: 'Try again with more light on your face, or move a little closer.',
                });
                return;
            }

            setFaceStatus('Connecting…');
            const firebaseUser = await waitForFirebaseAuthUser(auth, 15000);
            if (!firebaseUser) {
                playSound('error');
                toast({
                    variant: 'destructive',
                    title: 'Cannot save face login',
                    description:
                        'This page is not signed in to Firebase yet. In the Firebase console, open Authentication → Sign-in method and enable Anonymous. Then refresh this page and try again.',
                });
                return;
            }

            setFaceStatus('Saving…');
            const enroll = httpsCallable(functions, 'enrollStudentFace');
            await enroll({ schoolId, studentId: finalStudentId, descriptor: descriptorPayload });
            playSound('success');
            setFaceStatus('Saved. You can now sign in with face.');
            toast({ title: 'Face trained', description: 'This kiosk (and others) can now recognize you.' });
        } catch (e: any) {
            playSound('error');
            const code = String(e?.code ?? '');
            const rawMsg = String(e?.message ?? '');
            const details = e?.details ? ` (${typeof e.details === 'string' ? e.details : JSON.stringify(e.details)})` : '';
            console.error('[face-train] failed', { code, message: rawMsg, details: e?.details, error: e });
            const friendly = getReadableErrorMessage(e, 'Could not save face login.');
            const codeLabel = code ? `[${code}] ` : '';
            toast({
                variant: 'destructive',
                title: 'Face training failed',
                description: `${codeLabel}${friendly}${details}`,
            });
            setFaceStatus(null);
        } finally {
            setFaceBusy(false);
        }
    }, [schoolId, faceIdInput, firestore, functions, auth, toast, playSound, startFaceCamera, captureFaceDescriptor, averageDescriptor]);

    const handleFaceSignIn = useCallback(async () => {
        if (!schoolId) return;
        setFaceBusy(true);
        setFaceStatus('Looking for a face…');
        try {
            await startFaceCamera();
            const descriptor = await captureFaceDescriptor();
            if (!descriptor) {
                playSound('error');
                toast({ variant: 'destructive', title: 'No face detected', description: 'Move closer and face the camera.' });
                return;
            }

            const signInDescriptor = descriptor.map((n) => Number(n));
            if (signInDescriptor.length !== 128 || signInDescriptor.some((n) => !Number.isFinite(n))) {
                playSound('error');
                toast({ variant: 'destructive', title: 'Face scan was unclear', description: 'Try again with better lighting.' });
                return;
            }

            setFaceStatus('Connecting…');
            const matchUser = await waitForFirebaseAuthUser(auth, 15000);
            if (!matchUser) {
                playSound('error');
                toast({
                    variant: 'destructive',
                    title: 'Cannot sign in with face',
                    description:
                        'This page is not signed in to Firebase yet. Enable Anonymous authentication in the Firebase console, then refresh and try again.',
                });
                return;
            }

            setFaceStatus('Matching…');
            const match = httpsCallable(functions, 'matchStudentFace');
            const res = await match({ schoolId, descriptor: signInDescriptor });
            const data = res.data as any;
            const matchedStudentId = typeof data?.studentId === 'string' ? data.studentId : '';
            if (!matchedStudentId) {
                playSound('error');
                toast({ variant: 'destructive', title: 'Not sure who this is', description: 'Try again or use your card/ID.' });
                setFaceStatus('No confident match. Try again.');
                return;
            }
            playSound('login');
            setFaceStatus('Welcome!');
            onStudentFound(matchedStudentId);
        } catch (e: any) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Face sign-in failed',
                description: getReadableErrorMessage(e, 'Could not sign in with face.'),
            });
            setFaceStatus(null);
        } finally {
            setFaceBusy(false);
        }
    }, [schoolId, functions, auth, toast, playSound, startFaceCamera, captureFaceDescriptor, onStudentFound]);

    const handleFaceDelete = useCallback(async () => {
        if (!schoolId) return;
        const rawId = faceIdInput.trim();
        if (!rawId) {
            toast({ variant: 'destructive', title: 'Student ID required', description: 'Enter your student ID first.' });
            return;
        }
        const ok = window.confirm('Remove your face login? You can always train again later.');
        if (!ok) return;
        setFaceBusy(true);
        setFaceStatus('Removing…');
        try {
            const finalStudentId = await lookupStudentId(firestore, schoolId, rawId);
            if (!finalStudentId) {
                playSound('error');
                toast({ variant: 'destructive', title: 'Student Not Found', description: 'That ID does not match a student.' });
                return;
            }
            setFaceStatus('Connecting…');
            const delUser = await waitForFirebaseAuthUser(auth, 15000);
            if (!delUser) {
                playSound('error');
                toast({
                    variant: 'destructive',
                    title: 'Cannot remove face login',
                    description:
                        'This page is not signed in to Firebase yet. Enable Anonymous authentication in the Firebase console, then refresh and try again.',
                });
                return;
            }
            setFaceStatus('Removing…');
            const del = httpsCallable(functions, 'deleteStudentFace');
            await del({ schoolId, studentId: finalStudentId });
            playSound('success');
            setFaceStatus('Removed.');
            toast({ title: 'Face login removed', description: 'This kiosk (and others) will stop recognizing you.' });
        } catch (e: any) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Remove failed',
                description: getReadableErrorMessage(e, 'Could not remove face login.'),
            });
            setFaceStatus(null);
        } finally {
            setFaceBusy(false);
        }
    }, [schoolId, faceIdInput, firestore, functions, auth, toast, playSound]);

    const { videoRef, hasCameraPermission: hookHasPermission } = useBarcodeScanner(
        isActive && loginTab === 'camera',
        (code) => handleLookup(code),
        (err) => {
            setHasCameraPermission(false);
            if (loginTab === 'camera') setLoginTab('nfc');
            toast({ variant: 'destructive', title: 'Camera Error', description: err });
        }
    );

    useEffect(() => { setHasCameraPermission(hookHasPermission); }, [hookHasPermission]);

    useEffect(() => {
        if (isActive && loginTab === 'nfc') {
            const timer = setTimeout(() => nfcInputRef.current?.focus(), 100);

            // Global keydown listener to hijack input for the scanner
            const handleGlobalKeyDown = (e: KeyboardEvent) => {
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
            "w-full max-w-md rounded-[2.5rem] p-6 transition-all duration-700 relative z-10 overflow-hidden",
            isGraphic
                ? 'bg-white dark:bg-card border border-slate-200/90 dark:border-border shadow-2xl shadow-black/10'
                : 'bg-card shadow-2xl border border-border',
        )}>
            <div className={cn(
                "p-4 text-center relative z-10",
                isGraphic ? 'border-b border-slate-100 dark:border-border bg-slate-50/60 dark:bg-muted/20' : 'bg-muted/30 border-b border-border',
            )}>
                {/* Kiosk lock removed */}
                <div className={cn(
                    "w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 transition-transform hover:rotate-0",
                    isGraphic ? 'bg-primary text-primary-foreground animate-pulse-glow' : 'bg-primary/10'
                )}>
                    {icon}
                </div>
                <div className="space-y-1 mb-4">
                    <h2 className={cn("text-4xl font-black tracking-tighter uppercase font-headline", isGraphic ? 'text-foreground graphic-text-glow' : 'text-foreground')}>Ready to Scan</h2>
                    <p className={cn("text-[10px] font-black uppercase tracking-[0.2em] opacity-40", isGraphic ? 'text-primary' : 'text-muted-foreground')}>Place your ID card on the reader</p>
                </div>
            </div>

            <div className="p-5">
                <Tabs defaultValue="nfc" className="w-full" value={loginTab} onValueChange={setLoginTab}>
                    <TabsList
                        className={cn(
                            "grid w-full p-1 rounded-xl mb-6",
                            settings.enableFaceLogin ? "grid-cols-4" : "grid-cols-3",
                            isGraphic ? 'bg-slate-100 dark:bg-muted/50' : 'bg-muted/50'
                        )}
                    >
                        <TabsTrigger value="nfc" onClick={() => nfcInputRef.current?.focus()} className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-md transition-all">
                            <Nfc className="mr-2 h-4 w-4" /> Card
                        </TabsTrigger>
                        <TabsTrigger value="manual" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-md transition-all">
                            <Type className="mr-2 h-4 w-4" /> Type
                        </TabsTrigger>
                        <TabsTrigger value="camera" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-md transition-all">
                            <Camera className="mr-2 h-4 w-4" /> Scan
                        </TabsTrigger>
                        {settings.enableFaceLogin && (
                            <TabsTrigger value="face" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-md transition-all">
                                <ScanFace className="mr-2 h-4 w-4" /> Face
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="nfc" className="text-center">
                        <div className="py-12 space-y-8">
                            <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                                <div className={cn("absolute inset-0 rounded-full animate-ping opacity-25", isGraphic ? 'bg-primary' : 'bg-muted-foreground')}></div>
                                <div className={cn("w-24 h-24 rounded-full flex items-center justify-center border-4 relative z-10 shadow-xl transition-all", isGraphic ? 'bg-white dark:bg-background border-primary text-primary' : 'bg-card border-slate-800 dark:border-slate-200 text-slate-800 dark:text-slate-200')}>
                                    <Nfc className="w-12 h-12" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className={cn("font-black text-lg", isGraphic ? 'text-foreground' : 'text-foreground')}>System Ready</p>
                                <p className="text-muted-foreground text-sm font-medium">Please place your card on the reader</p>
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
                        <form
                            className="space-y-4 py-2"
                            onSubmit={(e) => {
                                e.preventDefault();
                                void handleLookup(nfcId);
                            }}
                        >
                            <div className={cn("flex items-center gap-4 p-4 rounded-2xl border border-dashed transition-all hover:border-primary/50", isGraphic ? 'bg-slate-50 dark:bg-secondary/50' : 'bg-secondary/50')}>
                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", isGraphic ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary')}>
                                    <UserIcon className="w-5 h-5" />
                                </div>
                                <div className="flex-grow text-left">
                                    <Label className={cn("text-[10px] font-bold uppercase tracking-widest opacity-60", isGraphic ? 'text-foreground' : 'text-foreground')}>Manual Entry</Label>
                                    <p className={cn("text-xs font-medium", isGraphic ? 'text-muted-foreground' : 'text-muted-foreground')}>Enter your Student ID</p>
                                </div>
                            </div>
                            <div className="py-8">
                                <Input
                                    value={nfcId}
                                    onChange={e => setNfcId(e.target.value)}
                                    className={cn("h-20 text-4xl font-black text-center tracking-[0.5em] rounded-2xl transition-all", isGraphic ? 'bg-white dark:bg-foreground/5 border-border text-foreground' : 'border-border bg-muted/30 text-foreground')}
                                    placeholder="----"
                                    autoFocus
                                    autoComplete="one-time-code"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">Use the ID on your student card or ask a teacher.</p>
                            <Button type="submit" className={cn("w-full h-14 rounded-xl font-black text-base uppercase tracking-widest shadow-lg transition-all active:scale-95 text-primary-foreground", isGraphic ? 'bg-primary hover:bg-primary/90' : 'bg-primary hover:bg-primary/90')}>
                                Identify Student
                            </Button>
                        </form>
                    </TabsContent>

                    <TabsContent value="camera">
                        <div className="py-2 space-y-4">
                            <div className="relative border-2 border-border rounded-xl overflow-hidden shadow-xl bg-black">
                                <video ref={videoRef as RefObject<HTMLVideoElement>} className="w-full aspect-square object-cover" playsInline muted />
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

                    {settings.enableFaceLogin && (
                        <TabsContent value="face">
                            <div className="py-2 space-y-4">
                                <div className="relative border-2 border-border rounded-xl overflow-hidden shadow-xl bg-black">
                                    <video ref={faceVideoRef} className="w-full aspect-square object-cover" playsInline muted />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-3/4 h-3/4 border-2 border-white/30 rounded-[1.5rem] border-dashed animate-pulse" />
                                    </div>
                                    {faceBusy && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <Loader2 className="w-10 h-10 text-white animate-spin" />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Optional</Label>
                                    <p className="text-xs text-muted-foreground leading-snug">
                                        Train once, then sign in faster on any computer. If it can’t recognize you, use Card/Type/Scan.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="face-student-id" className="text-[10px] font-bold uppercase tracking-widest opacity-60">Student ID</Label>
                                    <Input
                                        id="face-student-id"
                                        value={faceIdInput}
                                        onChange={(e) => setFaceIdInput(e.target.value)}
                                        className={cn("h-12 font-black text-center tracking-[0.35em] rounded-xl", isGraphic ? 'bg-white dark:bg-foreground/5 border-border text-foreground' : 'border-border bg-muted/30 text-foreground')}
                                        placeholder="----"
                                        autoComplete="one-time-code"
                                        disabled={faceBusy}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        type="button"
                                        onClick={() => void handleFaceSignIn()}
                                        disabled={faceBusy}
                                        className={cn("h-12 rounded-xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95", isGraphic ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-primary hover:bg-primary/90 text-primary-foreground')}
                                    >
                                        Sign in
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => void handleFaceTrain()}
                                        disabled={faceBusy}
                                        className="h-12 rounded-xl font-black uppercase tracking-widest"
                                    >
                                        Train
                                    </Button>
                                </div>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => void handleFaceDelete()}
                                    disabled={faceBusy}
                                    className="h-10 w-full rounded-xl font-black uppercase tracking-widest text-xs text-muted-foreground hover:text-destructive"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Remove my face login
                                </Button>

                                {faceStatus && (
                                    <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        {faceStatus}
                                    </p>
                                )}
                            </div>
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </div>
    );
}
