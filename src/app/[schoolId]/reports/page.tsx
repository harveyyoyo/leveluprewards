'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { collection, doc } from 'firebase/firestore';
import { FileText, Loader2, LogOut } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import type { Category, Class, Coupon, Prize, Student, Teacher } from '@/lib/types';

type SchoolDoc = {
  name?: string;
};

const SchoolReportsPanel = dynamic(
  () =>
    import('@/components/reports/SchoolReportsPanel')
      .then((module) => module.SchoolReportsPanel)
      .catch((err) => {
        if (typeof window !== 'undefined' && (err.message?.includes('Loading chunk') || err.name === 'ChunkLoadError')) {
          window.location.reload();
        }
        throw err;
      }),
  { ssr: false },
);

export default function ReportsPage() {
  const { loginState, isInitialized, schoolId, logout, userName, isReports } = useAppContext();
  const { settings } = useSettings();
  const firestore = useFirestore();
  const router = useRouter();
  const playSound = useArcadeSound();

  const schoolRef = useMemoFirebase(
    () => (schoolId ? doc(firestore, 'schools', schoolId) : null),
    [firestore, schoolId],
  );
  const studentsRef = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'students') : null),
    [firestore, schoolId],
  );
  const classesRef = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null),
    [firestore, schoolId],
  );
  const teachersRef = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'teachers') : null),
    [firestore, schoolId],
  );
  const couponsRef = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'coupons') : null),
    [firestore, schoolId],
  );
  const prizesRef = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'prizes') : null),
    [firestore, schoolId],
  );
  const categoriesRef = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'categories') : null),
    [firestore, schoolId],
  );

  const school = useDoc<SchoolDoc>(schoolRef);
  const students = useCollection<Student>(studentsRef);
  const classes = useCollection<Class>(classesRef);
  const teachers = useCollection<Teacher>(teachersRef);
  const coupons = useCollection<Coupon>(couponsRef);
  const prizes = useCollection<Prize>(prizesRef);
  const categories = useCollection<Category>(categoriesRef);

  useEffect(() => {
    if (!isInitialized || !schoolId) return;
    if (loginState === 'secretary' && !isReports) {
      router.replace(`/${schoolId}/secretary`);
    } else if (loginState === 'prizeClerk' && !isReports) {
      router.replace(`/${schoolId}/admin`);
    } else if (loginState === 'teacher') {
      router.replace(`/${schoolId}/teacher`);
    } else if (loginState === 'admin' || loginState === 'developer') {
      router.replace(`/${schoolId}/admin`);
    }
  }, [isInitialized, isReports, loginState, router, schoolId]);

  const handleLogout = () => {
    playSound('swoosh');
    logout({ staffNavigateTo: 'portal' });
  };

  if (!isInitialized || !schoolId || !isReports) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Button disabled variant="ghost" size="lg" className="text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </Button>
      </div>
    );
  }

  const isLoading =
    school.isLoading ||
    students.isLoading ||
    classes.isLoading ||
    teachers.isLoading ||
    coupons.isLoading ||
    prizes.isLoading ||
    categories.isLoading;

  const firstError =
    school.error ||
    students.error ||
    classes.error ||
    teachers.error ||
    coupons.error ||
    prizes.error ||
    categories.error;

  return (
    <ErrorBoundary name="ReportsStaffPage">
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-muted-foreground">Signed in as {userName || 'Reports'}</p>
                <h1 className="truncate text-xl font-black">Reports</h1>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              End session
            </Button>
          </div>
        </div>

        <main className="mx-auto max-w-7xl px-4 py-6">
          {isLoading ? (
            <Card>
              <CardContent className="flex min-h-[320px] items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading reports...
              </CardContent>
            </Card>
          ) : firstError ? (
            <Card>
              <CardContent className="py-8 text-sm text-destructive">
                Could not load reports: {firstError.message}
              </CardContent>
            </Card>
          ) : (
            <SchoolReportsPanel
              scope="school"
              schoolName={school.data?.name?.trim() || 'School'}
              students={students.data ?? []}
              classes={classes.data ?? []}
              teachers={teachers.data ?? []}
              coupons={coupons.data ?? []}
              prizes={prizes.data ?? []}
              categories={categories.data ?? []}
              rafflePointsPerTicket={settings.rafflePointsPerTicket}
            />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
