'use client';

import { useCallback, useDeferredValue, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { ClassroomPointsPanel } from '@/components/points/ClassroomPointsPanel';
import { ClassroomRealmShell } from '@/components/classroom/ClassroomRealmShell';
import { ClassroomLiveTeachChrome } from '@/components/classroom/ClassroomLiveTeachChrome';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Button } from '@/components/ui/button';
import { useClassroomRealmRoster } from '@/hooks/useClassroomRealmRoster';
import { useClassroomTeachNow } from '@/hooks/useClassroomTeachNow';
import { canAccessHallOfFameRoute } from '@/lib/hallOfFameAccess';
import { filterCategoriesForStaffPortal } from '@/lib/staffCategoryScope';
import { isClassroomPillarOn } from '@/lib/productPillars';
import {
  CLASSROOM_ALL_STUDENTS_FILTER_ID,
  CLASSROOM_TAB_LABEL,
} from '@/lib/classroom/classroomTabSections';
import { DEFAULT_CLASSROOM_SESSION_TIMEOUT_MS } from '@/lib/classroom/classroomManagementSettings';
import { classroomRealmHref } from '@/lib/classroomRealmUrl';
import { pickClassroomActiveClass, rememberClassroomActiveClass } from '@/lib/classroom/classroomActiveClass';
import { teacherWithBudgetAfterSpend } from '@/lib/teacherBudget';
import { useClassroomIdleExit } from '@/hooks/useClassroomIdleExit';

const spring = { type: 'spring' as const, stiffness: 280, damping: 28 };

