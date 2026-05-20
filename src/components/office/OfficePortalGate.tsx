'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { collection } from 'firebase/firestore';
import { Building2, Loader2, LogIn } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isOfficePillarOn } from '@/lib/productPillars';
import type { OfficeBillingAccount, OfficeGradeEntry, OfficeInvoice } from '@/lib/office/types';
import { OfficePortalShell } from '@/components/office/OfficePortalShell';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import {
  hasOfficePortalLoginIntent,
  hasVerifiedOfficeFirestoreAccess,
} from '@/lib/office/officeAccess';

type OfficePortalData = {
  gradeEntries: OfficeGradeEntry[];
  billingAccounts: OfficeBillingAccount[];
  invoices: OfficeInvoice[];
  isOfficeDataLoading: boolean;
};

const OfficePortalDataContext = createContext<OfficePortalData>({
  gradeEntries: [],
  billingAccounts: [],
  invoices: [],
  isOfficeDataLoading: true,
});

export function useOfficePortalData() {
  return useContext(OfficePortalDataContext);
}

export function OfficePortalGate({ children }: { children: React.ReactNode }) {
  const params = useParams<{ schoolId: string }>();
  const searchParams = useSearchParams();
  const routeSchoolId = params.schoolId?.trim().toLowerCase() ?? '';
  const router = useRouter();
  const firestore = useFirestore();
  const { settings } = useSettings();
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const {
    loginState,
    isInitialized,
    schoolId: sessionSchoolId,
    login,
    logout,
    userName,
    isAdmin,
    isOffice,
  } = useAppContext();

  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const schoolDocRef = useSchoolMetadataDocRef();
  const { data: schoolMeta } = useDoc<{ name?: string }>(schoolDocRef);

  const pillarOn = isOfficePillarOn(settings);
  const handoffPending = searchParams?.get('officeHandoff') === '1';
  const roleVerified = hasVerifiedOfficeFirestoreAccess({ loginState, isAdmin, isOffice });
  const wantsOfficePortal = hasOfficePortalLoginIntent(loginState);
  const canAccess = pillarOn && roleVerified && !handoffPending;
  const canLoadOfficeData = canAccess && !!firestore && !!routeSchoolId;

  const gradesQuery = useMemoFirebase(
    () =>
      canLoadOfficeData
        ? collection(firestore, 'schools', routeSchoolId, 'officeGradeEntries')
        : null,
    [firestore, routeSchoolId, canLoadOfficeData],
  );
  const accountsQuery = useMemoFirebase(
    () =>
      canLoadOfficeData
        ? collection(firestore, 'schools', routeSchoolId, 'officeBillingAccounts')
        : null,
    [firestore, routeSchoolId, canLoadOfficeData],
  );
  const invoicesQuery = useMemoFirebase(
    () =>
      canLoadOfficeData ? collection(firestore, 'schools', routeSchoolId, 'officeInvoices') : null,
    [firestore, routeSchoolId, canLoadOfficeData],
  );

  const { data: gradeEntriesRaw, isLoading: gradesLoading } = useCollection<OfficeGradeEntry>(gradesQuery);
  const { data: billingAccountsRaw, isLoading: accountsLoading } =
    useCollection<OfficeBillingAccount>(accountsQuery);
  const { data: invoicesRaw, isLoading: invoicesLoading } = useCollection<OfficeInvoice>(invoicesQuery);

  const portalData = useMemo<OfficePortalData>(
    () => ({
      gradeEntries: gradeEntriesRaw ?? [],
      billingAccounts: billingAccountsRaw ?? [],
      invoices: invoicesRaw ?? [],
      isOfficeDataLoading: gradesLoading || accountsLoading || invoicesLoading,
    }),
    [
      gradeEntriesRaw,
      billingAccountsRaw,
      invoicesRaw,
      gradesLoading,
      accountsLoading,
      invoicesLoading,
    ],
  );

  useEffect(() => {
    if (!isInitialized || !routeSchoolId) return;
    if (loginState === 'developer') return;
    if (loginState === 'office' || loginState === 'admin') return;
    if (loginState === 'teacher') router.replace(`/${routeSchoolId}/teacher`);
    else if (loginState === 'secretary') router.replace(`/${routeSchoolId}/secretary`);
    else if (loginState === 'prizeClerk') router.replace(`/${routeSchoolId}/admin`);
    else if (loginState === 'reports') router.replace(`/${routeSchoolId}/reports`);
    else if (loginState === 'librarian') router.replace(`/${routeSchoolId}/librarian`);
  }, [isInitialized, loginState, routeSchoolId, router]);

  const handleLogin = async () => {
    if (isSubmitting || !routeSchoolId) return;
    setIsSubmitting(true);
    try {
      const authResult = await login('office', {
        schoolId: routeSchoolId,
        username: username.trim(),
        passcode,
      });
      if (authResult.ok) {
        playSound('login');
        toast({ title: 'Signed in to School Office' });
      } else {
        toast({
          variant: 'destructive',
          title: 'Sign-in failed',
          description: authResult.message ?? 'Check your username and passcode.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isInitialized || handoffPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        <span className="sr-only">{handoffPending ? 'Completing office sign-in…' : 'Loading…'}</span>
      </div>
    );
  }

  if (!pillarOn) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-teal-700" />
              School Office is off
            </CardTitle>
            <CardDescription>
              Enable the School Office product pillar in Admin → Settings to use grades and billing here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="rounded-xl">
              <a href={`/${routeSchoolId}/portal`}>Back to portal</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canAccess) {
    const sessionMismatch =
      sessionSchoolId && sessionSchoolId.toLowerCase() !== routeSchoolId;
    const staleRoleSession = wantsOfficePortal && !roleVerified;
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7f9] p-6 dark:bg-slate-950">
        <Card className="w-full max-w-md rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-teal-700" />
              School Office sign-in
            </CardTitle>
            <CardDescription>
              {sessionMismatch
                ? 'Your session is for a different school. Sign in with your office desk account.'
                : staleRoleSession
                  ? 'Your office session expired or is out of sync. Sign in again with your office desk account.'
                  : 'Use your office staff username and passcode.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="office-username">Username</Label>
              <Input
                id="office-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="office-passcode">Passcode</Label>
              <Input
                id="office-passcode"
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                autoComplete="current-password"
                className="rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleLogin();
                }}
              />
            </div>
            <Button
              className="w-full rounded-xl gap-2"
              onClick={() => void handleLogin()}
              disabled={isSubmitting || !username.trim() || !passcode}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displaySchool = schoolMeta?.name?.trim() || routeSchoolId;

  return (
    <OfficePortalDataContext.Provider value={portalData}>
      <OfficePortalShell
        schoolId={routeSchoolId}
        schoolName={displaySchool}
        userName={userName}
        onLogout={logout}
      >
        {children}
      </OfficePortalShell>
    </OfficePortalDataContext.Provider>
  );
}
