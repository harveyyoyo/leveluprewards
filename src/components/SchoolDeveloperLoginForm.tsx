'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/components/AppProvider';
import { useToast } from '@/hooks/use-toast';
import { useRouter, usePathname } from 'next/navigation';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useSettings } from '@/components/providers/SettingsProvider';
import { isPublicSampleSchoolId } from '@/lib/sampleSchools';
import { isAllowedDeveloperGoogleUser } from '@/lib/developerAccess';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { getLevelUpLogoHref, APP_NAME, APP_TAGLINE } from '@/lib/appBranding';
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
import { Loader2 } from 'lucide-react';

/** Set before Google redirect sign-in so we only auto-complete developer login when intended. */
const PENDING_DEVELOPER_LOGIN_KEY = 'levelup:pendingDeveloperLogin';

export type SchoolDeveloperLoginFormMode = 'full' | 'developer-only';

export type SchoolDeveloperLoginFormProps = {
  /** `full` = school sign-in + optional developer toggle (public `/login`). `developer-only` = Google sign-in for `/developer`. */
  mode?: SchoolDeveloperLoginFormMode;
  /** Prefill School ID (e.g. from `/login?school=` after a gated route redirect). */
  initialSchoolId?: string;
};

export function SchoolDeveloperLoginForm({ mode = 'full', initialSchoolId }: SchoolDeveloperLoginFormProps) {
  const [schoolId, setSchoolId] = useState('');
  const [schoolPasscode, setSchoolPasscode] = useState('');
  const [developerPasscode, setDeveloperPasscode] = useState('');
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [googleSignInBlocked, setGoogleSignInBlocked] = useState<null | 'operation-not-allowed'>(
    null,
  );
  const schoolIdRef = useRef<HTMLInputElement | null>(null);
  const passcodeRef = useRef<HTMLInputElement | null>(null);
  const lastAutoFocusedRef = useRef<null | 'schoolId' | 'passcode'>(null);
  const developerAutoLoginAttemptedRef = useRef(false);
  const schoolLoginIntentRef = useRef(false);
  const { login, isInitialized, isUserLoading, loginState } = useAppContext();
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

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  const shouldCompleteDeveloperLogin = () =>
    isDeveloperOnly ||
    (typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem(PENDING_DEVELOPER_LOGIN_KEY) === 'true');

  const clearPendingDeveloperLogin = () => {
    try {
      sessionStorage.removeItem(PENDING_DEVELOPER_LOGIN_KEY);
    } catch {
      // ignore
    }
  };

  const markPendingDeveloperLogin = () => {
    try {
      sessionStorage.setItem(PENDING_DEVELOPER_LOGIN_KEY, 'true');
    } catch {
      // ignore
    }
  };

  // If we had to fall back to redirect-based sign-in (popup blocked),
  // complete the flow when we return to this page — only for explicit developer intent.
  useEffect(() => {
    if (!mounted || !auth) return;
    void (async () => {
      try {
        const res = await getRedirectResult(auth);
        if (!res?.user) return;
        const allowed = isAllowedDeveloperGoogleUser(res.user);
        const pendingDeveloper = shouldCompleteDeveloperLogin();
        toast({
          title: allowed ? 'Google sign-in complete' : 'Google sign-in complete (no dev access)',
          description: allowed
            ? pendingDeveloper
              ? 'Finishing developer sign-in…'
              : 'Developer mode is available if you switch to developer login.'
            : 'This Google account is not on the developer allowlist.',
        });
        if (allowed && pendingDeveloper) {
          clearPendingDeveloperLogin();
          setIsSubmitting(true);
          try {
            const loginRes = await login('developer', {});
            if (loginRes.ok) {
              playSound('login');
              if (pathname !== '/developer') {
                router.push('/developer');
              }
            }
          } finally {
            setIsSubmitting(false);
          }
        } else {
          clearPendingDeveloperLogin();
        }
      } catch (e) {
        // getRedirectResult throws if there was no pending redirect in some environments.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, mounted]);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    const onSessionSyncFailed = () => {
      playSound('error');
      triggerShake();
      toast({
        variant: 'destructive',
        title: 'Secure session could not start',
        description:
          'Your passcode was accepted, but the server could not open the portal session. Please try again or contact support.',
      });
    };

    window.addEventListener('levelup:session-sync-failed', onSessionSyncFailed);
    return () => window.removeEventListener('levelup:session-sync-failed', onSessionSyncFailed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, playSound, toast]);

  const isDeveloperOnly = mode === 'developer-only';

  useEffect(() => {
    if (isDeveloperOnly) return;
    const s = initialSchoolId?.trim().toLowerCase();
    if (s) setSchoolId(s);
  }, [isDeveloperOnly, initialSchoolId]);

  useEffect(() => {
    if (!mounted || !isInitialized || isUserLoading) return;

    // Only auto-advance focus to passcode when the School ID was *prefilled* (e.g. via `?school=`).
    // Never auto-focus on every keystroke (it will keep selecting the field and feel like typing is broken).
    const shouldFocusPasscode =
      isDeveloperOnly || isDeveloper || (mode === 'full' && !!initialSchoolId?.trim() && schoolId.trim().length > 0);

    const desired: 'schoolId' | 'passcode' = shouldFocusPasscode ? 'passcode' : 'schoolId';
    if (lastAutoFocusedRef.current === desired) return;

    const target = desired === 'passcode' ? passcodeRef.current : schoolIdRef.current;
    if (!target) return;

    // Only select when we intentionally moved focus (prefill/toggle) — not while the user is typing.
    target.focus();
    if (desired === 'passcode') target.select?.();
    lastAutoFocusedRef.current = desired;
  }, [isDeveloper, isDeveloperOnly, initialSchoolId, isInitialized, isUserLoading, mode, mounted, schoolId]);

  // `/developer` is always allowed to complete Google + developer login (email allowlist + addDeveloperMe gate access).
  // `NEXT_PUBLIC_ENABLE_DEV_LOGIN` only controls whether `/login` shows the optional developer toggle.
  const allowDeveloperLogin =
    isDeveloperOnly ||
    (process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true' || process.env.NODE_ENV === 'development');

  const hasGoogleUser =
    !!auth.currentUser &&
    !auth.currentUser.isAnonymous &&
    auth.currentUser.providerData.some((p) => p.providerId === 'google.com');

  const googleEmail = (auth.currentUser?.email ?? '').trim().toLowerCase();
  const isAllowedGoogleEmail = isAllowedDeveloperGoogleUser(auth.currentUser);

  const allowDeveloperToggle = allowDeveloperLogin && isAllowedGoogleEmail;

  useEffect(() => {
    if (isDeveloperOnly) {
      setIsDeveloper(true);
      return;
    }
    if (!allowDeveloperToggle && isDeveloper) setIsDeveloper(false);
  }, [allowDeveloperToggle, isDeveloper, isDeveloperOnly]);
  // Auto-log into developer mode only when the user explicitly chose developer login
  // (`/developer` or the "Developer? Click here" toggle). Never hijack school sign-in.
  useEffect(() => {
    if (!mounted || !isInitialized || isUserLoading) return;
    if (loginState === 'developer' || loginState === 'school') return;
    if (schoolLoginIntentRef.current) return;
    if (!isDeveloperOnly && !isDeveloper) return;
    if (!allowDeveloperLogin || !isAllowedGoogleEmail) return;
    if (isSubmitting || developerAutoLoginAttemptedRef.current) return;

    developerAutoLoginAttemptedRef.current = true;
    setIsSubmitting(true);
    void (async () => {
      try {
        const result = await login('developer', {});
        if (schoolLoginIntentRef.current) return;
        try {
          if (localStorage.getItem('loginState') === 'school') return;
        } catch {
          // ignore
        }
        if (result.ok) {
          playSound('login');
          if (pathname !== '/developer') {
            router.push('/developer');
          }
        } else {
          developerAutoLoginAttemptedRef.current = false;
          playSound('error');
          triggerShake();
          toast({
            variant: 'destructive',
            title: 'Developer sign-in failed',
            description: result.message,
          });
        }
      } finally {
        setIsSubmitting(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mounted,
    isInitialized,
    isUserLoading,
    loginState,
    allowDeveloperLogin,
    isAllowedGoogleEmail,
    isDeveloperOnly,
    isDeveloper,
  ]);


  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setIsGoogleSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      // If the app started an anonymous session (normal for this app),
      // link it to Google so the UID stays stable for role provisioning.
      const result = auth.currentUser?.isAnonymous
        ? await linkWithPopup(auth.currentUser, provider).catch((linkErr) => {
            const code = String((linkErr as { code?: string })?.code ?? '');
            if (code === 'auth/credential-already-in-use') {
              return signInWithPopup(auth, provider);
            }
            throw linkErr;
          })
        : await signInWithPopup(auth, provider);
      playSound('success');
      const allowed = isAllowedDeveloperGoogleUser(result.user);
      toast({
        title: allowed ? 'Google sign-in complete' : 'Google sign-in complete (no dev access)',
        description: allowed
          ? 'Developer mode is now available on this device.'
          : 'This Google account is not on the developer allowlist.',
      });
      if (allowed && (isDeveloperOnly || isDeveloper)) {
        developerAutoLoginAttemptedRef.current = true;
        setIsSubmitting(true);
        try {
          const loginRes = await login('developer', {});
          if (loginRes.ok) {
            playSound('login');
            if (pathname !== '/developer') {
              router.push('/developer');
            }
          } else {
            developerAutoLoginAttemptedRef.current = false;
            playSound('error');
            triggerShake();
            toast({
              variant: 'destructive',
              title: 'Developer sign-in failed',
              description: loginRes.message,
            });
          }
        } finally {
          setIsSubmitting(false);
        }
      }
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
          if (isDeveloperOnly || isDeveloper) {
            markPendingDeveloperLogin();
          }
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

  const allowDevPasscodeLogin = process.env.NODE_ENV === 'development';

  const handleDeveloperPasscodeLogin = async () => {
    if (isSubmitting) return;
    if (!developerPasscode.trim()) {
      playSound('error');
      triggerShake();
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: 'Enter the local developer passcode (DEV_DEVELOPER_PASSCODE in .env.local).',
      });
      return;
    }
    playSound('click');
    setIsSubmitting(true);
    try {
      const result = await login('developer', { passcode: developerPasscode.trim() });
      if (!result.ok) {
        playSound('error');
        triggerShake();
        toast({
          variant: 'destructive',
          title: 'Developer sign-in failed',
          description: result.message,
        });
        return;
      }
      playSound('login');
      if (pathname !== '/developer') {
        router.push('/developer');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSchoolEntry = async () => {
    if (isSubmitting) return;
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
    schoolLoginIntentRef.current = true;
    clearPendingDeveloperLogin();
    setIsSubmitting(true);
    try {
      const result = await login('school', { schoolId: sid, passcode: schoolPasscode.trim() });
      if (!result.ok) {
        playSound('error');
        triggerShake();
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: result.message,
        });
        return;
      }

      playSound('login');
      router.push(`/${sid}/portal`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSampleLogin = async (id: string) => {
    playSound('click');
    const schoolId = id.trim().toLowerCase();

    // Demo schools should log in like any other school (user must enter the passcode).
    // The buttons just make it easy to pick a known School ID.
    if (isPublicSampleSchoolId(schoolId)) {
      setSchoolId(schoolId);
      setSchoolPasscode('');
      // Focus will naturally shift to the passcode input via the existing autofocus effect.
      toast({
        title: 'Demo school selected',
        description: 'Enter the school passcode to continue.',
      });
      return;
    }
  };

  if (!mounted || !isInitialized || isUserLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 text-center">
        <div className="animate-pulse mb-4 text-primary font-bold text-xl uppercase tracking-tighter">
          Loading {APP_NAME}…
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
              aria-label={`${APP_NAME} — school sign-in`}
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
                <h1 className="text-2xl font-bold font-headline text-foreground">{APP_NAME}</h1>
                <p className="text-sm text-muted-foreground">{APP_TAGLINE}</p>
              </div>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              {isDeveloperOnly ? (
                <>
                  {allowDevPasscodeLogin ? (
                    <>
                      Sign in with a local developer passcode (no Google) or your allowed Google account.
                      School staff should use{' '}
                    </>
                  ) : (
                    <>
                      Sign in with your allowed Google account for system-wide tools. School staff should use{' '}
                    </>
                  )}
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
              if (isDeveloperOnly || isDeveloper) {
                if (allowDevPasscodeLogin && developerPasscode.trim()) {
                  void handleDeveloperPasscodeLogin();
                  return;
                }
                if (!isAllowedGoogleEmail) void handleGoogleSignIn();
                return;
              }
              void handleSchoolEntry();
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
            {(isDeveloperOnly || isDeveloper) && allowDevPasscodeLogin && (
              <div className="space-y-2">
                <Label htmlFor="developerPasscode" className="text-xs font-semibold text-muted-foreground">
                  Local developer passcode
                </Label>
                <input
                  id="developerPasscode"
                  type="password"
                  className="w-full h-12 rounded-xl px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all font-mono tracking-[0.2em] text-center bg-background border border-border text-foreground"
                  value={developerPasscode}
                  onChange={(e) => setDeveloperPasscode(e.target.value)}
                  autoComplete="off"
                  placeholder="No Google account needed"
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
            <div className="pt-4 flex flex-col gap-3">
              {(isSubmitting || isGoogleSigningIn) && (isDeveloperOnly || isDeveloper) ? (
                <div className="text-center bg-primary/10 border border-primary/20 text-primary rounded-xl p-4 flex flex-col items-center gap-2 font-semibold text-sm animate-pulse">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Initializing developer portal session…</span>
                </div>
              ) : (isDeveloperOnly || isDeveloper) && hasGoogleUser && !isAllowedGoogleEmail ? null : (
                <button
                  type="submit"
                  aria-label={
                    isDeveloperOnly || isDeveloper
                      ? allowDevPasscodeLogin && developerPasscode.trim()
                        ? 'Sign in with developer passcode'
                        : 'Sign in with Google'
                      : 'Sign in to school'
                  }
                  disabled={isSubmitting || isGoogleSigningIn}
                  className="w-full h-12 font-bold rounded-xl transition-all active:scale-[0.99] bg-primary hover:bg-primary/90 text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-70 inline-flex items-center justify-center gap-2"
                >
                  {(isSubmitting || isGoogleSigningIn) && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  {isSubmitting || isGoogleSigningIn
                    ? 'Signing in...'
                    : isDeveloperOnly || isDeveloper
                      ? allowDevPasscodeLogin && developerPasscode.trim()
                        ? 'Sign in with passcode'
                        : 'Sign in with Google'
                      : 'Continue'}
                </button>
              )}

              {allowDeveloperLogin && !hasGoogleUser && !isDeveloperOnly && (
                <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground">Developer mode locked</p>
                      <p className="mt-1 text-xs text-muted-foreground/80 leading-relaxed">
                        {googleSignInBlocked === 'operation-not-allowed'
                          ? 'Google sign-in is disabled for this Firebase project. Enable Google in Firebase Console → Authentication → Sign-in method.'
                          : 'Sign in with Google to use developer tools on this device.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleGoogleSignIn()}
                      disabled={isGoogleSigningIn || googleSignInBlocked === 'operation-not-allowed'}
                      className={cn(
                        'shrink-0 h-9 px-3 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-xs font-semibold inline-flex items-center justify-center',
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

              {allowDeveloperLogin && hasGoogleUser && !isAllowedGoogleEmail && (
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
                    aria-label="Sign in to demo school: Yeshiva Demo"
                    className="flex-1 h-9 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Yeshiva Demo
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
