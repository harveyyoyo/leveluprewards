'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc } from 'firebase/firestore';
import { Building2, Loader2, LogIn } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfficePortalShell } from '@/components/office/OfficePortalShell';
import { isOfficePillarOn } from '@/lib/productPillars';
import type { OfficeBillingAccount, OfficeGradeEntry, OfficeInvoice } from '@/lib/office/types';

type SchoolPublicName = { name?: string };

export function OfficePortalGate({ children }: { children: React.ReactNode }) {
  const { loginState, isInitialized, schoolId, login, logout, userName, isOffice, isAdmin } = useAppContext();
  const router = useRouter();
  const firestore = useFirestore();
  const { settings } = useSettings();
  const playSound = useArcadeSound();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const officeOn = isOfficePillarOn(settings);

  const schoolPublicRef = useMemoFirebase(
    () => (firestore && schoolId ? doc(firestore, 'schoolPublic', schoolId) : null),
    [firestore, schoolId],
  );
  const { data: schoolPublic } = useDoc<SchoolPublicName>(schoolPublicRef);

  const canAccess = isOffice || isAdmin;
  const dataEnabled = !!schoolId && canAccess && officeOn;

  const gradesQuery = useMemoFirebase(
    () => (firestore && dataEnabled && schoolId ? collection(firestore, 'schools', schoolId, 'officeGradeEntries') : null),
    [firestore, schoolId, dataEnabled],
  );
  const accountsQuery = useMemoFirebase(
    () => (firestore && dataEnabled && schoolId ? collection(firestore, 'schools', schoolId, 'officeBillingAccounts') : null),
    [firestore, schoolId, dataEnabled],
  );
  const invoicesQuery = useMemoFirebase(
    () => (firestore && dataEnabled && schoolId ? collection(firestore, 'schools', schoolId, 'officeInvoices') : null),
    [firestore, schoolId, dataEnabled],
  );

  const { data: gradeEntries } = useCollection<OfficeGradeEntry>(gradesQuery);
  const { data: billingAccounts } = useCollection<OfficeBillingAccount>(accountsQuery);
  const { data: invoices } = useCollection<OfficeInvoice>(invoicesQuery);

  useEffect(() => {
    if (!isInitialized || !schoolId) return;
    if (loginState === 'teacher') router.replace(`/${schoolId}/teacher`);
    else if (loginState === 'secretary') router.replace(`/${schoolId}/secretary`);
    else if (loginState === 'librarian') router.replace(`/${schoolId}/librarian`);
    else if (loginState === 'prizeClerk') router.replace(`/${schoolId}/admin`);
    else if (loginState === 'reports') router.replace(`/${schoolId}/reports`);
  }, [isInitialized, loginState, schoolId, router]);

  const handleLogin = async () => {
    if (isSubmitting || !schoolId) return;
    if (!username.trim() || !passcode) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Enter username and passcode.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const authResult = await login('office', { schoolId, username: username.trim(), passcode });
      if (authResult.ok) {
        playSound('login');
        toast({ title: 'Signed in to School Office' });
      } else {
        playSound('error');
        toast({ variant: 'destructive', title: 'Login failed', description: authResult.message });
        setPasscode('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    playSound('swoosh');
    logout({ staffNavigateTo: 'portal' });
  };

  if (!isInitialized || !schoolId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!officeOn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>School Office is not enabled</CardTitle>
            <CardDescription>
              An administrator can turn on the Office pillar under Settings → Product Pillars.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="rounded-xl">
              <a href={`/${schoolId}/portal`}>Back to portal</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <ErrorBoundary name="OfficeLogin">
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#f4f7f9]">
          <Card className="w-full max-w-md border-t-4 border-teal-600 shadow-lg">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-teal-800 text-white shadow-lg">
                <Building2 className="h-10 w-10" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">School Office</CardTitle>
                <CardDescription>Grades and billing — separate from rewards admin.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!isSubmitting) void handleLogin();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="office-user">Username</Label>
                  <Input
                    id="office-user"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 rounded-xl"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="office-pass">Passcode</Label>
                  <Input
                    id="office-pass"
                    type="password"
                    autoComplete="current-password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="h-12 rounded-xl font-mono tracking-widest text-center"
                  />
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl font-bold gap-2" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
                  Sign in
                </Button>
              </form>
              <p className="text-center text-xs text-muted-foreground">
                Admins can also open this portal from the main hub. Desk staff need an office account from Admin → Teachers.
              </p>
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <OfficePortalShell
      schoolId={schoolId}
      schoolName={schoolPublic?.name}
      userName={userName}
      onLogout={handleLogout}
    >
      <OfficePortalDataContext.Provider
        value={{
          gradeEntries: gradeEntries ?? [],
          billingAccounts: billingAccounts ?? [],
          invoices: invoices ?? [],
        }}
      >
        {children}
      </OfficePortalDataContext.Provider>
    </OfficePortalShell>
  );
}

type OfficePortalData = {
  gradeEntries: OfficeGradeEntry[];
  billingAccounts: OfficeBillingAccount[];
  invoices: OfficeInvoice[];
};

const OfficePortalDataContext = createContext<OfficePortalData>({
  gradeEntries: [],
  billingAccounts: [],
  invoices: [],
});

export function useOfficePortalData() {
  return useContext(OfficePortalDataContext);
}
