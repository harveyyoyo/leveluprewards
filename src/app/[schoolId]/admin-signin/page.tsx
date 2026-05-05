'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';

import { useAppContext } from '@/components/AppProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminSignInPage() {
  const params = useParams<{ schoolId: string }>();
  const router = useRouter();
  const playSound = useArcadeSound();
  const { toast } = useToast();
  const { login, isInitialized, schoolId: activeSchoolId } = useAppContext();
  const [passcode, setPasscode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const schoolId = useMemo(
    () => (params.schoolId || activeSchoolId || '').trim().toLowerCase(),
    [activeSchoolId, params.schoolId],
  );

  const handleSubmit = async () => {
    if (!schoolId || !passcode.trim()) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Missing passcode',
        description: 'Enter the admin passcode to continue.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const ok = await login('admin', { schoolId, passcode: passcode.trim() });
      if (!ok) {
        playSound('error');
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: 'Incorrect passcode.',
        });
        setPasscode('');
        return;
      }
      playSound('login');
      router.replace(`/${schoolId}/admin`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-8">
        <Button disabled variant="ghost" size="lg" className="text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
          Loading...
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
            <CardDescription>Enter the admin passcode for this school.</CardDescription>
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
            <Link href={`/${schoolId}/sign-in`} onClick={() => playSound('click')}>
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back
            </Link>
          </Button>


        </CardContent>
      </Card>
    </div>
  );
}
