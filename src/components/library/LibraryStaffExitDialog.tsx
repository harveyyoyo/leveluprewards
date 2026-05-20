'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppContext } from '@/components/AppProvider';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { verifyStaffDeskLogin } from '@/lib/staffDeskLogin';

export function LibraryStaffExitDialog({
  open,
  onOpenChange,
  onUnlocked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlocked: () => void;
}) {
  const { schoolId, login } = useAppContext();
  const { auth, functions } = useFirebase();
  const { toast } = useToast();
  const [adminPasscode, setAdminPasscode] = useState('');
  const [librarianUser, setLibrarianUser] = useState('');
  const [librarianPasscode, setLibrarianPasscode] = useState('');
  const [busy, setBusy] = useState(false);

  const resetFields = () => {
    setAdminPasscode('');
    setLibrarianUser('');
    setLibrarianPasscode('');
  };

  const handleAdminExit = async () => {
    if (!schoolId || busy) return;
    const code = adminPasscode.trim();
    if (!code) {
      toast({ variant: 'destructive', title: 'Enter admin passcode' });
      return;
    }
    setBusy(true);
    try {
      const authResult = await login('admin', { schoolId, passcode: code });
      if (!authResult.ok) {
        toast({
          variant: 'destructive',
          title: 'Incorrect passcode',
          description: authResult.message || 'Admin passcode did not match.',
        });
        return;
      }
      resetFields();
      onOpenChange(false);
      onUnlocked();
    } finally {
      setBusy(false);
    }
  };

  const handleLibrarianExit = async () => {
    if (!schoolId || !auth || busy) return;
    const user = librarianUser.trim();
    const code = librarianPasscode.trim();
    if (!user || !code) {
      toast({ variant: 'destructive', title: 'Enter librarian username and passcode' });
      return;
    }
    setBusy(true);
    try {
      await verifyStaffDeskLogin(auth, functions, {
        schoolId,
        username: user,
        passcode: code,
        role: 'librarian',
      });
      resetFields();
      onOpenChange(false);
      onUnlocked();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Incorrect passcode',
        description: 'Librarian username or passcode did not match.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetFields();
        onOpenChange(next);
      }}
    >
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline">
            <Lock className="h-5 w-5 text-primary" />
            Staff exit
          </DialogTitle>
          <DialogDescription>
            Enter an admin or librarian passcode to leave the student self-checkout screen.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="admin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="admin" className="rounded-lg text-xs font-bold">
              Admin
            </TabsTrigger>
            <TabsTrigger value="librarian" className="rounded-lg text-xs font-bold">
              Librarian
            </TabsTrigger>
          </TabsList>
          <TabsContent value="admin" className="space-y-3 mt-3">
            <div className="space-y-2">
              <Label htmlFor="lib-exit-admin-pass">Admin passcode</Label>
              <Input
                id="lib-exit-admin-pass"
                type="password"
                autoComplete="off"
                value={adminPasscode}
                onChange={(e) => setAdminPasscode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleAdminExit();
                }}
              />
            </div>
            <DialogFooter className="sm:justify-start">
              <Button type="button" className="rounded-xl w-full" disabled={busy} onClick={() => void handleAdminExit()}>
                Unlock
              </Button>
            </DialogFooter>
          </TabsContent>
          <TabsContent value="librarian" className="space-y-3 mt-3">
            <div className="space-y-2">
              <Label htmlFor="lib-exit-lib-user">Username</Label>
              <Input
                id="lib-exit-lib-user"
                autoComplete="username"
                value={librarianUser}
                onChange={(e) => setLibrarianUser(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lib-exit-lib-pass">Passcode</Label>
              <Input
                id="lib-exit-lib-pass"
                type="password"
                autoComplete="off"
                value={librarianPasscode}
                onChange={(e) => setLibrarianPasscode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleLibrarianExit();
                }}
              />
            </div>
            <DialogFooter className="sm:justify-start">
              <Button
                type="button"
                className="rounded-xl w-full"
                disabled={busy}
                onClick={() => void handleLibrarianExit()}
              >
                Unlock
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
