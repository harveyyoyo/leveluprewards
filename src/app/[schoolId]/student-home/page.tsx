'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { signInAnonymously, signInWithCustomToken, signOut } from 'firebase/auth';
import { GraduationCap } from 'lucide-react';
import { useFirebase, useFunctions, useUser } from '@/firebase';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { SchoolGate } from '@/components/auth/SchoolGate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StudentPortalLogin } from '@/components/student-portal/StudentPortalLogin';
import { StudentPortalDashboard } from '@/components/student-portal/StudentPortalDashboard';
import { logoutStudentPortal } from '@/lib/students/studentPortalClient';
import { establishStudentPortalLobby } from '@/lib/students/studentPortalLobby';
import {
  syncFirebaseSessionCookie,
  syncSchoolGateCookie,
} from '@/lib/auth/syncFirebaseSessionCookie';
import { getReadableErrorMessage } from '@/lib/errorMessage';
import { setStudentPortalSignedIn } from '@/lib/students/studentLayoutChrome';

export default function StudentHomePage() {
  const params = useParams<{ schoolId: string }>();
  const { schoolId: ctxSchoolId } = useAppContext();
  const schoolId = (ctxSchoolId || params.schoolId || '').trim().toLowerCase();
  const { auth } = useFirebase();
  const functions = useFunctions();
  const { user, isUserLoading } = useUser();
  const { settings } = useSettings();

  const [lobbyReady, setLobbyReady] = useState(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [lobbyToken, setLobbyToken] = useState<string | null>(null);
  const [portalStudentId, setPortalStudentId] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const portalEnabled = settings.enableStudentPortal === true;

  useEffect(() => {
    if (!portalEnabled || !schoolId || isUserLoading || !user || !auth) return;
    let cancelled = false;
    (async () => {
      try {
        const idToken = await user.getIdToken(true);
        await establishStudentPortalLobby(functions, idToken, schoolId);
        await syncFirebaseSessionCookie(auth);
        await syncSchoolGateCookie(auth, schoolId);
        if (!cancelled) {
          setLobbyToken(idToken);
          setLobbyReady(true);
          setLobbyError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setLobbyError(getReadableErrorMessage(e, 'Could not open student portal.'));
          setLobbyReady(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [portalEnabled, schoolId, isUserLoading, user, auth, functions]);

  useEffect(() => {
    if (!user || isUserLoading) return;
    void user.getIdTokenResult().then((result) => {
      if (result.claims.studentPortal === true) {
        setPortalStudentId(user.uid);
      }
    });
  }, [user, isUserLoading]);

  const handleSignedIn = useCallback(
    async (customToken: string, studentId: string) => {
      if (!auth) return;
      await signInWithCustomToken(auth, customToken);
      const signedIn = auth.currentUser;
      if (signedIn) {
        await signedIn.getIdToken(true);
        await syncFirebaseSessionCookie(auth);
        await syncSchoolGateCookie(auth, schoolId);
      }
      setPortalStudentId(studentId);
    },
    [auth, schoolId],
  );

  const lockBrowserToStudent = settings.studentPortalLockBrowserToStudent === true;

  const handleSignOut = useCallback(async () => {
    if (!auth || !schoolId) return;
    setSigningOut(true);
    try {
      const sid = portalStudentId;
      if (sid) {
        await logoutStudentPortal(schoolId, sid, {
          clearDevice: !lockBrowserToStudent,
        });
      }
      await signOut(auth);
      await signInAnonymously(auth);
      setPortalStudentId(null);
      setLobbyToken(null);
      setLobbyReady(false);
    } finally {
      setSigningOut(false);
    }
  }, [auth, lockBrowserToStudent, portalStudentId, schoolId]);

  const isPortalStudent = Boolean(portalStudentId && user?.uid === portalStudentId);

  useEffect(() => {
    setStudentPortalSignedIn(isPortalStudent);
    return () => setStudentPortalSignedIn(false);
  }, [isPortalStudent]);

  if (!portalEnabled) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
        <Card className="w-full max-w-lg border-t-8 border-muted shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <GraduationCap className="h-8 w-8" aria-hidden />
            </div>
            <CardTitle className="text-2xl font-black">Student home portal</CardTitle>
            <CardDescription>
              Your school has not turned on the student home portal yet. Use the in-school kiosk to view rewards.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <SchoolGate>
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
        {lobbyError ? (
          <Card className="w-full max-w-lg border-destructive/40">
            <CardHeader>
              <CardTitle>Could not load portal</CardTitle>
              <CardDescription>{lobbyError}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Refresh the page or try again later.</p>
            </CardContent>
          </Card>
        ) : !lobbyReady || !lobbyToken ? (
          <p className="text-muted-foreground">Preparing secure connection…</p>
        ) : isPortalStudent && portalStudentId ? (
          <StudentPortalDashboard
            schoolId={schoolId}
            studentId={portalStudentId}
            onSignOut={() => void handleSignOut()}
            signingOut={signingOut}
          />
        ) : (
          <StudentPortalLogin
            schoolId={schoolId}
            lobbyIdToken={lobbyToken}
            onSignedIn={(token, sid) => void handleSignedIn(token, sid)}
          />
        )}
      </div>
    </SchoolGate>
  );
}
