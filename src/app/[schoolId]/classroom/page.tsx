'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useClassroomIdleExit } from '@/hooks/useClassroomIdleExit';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { ClassroomPointsPanel } from '@/components/points/ClassroomPointsPanel';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Button } from '@/components/ui/button';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { canAccessHallOfFameRoute } from '@/lib/hallOfFameAccess';
import { getHallOfFameStageSizeStyle } from '@/lib/hallOfFameUrlConfig';
import { studentsInTeacherScope } from '@/lib/reportsScope';
import { filterCategoriesForStaffPortal } from '@/lib/staffCategoryScope';
import { isLeadershipPersonnel } from '@/lib/teacherPersonnelRole';
import { isClassroomPillarOn } from '@/lib/productPillars';
import { CLASSROOM_TAB_LABEL } from '@/lib/classroom/classroomTabSections';
import { DEFAULT_CLASSROOM_SESSION_TIMEOUT_MS } from '@/lib/classroom/classroomManagementSettings';
import {
  teacherWithBudgetAfterSpend,
} from '@/lib/teacherBudget';
import type { Category, Class, Student, Teacher } from '@/lib/types';

export default function ClassroomFullscreenPage() {
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

  const {
    loginState,
    isInitialized,
    updateTeacher,
    teacherDocId,
    userId,
    isAdmin,
  } = useAppContext();
  const { settings } = useSettings();
  const classroomOn = isClassroomPillarOn(settings);

  const firestore = useFirestore();
  const studentsQuery = useMemoFirebase(
    () => (schoolId && firestore ? collection(firestore, 'schools', schoolId, 'students') : null),
    [firestore, schoolId],
  );
  const { data: allStudents, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

  const classesQuery = useMemoFirebase(
    () => (schoolId && firestore ? collection(firestore, 'schools', schoolId, 'classes') : null),
    [firestore, schoolId],
  );
  const { data: allClasses, isLoading: classesLoading } = useCollection<Class>(classesQuery);

  const teachersQuery = useMemoFirebase(
    () => (schoolId && firestore ? collection(firestore, 'schools', schoolId, 'teachers') : null),
    [firestore, schoolId],
  );
  const { data: teachers } = useCollection<Teacher>(teachersQuery);

  const categoriesQuery = useMemoFirebase(
    () => (schoolId && firestore ? collection(firestore, 'schools', schoolId, 'categories') : null),
    [firestore, schoolId],
  );
  const { data: allCategories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);

  const activeTeacherId = teacherDocId || userId || '';
  const currentTeacher = teachers?.find((t) => t.id === activeTeacherId) ?? null;
  const schoolWide =
    isAdmin ||
    loginState === 'developer' ||
    isLeadershipPersonnel(currentTeacher);
  const storageScope =
    scopeFromUrl || (schoolWide ? 'admin' : activeTeacherId || 'staff');

  const students = useMemo(() => {
    const list = allStudents ?? [];
    if (schoolWide) return list;
    if (!activeTeacherId) return list;
    return studentsInTeacherScope(activeTeacherId, list, allClasses ?? []);
  }, [allStudents, allClasses, schoolWide, activeTeacherId]);

  const classes = useMemo(() => {
    const list = (allClasses ?? []).slice().sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    if (schoolWide) return list;
    const fromStudents = new Set(
      students.map((s) => s.classId).filter((id): id is string => Boolean(id)),
    );
    return list
      .filter((c) => fromStudents.has(c.id) || c.primaryTeacherId === activeTeacherId)
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }, [allClasses, schoolWide, students, activeTeacherId]);

  const deferredStudents = useDeferredValue(students);

  const categories = useMemo(
    () =>
      filterCategoriesForStaffPortal(allCategories, {
        schoolWideAccess: schoolWide,
        managerTeacherId: activeTeacherId || undefined,
      }),
    [allCategories, schoolWide, activeTeacherId],
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
    const href =
      loginState === 'teacher' ? `/${schoolId}/teacher` : `/${schoolId}/admin`;
    router.replace(href);
  }, [loginState, router, schoolId]);

  const handleMonitorClassChange = useCallback(
    (nextClassId: string) => {
      if (!nextClassId) return;
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('fullscreen', '1');
      params.set('classId', nextClassId);
      if (storageScope) params.set('scope', storageScope);
      if (audienceFromUrl === 'student') params.set('audience', 'student');
      router.replace(`/${schoolId}/classroom?${params.toString()}`);
    },
    [audienceFromUrl, router, schoolId, searchParams, storageScope],
  );

  useClassroomIdleExit({
    enabled: classroomAutoLogoutOn && classroomOn && isInitialized,
    idleMs: classroomIdleMs,
    onExit: exitClassroom,
  });

  useEffect(() => {
    if (!isInitialized) return;
    if (!canAccessHallOfFameRoute(loginState)) {
      router.replace(schoolId ? `/${schoolId}/portal` : '/');
    }
  }, [isInitialized, loginState, router, schoolId]);

  if (
    !isInitialized ||
    !canAccessHallOfFameRoute(loginState) ||
    studentsLoading ||
    classesLoading ||
    categoriesLoading
  ) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const backHref =
    loginState === 'teacher'
      ? `/${schoolId}/teacher`
      : `/${schoolId}/admin`;

  if (!classroomOn) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <p className="text-lg font-black tracking-tight">{CLASSROOM_TAB_LABEL} is not enabled</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Seating charts, quick awards, and the live awards monitor require the Classroom product pillar.
          Ask your admin to enable it under Settings → Product pillars.
        </p>
        <Button type="button" variant="outline" asChild>
          <Link href={backHref}>Back to portal</Link>
        </Button>
      </div>
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

  if (portalReady) {
    return createPortal(monitorContent, document.body);
  }

  return monitorContent;
}
