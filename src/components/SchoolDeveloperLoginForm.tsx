'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/components/AppProvider';
import { useToast } from '@/hooks/use-toast';
import { useRouter, usePathname } from 'next/navigation';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useSettings } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import Logo from '@/components/Logo';
import { useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';

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
  const [showForgot, setShowForgot] = useState(false);
  const { login, isInitialized, isUserLoading } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const playSound = useArcadeSound();
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(false);

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

  const isDeveloperOnly = mode === 'developer-only';

  useEffect(() => {
    if (isDeveloperOnly) return;
    const s = initialSchoolId?.trim().toLowerCase();
    if (s) setSchoolId(s);
  }, [isDeveloperOnly, initialSchoolId]);

  const allowDeveloperLogin =
    process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true' ||
    process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (isDeveloperOnly) {
      setIsDeveloper(true);
      return;
    }
    if (!allowDeveloperLogin && isDeveloper) setIsDeveloper(false);
  }, [allowDeveloperLogin, isDeveloper, isDeveloperOnly]);

  const handleSchoolLogin = async () => {
    if (!schoolId || !schoolPasscode) {
      playSound('error');
      triggerShake();
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Please enter a School ID and passcode.',
      });
      return;
    }

    playSound('click');
    const result = await login('school', {
      schoolId: schoolId.trim(),
      passcode: schoolPasscode,
    });
    if (result) {
      playSound('login');
      router.push(`/${schoolId.trim()}/portal`);
    } else {
      playSound('error');
      triggerShake();
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid School ID or passcode.',
      });
      setSchoolPasscode('');
    }
  };

  const handleDeveloperLogin = async () => {
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
    const result = await login('school', {
      schoolId: id,
      passcode: '1234',
    });
    if (result) {
      playSound('login');
      router.push(`/${id}/portal`);
    } else {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid School ID or passcode.',
      });
    }
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
            <div className="flex items-center justify-center gap-4">
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
            </div>
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
                <>Sign in with your school&apos;s ID and passcode to manage students, award points, and redeem prizes.</>
              )}
            </p>
          </div>

          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (isDeveloperOnly || isDeveloper) void handleDeveloperLogin();
              else void handleSchoolLogin();
            }}
          >
            {!isDeveloperOnly && !isDeveloper && (
              <div className="space-y-2">
                <Label htmlFor="schoolId" className="text-xs font-semibold text-muted-foreground">
                  School ID
                </Label>
                <input
                  id="schoolId"
                  className="w-full h-12 rounded-xl px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all font-semibold bg-background border border-border text-foreground placeholder:text-muted-foreground"
                  placeholder="e.g. schoolabc"
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value.trim().toLowerCase())}
                  autoComplete="username"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="passcode" className="text-xs font-semibold text-muted-foreground">
                {isDeveloperOnly || isDeveloper ? 'Developer Passcode' : 'Access Passcode'}
              </Label>
              <input
                id="passcode"
                type="password"
                className="w-full h-12 rounded-xl px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all font-mono tracking-[0.35em] text-center bg-background border border-border text-foreground"
                value={schoolPasscode}
                onChange={(e) => setSchoolPasscode(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button
                type="submit"
                aria-label={isDeveloperOnly || isDeveloper ? 'Sign in as developer' : 'Sign in to school'}
                className="w-full h-12 font-bold rounded-xl transition-all active:scale-[0.99] bg-primary hover:bg-primary/90 text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {isDeveloperOnly || isDeveloper ? 'Dev Login' : 'School Login'}
              </button>
              <div className="flex items-center justify-between text-xs">
                {!isDeveloperOnly && !isDeveloper ? (
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:underline"
                  >
                    Forgot passcode?
                  </button>
                ) : (
                  <span />
                )}
                {!isDeveloperOnly && allowDeveloperLogin && (
                  <button
                    type="button"
                    onClick={() => setIsDeveloper(!isDeveloper)}
                    className="font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:underline"
                  >
                    {isDeveloper ? '← Return to School Login' : 'Developer? Click here'}
                  </button>
                )}
              </div>
            </div>

            {showForgot && !isDeveloperOnly && !isDeveloper && (
              <div
                className="mt-2 rounded-xl border border-amber-300/60 bg-amber-50/70 dark:bg-amber-900/20 dark:border-amber-800/50 p-4 text-xs text-amber-900 dark:text-amber-200 leading-relaxed space-y-2"
                role="dialog"
                aria-labelledby="forgot-title"
              >
                <p id="forgot-title" className="font-semibold">
                  Forgot your school passcode?
                </p>
                <p>
                  Contact your school&apos;s developer or system administrator to reset it — for security reasons we
                  can&apos;t reset it from this screen.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="font-semibold underline underline-offset-2 hover:no-underline"
                >
                  Got it
                </button>
              </div>
            )}

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
