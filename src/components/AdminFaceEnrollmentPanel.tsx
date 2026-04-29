'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { ScanFace, Loader2, Trash2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAppContext } from '@/components/AppProvider';
import { useFirebase } from '@/firebase';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { useToast } from '@/hooks/use-toast';
import { getReadableErrorMessage } from '@/lib/errorMessage';
import { callableToastDescription } from '@/firebase/emulatorHints';
import { useFaceDescriptor } from '@/hooks/useFaceDescriptor';
import { cn } from '@/lib/utils';

interface AdminFaceEnrollmentPanelProps {
  studentId: string;
  studentLabel?: string;
}

type FaceAuthStatus = {
  enrolled: boolean;
  scanCount: number;
  updatedAt: number | null;
  autoLogin: boolean;
  enabled: boolean;
};

/**
 * Admin-side per-student face-login controls, shown inside the edit modal.
 *
 *  - Displays enrollment summary and auto-login in the student form.
 *  - Opens a dedicated dialog for camera capture, Train/Retrain, and Remove —
 *    so face training does not stay embedded in the student edit dialog.
 */
export function AdminFaceEnrollmentPanel({ studentId, studentLabel }: AdminFaceEnrollmentPanelProps) {
  const { schoolId } = useAppContext();
  const { functions, user, isUserLoading, userError } = useFirebase();
  const confirm = useConfirm();
  const { toast } = useToast();
  const { captureFaceDescriptor, averageDescriptor, ensureFaceApiReady } = useFaceDescriptor();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [faceStatus, setFaceStatus] = useState<FaceAuthStatus>({
    enrolled: false,
    scanCount: 0,
    updatedAt: null,
    autoLogin: true,
    enabled: false,
  });

  const refreshStatus = useCallback(async () => {
    if (!schoolId || !functions || !studentId) return;
    try {
      const fn = httpsCallable(functions, 'getStudentFaceAuthStatus');
      const res = await fn({ schoolId, studentId });
      const data = res.data as any;
      setFaceStatus({
        enrolled: !!data?.enrolled,
        scanCount: typeof data?.scanCount === 'number' ? data.scanCount : 0,
        updatedAt: typeof data?.updatedAt === 'number' ? data.updatedAt : null,
        autoLogin: typeof data?.autoLogin === 'boolean' ? data.autoLogin : true,
        enabled: !!data?.enabled,
      });
    } catch (e: any) {
      // If the user isn't an admin (or function not deployed yet), don't break the modal.
      console.warn('[AdminFaceEnrollmentPanel] status load failed', e);
    }
  }, [schoolId, functions, studentId]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const enrolled = faceStatus.enrolled;
  const scanCount = faceStatus.scanCount;
  const updatedLabel = useMemo(() => {
    if (typeof faceStatus.updatedAt !== 'number') return null;
    try {
      return new Date(faceStatus.updatedAt).toLocaleString();
    } catch {
      return null;
    }
  }, [faceStatus.updatedAt]);

  const stopCamera = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      for (const t of stream.getTracks()) t.stop();
    }
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      try { video.pause(); } catch {}
      video.srcObject = null;
    }
    setCameraOn(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleTrainingDialogOpenChange = useCallback(
    (open: boolean) => {
      setTrainingDialogOpen(open);
      if (!open) stopCamera();
    },
    [stopCamera],
  );

  const startCamera = useCallback(async (): Promise<HTMLVideoElement | null> => {
    const video = videoRef.current;
    if (!video) return null;
    try {
      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        streamRef.current = stream;
      }
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
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
      
      setCameraOn(true);
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
          : e?.message || 'Camera access is required to train a face.',
      });
      return null;
    }
  }, [toast]);

  const firebaseAuthReadyForCallables =
    !userError && !isUserLoading && !!user;

  const handleTrain = useCallback(async () => {
    if (!schoolId || !functions || !studentId) return;
    if (userError) {
      toast({
        variant: 'destructive',
        title: 'Face training unavailable',
        description: getReadableErrorMessage(userError, 'Firebase Authentication failed.'),
      });
      return;
    }
    if (isUserLoading) {
      toast({
        description: 'Still connecting to Firebase. Wait a moment, then tap Train again.',
      });
      return;
    }
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not signed in to Firebase',
        description:
          'Enable Anonymous sign-in in Firebase Console → Authentication → Sign-in method, hard-refresh this page, and try Training again.',
      });
      return;
    }

    setBusy(true);
    setStatus('Starting camera…');
    try {
      await user.getIdToken(true);
      const video = await startCamera();
      if (!video) {
        setStatus(null);
        return;
      }
      
      setStatus('Initializing AI…');
      await ensureFaceApiReady();

      const samples: number[][] = [];
      for (let i = 0; i < 3; i++) {
        setStatus(`Hold still… scan ${i + 1} of 3`);
        const d = await captureFaceDescriptor(video);
        if (d) samples.push(d);
        await new Promise((r) => setTimeout(r, 220));
      }
      const descriptor = averageDescriptor(samples);
      if (
        !descriptor ||
        descriptor.length !== 128 ||
        descriptor.some((n: number) => !Number.isFinite(n))
      ) {
        toast({
          variant: 'destructive',
          title: 'No face detected',
          description: 'Make sure the student is centered and well-lit, then try again.',
        });
        setStatus(null);
        return;
      }

      setStatus('Saving…');
      const enroll = httpsCallable(functions, 'enrollStudentFace');
      await enroll({
        schoolId,
        studentId,
        descriptor: descriptor.map((n: number) => Number(n)),
      });
      toast({
        title: enrolled ? 'Face retrained' : 'Face trained',
        description: studentLabel ? `${studentLabel} can now sign in by face.` : 'Student can now sign in by face.',
      });
      setStatus(null);
      await refreshStatus();
    } catch (e: any) {
      console.warn('[enrollStudentFace]', e?.code, e?.message, e);
      toast({
        variant: 'destructive',
        title: 'Face training failed',
        description: callableToastDescription(e, 'Could not save face login.'),
      });
      setStatus(null);
    } finally {
      setBusy(false);
      stopCamera();
    }
  }, [
    schoolId,
    functions,
    studentId,
    studentLabel,
    enrolled,
    user,
    userError,
    isUserLoading,
    startCamera,
    captureFaceDescriptor,
    averageDescriptor,
    toast,
    stopCamera,
    refreshStatus,
  ]);

  const handleRemove = useCallback(async () => {
    if (!schoolId || !functions || !studentId) return;
    if (userError) {
      toast({
        variant: 'destructive',
        title: 'Cannot remove face login',
        description: getReadableErrorMessage(userError, 'Firebase Authentication failed.'),
      });
      return;
    }
    if (isUserLoading || !user) {
      toast({
        variant: 'destructive',
        title: 'Firebase not ready',
        description:
          'Sign in anonymously (Firebase Console → Authentication) or refresh the page.',
      });
      return;
    }
    const ok = await confirm({
      title: 'Remove face login?',
      description: 'The student will stop being recognized by face. They can retrain later.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    setStatus('Removing…');
    try {
      await user.getIdToken(true);
      const del = httpsCallable(functions, 'deleteStudentFace');
      await del({ schoolId, studentId });
      toast({ title: 'Face login removed' });
      setStatus(null);
      await refreshStatus();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Remove failed',
        description: callableToastDescription(e, 'Could not remove face login.'),
      });
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }, [schoolId, functions, studentId, user, userError, isUserLoading, confirm, toast, refreshStatus]);

  const handleToggleAutoLogin = useCallback(
    async (next: boolean) => {
      if (!schoolId || !functions || !studentId) return;
      if (userError || isUserLoading || !user) {
        toast({
          variant: 'destructive',
          title: 'Could not update face login',
          description: userError
            ? getReadableErrorMessage(userError, 'Firebase Authentication failed.')
            : 'Wait for Firebase to finish signing you in, then try again.',
        });
        return;
      }
      // Optimistic UI
      setFaceStatus((s) => ({ ...s, autoLogin: next }));
      try {
        await user.getIdToken(true);
        const fn = httpsCallable(functions, 'setStudentFaceAutoLogin');
        await fn({ schoolId, studentId, autoLogin: next });
        await refreshStatus();
      } catch (e: any) {
        // Revert
        setFaceStatus((s) => ({ ...s, autoLogin: !next }));
        toast({
          variant: 'destructive',
          title: 'Could not update face login',
          description: getReadableErrorMessage(e, 'Please try again.'),
        });
      }
    },
    [schoolId, functions, studentId, user, userError, isUserLoading, refreshStatus, toast],
  );

  if (!schoolId || !studentId) return null;

  return (
    <div className="space-y-2 rounded-xl border border-border/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-2 text-sm">
          <ScanFace className="w-4 h-4 text-primary" />
          Face Login
        </Label>
        <span
          className={cn(
            'text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-0.5',
            enrolled
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {enrolled ? `Enrolled · ${scanCount} scan${scanCount === 1 ? '' : 's'}` : 'Not enrolled'}
        </span>
      </div>

      {updatedLabel && (
        <p className="text-[11px] text-muted-foreground">Last updated {updatedLabel}</p>
      )}

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs font-bold">Auto face login</p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            When off, this student will not be matched for automatic sign-in by face.
          </p>
        </div>
        <Switch
          checked={faceStatus.autoLogin}
          onCheckedChange={(v) => void handleToggleAutoLogin(!!v)}
          disabled={busy || !firebaseAuthReadyForCallables}
          aria-label="Auto face login"
        />
      </div>

      {userError ? (
        <p className="text-[11px] text-destructive font-medium leading-snug">
          Firebase sign-in failed: {getReadableErrorMessage(userError, String(userError?.message ?? 'Unknown error'))}
        </p>
      ) : isUserLoading ? (
        <p className="text-[11px] text-muted-foreground">Connecting your session to Firebase…</p>
      ) : !user ? (
        <p className="text-[11px] text-destructive font-medium leading-snug">
          Not signed in to Firebase. Enable Anonymous in Authentication → Sign-in method, then reload.
        </p>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full rounded-lg font-semibold"
        disabled={busy || !firebaseAuthReadyForCallables}
        onClick={() => setTrainingDialogOpen(true)}
      >
        <Camera className="w-4 h-4 mr-2" />
        {enrolled ? 'Retrain face login…' : 'Train face login…'}
      </Button>

      <Dialog open={trainingDialogOpen} onOpenChange={handleTrainingDialogOpenChange}>
        <DialogContent
          className="gap-0 z-[60]"
          onInteractOutside={(e) => {
            if (busy) e.preventDefault();
          }}
        >
          <DialogHeader className="pb-4">
            <DialogTitle>
              Face login training
              {studentLabel ? (
                <span className="block text-sm font-normal text-muted-foreground mt-1">
                  {studentLabel}
                </span>
              ) : null}
            </DialogTitle>
            <DialogDescription>
              Capture the student&apos;s face for kiosk sign-in. Grant camera permission when prompted.
              Close this window when you are finished.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pb-2">
            <div
              className={cn(
                'relative w-full overflow-hidden rounded-lg border bg-black aspect-video',
                cameraOn ? 'opacity-100' : 'opacity-0 h-0 border-0',
              )}
              style={cameraOn ? undefined : { height: 0 }}
            >
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              {busy && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>

            {status && (
              <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {status}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => void handleTrain()}
                disabled={busy || !firebaseAuthReadyForCallables}
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-2" />
                {enrolled ? 'Retrain' : 'Train'}
              </Button>
              {enrolled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRemove()}
                  disabled={busy || !firebaseAuthReadyForCallables}
                  className="text-muted-foreground hover:text-destructive hover:border-destructive/60"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground leading-snug">
              Have the student face the camera, then click Train. You can retrain any time if
              the kiosk starts recognizing the wrong person.
            </p>
          </div>

          <DialogFooter className="pt-4 sm:justify-center border-t mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleTrainingDialogOpenChange(false)}
              disabled={busy}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
