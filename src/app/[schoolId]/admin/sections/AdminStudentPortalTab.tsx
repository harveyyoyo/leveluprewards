'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Copy, Download, ExternalLink, GraduationCap, Lock, MonitorOff, Unlock } from 'lucide-react';
import { doc } from 'firebase/firestore';
import { useFirebase, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useSettings } from '@/components/providers/SettingsProvider';
import type { Student } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { useToast } from '@/hooks/use-toast';
import { getStudentNickname } from '@/lib/utils';
import {
  clearStudentPortalPasscode,
  resetStudentPortalBrowser,
  setStudentPortalPasscode,
  unlockStudentPortal,
} from '@/lib/students/studentPortalClient';
import { getReadableErrorMessage } from '@/lib/errorMessage';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import { BrandedQrCode } from '@/components/qr/BrandedQrCode';
import { downloadBrandedQrPng } from '@/lib/qr/downloadBrandedQrPng';

type Props = {
  schoolId: string;
  students: Student[];
};

export function AdminStudentPortalTab({ schoolId, students }: Props) {
  const { settings, updateSettings } = useSettings();
  const { user } = useUser();
  const { auth } = useFirebase();
  const firestore = useFirestore();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [passcodeDraft, setPasscodeDraft] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [qrDownloadBusy, setQrDownloadBusy] = useState(false);
  const qrCaptureRef = useRef<HTMLDivElement>(null);

  const appConfigRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'appConfig', 'global') : null),
    [firestore],
  );
  const { data: appConfig } = useDoc<{ appLogoUrl?: string }>(appConfigRef);
  const appLogoUrl = appConfig?.appLogoUrl ?? null;

  const portalUrl = useMemo(() => {
    if (typeof window === 'undefined' || !schoolId) return `/${schoolId}/student-home`;
    return `${window.location.origin}/${schoolId}/student-home`;
  }, [schoolId]);

  const portalOn = settings.enableStudentPortal === true;
  const passcodeRequired = settings.studentPortalRequirePasscode !== false;

  const handlePasscodeRequiredChange = async (checked: boolean) => {
    if (checked) {
      updateSettings({ studentPortalRequirePasscode: true });
      return;
    }
    const ok = await confirm({
      title: 'Turn off portal passcodes?',
      description:
        'Anyone who knows a student’s ID can sign in at home and view that student’s points, activity, and rewards. Only continue if your school accepts that risk.',
      confirmLabel: 'Turn off passcodes',
      cancelLabel: 'Keep passcodes required',
      destructive: true,
    });
    if (ok) {
      updateSettings({ studentPortalRequirePasscode: false });
    }
  };

  const getIdToken = useCallback(async () => {
    if (!auth?.currentUser) throw new Error('Sign in again to continue.');
    return auth.currentUser.getIdToken(true);
  }, [auth]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      toast({ title: 'Link copied', description: 'Share this URL with students for home access.' });
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed' });
    }
  };

  const handleDownloadPortalQr = async () => {
    const el = qrCaptureRef.current;
    if (!el) return;
    setQrDownloadBusy(true);
    try {
      await downloadBrandedQrPng(el, `${schoolId}-student-home-portal-qr.png`);
      toast({
        title: 'QR downloaded',
        description: 'Print on flyers or posters; test with a phone camera before bulk printing.',
      });
    } catch {
      toast({ variant: 'destructive', title: 'Download failed', description: 'Try again in a moment.' });
    } finally {
      setQrDownloadBusy(false);
    }
  };

  const handleUnlock = async (studentId: string) => {
    setBusyId(studentId);
    try {
      const idToken = await getIdToken();
      await unlockStudentPortal(idToken, schoolId, studentId);
      toast({ title: 'Portal unlocked', description: 'The student can try signing in again.' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Unlock failed',
        description: getReadableErrorMessage(e, 'Unlock failed.'),
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleSetPasscode = async (studentId: string) => {
    const code = (passcodeDraft[studentId] ?? '').trim();
    if (code.length < 4) {
      toast({ variant: 'destructive', title: 'Passcode too short', description: 'Use at least 4 characters.' });
      return;
    }
    setBusyId(studentId);
    try {
      const idToken = await getIdToken();
      await setStudentPortalPasscode(idToken, schoolId, studentId, code);
      setPasscodeDraft((prev) => ({ ...prev, [studentId]: '' }));
      toast({ title: 'Passcode saved', description: 'Share it privately with the student.' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not save passcode',
        description: getReadableErrorMessage(e, 'Could not save passcode.'),
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleResetBrowser = async (studentId: string) => {
    setBusyId(studentId);
    try {
      const idToken = await getIdToken();
      const result = await resetStudentPortalBrowser(idToken, schoolId, studentId);
      toast({
        title: 'Browser link reset',
        description:
          result.cleared > 0
            ? 'Another student can sign in on that home device after signing out.'
            : 'No active home browser was linked to this student.',
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Reset failed',
        description: getReadableErrorMessage(e, 'Reset failed.'),
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleClearPasscode = async (studentId: string) => {
    setBusyId(studentId);
    try {
      const idToken = await getIdToken();
      await clearStudentPortalPasscode(idToken, schoolId, studentId);
      toast({ title: 'Passcode cleared' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not clear passcode',
        description: getReadableErrorMessage(e, 'Could not clear passcode.'),
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <Helper content="Students sign in at home with their ID and a personal passcode (recommended). They only see their own rewards — not other students or staff tools.">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" aria-hidden />
              Student home portal
            </CardTitle>
          </Helper>
          <TabWalkthroughHeaderAction />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
            <div>
              <Label htmlFor="enable-student-portal-tab" className="font-semibold">
                Enable student home portal
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                When off, the student home URL is disabled and students use the in-school kiosk only.
              </p>
            </div>
            <Switch
              id="enable-student-portal-tab"
              checked={portalOn}
              onCheckedChange={(checked) => updateSettings({ enableStudentPortal: checked })}
            />
          </div>

          {portalOn ? (
            <>
              <div className="space-y-2">
                <Label>Student home portal URL</Label>
                <div className="flex flex-wrap gap-2">
                  <Input readOnly value={portalUrl} className="font-mono text-sm flex-1 min-w-[200px]" />
                  <Button type="button" variant="outline" onClick={() => void handleCopyUrl()}>
                    <Copy className="mr-2 h-4 w-4" aria-hidden />
                    Copy
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                      Open
                    </a>
                  </Button>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border p-4">
                <div>
                  <Label className="font-semibold">Poster QR code</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Branded code with the LevelUp logo in the center. Students scan to open the home portal.
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-6">
                  <BrandedQrCode
                    ref={qrCaptureRef}
                    value={portalUrl}
                    logoSrc={appLogoUrl}
                    size={180}
                    caption="Scan to open student home"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={qrDownloadBusy}
                    onClick={() => void handleDownloadPortalQr()}
                  >
                    <Download className="mr-2 h-4 w-4" aria-hidden />
                    {qrDownloadBusy ? 'Preparing…' : 'Download PNG'}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
                <div>
                  <Label className="font-semibold">Require passcode for all students</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    When on, each student must have a portal passcode set below before they can sign in at home.
                  </p>
                </div>
                <Switch
                  checked={passcodeRequired}
                  onCheckedChange={(checked) => void handlePasscodeRequiredChange(checked)}
                />
              </div>

              {!passcodeRequired ? (
                <Alert variant="destructive">
                  <AlertTitle>Portal passcodes are off</AlertTitle>
                  <AlertDescription>
                    Anyone who knows a student’s ID can sign in at home and see that student’s points and
                    rewards information. Turn passcodes back on unless your school has explicitly accepted
                    this risk.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
                <div>
                  <Label className="font-semibold">Lock each browser to one student</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Off (recommended for home): when a student signs out, a sibling can sign in on the same
                    computer with their ID and passcode. On: the first student keeps the browser until you
                    reset it below.
                  </p>
                </div>
                <Switch
                  checked={settings.studentPortalLockBrowserToStudent === true}
                  onCheckedChange={(checked) =>
                    updateSettings({ studentPortalLockBrowserToStudent: checked })
                  }
                />
              </div>

              <div className="max-w-xs space-y-2">
                <Label htmlFor="portal-max-attempts">Max wrong passcode attempts</Label>
                <Input
                  id="portal-max-attempts"
                  type="number"
                  min={3}
                  max={20}
                  value={settings.studentPortalMaxFailedAttempts ?? 5}
                  onChange={(e) =>
                    updateSettings({
                      studentPortalMaxFailedAttempts: Math.min(
                        20,
                        Math.max(3, Number(e.target.value) || 5),
                      ),
                    })
                  }
                />
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {portalOn ? (
        <Card>
          <CardHeader>
            <Helper content="Set an optional second passcode per student. Locked accounts can only be unlocked here.">
              <CardTitle>Student passcodes &amp; lockouts</CardTitle>
            </Helper>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[...students]
                .sort((a, b) => getStudentNickname(a).localeCompare(getStudentNickname(b)))
                .map((s) => {
                  const hasPasscode = s.portalPasscodeSet === true;
                  const locked = s.portalLocked === true;
                  const busy = busyId === s.id;
                  return (
                    <li
                      key={s.id}
                      className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold">{getStudentNickname(s)}</p>
                        <p className="text-xs text-muted-foreground font-mono">ID: {s.nfcId || s.id}</p>
                        <p className="text-xs mt-1">
                          {locked ? (
                            <span className="text-destructive font-medium">Locked</span>
                          ) : hasPasscode ? (
                            <span className="text-emerald-600 font-medium">Passcode set</span>
                          ) : (
                            <span className="text-muted-foreground">No passcode</span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {locked ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => void handleUnlock(s.id)}
                          >
                            <Unlock className="mr-1 h-3 w-3" aria-hidden />
                            Unlock
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          title="Let another student use the same home browser"
                          onClick={() => void handleResetBrowser(s.id)}
                        >
                          <MonitorOff className="mr-1 h-3 w-3" aria-hidden />
                          Reset browser
                        </Button>
                        <Input
                          type="password"
                          placeholder="New passcode"
                          className="w-36 font-mono"
                          value={passcodeDraft[s.id] ?? ''}
                          onChange={(e) =>
                            setPasscodeDraft((prev) => ({ ...prev, [s.id]: e.target.value }))
                          }
                          disabled={busy}
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy}
                          onClick={() => void handleSetPasscode(s.id)}
                        >
                          <Lock className="mr-1 h-3 w-3" aria-hidden />
                          Save
                        </Button>
                        {hasPasscode ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => void handleClearPasscode(s.id)}
                          >
                            Clear
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
