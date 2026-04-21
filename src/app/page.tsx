'use client';
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/components/AppProvider';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useSettings } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import Logo from '@/components/Logo';
import { useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';

export default function LoginPage() {
  const [schoolId, setSchoolId] = useState('');
  const [schoolPasscode, setSchoolPasscode] = useState('');
  const [isDeveloper, setIsDeveloper] = useState(false);
  const { login, isInitialized, isUserLoading } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();
  const playSound = useArcadeSound();
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(false);

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

  // Safe access to settings
  const isGraphic = settings?.graphicMode === 'graphics';
  const displayMode = settings?.displayMode || 'web';
  // NEXT_PUBLIC_* is inlined at build time — for deployed apps, set the env before `next build`.
  // Local `next dev` always shows the toggle so `.env.local` is not required for development.
  const allowDeveloperLogin =
    process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true' ||
    process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (!allowDeveloperLogin && isDeveloper) setIsDeveloper(false);
  }, [allowDeveloperLogin, isDeveloper]);

  const handleSchoolLogin = async () => {
    if (!schoolId || !schoolPasscode) {
      playSound('error');
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
    if (result.ok) {
      playSound('login');
      router.push(`/${schoolId.trim()}/portal`);
    } else {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: result.message,
      });
      setSchoolPasscode('');
    }
  };

  const handleDeveloperLogin = async () => {
    const result = await login('developer', { passcode: schoolPasscode });
    if (result.ok) {
      playSound('login');
      router.push('/developer');
    } else {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: result.message,
      });
      setSchoolPasscode('');
    }
  };

  const handleSampleLogin = async (id: string) => {
    playSound('click');
    const result = await login('school', {
      schoolId: id,
      passcode: '1234', // All sample schools use this passcode
    });
    if (result.ok) {
      playSound('login');
      router.push(`/${id}/portal`);
    } else {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: result.message,
      });
    }
  };

  // Prevent hydration mismatch and wait for auth to be ready
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
    <div className={cn(
      "min-h-screen relative overflow-hidden font-sans flex flex-col items-center justify-center transition-colors duration-500",
      displayMode === 'app' ? 'pb-8' : 'pb-8'
    )}>

      <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center">

        <div className={cn(
          "w-full rounded-2xl p-8 relative transition-all border bg-card border-border shadow-sm"
        )}>
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4">
              {appLogoUrl ? (
                <div className="h-14 w-14 rounded-2xl overflow-hidden bg-muted border border-border/70 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={appLogoUrl} alt="App logo" className={settings.logoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'} />
                </div>
              ) : (
                <Logo className="h-14 w-auto" />
              )}
              <div className="text-left">
                <h1 className="text-2xl font-bold font-headline text-foreground">
                  levelUp EDU
                </h1>
                <p className="text-sm text-muted-foreground">
                  School login
                </p>
              </div>
            </div>
          </div>

          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (isDeveloper) void handleDeveloperLogin();
              else void handleSchoolLogin();
            }}
          >
            {!isDeveloper && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleSampleLogin('schoolabc')}
                  className="flex-1 h-10 rounded-xl border border-border bg-background hover:bg-muted transition-colors text-xs font-semibold"
                >
                  Demo: School ABC
                </button>
                <button
                  type="button"
                  onClick={() => void handleSampleLogin('yeshiva')}
                  className="flex-1 h-10 rounded-xl border border-border bg-background hover:bg-muted transition-colors text-xs font-semibold"
                >
                  Demo: Yeshiva
                </button>
              </div>
            )}
            {!isDeveloper && (
              <div className="space-y-2">
                <Label htmlFor="schoolId" className="text-xs font-semibold text-muted-foreground">School ID</Label>
                <input
                  id="schoolId"
                  className="w-full h-12 rounded-xl px-4 focus:outline-none focus:ring-2 transition-all font-semibold bg-background border border-border text-foreground placeholder:text-muted-foreground focus:ring-primary/20"
                  placeholder="e.g. schoolabc"
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value.trim().toLowerCase())}
                  autoComplete="username"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="passcode" className="text-xs font-semibold text-muted-foreground">
                {isDeveloper ? 'Developer Passcode' : 'Access Passcode'}
              </Label>
              <input
                id="passcode"
                type="password"
                className="w-full h-12 rounded-xl px-4 focus:outline-none focus:ring-2 transition-all font-mono tracking-[0.35em] text-center bg-background border border-border text-foreground focus:ring-primary/20"
                value={schoolPasscode}
                onChange={(e) => setSchoolPasscode(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button
                type="submit"
                className="w-full h-12 font-bold rounded-xl transition-all active:scale-[0.99] bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isDeveloper ? 'Dev Login' : 'School Login'}
              </button>
              {allowDeveloperLogin && (
                <button
                  type="button"
                  onClick={() => setIsDeveloper(!isDeveloper)}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {isDeveloper ? '← Return to School Login' : 'Developer? Click here'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
