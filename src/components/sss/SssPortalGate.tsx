'use client';

import { createContext, useContext, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { HeartHandshake, Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SssPortalShell } from '@/components/sss/SssPortalShell';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import { hasVerifiedSssFirestoreAccess } from '@/lib/sss/sssAccess';
import { useSssStudents } from '@/lib/sss/useSssStudents';
import type { SssStudent } from '@/lib/sss/types';
import { schoolPortalHref } from '@/lib/sss/sssPublicUrl';
import { schoolPublicDocRef } from '@/lib/schoolPublic';

type SssPortalData = {
  students: SssStudent[];
  isSssDataLoading: boolean;
};

const SssPortalDataContext = createContext<SssPortalData>({
  students: [],
  isSssDataLoading: true,
});

export function useSssPortalData() {
  return useContext(SssPortalDataContext);
}

export function SssPortalGate({ children }: { children: React.ReactNode }) {
  const routeSchoolId = useParams<{ schoolId: string }>().schoolId?.trim().toLowerCase() ?? '';
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const { loginState, isInitialized, schoolId: sessionSchoolId, login, logout, userName, isAdmin, isOffice } = useAppContext();

  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [signInMode, setSignInMode] = useState<'office' | 'admin'>('admin');

  const schoolDocRef = useSchoolMetadataDocRef();
  const { data: schoolMeta } = useDoc<{ name?: string }>(schoolDocRef);
  const routeSchoolPublicRef = useMemoFirebase(
    () => (firestore && routeSchoolId ? schoolPublicDocRef(firestore, routeSchoolId) : null),
    [firestore, routeSchoolId],
  );
  const { data: routeSchoolPublic } = useDoc<{ name?: string }>(routeSchoolPublicRef);

  const sessionMatchesRoute = !!(routeSchoolId && sessionSchoolId?.trim().toLowerCase() === routeSchoolId);
  const roleVerified =
    (loginState === 'developer' && isAdmin) ||
    (sessionMatchesRoute && hasVerifiedSssFirestoreAccess({ loginState, isAdmin, isOffice, schoolId: routeSchoolId }));
  const canAccess = roleVerified;
  const canLoadSssData =
    canAccess &&
    !!firestore &&
    !!routeSchoolId &&
    hasVerifiedSssFirestoreAccess({
      loginState,
      isAdmin,
      isOffice,
      schoolId: routeSchoolId,
    });

  const { students, isLoading: isSssDataLoading } = useSssStudents(routeSchoolId, canLoadSssData);

  const handleLogin = async () => {
    if (isSubmitting || !routeSchoolId) return;
    setIsSubmitting(true);
    try {
      const authResult =
        signInMode === 'admin'
          ? await login('admin', { schoolId: routeSchoolId, passcode: passcode.trim() })
          : await login('office', { schoolId: routeSchoolId, username: username.trim(), passcode: passcode.trim() });
      if (authResult.ok) {
        playSound('login');
        toast({ title: 'Signed in to Student Special Services' });
      } else {
        toast({ variant: 'destructive', title: 'Sign-in failed', description: authResult.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-4 bg-[#f5f3ff]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-700" />
        <p className="text-sm text-muted-foreground">Loading Student Special Services…</p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f3ff] p-6">
        <Card className="w-full max-w-md rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HeartHandshake className="h-5 w-5 text-violet-700" />Student Special Services sign-in</CardTitle>
            <CardDescription>Use your admin passcode or office staff credentials.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <Button type="button" variant={signInMode === 'admin' ? 'default' : 'ghost'} className="h-9 rounded-lg text-xs" onClick={() => setSignInMode('admin')}>Admin</Button>
              <Button type="button" variant={signInMode === 'office' ? 'default' : 'ghost'} className="h-9 rounded-lg text-xs" onClick={() => setSignInMode('office')}>Office staff</Button>
            </div>
            {signInMode === 'office' ? (
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} className="rounded-xl" />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Passcode</Label>
              <div className="relative">
                <Input type={showPasscode ? 'text' : 'password'} value={passcode} onChange={(e) => setPasscode(e.target.value)} className="rounded-xl pr-10" onKeyDown={(e) => e.key === 'Enter' && void handleLogin()} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowPasscode((v) => !v)}>
                  {showPasscode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button className="w-full rounded-xl gap-2" onClick={() => void handleLogin()} disabled={isSubmitting || !passcode.trim() || (signInMode === 'office' && !username.trim())}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}Sign in
            </Button>
            <Button type="button" variant="ghost" className="w-full rounded-xl text-xs h-9" onClick={() => router.push(schoolPortalHref(routeSchoolId))}>Return to student portal</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displaySchool = schoolMeta?.name?.trim() || routeSchoolPublic?.name?.trim() || routeSchoolId;
  return (
    <SssPortalDataContext.Provider value={{ students, isSssDataLoading }}>
      <SssPortalShell schoolId={routeSchoolId} schoolName={displaySchool} userName={userName} onLogout={() => logout()}>
        {children}
      </SssPortalShell>
    </SssPortalDataContext.Provider>
  );
}
