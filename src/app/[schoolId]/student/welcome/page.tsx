'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';

import dynamic from 'next/dynamic';
// 122 KB — 30 style themes + palettes. Lazy-loaded while SchoolGate renders.
const WelcomeGreeting = dynamic(
  () => import('@/components/WelcomeGreeting').then(m => m.WelcomeGreeting),
  { ssr: false, loading: () => <div className="animate-pulse h-96 w-full rounded-xl bg-muted/40" /> },
);
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useStudentKioskSession } from '@/components/providers/StudentKioskSessionProvider';
import { SchoolGate } from '@/components/SchoolGate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Student } from '@/lib/types';
import {
  STUDENT_WELCOME_STYLES_LIVE,
  schoolAllowsStudentWelcome,
  studentAllowsWelcomePage,
  welcomeGreetingStyleStorageKey,
} from '@/lib/studentWelcome';
import { getStudentNickname } from '@/lib/utils';

export default function StudentWelcomePage() {
  const params = useParams<{ schoolId: string }>();
  const routeSchoolId = typeof params.schoolId === 'string' ? params.schoolId : '';
  const { schoolId: ctxSchoolId, loginState, isInitialized } = useAppContext();
  const schoolId = ctxSchoolId || routeSchoolId;
  const { settings } = useSettings();
  const { activeStudentId } = useStudentKioskSession();
  const firestore = useFirestore();

  const studentRef = useMemoFirebase(
    () =>
      firestore && schoolId && activeStudentId
        ? doc(firestore, 'schools', schoolId, 'students', activeStudentId)
        : null,
    [firestore, schoolId, activeStudentId],
  );
  const { data: student, isLoading } = useDoc<Student>(studentRef);

  const kioskHref = schoolId ? `/${schoolId}/student` : '/login';

  if (!isInitialized || !['student', 'teacher', 'admin', 'school', 'developer'].includes(loginState)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (!schoolId) {
    return null;
  }

  if (!STUDENT_WELCOME_STYLES_LIVE) {
    return (
      <SchoolGate>
        <div className="mx-auto max-w-lg px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" aria-hidden />
                Welcome styles
              </CardTitle>
              <CardDescription>Coming soon. Check back later for animated welcome themes on the kiosk.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={kioskHref}>
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
                  Back to kiosk
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </SchoolGate>
    );
  }

  if (!schoolAllowsStudentWelcome(settings)) {
    return (
      <SchoolGate>
        <div className="mx-auto max-w-lg px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" aria-hidden />
                Welcome styles
              </CardTitle>
              <CardDescription>This experience is turned off in school settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={kioskHref}>
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
                  Back to kiosk
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </SchoolGate>
    );
  }

  if (!activeStudentId) {
    return (
      <SchoolGate>
        <div className="mx-auto max-w-lg px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Sign in first</CardTitle>
              <CardDescription>Scan or enter your student ID on the kiosk, then open Welcome styles again.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="rounded-xl">
                <Link href={kioskHref}>Go to student kiosk</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </SchoolGate>
    );
  }

  if (isLoading || !student) {
    return (
      <SchoolGate>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">Loading profile…</p>
        </div>
      </SchoolGate>
    );
  }

  if (!studentAllowsWelcomePage(student)) {
    return (
      <SchoolGate>
        <div className="mx-auto max-w-lg px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Not available</CardTitle>
              <CardDescription>
                The welcome style page is turned off for your account. Ask a teacher or admin if you think this is a mistake.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={kioskHref}>
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
                  Back to kiosk
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </SchoolGate>
    );
  }

  const displayName = [getStudentNickname(student), student.lastName].filter(Boolean).join(' ').trim() || student.firstName;
  const persistKey = welcomeGreetingStyleStorageKey(schoolId, activeStudentId);

  return (
    <SchoolGate>
      <div className="border-b border-border/40 bg-background/95 px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="rounded-xl font-bold">
            <Link href={kioskHref}>
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
              Back
            </Link>
          </Button>
          <p className="truncate text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Pick your welcome style
          </p>
          <span className="w-16 shrink-0" aria-hidden />
        </div>
      </div>
      <WelcomeGreeting
        name={displayName}
        initialStyleId={student.welcomeGreetingStyleId || settings.defaultWelcomeGreetingStyleId || undefined}
        persistStyleStorageKey={persistKey}
      />
    </SchoolGate>
  );
}
