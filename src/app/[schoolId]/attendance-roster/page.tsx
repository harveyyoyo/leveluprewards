'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { collection, doc } from 'firebase/firestore';
import { ClipboardList, Loader2, Lock } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StaffPortalLayoutProvider } from '@/components/staff/StaffPortalLayoutContext';
import { StaffPortalContentWidth } from '@/components/staff/StaffPortalContentWidth';
import { Button } from '@/components/ui/button';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { getAttendanceConfig } from '@/lib/db/attendance';
import type { Class, Student } from '@/lib/types';
import { AttendanceClockBar } from '@/components/attendance/AttendanceClockBar';
import {
  AttendanceHeadcountRoster,
  type RosterSortKey,
} from '@/components/attendance/AttendanceHeadcountRoster';

/** Roles that can read student and attendance records (see firestore.rules). */
const ROSTER_ROLES = new Set(['admin', 'developer', 'teacher', 'reports']);
const SORT_KEYS: RosterSortKey[] = ['name', 'class', 'status', 'time'];

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-background p-6">{children}</div>;
}

function RosterPageBody() {
  const { loginState, isInitialized, schoolId } = useAppContext();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const canView = ROSTER_ROLES.has(loginState);

  // Class and sort live in the link, so a shared link opens on the same class and order.
  const classId = searchParams.get('class') || 'all';
  const sortParam = searchParams.get('sort') as RosterSortKey | null;
  const sortKey: RosterSortKey = sortParam && SORT_KEYS.includes(sortParam) ? sortParam : 'class';
  const sortDir = searchParams.get('dir') === 'desc' ? 'desc' : 'asc';

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null) next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const schoolRef = useMemoFirebase(
    () => (schoolId && canView ? doc(firestore, 'schools', schoolId) : null),
    [firestore, schoolId, canView],
  );
  const studentsRef = useMemoFirebase(
    () => (schoolId && canView ? collection(firestore, 'schools', schoolId, 'students') : null),
    [firestore, schoolId, canView],
  );
  const classesRef = useMemoFirebase(
    () => (schoolId && canView ? collection(firestore, 'schools', schoolId, 'classes') : null),
    [firestore, schoolId, canView],
  );
  const school = useDoc<{ name?: string }>(schoolRef);
  const students = useCollection<Student>(studentsRef);
  const classes = useCollection<Class>(classesRef);

  const [timeZone, setTimeZone] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!schoolId || !canView) return;
    let cancelled = false;
    getAttendanceConfig(firestore, schoolId)
      .then((c) => {
        if (!cancelled) setTimeZone(c?.attendanceTimeZone);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [firestore, schoolId, canView]);

  if (!isInitialized || !schoolId) {
    return (
      <Centered>
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="text-sm text-muted-foreground">Loading…</span>
      </Centered>
    );
  }

  if (!canView) {
    return (
      <Centered>
        <div className="max-w-sm space-y-4 rounded-3xl border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-black">Staff sign-in needed</h1>
            <p className="text-sm text-muted-foreground">
              This attendance list has student names, so only school admins and teachers can see it. Sign in as
              staff, then open this link again.
            </p>
          </div>
          <Button asChild className="w-full rounded-xl font-bold">
            <Link href={`/${schoolId}/teacher`}>Staff sign-in</Link>
          </Button>
        </div>
      </Centered>
    );
  }

  const loading = students.isLoading || classes.isLoading;
  const loadError = students.error || classes.error;

  return (
    <StaffPortalLayoutProvider>
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur print:hidden">
          <StaffPortalContentWidth className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ClipboardList className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="truncate text-lg font-black">Daily headcount</p>
            </div>
            {loginState !== 'reports' && (
              <Button asChild variant="outline" size="sm" className="shrink-0 rounded-xl">
                <Link href={loginState === 'teacher' ? `/${schoolId}/teacher` : `/${schoolId}/attendance`}>
                  Back to attendance
                </Link>
              </Button>
            )}
          </StaffPortalContentWidth>
        </div>
        <StaffPortalContentWidth className="space-y-5 px-4 py-6">
          <AttendanceClockBar schoolId={schoolId} timeZone={timeZone ?? null} className="print:hidden" />
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> Loading students…
            </div>
          ) : loadError ? (
            <p className="rounded-2xl border p-8 text-sm text-destructive">
              Couldn&apos;t load the student list. Check the internet connection and reload the page.
            </p>
          ) : (
            <AttendanceHeadcountRoster
              schoolId={schoolId}
              schoolName={school.data?.name?.trim() || 'School'}
              students={students.data ?? []}
              classes={classes.data ?? []}
              timeZone={timeZone}
              classId={classId}
              onClassIdChange={(id) => setParams({ class: id === 'all' ? null : id })}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={(key, dir) =>
                setParams({ sort: key === 'class' ? null : key, dir: dir === 'asc' ? null : dir })
              }
            />
          )}
        </StaffPortalContentWidth>
      </div>
    </StaffPortalLayoutProvider>
  );
}

export default function AttendanceRosterPage() {
  return (
    <ErrorBoundary name="AttendanceRosterPage">
      <Suspense
        fallback={
          <Centered>
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </Centered>
        }
      >
        <RosterPageBody />
      </Suspense>
    </ErrorBoundary>
  );
}
