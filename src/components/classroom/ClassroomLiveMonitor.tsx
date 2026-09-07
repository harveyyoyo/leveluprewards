'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { ClassroomPointsPanel } from '@/components/points/ClassroomPointsPanel';
import { ClassroomRealmShell } from '@/components/classroom/ClassroomRealmShell';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Button } from '@/components/ui/button';
import { useClassroomRealmRoster } from '@/hooks/useClassroomRealmRoster';
import { canAccessHallOfFameRoute } from '@/lib/hallOfFameAccess';
import { getHallOfFameStageSizeStyle } from '@/lib/hallOfFameUrlConfig';
import { filterCategoriesForStaffPortal } from '@/lib/staffCategoryScope';
import { isClassroomPillarOn } from '@/lib/productPillars';
import { CLASSROOM_TAB_LABEL } from '@/lib/classroom/classroomTabSections';
import { DEFAULT_CLASSROOM_SESSION_TIMEOUT_MS } from '@/lib/classroom/classroomManagementSettings';
import { classroomRealmHref } from '@/lib/classroomRealmUrl';
import { teacherWithBudgetAfterSpend } from '@/lib/teacherBudget';
import { useClassroomIdleExit } from '@/hooks/useClassroomIdleExit';

export function ClassroomLiveMonitor({ hideRealmChrome = true }: { hideRealmChrome?: boolean }) {
  const [portalReady, setPortalReady] = useState(false);
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setPortalReady(true);
  }, []);

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
  } = useClassroomRealmRoster(schoolId, { includeCategories: true });
  const storageScope =
    scopeFromUrl || (schoolWide ? 'admin' : activeTeacherId || 'staff');

  const deferredStudents = useDeferredValue(students);

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
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('classId', nextClassId);
      if (storageScope) params.set('scope', storageScope);
      if (audienceFromUrl === 'student') params.set('audience', 'student');
      router.replace(`${classroomRealmHref(schoolId, 'live')}?${params.toString()}`);
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

  if (!isInitialized || !canAccessHallOfFameRoute(loginState)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  const monitorContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background">
      <div
        className="relative z-10 flex flex-col overflow-hidden bg-background"
        style={getHallOfFameStageSizeStyle(false)}
      >
        <div className="flex h-full min-h-0 w-full flex-col pl-3 pt-2 pb-2 pr-0">
          <ClassroomPointsPanel
            variant="fullscreen"
            audience={audienceFromUrl}
            schoolId={schoolId}
            students={deferredStudents}
            classes={classes}
            categories={categories}
            storageScope={storageScope}
            initialClassId={classIdFromUrl || undefined}
            budgetOptions={budgetOptions}
            onClassIdChange={handleMonitorClassChange}
          />
        </div>
      </div>
    </div>
  );

  const shell = hideRealmChrome ? (
    <ClassroomRealmShell schoolId={schoolId} hideChrome>
      {monitorContent}
    </ClassroomRealmShell>
  ) : (
    monitorContent
  );

  if (portalReady) {
    return createPortal(shell, document.body);
  }

  return shell;
}

export default function ClassroomRealmLivePage() {
  return <ClassroomLiveMonitor hideRealmChrome />;
}
