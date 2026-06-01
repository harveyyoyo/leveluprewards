'use client';

import { useDeferredValue, useEffect, useMemo, useRef } from 'react';
import { useScrollPausedValue } from '@/hooks/useScrollPausedValue';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, X } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { ClassroomPointsPanel } from '@/components/points/ClassroomPointsPanel';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Button } from '@/components/ui/button';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { canAccessHallOfFameRoute } from '@/lib/hallOfFameAccess';
import { studentsInTeacherScope } from '@/lib/reportsScope';
import { filterCategoriesForStaffPortal } from '@/lib/staffCategoryScope';
import { isLeadershipPersonnel } from '@/lib/teacherPersonnelRole';
import { isClassroomPillarOn } from '@/lib/productPillars';
import {
  remainingTeacherBudgetPoints,
  teacherWithBudgetAfterSpend,
} from '@/lib/teacherBudget';
import type { Category, Class, Student, Teacher } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function ClassroomFullscreenPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const schoolId = typeof params.schoolId === 'string' ? params.schoolId : '';
  const classIdFromUrl = (searchParams?.get('classId') || '').trim();
  const scopeFromUrl = (searchParams?.get('scope') || '').trim();

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
    const list = (allClasses ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
    if (schoolWide) return list;
    const fromStudents = new Set(
      students.map((s) => s.classId).filter((id): id is string => Boolean(id)),
    );
    return list
      .filter((c) => fromStudents.has(c.id) || c.primaryTeacherId === activeTeacherId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allClasses, schoolWide, students, activeTeacherId]);

  const scrollRootRef = useRef<HTMLDivElement>(null);
  const pausedStudents = useScrollPausedValue(students, scrollRootRef, 280);
  const deferredStudents = useDeferredValue(pausedStudents);

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
        <p className="text-lg font-black tracking-tight">Classroom Management is not enabled</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Seating charts, quick awards, and the full-screen classroom view require the Classroom
          product pillar. Ask your admin to enable it under Settings → Product pillars.
        </p>
        <Button type="button" variant="outline" asChild>
          <Link href={backHref}>Back to portal</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex flex-col bg-background',
        'h-dvh max-h-dvh w-full overflow-hidden',
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b bg-background px-2 py-1.5 sm:px-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black tracking-tight">Classroom</p>
          {currentTeacher && !schoolWide && (
            <p className="truncate text-[10px] text-muted-foreground">
              {currentTeacher.name}
              {remainingTeacherBudgetPoints(currentTeacher) !== null && (
                <> · {remainingTeacherBudgetPoints(currentTeacher)?.toLocaleString()} pts budget left</>
              )}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg text-xs font-bold" asChild>
            <Link href={backHref}>Portal</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            aria-label="Close tab"
            onClick={() => window.close()}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div
        ref={scrollRootRef}
        className="relative flex min-h-0 flex-1 flex-col overflow-auto p-2 sm:p-3"
      >
        <ClassroomPointsPanel
          variant="fullscreen"
          schoolId={schoolId}
          students={deferredStudents}
          classes={classes}
          categories={categories}
          storageScope={storageScope}
          initialClassId={classIdFromUrl || undefined}
          budgetOptions={budgetOptions}
        />
      </div>
    </div>
  );
}