export function ClassroomLiveMonitor({ hideRealmChrome = true }: { hideRealmChrome?: boolean }) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const schoolId = typeof params.schoolId === 'string' ? params.schoolId : '';
  const classIdFromUrl = (searchParams?.get('classId') || '').trim();
  const scopeFromUrl = (searchParams?.get('scope') || '').trim();
  const audienceFromUrl = searchParams?.get('audience') === 'student' ? 'student' : 'teacher';

  const { loginState, isInitialized, updateTeacher } = useAppContext();
  const { settings } = useSettings();
  const classroomOn = isClassroomPillarOn(settings);

  const {
    activeTeacherId,
    currentTeacher,
    schoolWide,
    students,
    studentsLoading,
    classes,
    classesLoading,
    categories: rawCategories,
    categoriesLoading,
    canReadRoster,
    variant,
  } = useClassroomRealmRoster(schoolId, { includeCategories: true });
  const storageScope =
    scopeFromUrl || (schoolWide ? 'admin' : activeTeacherId || 'staff');

  const deferredStudents = useDeferredValue(students);
  const isStudentAudience = audienceFromUrl === 'student';

  const categories = useMemo(
    () =>
      filterCategoriesForStaffPortal(rawCategories, {
        schoolWideAccess: schoolWide,
        managerTeacherId: activeTeacherId || undefined,
      }),
    [rawCategories, schoolWide, activeTeacherId],
  );

  const budgetOptions = useMemo(() => {
    if (schoolWide || !currentTeacher) return undefined;
    return {
      isAdmin: false as const,
      currentTeacher,
      onBudgetSpend: async (totalCost: number) => {
        const next =
          currentTeacher.monthlyBudget !== undefined
            ? teacherWithBudgetAfterSpend(currentTeacher, totalCost)
            : {
                ...currentTeacher,
                spentThisMonth: (currentTeacher.spentThisMonth || 0) + totalCost,
              };
        await updateTeacher(next);
      },
    };
  }, [schoolWide, currentTeacher, updateTeacher]);

  const classroomAutoLogoutOn = settings.classroomAutoLogoutEnabled !== false;
  const classroomIdleMs =
    typeof settings.classroomSessionTimeoutMs === 'number' &&
    Number.isFinite(settings.classroomSessionTimeoutMs) &&
    settings.classroomSessionTimeoutMs > 0
      ? settings.classroomSessionTimeoutMs
      : DEFAULT_CLASSROOM_SESSION_TIMEOUT_MS;

  const exitClassroom = useCallback(() => {
    router.replace(classroomRealmHref(schoolId, ''));
  }, [router, schoolId]);

  const handleMonitorClassChange = useCallback(
    (nextClassId: string) => {
      if (!nextClassId) return;
      rememberClassroomActiveClass(nextClassId);
      const next = new URLSearchParams(searchParams?.toString() ?? '');
      next.set('classId', nextClassId);
      if (storageScope) next.set('scope', storageScope);
      if (audienceFromUrl === 'student') next.set('audience', 'student');
      router.replace(`${classroomRealmHref(schoolId, 'live')}?${next.toString()}`);
    },
    [audienceFromUrl, router, schoolId, searchParams, storageScope],
  );

  useClassroomIdleExit({
    enabled: classroomAutoLogoutOn && classroomOn && isInitialized,
    idleMs: classroomIdleMs,
    onExit: exitClassroom,
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-classroom-realm', '');
    return () => document.documentElement.removeAttribute('data-classroom-realm');
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!canAccessHallOfFameRoute(loginState)) {
      router.replace(schoolId ? `/${schoolId}/portal` : '/');
    }
  }, [isInitialized, loginState, router, schoolId]);

  const monitorClassId =
    classIdFromUrl === CLASSROOM_ALL_STUDENTS_FILTER_ID
      ? CLASSROOM_ALL_STUDENTS_FILTER_ID
      : pickClassroomActiveClass(classes, classIdFromUrl);

  const teach = useClassroomTeachNow({
    schoolId,
    classes,
    students,
    variant,
    activeTeacherId,
    initialClassId: monitorClassId === CLASSROOM_ALL_STUDENTS_FILTER_ID ? undefined : monitorClassId,
  });

  if (!isInitialized || !canAccessHallOfFameRoute(loginState)) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ backgroundColor: 'var(--cr-base, #102016)' }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-white/70" />
      </div>
    );
  }

  if (!canReadRoster) {
    return (
      <ClassroomRealmShell schoolId={schoolId} hideChrome={hideRealmChrome}>
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-lg font-black tracking-tight text-white">Sign in as teacher or admin</p>
          <p className="max-w-md text-sm text-white/60">
            This sign-in can’t open the class list. Use the teacher or admin passcode, then open Live
            again.
          </p>
          <Button type="button" variant="outline" asChild className="border-white/20 text-white hover:bg-white/10">
            <Link href={schoolId ? `/${schoolId}/portal` : '/'}>Back to portal</Link>
          </Button>
        </div>
      </ClassroomRealmShell>
    );
  }

  if (studentsLoading || classesLoading || categoriesLoading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ backgroundColor: 'var(--cr-base, #102016)' }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-white/70" />
      </div>
    );
  }

  if (!classroomOn) {
    return (
      <ClassroomRealmShell schoolId={schoolId} hideChrome={hideRealmChrome}>
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-lg font-black tracking-tight text-white">{CLASSROOM_TAB_LABEL} is not enabled</p>
          <p className="max-w-md text-sm text-white/60">
            Ask your admin to enable Classroom under Settings → Product pillars.
          </p>
          <Button type="button" variant="outline" asChild className="border-white/20 text-white hover:bg-white/10">
            <Link href={classroomRealmHref(schoolId, '')}>Back to Classroom home</Link>
          </Button>
        </div>
      </ClassroomRealmShell>
    );
  }

  const teachStudents =
    monitorClassId === CLASSROOM_ALL_STUDENTS_FILTER_ID ? deferredStudents : teach.classStudents;

  const monitorContent = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={spring}
      className="classroom-realm-root classroom-realm-manage fixed inset-0 z-[100] flex min-h-0 flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--cr-base, #102016)' }}
    >
      <div
        className="relative z-10 flex h-full min-h-0 w-full flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--cr-base, #102016)' }}
      >
        {!isStudentAudience ? (
          <ClassroomLiveTeachChrome
            schoolId={schoolId}
            classId={teach.selectedClassId || monitorClassId}
            classNameLabel={
              monitorClassId === CLASSROOM_ALL_STUDENTS_FILTER_ID
                ? 'All students'
                : teach.activeClass?.name || 'Classroom'
            }
            scope={storageScope}
            students={teachStudents}
            sessionPoints={teach.sessionPoints}
            passes={
              monitorClassId === CLASSROOM_ALL_STUDENTS_FILTER_ID
                ? teach.allActivePasses
                : teach.classActivePasses
            }
            bathroomMaxMinutes={teach.bathroomMaxMinutes}
            onReturn={(id) => void teach.handleEndPass(id)}
            onAward={teach.handleRandomAward}
          />
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col pl-3 pt-2 pb-2 pr-0">
          <ClassroomPointsPanel
            variant="fullscreen"
            audience={audienceFromUrl}
            schoolId={schoolId}
            students={deferredStudents}
            classes={classes}
            categories={categories}
            storageScope={storageScope}
            initialClassId={monitorClassId || undefined}
            budgetOptions={budgetOptions}
            onClassIdChange={handleMonitorClassChange}
          />
        </div>
      </div>
    </motion.div>
  );

  if (hideRealmChrome) {
    return (
      <ClassroomRealmShell schoolId={schoolId} hideChrome>
        {monitorContent}
      </ClassroomRealmShell>
    );
  }

  return monitorContent;
}

export default function ClassroomRealmLivePage() {
  return <ClassroomLiveMonitor hideRealmChrome />;
}
