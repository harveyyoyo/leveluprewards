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
import { loginSchoolAdmin } from '@/lib/adminGoogleAccess';
import { isGoogleSignedInUser } from '@/lib/google/googleSchoolAccess';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Logo from '@/components/logos/Logo';
import { getLevelUpLogoHref, APP_NAME, APP_TAGLINE } from '@/lib/appBranding';
import { useFirestore, useMemoFirebase, useDoc, useFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import {
  GoogleAuthProvider,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import { Loader2, Keyboard } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  canUseGoogleRedirectSignIn,
  consumeGoogleRedirectFailedNotice,
  googleRedirectRecoveryHint,
  isGoogleRedirectStateLostError,
} from '@/lib/google/googleAuthEnvironment';
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
import { AlphanumericKeyboard } from '@/components/ui/AlphanumericKeyboard';
import { NumericKeypad } from '@/components/ui/NumericKeypad';
import { useTranslation } from '@/components/providers/LocaleProvider';

export type SchoolDeveloperLoginFormMode = 'full' | 'developer-only';

export type SchoolDeveloperLoginFormProps = {
  /** `full` = school sign-in + optional developer toggle (public `/login`). `developer-only` = Google sign-in for `/developer`. */
  mode?: SchoolDeveloperLoginFormMode;
  /** Prefill School ID (e.g. from `/login?school=` after a gated route redirect). */
  initialSchoolId?: string;
  /** Shareable library sign-in: blank school box, then open that school's library. */
  libraryLogin?: boolean;
};

export function SchoolDeveloperLoginForm({
  mode = 'full',
  initialSchoolId,
  libraryLogin = false,
}: SchoolDeveloperLoginFormProps) {
  const [schoolId, setSchoolId] = useState('');
  const [schoolPasscode, setSchoolPasscode] = useState('');
  const [developerPasscode, setDeveloperPasscode] = useState('');
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginPhase, setLoginPhase] = useState<'idle' | 'verifying' | 'session'>('idle');
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
  const adminSchoolAutoResolveAttemptedRef = useRef<string | null>(null);
  const [isResolvingAdminSchool, setIsResolvingAdminSchool] = useState(false);
  const [matchedSchools, setMatchedSchools] = useState<Array<{ id: string; name: string }>>([]);
  const [showManualSchoolEntry, setShowManualSchoolEntry] = useState(false);
  const { login, isInitialized, isUserLoading, loginState } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const playSound = useArcadeSound();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const { auth, user: firebaseUser } = useFirebase();

  const [activeField, setActiveField] = useState<'schoolId' | 'passcode' | null>(null);

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
    if (!consumeGoogleRedirectFailedNotice()) return;

    playSound('error');
    toast({
      variant: 'destructive',
      title: 'Google sign-in could not finish',
      description: googleRedirectRecoveryHint(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

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
    if (libraryLogin) {
      setSchoolId('');
      return;
    }
    const s = initialSchoolId?.trim().toLowerCase();
    if (s) setSchoolId(s);
  }, [isDeveloperOnly, initialSchoolId, libraryLogin]);

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

  // Google accounts listed on a school's adminEmails see those schools as buttons
  // instead of typing a School ID.
  useEffect(() => {
    if (isDeveloperOnly || libraryLogin) return;
    if (!mounted || !isInitialized || isUserLoading) return;
    if (!hasGoogleUser || !firebaseUser) return;
    if (isAllowedGoogleEmail) return; // Owner/developer keeps the manual school picker.
    if (adminSchoolAutoResolveAttemptedRef.current === firebaseUser.uid) return;
    adminSchoolAutoResolveAttemptedRef.current = firebaseUser.uid;

    void (async () => {
      setIsResolvingAdminSchool(true);
      try {
        const token = await firebaseUser.getIdToken();
        const res = await fetch('/api/auth/resolve-admin-school', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          schools?: Array<{ id?: string; name?: string }>;
          schoolId?: string | null;
        };
        const schools = Array.isArray(data.schools)
          ? data.schools
              .map((school) => ({
                id: typeof school.id === 'string' ? school.id.trim().toLowerCase() : '',
                name:
                  typeof school.name === 'string' && school.name.trim()
                    ? school.name.trim()
                    : typeof school.id === 'string'
                      ? school.id
                      : '',
              }))
              .filter((school) => school.id)
          : data.schoolId
            ? [{ id: data.schoolId.trim().toLowerCase(), name: data.schoolId.trim().toLowerCase() }]
            : [];
        setMatchedSchools(schools);
        if (schools.length > 0) {
          setShowManualSchoolEntry(false);
        }
      } catch {
        // Best-effort convenience — silently fall back to the manual school picker.
      } finally {
        setIsResolvingAdminSchool(false);
      }
    })();
  }, [
    isDeveloperOnly,
    libraryLogin,
    mounted,
    isInitialized,
    isUserLoading,
    hasGoogleUser,
    firebaseUser,
    isAllowedGoogleEmail,
  ]);

  const enterMatchedSchool = async (sid: string) => {
    if (isSubmitting || !sid.trim()) return;
    const cleanId = sid.trim().toLowerCase();
    playSound('click');
    schoolLoginIntentRef.current = true;
    clearPendingGoogleRedirect();
    setGoogleSchoolLoginError(null);
    setIsSubmitting(true);
    setLoginPhase('verifying');
    try {
      const schoolResult = await login('school', { schoolId: cleanId, passcode: '' });
      if (!schoolResult.ok) {
        setGoogleSchoolLoginError(schoolResult.message);
        playSound('error');
        triggerShake();
        toast({
          variant: 'destructive',
          title: t('common.loginFailed'),
          description: schoolResult.message,
        });
        return;
      }

      const adminResult = await loginSchoolAdmin(login, firebaseUser, cleanId, '');
      if (!adminResult.ok) {
        // School access worked; land on the portal chooser if admin login is unavailable.
        playSound('login');
        if (!auth) return;
        setLoginPhase('session');
        const navigated = await navigateAfterSchoolLogin(auth, cleanId);
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
        return;
      }

      playSound('login');
      router.replace(`/${cleanId}/admin`);
    } finally {
      setIsSubmitting(false);
      setLoginPhase('idle');
    }
  };

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
    if (schoolLoginIntentRef.current) return;
    if (!isDeveloperOnly && !isDeveloper) return;
    if (!allowDeveloperLogin || !isAllowedGoogleEmail) return;
    const pendingDeveloper = shouldCompleteDeveloperLogin();
    if (!isDeveloperOnly && !pendingDeveloper) return;
    // School chooser sessions are normal here (/developer or after Google redirect).
    // Only skip auto-login when a school passcode submit is in flight on /login.
    if (loginState === 'school' && !isDeveloperOnly && !pendingDeveloper) return;
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

  const handleGoogleSignOut = async () => {
    if (!auth) return;
    setIsGoogleSigningIn(true);
    try {
      playSound('swoosh');
      clearPendingGoogleRedirect();
      clearGoogleRedirectAttempt();
      await signOut(auth);
      try {
        await signInAnonymously(auth);
      } catch (anonErr) {
        console.warn('Anonymous sign-in after Google sign-out failed:', anonErr);
      }
      developerLoginCompletedUidRef.current = null;
      developerAutoLoginAttemptedRef.current = false;
      adminSchoolAutoResolveAttemptedRef.current = null;
      setMatchedSchools([]);
      setShowManualSchoolEntry(false);
      toast({
        title: t('auth.signedOutOfGoogleTitle'),
        description: t('auth.signedOutOfGoogleDescription'),
      });
    } catch (err) {
      console.error('Google sign-out failed:', err);
      playSound('error');
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: (err as Error)?.message || 'Could not sign out. Please try again.',
      });
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const handleGoogleSignIn = async (options?: { promptSelectAccount?: boolean }) => {
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

      // Only force account picker when switching from a non-allowed Google account or explicitly requested.
      // Otherwise, let Google reuse the existing session to avoid repeated sign-in prompts.
      const needsAccountSwitch = options?.promptSelectAccount || (hasGoogleUser && !isAllowedGoogleEmail);
      if (needsAccountSwitch) {
        provider.setCustomParameters({ prompt: 'select_account' });
        await signOut(auth);
      }

      let result: { user: User };
      try {
        result = await signInWithPopup(auth, provider);
      } catch (popupErr) {
        const pCode = String((popupErr as { code?: string })?.code ?? '');
        const isBlocked =
          pCode === 'auth/popup-blocked' ||
          pCode === 'auth/operation-not-supported-in-this-environment';

        if (isBlocked && canUseGoogleRedirectSignIn()) {
          if (shouldThrottleGoogleRedirect()) {
            playSound('error');
            toast({
              variant: 'destructive',
              title: t('auth.googleStillStarting'),
              description:
                'Wait a few seconds for the previous Google sign-in attempt to finish, or refresh the page and try again.',
            });
            return;
          }
          markPendingGoogleRedirect();
          markGoogleRedirectAttempt();
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupErr;
      }

      await refreshGoogleIdToken(result.user);
      clearGoogleRedirectAttempt();
      playSound('success');
      const allowed = isAllowedDeveloperGoogleUser(result.user);
      if (isDeveloperOnly || isDeveloper) {
        toast({
          title: allowed ? t('auth.googleComplete') : t('auth.googleCompleteNoAccess'),
          description: allowed
            ? 'Developer mode is now available on this device.'
            : 'This Google account is not on the developer allowlist.',
        });
        if (allowed) {
          await completeDeveloperLogin({ force: true });
        }
      } else {
        toast({
          title: t('auth.googleComplete'),
          description: schoolId.trim()
            ? t('auth.schoolAccessNoPasscode')
            : t('auth.googleSchoolReadyHint'),
        });
      }
    } catch (err) {
      const e = err as { code?: string; message?: string };
      const code = String(e?.code ?? '');
      if (code === 'auth/popup-closed-by-user') {
        return;
      }
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

      if (isGoogleRedirectStateLostError(err)) {
        clearPendingGoogleRedirect();
        clearGoogleRedirectAttempt();
        playSound('error');
        toast({
          variant: 'destructive',
          title: 'Google sign-in could not finish',
          description: googleRedirectRecoveryHint(),
        });
        return;
      }

      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        playSound('error');
        toast({
          variant: 'destructive',
          title: 'Google sign-in needs a full browser',
          description: googleRedirectRecoveryHint(),
        });
        return;
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
    setLoginPhase('verifying');
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
      setLoginPhase('session');
      try {
        const prefix = `lvlup:login-next:${sid}`;
        for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
          const key = sessionStorage.key(i);
          if (key?.startsWith(prefix)) sessionStorage.removeItem(key);
        }
      } catch {
        // ignore
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
      setLoginPhase('idle');
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

  const showMatchedSchoolPicker =
    !isDeveloperOnly &&
    !isDeveloper &&
    hasGoogleUser &&
    !isAllowedGoogleEmail &&
    matchedSchools.length > 0 &&
    !showManualSchoolEntry &&
    !googleSchoolLoginError;

  const isWideLayout = !isDeveloperOnly;

  const renderHelpers = () => (
    <>
      {allowDeveloperLogin && !hasGoogleUser && !isDeveloperOnly && (
        <div className="rounded-xl border border-border/70 bg-background/60 p-3.5">
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
        <div className="rounded-xl border border-border/70 bg-background/60 p-3.5 space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">{t('auth.developerModeLocked')}</p>
            <p className="mt-1 text-xs text-muted-foreground/80 leading-relaxed">
              {t('auth.googleNotAllowed', { email: googleEmail || '(unknown)' })}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void handleGoogleSignIn({ promptSelectAccount: true })}
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
            <button
              type="button"
              onClick={() => void handleGoogleSignOut()}
              disabled={isGoogleSigningIn}
              className="w-full h-7 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors disabled:opacity-50"
            >
              {t('auth.signOutGoogle')}
            </button>
          </div>
        </div>
      )}

      {(isDeveloperOnly || isDeveloper) && hasGoogleUser && isAllowedGoogleEmail && (
        <div className="rounded-xl border border-border/70 bg-background/60 p-3 space-y-2 text-center">
          <p className="text-xs text-muted-foreground">
            {t('auth.signedInAsGoogle')}{' '}
            <span className="font-mono font-medium text-foreground">{googleEmail}</span>
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void handleGoogleSignOut()}
              disabled={isGoogleSigningIn}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors disabled:opacity-50"
            >
              {t('auth.signOutGoogle')}
            </button>
            <span className="text-muted-foreground/40 text-xs">·</span>
            <button
              type="button"
              onClick={() => void handleGoogleSignIn({ promptSelectAccount: true })}
              disabled={isGoogleSigningIn}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors disabled:opacity-50"
            >
              {t('auth.useDifferentGoogleAccount')}
            </button>
          </div>
        </div>
      )}

      {!isDeveloperOnly && allowDeveloperToggle && (
        <div className="flex justify-start text-xs pt-1">
          <button
            type="button"
            onClick={() => setIsDeveloper(!isDeveloper)}
            className="font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:underline"
          >
            {isDeveloper ? t('auth.returnToSchoolLogin') : t('auth.developerClickHere')}
          </button>
        </div>
      )}

      {!isDeveloperOnly && !isDeveloper && (
        <div className="rounded-xl border border-border/70 bg-background/60 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground">{t('auth.tryDemoSchool')}</span>
            <span className="text-[11px] text-muted-foreground">
              Passcode: <strong className="font-mono text-foreground">1234</strong>
            </span>
          </div>
          <div className="flex gap-2">
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
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen relative overflow-hidden font-sans flex flex-col items-center justify-center transition-colors duration-500 p-4 sm:p-6 md:p-8">
      <div
        className={cn(
          'relative z-10 w-full flex flex-col items-center transition-all',
          isWideLayout ? 'max-w-md md:max-w-4xl lg:max-w-5xl' : 'max-w-md',
        )}
      >
        <div
          className={cn(
            'w-full rounded-2xl p-6 sm:p-8 md:p-10 relative transition-all border bg-card border-border shadow-sm',
            isShaking && 'animate-arcade-shake',
          )}
        >
          {isWideLayout ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
              {/* Left Column: Branding, Guidance & Helpers */}
              <div className="flex flex-col justify-between h-full space-y-6 md:border-r md:border-border/50 md:pr-10">
                <div className="space-y-4">
                  <Link
                    href={getLevelUpLogoHref()}
                    className="flex items-center justify-center md:justify-start gap-4 no-underline outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
                    aria-label={t('auth.schoolSignInAria', { appName: APP_NAME })}
                  >
                    {appLogoUrl ? (
                      <div className="h-14 w-14 rounded-2xl overflow-hidden bg-muted border border-border/70 flex items-center justify-center shrink-0">
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
                      <Logo className="h-14 w-auto shrink-0" />
                    )}
                    <div className="text-left">
                      <h1 className="text-2xl font-bold font-headline text-foreground">{APP_NAME}</h1>
                      <p className="text-sm text-muted-foreground">{APP_TAGLINE}</p>
                    </div>
                  </Link>
                  <p className="text-center md:text-left text-sm text-muted-foreground leading-relaxed">
                    {libraryLogin ? t('auth.enterLibrarySchoolIdHint') : t('auth.enterSchoolIdHint')}
                  </p>
                </div>

                {/* On desktop: show demo schools and developer helpers here */}
                <div className="hidden md:flex flex-col space-y-3 pt-4">
                  {renderHelpers()}
                </div>
              </div>

              {/* Right Column: Interactive Login Form */}
              <div className="flex flex-col justify-center space-y-6 md:pl-2">
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
                      {isResolvingAdminSchool ? (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                          {t('auth.checkingYourSchools')}
                        </p>
                      ) : null}

                      {showMatchedSchoolPicker ? (
                        <motion.div
                          className="space-y-3"
                          initial="hidden"
                          animate="show"
                          variants={{
                            hidden: { opacity: 0 },
                            show: {
                              opacity: 1,
                              transition: { staggerChildren: 0.08, delayChildren: 0.05 },
                            },
                          }}
                        >
                          <div className="rounded-xl border border-border/70 bg-background/60 px-4 py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {t('auth.signedInAsGoogle')}{' '}
                                <span className="font-mono text-foreground font-semibold truncate inline-block max-w-full align-bottom">
                                  {googleEmail || t('auth.yourAccount')}
                                </span>
                                . {t('auth.pickSchoolBelow')}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleGoogleSignOut()}
                              disabled={isGoogleSigningIn}
                              className="shrink-0 text-xs font-semibold text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors disabled:opacity-50"
                            >
                              {t('auth.signOutGoogle')}
                            </button>
                          </div>
                          <Label className="text-xs font-semibold text-muted-foreground">
                            {matchedSchools.length === 1
                              ? t('auth.yourSchool')
                              : t('auth.chooseYourSchool')}
                          </Label>
                          {matchedSchools.map((school) => (
                            <motion.button
                              key={school.id}
                              type="button"
                              layoutId={`google-school-${school.id}`}
                              variants={{
                                hidden: { opacity: 0, y: 10 },
                                show: {
                                  opacity: 1,
                                  y: 0,
                                  transition: { type: 'spring', stiffness: 380, damping: 28 },
                                },
                              }}
                              onClick={() => void enterMatchedSchool(school.id)}
                              disabled={isSubmitting || isGoogleSigningIn}
                              className="w-full h-12 rounded-xl border border-border bg-background hover:bg-muted transition-colors text-sm font-semibold text-foreground px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 inline-flex items-center justify-between gap-3"
                            >
                              <span className="truncate">{school.name}</span>
                              <span className="shrink-0 text-xs font-mono text-muted-foreground">
                                {school.id}
                              </span>
                            </motion.button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setShowManualSchoolEntry(true)}
                            className="text-xs font-semibold text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                          >
                            {t('auth.useDifferentSchool')}
                          </button>
                        </motion.div>
                      ) : (
                        <>
                          <Label htmlFor="schoolId" className="text-xs font-semibold text-muted-foreground">
                            {t('auth.schoolId')}
                          </Label>
                          <div className="flex gap-2 items-center">
                            <input
                              id="schoolId"
                              ref={schoolIdRef}
                              className="flex-1 h-12 rounded-xl px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all font-semibold bg-background border border-border text-foreground placeholder:text-muted-foreground"
                              placeholder={t('auth.schoolIdPlaceholder')}
                              value={schoolId}
                              onChange={(e) => setSchoolId(e.target.value.trim().toLowerCase())}
                              autoComplete="username"
                            />
                            <button
                              type="button"
                              title="Toggle onscreen keyboard"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setActiveField(activeField === 'schoolId' ? null : 'schoolId');
                                schoolIdRef.current?.focus();
                              }}
                              className={cn(
                                'h-12 w-12 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0',
                                activeField === 'schoolId' && 'bg-primary/10 border-primary text-primary',
                              )}
                            >
                              <Keyboard className="h-5 w-5" />
                            </button>
                          </div>
                          {matchedSchools.length > 0 && showManualSchoolEntry ? (
                            <button
                              type="button"
                              onClick={() => setShowManualSchoolEntry(false)}
                              className="text-xs font-semibold text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                            >
                              {t('auth.backToYourSchools')}
                            </button>
                          ) : null}
                        </>
                      )}
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

                  {!isDeveloperOnly && !isDeveloper && !showMatchedSchoolPicker && (
                    hasGoogleUser && !googleSchoolLoginError ? (
                      <div className="rounded-xl border border-border/70 bg-background/60 px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {t('auth.signedInAsGoogle')}{' '}
                            <span className="font-mono text-foreground font-semibold truncate inline-block max-w-full align-bottom">
                              {googleEmail || t('auth.yourAccount')}
                            </span>
                            .{' '}
                            {isAllowedGoogleEmail
                              ? ` ${t('auth.developerNoPasscode')}`
                              : ` ${t('auth.schoolAccessNoPasscode')}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleGoogleSignOut()}
                          disabled={isGoogleSigningIn}
                          className="shrink-0 text-xs font-semibold text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors disabled:opacity-50"
                        >
                          {t('auth.signOutGoogle')}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="passcode" className="text-xs font-semibold text-muted-foreground">
                          {t('auth.accessPasscode')}
                        </Label>
                        {googleSchoolLoginError && (
                          <p className="text-xs text-muted-foreground leading-relaxed rounded-xl border border-border/70 bg-background/60 px-4 py-3">
                            {t('auth.googleNoSchoolAccess', {
                              email: googleEmail || t('auth.yourAccount'),
                            })}
                          </p>
                        )}
                        <div className="flex gap-2 items-center">
                          <input
                            id="passcode"
                            name="school-access-passcode"
                            type="password"
                            ref={passcodeRef}
                            className="flex-1 h-12 rounded-xl px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all font-mono tracking-[0.35em] text-center bg-background border border-border text-foreground"
                            value={schoolPasscode}
                            onChange={(e) => setSchoolPasscode(e.target.value)}
                            onInput={(e) => setSchoolPasscode(e.currentTarget.value)}
                            autoComplete="off"
                            inputMode="numeric"
                          />
                          <button
                            type="button"
                            title="Toggle onscreen numeric keypad"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setActiveField(activeField === 'passcode' ? null : 'passcode');
                              passcodeRef.current?.focus();
                            }}
                            className={cn(
                              'h-12 w-12 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0',
                              activeField === 'passcode' && 'bg-primary/10 border-primary text-primary',
                            )}
                          >
                            <Keyboard className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    )
                  )}

                  <div className="pt-2 flex flex-col gap-3">
                    {(isSubmitting || isGoogleSigningIn) && (isDeveloperOnly || isDeveloper) ? (
                      <div className="text-center bg-primary/10 border border-primary/20 text-primary rounded-xl p-4 flex flex-col items-center gap-2 font-semibold text-sm animate-pulse">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>{t('auth.initializingDeveloper')}</span>
                      </div>
                    ) : showMatchedSchoolPicker ? (
                      isSubmitting ? (
                        <div className="text-center bg-primary/10 border border-primary/20 text-primary rounded-xl p-4 flex flex-col items-center gap-2 font-semibold text-sm animate-pulse">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>{t('auth.signingIn')}</span>
                        </div>
                      ) : null
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
                            : libraryLogin
                              ? t('auth.openTheLibrary')
                              : t('auth.signInToSchool')
                        }
                        disabled={isSubmitting || isGoogleSigningIn}
                        className="w-full h-12 font-bold rounded-xl transition-all active:scale-[0.99] bg-primary hover:bg-primary/90 text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-70 inline-flex items-center justify-center gap-2"
                      >
                        {(isSubmitting || isGoogleSigningIn) && (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        )}
                        {isSubmitting || isGoogleSigningIn
                          ? loginPhase === 'session'
                            ? libraryLogin
                              ? t('auth.openingLibrary')
                              : 'Opening your school portal…'
                            : loginPhase === 'verifying'
                              ? 'Verifying school…'
                              : t('auth.signingIn')
                          : isDeveloperOnly || isDeveloper
                            ? allowDevPasscodeLogin && developerPasscode.trim()
                              ? t('auth.signInWithPasscode')
                              : isAllowedGoogleEmail
                                ? t('auth.continueDeveloperPortal')
                                : t('auth.signInWithGoogle')
                            : libraryLogin
                              ? t('auth.openTheLibrary')
                              : t('auth.continue')}
                      </button>
                    )}

                    {!isDeveloperOnly && !isDeveloper && !hasGoogleUser && googleSignInBlocked !== 'operation-not-allowed' && (
                      <motion.div
                        className="space-y-3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      >
                        <div className="flex items-center gap-3" aria-hidden>
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {t('auth.orUseGoogle')}
                          </span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleGoogleSignIn()}
                          disabled={isGoogleSigningIn}
                          className="w-full h-12 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-sm font-semibold inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
                        >
                          {isGoogleSigningIn ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                              {t('auth.openingGoogle')}
                            </>
                          ) : (
                            t('auth.signInWithGoogle')
                          )}
                        </button>
                      </motion.div>
                    )}
                  </div>
                </form>

                {/* On mobile: Helpers appear below the main login form */}
                <div className="flex md:hidden flex-col space-y-3 pt-2 border-t border-border/40">
                  {renderHelpers()}
                </div>
              </div>

              {/* Onscreen Keyboard / Keypad - spans both columns across bottom */}
              {activeField && (
                <div className="col-span-1 md:col-span-2 pt-4 border-t border-border/40 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  {activeField === 'schoolId' && (
                    <AlphanumericKeyboard
                      value={schoolId}
                      onChange={(val) => setSchoolId(val.toLowerCase())}
                    />
                  )}
                  {activeField === 'passcode' && (
                    <NumericKeypad
                      value={schoolPasscode}
                      onChange={(val) => setSchoolPasscode(val)}
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Developer-only compact layout */
            <div>
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
                  {allowDevPasscodeLogin
                    ? t('auth.developerOnlyPasscodeHint')
                    : t('auth.developerOnlyGoogleHint')}
                  <a href="/login" className="font-medium text-foreground underline underline-offset-2">
                    /login
                  </a>
                  .
                </p>
              </div>

              <form
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleDeveloperPrimaryAction();
                }}
              >
                {allowDevPasscodeLogin && (
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

                <div className="pt-4 flex flex-col gap-3">
                  {(isSubmitting || isGoogleSigningIn) ? (
                    <div className="text-center bg-primary/10 border border-primary/20 text-primary rounded-xl p-4 flex flex-col items-center gap-2 font-semibold text-sm animate-pulse">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>{t('auth.initializingDeveloper')}</span>
                    </div>
                  ) : hasGoogleUser && !isAllowedGoogleEmail ? null : (
                    <button
                      type="button"
                      onClick={() => handleDeveloperPrimaryAction()}
                      aria-label={
                        allowDevPasscodeLogin && developerPasscode.trim()
                          ? t('auth.signInDeveloperPasscode')
                          : isAllowedGoogleEmail
                            ? t('auth.continueDeveloperPortal')
                            : t('auth.signInWithGoogle')
                      }
                      disabled={isSubmitting || isGoogleSigningIn}
                      className="w-full h-12 font-bold rounded-xl transition-all active:scale-[0.99] bg-primary hover:bg-primary/90 text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-70 inline-flex items-center justify-center gap-2"
                    >
                      {(isSubmitting || isGoogleSigningIn) && (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      )}
                      {allowDevPasscodeLogin && developerPasscode.trim()
                        ? t('auth.signInWithPasscode')
                        : isAllowedGoogleEmail
                          ? t('auth.continueDeveloperPortal')
                          : t('auth.signInWithGoogle')}
                    </button>
                  )}

                  {renderHelpers()}
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
