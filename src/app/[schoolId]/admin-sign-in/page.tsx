'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';

import { useAppContext } from '@/components/AppProvider';
import { useFirebase } from '@/firebase';
import { useAdminGooglePasscodeBypass } from '@/hooks/useAdminGooglePasscodeBypass';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useToast } from '@/hooks/use-toast';
import { loginSchoolAdmin } from '@/lib/adminGoogleAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Same-school path only; prevents open redirects. */
function destinationAfterAdminLogin(redirectParam: string | null, schoolId: string): string | null {
  if (!redirectParam || !schoolId) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(redirectParam);
  } catch {
    return null;
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('..') || decoded.includes(':')) {
    return null;
  }
  const pathOnly = decoded.split('?')[0] ?? '';
  // Never send a freshly signed-in admin back to the sign-in page (avoids redirect loops).
  if (/\/admin-sign-in\/?$/i.test(pathOnly)) {
    return null;
  }
  const seg = pathOnly.split('/').filter(Boolean)[0]?.toLowerCase();
  if (!seg || seg !== schoolId.trim().toLowerCase()) {
    return null;
  }
  const existingQuery = decoded.includes('?') ? decoded.slice(decoded.indexOf('?') + 1) : '';
  const params = new URLSearchParams(existingQuery);
  // Deep-link admin settings hub only when returning to the admin dashboard (not e.g. `/teacher`).
  if (/\/admin\/?$/i.test(pathOnly)) {
    params.set('settings', 'hub');
  }
  const qs = params.toString();
  return qs ? `${pathOnly}?${qs}` : pathOnly;
}

function AdminSignInLoading() {
  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-8">
      <span className="text-muted-foreground text-sm font-medium flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin shrink-0" aria-hidden />
        Loading…
      </span>
    </div>
  );
}

function AdminSignInContent() {
  const params = useParams<{ schoolId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const playSound = useArcadeSound();
  const { toast } = useToast();
  const { login, isInitialized, schoolId: activeSchoolId, loginState, isAdmin } = useAppContext();
  const { user } = useFirebase();
  const [passcode, setPasscode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const schoolId = useMemo(
    () => (params.schoolId || activeSchoolId || '').trim().toLowerCase(),
    [activeSchoolId, params.schoolId],
  );

  /** Kiosk (student) session should return to redeem — not the portal hub (`/portal`). */
  const backHref = useMemo(() => {
    if (!schoolId) return '/login';
    if (loginState === 'student') return `/${schoolId}/student`;
    return `/${schoolId}/portal`;
  }, [schoolId, loginState]);

  const redirectAfterAdminLogin = useCallback(() => {
    const next = destinationAfterAdminLogin(searchParams.get('redirect'), schoolId);
    router.replace(next ?? `/${schoolId}/admin`);
  }, [router, schoolId, searchParams]);

  const { canBypassAdminPasscode, isAutoLoggingIn } = useAdminGooglePasscodeBypass({
    schoolId,
    onSuccess: redirectAfterAdminLogin,
    onError: (message) => {
      playSound('error');
      toast({ variant: 'destructive', title: 'Admin sign-in failed', description: message });
    },
  });

  useEffect(() => {
    if (!isInitialized || !isAdmin || !schoolId) return;
    redirectAfterAdminLogin();
  }, [isAdmin, isInitialized, redirectAfterAdminLogin, schoolId]);

  const handleSubmit = async () => {
    if (!schoolId) return;
    setIsSubmitting(true);
    try {
      const authResult = await loginSchoolAdmin(login, user, schoolId, passcode);
      if (!authResult.ok && !passcode.trim()) {
        playSound('error');
        toast({
          variant: 'destructive',
          title: 'Missing passcode',
          description: authResult.message,
        });
        return;
      }
      if (!authResult.ok) {
        playSound('error');
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: authResult.message,
        });
        setPasscode('');
        return;
      }
      playSound('login');
      redirectAfterAdminLogin();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isInitialized || isAutoLoggingIn || (canBypassAdminPasscode && !isAdmin)) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-8">
        <Button disabled variant="ghost" size="lg" className="text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
          {canBypassAdminPasscode ? 'Signing in with Google…' : 'Loading…'}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-t-8 border-primary shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-8 w-8" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-black tracking-tight">Admin sign-in</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (isSubmitting) return;
              playSound('click');
              void handleSubmit();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="passcode" className="text-xs font-semibold text-muted-foreground">
                Admin passcode
              </Label>
              <Input
                id="passcode"
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="h-12 rounded-xl font-mono tracking-[0.35em] text-center"
                autoComplete="current-password"
                autoFocus
              />
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl font-black" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <Button variant="outline" className="w-full h-12 rounded-xl font-bold" asChild>
            <Link href={backHref} onClick={() => playSound('click')}>
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back
            </Link>
          </Button>


        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminSignInPage() {
  return (
    <Suspense fallback={<AdminSignInLoading />}>
      <AdminSignInContent />
    </Suspense>
  );
}
