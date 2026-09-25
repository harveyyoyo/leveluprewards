'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { collection, doc } from 'firebase/firestore';
import { ArrowLeft, ClipboardList, Clock3, Loader2, Lock } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useAdminAttendance } from '@/app/[schoolId]/admin/hooks/useAdminAttendance';
import type { AttendanceScheduleSlot, Category, Class, Student, Teacher } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  AttendanceSections,
  isAttendanceSectionId,
  type AttendanceSectionId,
} from '@/components/attendance/AttendanceSections';

const ATTENDANCE_ADMIN_ROLES = new Set(['admin', 'developer']);

/**
 * Full-screen Attendance workspace (like Classroom and Library): its own page, its own header,
 * and the whole width of the screen. The chosen section lives in the link (`?section=history`).
 */
export function AttendanceWorkspace() {
  const app = useAppContext();
  const { schoolId, loginState, isInitialized } = app;
  const { settings, updateSettings } = useSettings();
  const firestore = useFirestore();
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const canUse = ATTENDANCE_ADMIN_ROLES.has(loginState);
  const sectionParam = searchParams.get('section');
  const section: AttendanceSectionId = isAttendanceSectionId(sectionParam) ? sectionParam : 'today';
  const setSection = useCallback(
    (id: AttendanceSectionId) => {
      const next = new URLSearchParams(searchParams.toString());
      if (id === 'today') next.delete('section');
      else next.set('section', id);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const ref = <T,>(name: string) => (schoolId && canUse ? collection(firestore, 'schools', schoolId, name) : null) as T;
  const schoolRef = useMemoFirebase(() => (schoolId && canUse ? doc(firestore, 'schools', schoolId) : null), [firestore, schoolId, canUse]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const studentsRef = useMemoFirebase(() => ref<ReturnType<typeof collection> | null>('students'), [firestore, schoolId, canUse]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const classesRef = useMemoFirebase(() => ref<ReturnType<typeof collection> | null>('classes'), [firestore, schoolId, canUse]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const teachersRef = useMemoFirebase(() => ref<ReturnType<typeof collection> | null>('teachers'), [firestore, schoolId, canUse]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const categoriesRef = useMemoFirebase(() => ref<ReturnType<typeof collection> | null>('categories'), [firestore, schoolId, canUse]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const periodsRef = useMemoFirebase(() => ref<ReturnType<typeof collection> | null>('periods'), [firestore, schoolId, canUse]);

  const school = useDoc<{ name?: string }>(schoolRef);
  const students = useCollection<Student>(studentsRef);
  const classes = useCollection<Class>(classesRef);
  const teachers = useCollection<Teacher>(teachersRef);
  const categories = useCollection<Category>(categoriesRef);
  const periods = useCollection<AttendanceScheduleSlot>(periodsRef);

  const attendance = useAdminAttendance({
    enabled: canUse,
    schoolId,
    firestore,
    teachers: teachers.data,
    toast,
    playSound,
    getAttendanceConfig: app.getAttendanceConfig,
    setAttendanceConfig: app.setAttendanceConfig,
    listAttendanceLog: app.listAttendanceLog,
    getTeacherAttendanceConfig: app.getTeacherAttendanceConfig,
    setTeacherAttendanceConfig: app.setTeacherAttendanceConfig,
    listTeacherAttendanceLog: app.listTeacherAttendanceLog,
  });

  if (!isInitialized || !schoolId) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> Loading…
      </div>
    );
  }

  if (!canUse) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6">
        <div className="max-w-sm space-y-4 rounded-3xl border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-black">Admin sign-in needed</h1>
            <p className="text-sm text-muted-foreground">
              Attendance settings and reports are for school admins. Sign in as an admin, then open Attendance again.
            </p>
          </div>
          <Button asChild className="w-full rounded-xl font-bold">
            <Link href={`/${schoolId}/admin`}>Admin sign-in</Link>
          </Button>
        </div>
      </div>
    );
  }

  const listsLoading = students.isLoading || classes.isLoading;
  const schoolName = school.data?.name?.trim() || 'School';

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-br from-background via-background to-primary/[0.04]">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-xl" aria-label="Back to admin">
              <Link href={`/${schoolId}/admin`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-sky-600 text-white shadow-sm">
              <Clock3 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black leading-tight">Attendance</p>
              <p className="truncate text-xs font-semibold text-muted-foreground">{schoolName}</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="h-10 shrink-0 gap-2 rounded-xl font-bold">
            <Link href={`/${schoolId}/attendance-roster`} target="_blank" rel="noopener">
              <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="hidden sm:inline">Daily headcount</span>
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6 sm:py-6">
        {listsLoading ? (
          <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> Loading students…
          </div>
        ) : (
          <AttendanceSections
            section={section}
            onSectionChange={setSection}
            schoolId={schoolId}
            students={students.data ?? []}
            classes={classes.data ?? []}
            teachers={teachers.data ?? []}
            categories={categories.data ?? []}
            attendancePeriods={periods.data ?? []}
            attendancePeriodsLoading={periods.isLoading}
            settings={settings}
            updateSettings={updateSettings}
            getAttendanceConfig={app.getAttendanceConfig}
            setAttendanceConfig={app.setAttendanceConfig}
            {...attendance}
          />
        )}
      </main>
    </div>
  );
}
