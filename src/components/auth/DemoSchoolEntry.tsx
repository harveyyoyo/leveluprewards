'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { loginSchoolAdmin } from '@/lib/adminGoogleAccess';
import { syncSchoolSessionCookies } from '@/lib/auth/syncFirebaseSessionCookie';
import type { DemoLinkTarget } from '@/lib/demoSchoolLink';
import { PUBLIC_SAMPLE_SCHOOL_NAMES, SAMPLE_SCHOOL_ACCESS_PASSCODE } from '@/lib/sampleSchools';
import { normalizeSchoolId } from '@/lib/schoolId';

/**
 * Owner-made demo links: the server already checked the key, so sign into the demo school with
 * its public passcode (plus the demo admin for staff pages), then open the page.
 */
export function DemoSchoolEntry({ target }: { target: DemoLinkTarget }) {
  const {
    isInitialized,
    isUserLoading,
    loginState,
    schoolId,
    isAdmin,
    login,
    startDeveloperSupportSession,
  } = useAppContext();
  const { auth } = useFirebase();
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const startedAttemptRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isInitialized || isUserLoading) return;
    if (startedAttemptRef.current === attempt) return;
    startedAttemptRef.current = attempt;

    void (async () => {
      if (!auth) {
        setFailure('Could not connect. Refresh the page and try again.');
        return;
      }
      const sid = target.schoolId;
      const sameSchool = normalizeSchoolId(schoolId) === sid;
      let asAdmin = sameSchool && (loginState === 'admin' || (loginState === 'developer' && isAdmin));
      let asSchool = asAdmin || (sameSchool && loginState === 'school');
      let asDeveloper = loginState === 'developer';

      // Keep the owner's developer session: open the demo as developer support instead.
      if (asDeveloper && !asAdmin) {
        asDeveloper = asAdmin = asSchool = await startDeveloperSupportSession(sid);
      }

      if (!asSchool) {
        const result = await login('school', { schoolId: sid, passcode: SAMPLE_SCHOOL_ACCESS_PASSCODE });
        if (!result.ok) {
          setFailure(result.message);
          return;
        }
      }

      if (target.needsAdmin && !asAdmin) {
        // Best effort: if the demo admin code was changed, the page asks for it as usual.
        const result = await loginSchoolAdmin(login, auth.currentUser, sid, SAMPLE_SCHOOL_ACCESS_PASSCODE);
        if (!result.ok) console.warn('Demo link: admin sign-in failed:', result.message);
      }

      if (!asDeveloper) await syncSchoolSessionCookies(auth, sid);
      window.location.replace(target.href);
    })();
  }, [
    attempt,
    auth,
    isAdmin,
    isInitialized,
    isUserLoading,
    login,
    loginState,
    schoolId,
    startDeveloperSupportSession,
    target,
  ]);

  if (!failure) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-muted-foreground">
        <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
        <p className="text-sm font-medium">Opening {PUBLIC_SAMPLE_SCHOOL_NAMES[target.schoolId]}…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
            The demo did not open
          </CardTitle>
          <CardDescription>{failure}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button
            className="rounded-xl"
            onClick={() => {
              setFailure(null);
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={`/login?${new URLSearchParams({ school: target.schoolId, next: target.href })}`}>
              Sign in with the passcode instead
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
