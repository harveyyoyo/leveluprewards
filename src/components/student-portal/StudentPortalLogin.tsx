'use client';

import { useCallback, useRef, useState } from 'react';
import { GraduationCap, Loader2, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { lookupStudentPortal, verifyStudentPortal } from '@/lib/studentPortalClient';
import { getReadableErrorMessage } from '@/lib/errorMessage';

type Props = {
  schoolId: string;
  lobbyIdToken: string;
  onSignedIn: (customToken: string, studentId: string) => void;
};

export function StudentPortalLogin({ schoolId, lobbyIdToken, onSignedIn }: Props) {
  const { toast } = useToast();
  const [badgeId, setBadgeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [passcodeOpen, setPasscodeOpen] = useState(false);
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const [passcode, setPasscode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const finishVerify = useCallback(
    async (studentId: string, code?: string) => {
      setBusy(true);
      try {
        const result = await verifyStudentPortal(lobbyIdToken, schoolId, studentId, code);
        onSignedIn(result.customToken, result.studentId);
      } catch (e) {
        toast({
          variant: 'destructive',
          title: 'Sign-in failed',
          description: getReadableErrorMessage(e, 'Could not sign in.'),
        });
      } finally {
        setBusy(false);
        setPasscodeOpen(false);
        setPasscode('');
      }
    },
    [lobbyIdToken, onSignedIn, schoolId, toast],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = badgeId.trim();
    if (!id || busy) return;
    setBusy(true);
    try {
      const result = await lookupStudentPortal(lobbyIdToken, schoolId, id);
      if (!result.found || !result.studentId) {
        toast({
          variant: 'destructive',
          title: 'Student not found',
          description: 'Check your ID and try again.',
        });
        return;
      }
      if (result.locked) {
        toast({
          variant: 'destructive',
          title: 'Account locked',
          description: 'Ask your school admin to unlock your portal account.',
        });
        return;
      }
      if (result.deviceBlocked) {
        toast({
          variant: 'destructive',
          title: 'This device is in use',
          description:
            result.message ??
            'This device is linked to another student. Use a different browser or ask your school admin to reset the device.',
        });
        return;
      }
      if (result.requiresPasscode) {
        setPendingStudentId(result.studentId);
        setPasscodeOpen(true);
        return;
      }
      await finishVerify(result.studentId);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Lookup failed',
        description: getReadableErrorMessage(err, 'Could not look up student.'),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card className="w-full max-w-lg border-t-8 border-primary shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <GraduationCap className="h-8 w-8" aria-hidden />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-black tracking-tight">Student home</CardTitle>
            <CardDescription className="text-base">
              Enter your student ID to view your points and rewards.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="portal-student-id" className="flex items-center gap-2">
                <Type className="h-4 w-4" aria-hidden />
                Student ID
              </Label>
              <Input
                id="portal-student-id"
                ref={inputRef}
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                placeholder="Type your ID"
                className="h-12 text-lg font-mono"
                autoComplete="off"
                autoFocus
                disabled={busy}
              />
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl font-bold" disabled={busy || !badgeId.trim()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={passcodeOpen} onOpenChange={setPasscodeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter your portal passcode</DialogTitle>
            <DialogDescription>
              Your school gave you a personal passcode for home access. It is separate from your card ID.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Passcode"
            className="font-mono text-center text-lg tracking-widest"
            autoFocus
          />
          <DialogFooter>
            <Button
              type="button"
              className="w-full"
              disabled={busy || !passcode.trim() || !pendingStudentId}
              onClick={() => pendingStudentId && void finishVerify(pendingStudentId, passcode)}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Sign in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
