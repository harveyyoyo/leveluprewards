'use client';

import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useAppContext } from '@/components/AppProvider';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useCanReadSchoolRoster } from '@/hooks/useCanReadSchoolRoster';
import { canAccessHallOfFameRoute } from '@/lib/hallOfFameAccess';
import { studentsInTeacherScope } from '@/lib/reportsScope';
import { isLeadershipPersonnel } from '@/lib/teacherPersonnelRole';
import type { Category, Class, Student, Teacher } from '@/lib/types';

/** Shared class/student scope for Classroom realm manage + class-screen pages. */
export function useClassroomRealmRoster(schoolId: string, options?: { includeCategories?: boolean }) {
  const firestore = useFirestore();
  const { loginState, isAdmin, teacherDocId, userId } = useAppContext();
  const includeCategories = options?.includeCategories === true;
  const staffOk = canAccessHallOfFameRoute(loginState);
  const canReadRoster = useCanReadSchoolRoster();

  const studentsQuery = useMemoFirebase(
    () =>
      firestore && schoolId && canReadRoster
        ? collection(firestore, 'schools', schoolId, 'students')
        : null,
    [firestore, schoolId, canReadRoster],
  );
  const classesQuery = useMemoFirebase(
    () =>
      firestore && schoolId && canReadRoster
        ? collection(firestore, 'schools', schoolId, 'classes')
        : null,
    [firestore, schoolId, canReadRoster],
  );
  const teachersQuery = useMemoFirebase(
    () =>
      firestore && schoolId && canReadRoster
        ? collection(firestore, 'schools', schoolId, 'teachers')
        : null,
    [firestore, schoolId, canReadRoster],
  );
  const categoriesQuery = useMemoFirebase(
    () =>
      includeCategories && canReadRoster && firestore && schoolId
        ? collection(firestore, 'schools', schoolId, 'categories')
        : null,
    [includeCategories, canReadRoster, firestore, schoolId],
  );

  const { data: allStudents } = useCollection<Student>(studentsQuery);
  const { data: allClasses } = useCollection<Class>(classesQuery);
  const { data: teachers } = useCollection<Teacher>(teachersQuery);
  const { data: categories } = useCollection<Category>(categoriesQuery);

  const activeTeacherId = teacherDocId || userId || '';
  const currentTeacher = teachers?.find((t) => t.id === activeTeacherId) ?? null;
  const schoolWide =
    isAdmin || loginState === 'developer' || isLeadershipPersonnel(currentTeacher);

  const students = useMemo(() => {
    const list = allStudents ?? [];
    if (schoolWide || !activeTeacherId) return list;
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

  return {
    loginState,
    students,
    classes,
    categories: includeCategories ? categories : undefined,
    schoolWide,
    seatingScope: schoolWide ? 'admin' : activeTeacherId || 'staff',
    managerTeacherId: schoolWide ? undefined : activeTeacherId,
    staffOk,
    canReadRoster,
    variant: (loginState === 'teacher' ? 'teacher' : 'admin') as 'teacher' | 'admin',
  };
}
