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
import { isGoogleSignedInUser } from '@/lib/google/googleSchoolAccess';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Logo from '@/components/logos/Logo';
import { getLevelUpLogoHref, APP_NAME, APP_TAGLINE } from '@/lib/appBranding';
import { useFirestore, useMemoFirebase, useDoc, useFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import {
  GoogleAuthProvider,
  linkWithPopup,
  linkWithRedirect,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import {
  clearGoogleRedirectAttempt,
  clearPendingGoogleRedirect,
  markGoogleRedirectAttempt,
  markPendingGoogleRedirect,
  PENDING_DEVELOPER_LOGIN_KEY,
  shouldThrottleGoogleRedirect,
} from '@/lib/google/googleAuthRedirect';
import { refreshGoogleIdToken } from '@/lib/google/googleAuthSession';
import {
  googleOAuthRedirectMismatchHint,
  isGoogleOAuthRedirectMismatchError,
} from '@/lib/google/googleOAuthSetupHint';
import { navigateAfterSchoolLogin } from '@/lib/auth/syncFirebaseSessionCookie';
import { useTranslation } from '@/components/providers/LocaleProvider';

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
  const [googleSchoolLoginError, setGoogleSchoolLoginError] = useState<string | null>(null);
  const [googleSignInBlocked, setGoogleSignInBlocked] = useState<null | 'operation-not-allowed'>(
    null,
  );
  const schoolIdRef = useRef<HTMLInputElement | null>(null);
  const passcodeRef = useRef<HTMLInputElement | null>(null);
  const lastAutoFocusedRef = useRef<null | 'schoolId' | 'passcode'>(null);
  const developerAutoLoginAttemptedRef = useRef(false);
  const developerLoginCompletedUidRef = useRef<string | null>(null);
  const schoolLoginIntentRef = useRef(false);
  const { login, isInitialized, isUserLoading, loginState } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const playSound = useArcadeSound();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const { auth, user: firebaseUser } = useFirebase();

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

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    const onSessionSyncFailed = () => {
      playSound('error');
      triggerShake();
      toast({
        variant: 'destructive',
        title: t('auth.sessionFailedTitle'),
        description: t('auth.sessionFailedDescription'),
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
    !!firebaseUser &&
    !firebaseUser.isAnonymous &&
    firebaseUser.providerData.some((p) => p.providerId === 'google.com');

  const googleEmail = (firebaseUser?.email ?? '').trim().toLowerCase();
  const isAllowedGoogleEmail = isAllowedDeveloperGoogleUser(firebaseUser);

  const allowDeveloperToggle = allowDeveloperLogin && isAllowedGoogleEmail;

  useEffect(() => {
    if (isDeveloperOnly) {
      setIsDeveloper(true);
      return;
    }
    if (!allowDeveloperToggle && isDeveloper) setIsDeveloper(false);
  }, [allowDeveloperToggle, isDeveloper, isDeveloperOnly]);
  const completeDeveloperLogin = async (options?: { force?: boolean }) => {
    if (!firebaseUser || !allowDeveloperLogin || !isAllowedGoogleEmail) return;
    if (!isDeveloperOnly && !isDeveloper) return;
    if (
      !options?.force &&
      loginState === 'developer' &&
      developerLoginCompletedUidRef.current === firebaseUser.uid
    ) {
      return;
    }
    if (!options?.force && (isSubmitting || developerAutoLoginAttemptedRef.current)) return;

    developerAutoLoginAttemptedRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await login('developer', {});
      if (schoolLoginIntentRef.current) return;
      try {
        if (localStorage.getItem('loginState') === 'school') return;
      } catch {
        // ignore
      }
      if (result.ok) {
        developerLoginCompletedUidRef.current = firebaseUser.uid;
        clearPendingGoogleRedirect();
        clearGoogleRedirectAttempt();
        playSound('login');
        if (pathname !== '/developer') {
          router.push('/developer');
        }
      } else {
        developerAutoLoginAttemptedRef.current = false;
        clearPendingGoogleRedirect();
        clearGoogleRedirectAttempt();
        playSound('error');
        triggerShake();
        toast({
          variant: 'destructive',
          title: t('auth.developerSignInFailed'),
          description: result.message,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Finish developer login when Google auth is ready (popup or redirect).
  // FirebaseProvider consumes getRedirectResult first; we watch `firebaseUser` instead.
  useEffect(() => {
    if (!mounted || !isInitialized || isUserLoading || !firebaseUser) return;
    if (loginState === 'school') return;
    if (schoolLoginIntentRef.current) return;
    if (!isDeveloperOnly && !isDeveloper) return;
    if (!allowDeveloperLogin || !isAllowedGoogleEmail) return;
    const pendingDeveloper = shouldCompleteDeveloperLogin();
    if (!isDeveloperOnly && !pendingDeveloper) return;
    void completeDeveloperLogin();
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
    firebaseUser,
  ]);

  useEffect(() => {
    setGoogleSchoolLoginError(null);
  }, [schoolId]);

  const handleDeveloperPrimaryAction = () => {
    if (allowDevPasscodeLogin && developerPasscode.trim()) {
      void handleDeveloperPasscodeLogin();
      return;
    }
    if (isAllowedGoogleEmail) {
      void completeDeveloperLogin({ force: true });
      return;
    }
    void handleGoogleSignIn();
  };

  const handleGoogleSignIn = async () => {
    if (!auth) {
      toast({
        variant: 'destructive',
        title: t('auth.googleUnavailable'),
        description: 'Firebase auth is still loading. Wait a moment and try again.',
      });
      return;
    }
    developerAutoLoginAttemptedRef.current = false;
    setIsGoogleSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();

      // Only force account picker when switching from a non-allowed Google account.
      // Otherwise, let Google reuse the existing session to avoid repeated sign-in prompts.
      const needsAccountSwitch = hasGoogleUser && !isAllowedGoogleEmail;
      if (needsAccountSwitch) {
        provider.setCustomParameters({ prompt: 'select_account' });
        await signOut(auth);
      }

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
      await refreshGoogleIdToken(result.user);
      clearGoogleRedirectAttempt();
      playSound('success');
      const allowed = isAllowedDeveloperGoogleUser(result.user);
      toast({
        title: allowed ? t('auth.googleComplete') : t('auth.googleCompleteNoAccess'),
        description: allowed
          ? 'Developer mode is now available on this device.'
          : 'This Google account is not on the developer allowlist.',
      });
      if (allowed && (isDeveloperOnly || isDeveloper)) {
        await completeDeveloperLogin({ force: true });
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
          title: t('auth.googleDisabled'),
          description:
            'This Firebase project has Google sign-in turned off. Enable it in Firebase Console → Authentication → Sign-in method (Google), then try again.',
        });
        return;
      }

      if (isGoogleOAuthRedirectMismatchError(err)) {
        playSound('error');
        toast({
          variant: 'destructive',
          title: t('auth.googleRedirectMismatch'),
          description: googleOAuthRedirectMismatchHint(),
        });
        return;
      }

      const shouldRedirect =
        code === 'auth/popup-blocked' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/operation-not-supported-in-this-environment';

      if (shouldRedirect) {
        if (shouldThrottleGoogleRedirect()) {
          playSound('error');
          toast({
            variant: 'destructive',
            title: t('auth.googleStillStarting'),
            description:
              'Wait a few seconds for the previous Google redirect to finish, or refresh the page and try again.',
          });
          return;
        }
        try {
          markPendingGoogleRedirect();
          markGoogleRedirectAttempt();
          const provider = new GoogleAuthProvider();
          // Only force account picker for redirect when switching accounts
          if (hasGoogleUser && !isAllowedGoogleEmail) {
            provider.setCustomParameters({ prompt: 'select_account' });
          }
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
        title: t('auth.googleFailed'),
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
        title: t('common.loginFailed'),
        description: t('auth.developerPasscodeRequired'),
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
          title: t('auth.developerSignInFailed'),
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

  /** Password managers can fill the input without firing React `onChange`; read the DOM as fallback. */
  const resolveSchoolPasscode = () => {
    const fromState = schoolPasscode.trim();
    if (fromState) return fromState;
    const fromDom = passcodeRef.current?.value?.trim() ?? '';
    if (fromDom && fromDom !== schoolPasscode) {
      setSchoolPasscode(fromDom);
    }
    return fromDom;
  };

  const passcodeFieldVisible = !hasGoogleUser || !!googleSchoolLoginError;

  const handleSchoolEntry = async () => {
    if (isSubmitting) return;
    const sid = schoolId.trim().toLowerCase();
    const passcode = resolveSchoolPasscode();
    if (!sid) {
      playSound('error');
      triggerShake();
      toast({
        variant: 'destructive',
        title: t('common.loginFailed'),
        description: t('auth.enterSchoolId'),
      });
      return;
    }
    if (!passcode && !hasGoogleUser) {
      playSound('error');
      triggerShake();
      toast({
        variant: 'destructive',
        title: t('common.loginFailed'),
        description: t('auth.enterSchoolIdAndPasscode'),
      });
      return;
    }
    if (!passcode && passcodeFieldVisible) {
      passcodeRef.current?.focus();
      playSound('error');
      triggerShake();
      toast({
        variant: 'destructive',
        title: t('common.loginFailed'),
        description: t('auth.enterSchoolPasscode'),
      });
      return;
    }

    playSound('click');
    schoolLoginIntentRef.current = true;
    clearPendingGoogleRedirect();
    if (!hasGoogleUser) {
      setGoogleSchoolLoginError(null);
    }
    setIsSubmitting(true);
    try {
      const result = await login('school', { schoolId: sid, passcode });
      if (!result.ok) {
        if (hasGoogleUser) {
          setGoogleSchoolLoginError(result.message);
          window.setTimeout(() => passcodeRef.current?.focus(), 0);
        }
        playSound('error');
        triggerShake();
        toast({
          variant: 'destructive',
          title: t('common.loginFailed'),
          description: result.message,
        });
        return;
      }

      playSound('login');
      if (!auth) {
        toast({
          variant: 'destructive',
          title: t('auth.sessionFailedTitle'),
          description: 'Firebase auth is still loading. Refresh the page and try again.',
        });
        return;
      }
      const navigated = await navigateAfterSchoolLogin(auth, sid);
      if (!navigated) {
        playSound('error');
        triggerShake();
        toast({
          variant: 'destructive',
          title: t('auth.sessionFailedTitle'),
          description:
            'Your school was accepted, but this browser could not open a secure session. Please try again.',
        });
      }
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
        title: t('auth.demoSchoolSelected'),
        description: t('auth.demoSchoolPasscodeHint'),
      });
      return;
    }
  };

  if (!mounted || !isInitialized || isUserLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 text-center">
        <div className="animate-pulse mb-4 text-primary font-bold text-xl uppercase tracking-tighter">
          {t('auth.loadingApp', { appName: APP_NAME })}
        </div>
        <p className="text-xs text-muted-foreground opacity-60">
          {t('auth.preparingExperience')}
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
              aria-label={t('auth.schoolSignInAria', { appName: APP_NAME })}
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
                  {allowDevPasscodeLogin ? t('auth.developerOnlyPasscodeHint') : t('auth.developerOnlyGoogleHint')}
                  <a href="/login" className="font-medium text-foreground underline underline-offset-2">
                    /login
                  </a>
                  .
                </>
              ) : (
              <>{t('auth.enterSchoolIdHint')}</>
              )}
            </p>
          </div>

          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (isDeveloperOnly || isDeveloper) {
                handleDeveloperPrimaryAction();
                return;
              }
              void handleSchoolEntry();
            }}
          >
            {!isDeveloperOnly && !isDeveloper && (
              <div className="space-y-2">
                <Label htmlFor="schoolId" className="text-xs font-semibold text-muted-foreground">
                  {t('auth.schoolId')}
                </Label>
                <input
                  id="schoolId"
                  ref={schoolIdRef}
                  className="w-full h-12 rounded-xl px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all font-semibold bg-background border border-border text-foreground placeholder:text-muted-foreground"
                  placeholder={t('auth.schoolIdPlaceholder')}
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value.trim().toLowerCase())}
                  autoComplete="username"
                />
              </div>
            )}
            {(isDeveloperOnly || isDeveloper) && allowDevPasscodeLogin && (
              <div className="space-y-2">
                <Label htmlFor="developerPasscode" className="text-xs font-semibold text-muted-foreground">
                  {t('auth.developerPasscode')}
                </Label>
                <input
                  id="developerPasscode"
                  type="password"
                  className="w-full h-12 rounded-xl px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all font-mono tracking-[0.2em] text-center bg-background border border-border text-foreground"
                  value={developerPasscode}
                  onChange={(e) => setDeveloperPasscode(e.target.value)}
                  autoComplete="off"
                  placeholder={t('auth.passcodePlaceholder')}
                />
              </div>
            )}
            {(!isDeveloperOnly && !isDeveloper) && (
              hasGoogleUser && !googleSchoolLoginError ? (
                <p className="text-xs text-muted-foreground leading-relaxed rounded-xl border border-border/70 bg-background/60 px-4 py-3">
                  {t('auth.signedInAsGoogle')}{' '}
                  <span className="font-mono text-foreground">{googleEmail || t('auth.yourAccount')}</span>.
                  {isAllowedGoogleEmail
                    ? ` ${t('auth.developerNoPasscode')}`
                    : ` ${t('auth.schoolAccessNoPasscode')}`}
                </p>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="passcode" className="text-xs font-semibold text-muted-foreground">
                    {t('auth.accessPasscode')}
                  </Label>
                  {googleSchoolLoginError && (
                    <p className="text-xs text-muted-foreground leading-relaxed rounded-xl border border-border/70 bg-background/60 px-4 py-3">
                      {t('auth.googleNoSchoolAccess', { email: googleEmail || t('auth.yourAccount') })}
                    </p>
                  )}
                  <input
                    id="passcode"
                    name="school-access-passcode"
                    type="password"
                    ref={passcodeRef}
                    className="w-full h-12 rounded-xl px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all font-mono tracking-[0.35em] text-center bg-background border border-border text-foreground"
                    value={schoolPasscode}
                    onChange={(e) => setSchoolPasscode(e.target.value)}
                    onInput={(e) => setSchoolPasscode(e.currentTarget.value)}
                    autoComplete="off"
                    inputMode="numeric"
                  />
                </div>
              )
            )}
            <div className="pt-4 flex flex-col gap-3">
              {(isSubmitting || isGoogleSigningIn) && (isDeveloperOnly || isDeveloper) ? (
                <div className="text-center bg-primary/10 border border-primary/20 text-primary rounded-xl p-4 flex flex-col items-center gap-2 font-semibold text-sm animate-pulse">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{t('auth.initializingDeveloper')}</span>
                </div>
              ) : (isDeveloperOnly || isDeveloper) && hasGoogleUser && !isAllowedGoogleEmail ? null : (
                <button
                  type={isDeveloperOnly || isDeveloper ? 'button' : 'submit'}
                  onClick={
                    isDeveloperOnly || isDeveloper
                      ? () => handleDeveloperPrimaryAction()
                      : undefined
                  }
                  aria-label={
                    isDeveloperOnly || isDeveloper
                      ? allowDevPasscodeLogin && developerPasscode.trim()
                        ? t('auth.signInDeveloperPasscode')
                        : isAllowedGoogleEmail
                          ? t('auth.continueDeveloperPortal')
                          : t('auth.signInWithGoogle')
                      : t('auth.signInToSchool')
                  }
                  disabled={isSubmitting || isGoogleSigningIn}
                  className="w-full h-12 font-bold rounded-xl transition-all active:scale-[0.99] bg-primary hover:bg-primary/90 text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-70 inline-flex items-center justify-center gap-2"
                >
                  {(isSubmitting || isGoogleSigningIn) && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  {isSubmitting || isGoogleSigningIn
                    ? t('auth.signingIn')
                    : isDeveloperOnly || isDeveloper
                      ? allowDevPasscodeLogin && developerPasscode.trim()
                        ? t('auth.signInWithPasscode')
                        : isAllowedGoogleEmail
                          ? t('auth.continueDeveloperPortal')
                          : t('auth.signInWithGoogle')
                      : t('auth.continue')}
                </button>
              )}

              {allowDeveloperLogin && !hasGoogleUser && !isDeveloperOnly && (
                <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground">{t('auth.developerModeLocked')}</p>
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
                        ? t('auth.googleNotEnabled')
                        : isGoogleSigningIn
                          ? t('auth.signingIn')
                          : t('auth.signInWithGoogle')}
                    </button>
                  </div>
                </div>
              )}

              {allowDeveloperLogin && hasGoogleUser && !isAllowedGoogleEmail && (
                <div className="rounded-xl border border-border/70 bg-background/60 p-3 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">{t('auth.developerModeLocked')}</p>
                    <p className="mt-1 text-xs text-muted-foreground/80 leading-relaxed">
                      {t('auth.googleNotAllowed', { email: googleEmail || '(unknown)' })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleGoogleSignIn()}
                    disabled={isGoogleSigningIn}
                    className="w-full h-10 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-xs font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isGoogleSigningIn ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        {t('auth.openingGoogle')}
                      </>
                    ) : (
                      t('auth.useDifferentGoogleAccount')
                    )}
                  </button>
                </div>
              )}

              {!isDeveloperOnly && allowDeveloperToggle && (
                <div className="flex justify-end text-xs">
                  <button
                    type="button"
                    onClick={() => setIsDeveloper(!isDeveloper)}
                    className="font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:underline"
                  >
                    {isDeveloper ? t('auth.returnToSchoolLogin') : t('auth.developerClickHere')}
                  </button>
                </div>
              )}
            </div>

            {!isDeveloperOnly && !isDeveloper && (
              <details className="mt-2 rounded-xl border border-border/70 bg-background/60 group">
                <summary className="cursor-pointer list-none px-4 py-2.5 text-xs font-semibold text-muted-foreground flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
                  <span>{t('auth.tryDemoSchool')}</span>
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
