'use client';

import { useEffect, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/components/AppProvider';
import { useToast } from '@/hooks/use-toast';
import { useRouter, usePathname } from 'next/navigation';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useSettings } from '@/components/providers/SettingsProvider';
import {
  isPublicSampleSchoolId,
  PUBLIC_DEMO_ADMIN_PASSCODE,
  SAMPLE_SCHOOL_ACCESS_PASSCODE,
} from '@/lib/sample-schools';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { getLevelUpLogoHref } from '@/lib/app-branding';
import { useFirestore, useMemoFirebase, useDoc, useFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import {
  GoogleAuthProvider,
  getRedirectResult,
  linkWithPopup,
  linkWithRedirect,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';

export type SchoolDeveloperLoginFormMode = 'full' | 'developer-only';

export type SchoolDeveloperLoginFormProps = {
  /** `full` = school sign-in + optional developer toggle (public `/login`). `developer-only` = passcode for `/developer`. */
  mode?: SchoolDeveloperLoginFormMode;
  /** Prefill School ID (e.g. from `/login?school=` after a gated route redirect). */
  initialSchoolId?: string;
};

export function SchoolDeveloperLoginForm({ mode = 'full', initialSchoolId }: SchoolDeveloperLoginFormProps) {
  const [schoolId, setSchoolId] = useState('');
  const [schoolPasscode, setSchoolPasscode] = useState('');
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [googleSignInBlocked, setGoogleSignInBlocked] = useState<null | 'operation-not-allowed'>(
    null,
  );
  const schoolIdRef = useRef<HTMLInputElement | null>(null);
  const passcodeRef = useRef<HTMLInputElement | null>(null);
  const { login, isInitialized, isUserLoading } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const playSound = useArcadeSound();
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(false);
  const { auth } = useFirebase();

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const firestore = useFirestore();
  const appConfigDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'appConfig', 'global');
  }, [firestore]);
  const { data: appConfig } = useDoc<{ appLogoUrl?: string }>(appConfigDocRef);
  const appLogoUrl = appConfig?.appLogoUrl;

  useEffect(() => {
    setMounted(true);
  }, []);

  // If we had to fall back to redirect-based sign-in (popup blocked),
  // complete the flow when we return to this page.
  useEffect(() => {
    if (!mounted || !auth) return;
    void (async () => {
      try {
        const res = await getRedirectResult(auth);
        if (!res?.user) return;
        const email = (res.user.email ?? '').trim().toLowerCase();
        const allowed =
          allowedDeveloperEmails.length > 0 ? allowedDeveloperEmails.includes(email) : true;
        toast({
          title: allowed ? 'Google sign-in complete' : 'Google sign-in complete (no dev access)',
          description: allowed
            ? 'Developer mode is now available on this device.'
            : 'This Google account is not on the developer allowlist.',
        });
      } catch (e) {
        // getRedirectResult throws if there was no pending redirect in some environments.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, mounted]);

  const isDeveloperOnly = mode === 'developer-only';

  useEffect(() => {
    if (isDeveloperOnly) return;
    const s = initialSchoolId?.trim().toLowerCase();
    if (s) setSchoolId(s);
  }, [isDeveloperOnly, initialSchoolId]);

  useEffect(() => {
    if (!mounted || !isInitialized || isUserLoading) return;

    const shouldFocusPasscode =
      isDeveloperOnly || isDeveloper || (mode === 'full' && schoolId.trim().length > 0);

    const target = shouldFocusPasscode ? passcodeRef.current : schoolIdRef.current;
    target?.focus();
    target?.select?.();
  }, [isDeveloper, isDeveloperOnly, isInitialized, isUserLoading, mode, mounted, schoolId]);

  // Developer access should only be surfaced on the dedicated `/developer` route (mode: developer-only).
  // The public school login (`/login`) should not expose developer options.
  const allowDeveloperLogin =
    isDeveloperOnly &&
    (process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true' || process.env.NODE_ENV === 'development');

  const allowedDeveloperEmails = (process.env.NEXT_PUBLIC_DEVELOPER_GOOGLE_EMAIL_ALLOWLIST ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const hasGoogleUser =
    !!auth.currentUser &&
    !auth.currentUser.isAnonymous &&
    auth.currentUser.providerData.some((p) => p.providerId === 'google.com');

  const googleEmail = (auth.currentUser?.email ?? '').trim().toLowerCase();
  const isAllowedGoogleEmail =
    hasGoogleUser && allowedDeveloperEmails.length > 0
      ? allowedDeveloperEmails.includes(googleEmail)
      : hasGoogleUser;

  const allowDeveloperToggle = allowDeveloperLogin && isAllowedGoogleEmail;

  useEffect(() => {
    if (isDeveloperOnly) {
      setIsDeveloper(true);
      return;
    }
    if (!allowDeveloperToggle && isDeveloper) setIsDeveloper(false);
  }, [allowDeveloperToggle, isDeveloper, isDeveloperOnly]);

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setIsGoogleSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      // If the app started an anonymous session (normal for this app),
      // link it to Google so the UID stays stable for role provisioning.
      if (auth.currentUser?.isAnonymous) {
        await linkWithPopup(auth.currentUser, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
      playSound('success');
      const email = (auth.currentUser?.email ?? '').trim().toLowerCase();
      const allowed =
        allowedDeveloperEmails.length > 0 ? allowedDeveloperEmails.includes(email) : true;
      toast({
        title: allowed ? 'Google sign-in complete' : 'Google sign-in complete (no dev access)',
        description: allowed
          ? 'Developer mode is now available on this device.'
          : 'This Google account is not on the developer allowlist.',
      });
    } catch (err) {
      const e = err as { code?: string; message?: string };
      const code = String(e?.code ?? '');
      console.error('Google sign-in failed:', err);

      if (code === 'auth/operation-not-allowed') {
        setGoogleSignInBlocked('operation-not-allowed');
        playSound('error');
        toast({
          variant: 'destructive',
          title: 'Google sign-in disabled',
          description:
            'This Firebase project has Google sign-in turned off. Enable it in Firebase Console → Authentication → Sign-in method (Google), then try again.',
        });
        return;
      }

      const shouldRedirect =
        code === 'auth/popup-blocked' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/operation-not-supported-in-this-environment';

      if (shouldRedirect) {
        try {
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          if (auth.currentUser?.isAnonymous) {
            await linkWithRedirect(auth.currentUser, provider);
          } else {
            await signInWithRedirect(auth, provider);
          }
          // The browser will navigate away; no toast needed here.
          return;
        } catch (redirectErr) {
          console.error('Google redirect sign-in failed:', redirectErr);
        }
      }

      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Google sign-in failed',
        description:
          (code ? `${code}: ` : '') +
          (e?.message?.trim() || 'Please try again or check that popups are allowed.'),
      });
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const handleSchoolEntry = async () => {
    const sid = schoolId.trim().toLowerCase();
    if (!sid || !schoolPasscode.trim()) {
      playSound('error');
      triggerShake();
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: 'Please enter a School ID and passcode.',
      });
      return;
    }

    playSound('click');
    const result = await login('school', { schoolId: sid, passcode: schoolPasscode.trim() });
    if (!result) {
      playSound('error');
      triggerShake();
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: 'Invalid School ID or passcode.',
      });
      return;
    }

    playSound('login');
    router.push(`/${sid}/sign-in`);
  };

  const handleDeveloperLogin = async () => {
    if (!schoolPasscode) {
      playSound('error');
      triggerShake();
      toast({
        variant: 'destructive',
        title: 'Developer login failed',
        description: 'Please enter the developer passcode.',
      });
      return;
    }
    const result = await login('developer', { passcode: schoolPasscode });
    if (result) {
      playSound('login');
      if (pathname !== '/developer') {
        router.push('/developer');
      }
    } else {
      playSound('error');
      triggerShake();
      toast({
        variant: 'destructive',
        title: 'Developer login failed',
        description:
          'Wrong passcode, no Firebase user session yet, or Cloud Functions could not add your UID to developerUids (check DEV_PASSCODE matches on Functions).',
      });
      setSchoolPasscode('');
    }
  };

  const handleSampleLogin = async (id: string) => {
    playSound('click');
    const schoolId = id.trim().toLowerCase();

    // Public demos: one callable (`verifySchoolPasscode`) instead of school gate + admin.
    if (isPublicSampleSchoolId(schoolId)) {
      router.prefetch(`/${schoolId}/admin`);
      const adminOk = await login('admin', {
        schoolId,
        passcode: PUBLIC_DEMO_ADMIN_PASSCODE,
      });
      if (adminOk) {
        playSound('login');
        router.push(`/${schoolId}/admin`);
        return;
      }
      const schoolFallback = await login('school', {
        schoolId,
        passcode: SAMPLE_SCHOOL_ACCESS_PASSCODE,
      });
      if (schoolFallback) {
        toast({
          variant: 'destructive',
          title: 'Demo admin unavailable',
          description: 'You can still sign in from the next screen.',
        });
        playSound('login');
        router.push(`/${schoolId}/sign-in`);
        return;
      }
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid School ID or passcode.',
      });
      return;
    }

    const result = await login('school', {
      schoolId,
      passcode: SAMPLE_SCHOOL_ACCESS_PASSCODE,
    });
    if (!result) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid School ID or passcode.',
      });
      return;
    }
    playSound('login');
    router.push(`/${schoolId}/sign-in`);
  };

  if (!mounted || !isInitialized || isUserLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 text-center">
        <div className="animate-pulse mb-4 text-primary font-bold text-xl uppercase tracking-tighter">
          Loading levelUp EDU...
        </div>
        <p className="text-xs text-muted-foreground opacity-60">
          Preparing your school reward experience
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden font-sans flex flex-col items-center justify-center transition-colors duration-500 pb-8">
      <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center">
        <div
          className={cn(
            'w-full rounded-2xl p-8 relative transition-all border bg-card border-border shadow-sm',
            isShaking && 'animate-arcade-shake',
          )}
        >
          <div className="text-center mb-6">
            <Link
              href={getLevelUpLogoHref()}
              className="flex items-center justify-center gap-4 no-underline outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
              aria-label="LevelUp EDU — school sign-in"
            >
              {appLogoUrl ? (
                <div className="h-14 w-14 rounded-2xl overflow-hidden bg-muted border border-border/70 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={appLogoUrl}
                    alt="App logo"
                    className={
                      settings.logoDisplayMode === 'cover'
                        ? 'h-full w-full object-cover'
                        : 'h-full w-full object-contain'
                    }
                  />
                </div>
              ) : (
                <Logo className="h-14 w-auto" />
              )}
              <div className="text-left">
                <h1 className="text-2xl font-bold font-headline text-foreground">levelUp EDU</h1>
                <p className="text-sm text-muted-foreground">School rewards system</p>
              </div>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              {isDeveloperOnly ? (
                <>
                  Enter the developer passcode for system-wide tools. School staff should sign in at{' '}
                  <a href="/login" className="font-medium text-foreground underline underline-offset-2">
                    /login
                  </a>
                  .
                </>
              ) : (
              <>Enter your school&apos;s ID to open sign-in options for students and staff.</>
              )}
            </p>
          </div>

          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (isDeveloperOnly || isDeveloper) void handleDeveloperLogin();
              else void handleSchoolEntry();
            }}
          >
            {!isDeveloperOnly && !isDeveloper && (
              <div className="space-y-2">
                <Label htmlFor="schoolId" className="text-xs font-semibold text-muted-foreground">
                  School ID
                </Label>
                <input
                  id="schoolId"
                  ref={schoolIdRef}
                  className="w-full h-12 rounded-xl px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all font-semibold bg-background border border-border text-foreground placeholder:text-muted-foreground"
                  placeholder="e.g. schoolabc"
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value.trim().toLowerCase())}
                  autoComplete="username"
                />
              </div>
            )}
            {(!isDeveloperOnly && !isDeveloper) && (
              <div className="space-y-2">
                <Label htmlFor="passcode" className="text-xs font-semibold text-muted-foreground">
                  Access Passcode
                </Label>
                <input
                  id="passcode"
                  type="password"
                  ref={passcodeRef}
                  className="w-full h-12 rounded-xl px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all font-mono tracking-[0.35em] text-center bg-background border border-border text-foreground"
                  value={schoolPasscode}
                  onChange={(e) => setSchoolPasscode(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            )}
            {(isDeveloperOnly || isDeveloper) && (
              <div className="space-y-2">
                <Label htmlFor="passcode" className="text-xs font-semibold text-muted-foreground">
                  Developer Passcode
                </Label>
                <input
                  id="passcode"
                  type="password"
                  ref={passcodeRef}
                  className="w-full h-12 rounded-xl px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all font-mono tracking-[0.35em] text-center bg-background border border-border text-foreground"
                  value={schoolPasscode}
                  onChange={(e) => setSchoolPasscode(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            )}

            <div className="pt-4 flex flex-col gap-3">
              <button
                type="submit"
                aria-label={isDeveloperOnly || isDeveloper ? 'Sign in as developer' : 'Sign in to school'}
                className="w-full h-12 font-bold rounded-xl transition-all active:scale-[0.99] bg-primary hover:bg-primary/90 text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {isDeveloperOnly || isDeveloper ? 'Dev Login' : 'Continue'}
              </button>

              {!isDeveloperOnly && allowDeveloperLogin && !hasGoogleUser && (
                <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground">Developer mode locked</p>
                      <p className="mt-1 text-xs text-muted-foreground/80 leading-relaxed">
                        {googleSignInBlocked === 'operation-not-allowed'
                          ? 'Google sign-in is disabled for this Firebase project. Enable Google in Firebase Console → Authentication → Sign-in method.'
                          : 'Sign in with Google to reveal the developer login option on this device.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleGoogleSignIn()}
                      disabled={isGoogleSigningIn || googleSignInBlocked === 'operation-not-allowed'}
                      className={cn(
                        'shrink-0 h-9 px-3 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-xs font-semibold',
                        (isGoogleSigningIn || googleSignInBlocked === 'operation-not-allowed') &&
                          'opacity-60 pointer-events-none',
                      )}
                    >
                      {googleSignInBlocked === 'operation-not-allowed'
                        ? 'Google not enabled'
                        : isGoogleSigningIn
                          ? 'Signing in…'
                          : 'Sign in with Google'}
                    </button>
                  </div>
                </div>
              )}

              {!isDeveloperOnly && allowDeveloperLogin && hasGoogleUser && !isAllowedGoogleEmail && (
                <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Developer mode locked</p>
                  <p className="mt-1 text-xs text-muted-foreground/80 leading-relaxed">
                    Signed in as <span className="font-mono text-foreground">{googleEmail || '(unknown)'}</span>. This Google account is not allowed for developer access.
                  </p>
                </div>
              )}

              {!isDeveloperOnly && allowDeveloperToggle && (
                <div className="flex justify-end text-xs">
                  <button
                    type="button"
                    onClick={() => setIsDeveloper(!isDeveloper)}
                    className="font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:underline"
                  >
                    {isDeveloper ? '← Return to School Login' : 'Developer? Click here'}
                  </button>
                </div>
              )}
            </div>

            {!isDeveloperOnly && !isDeveloper && (
              <details className="mt-2 rounded-xl border border-border/70 bg-background/60 group">
                <summary className="cursor-pointer list-none px-4 py-2.5 text-xs font-semibold text-muted-foreground flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
                  <span>Try a demo school</span>
                  <span className="text-muted-foreground/60 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="px-3 pb-3 pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSampleLogin('schoolabc')}
                    aria-label="Sign in to demo school: School ABC"
                    className="flex-1 h-9 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    School ABC
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSampleLogin('yeshiva')}
                    aria-label="Sign in to demo school: Yeshiva"
                    className="flex-1 h-9 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Yeshiva
                  </button>
                </div>
              </details>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
