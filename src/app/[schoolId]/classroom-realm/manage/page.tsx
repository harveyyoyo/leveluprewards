'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { collection } from 'firebase/firestore';
import { ClassroomRealmShell } from '@/components/classroom/ClassroomRealmShell';
import { StaffClassroomTab } from '@/components/points/StaffClassroomTab';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { canAccessHallOfFameRoute } from '@/lib/hallOfFameAccess';
import { isClassroomPillarOn } from '@/lib/productPillars';
import { studentsInTeacherScope } from '@/lib/reportsScope';
import { isLeadershipPersonnel } from '@/lib/teacherPersonnelRole';
import { parseClassroomRealmManageSection } from '@/lib/classroomRealmUrl';
import type { Category, Class, Student, Teacher } from '@/lib/types';

export default function ClassroomRealmManagePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const schoolId = String(params.schoolId || '');
  const initialSection = parseClassroomRealmManageSection(searchParams?.get('section')) ?? 'seating';

  const firestore = useFirestore();
  const { settings } = useSettings();
  const { loginState, isAdmin, teacherDocId, userId } = useAppContext();
  const classroomOn = isClassroomPillarOn(settings);

  const studentsQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'students') : null),
    [firestore, schoolId],
  );
  const classesQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null),
    [firestore, schoolId],
  );
  const categoriesQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'categories') : null),
    [firestore, schoolId],
  );
  const teachersQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'teachers') : null),
    [firestore, schoolId],
  );

  const { data: allStudents } = useCollection<Student>(studentsQuery);
  const { data: allClasses } = useCollection<Class>(classesQuery);
  const { data: categories } = useCollection<Category>(categoriesQuery);
  const { data: teachers } = useCollection<Teacher>(teachersQuery);

  const activeTeacherId = teacherDocId || userId || '';
  const currentTeacher = teachers?.find((t) => t.id === activeTeacherId) ?? null;
  const schoolWide =
    isAdmin ||
    loginState === 'developer' ||
    isLeadershipPersonnel(currentTeacher);

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

  useEffect(() => {
    document.documentElement.setAttribute('data-classroom-realm', '');
    return () => document.documentElement.removeAttribute('data-classroom-realm');
  }, []);

  const staffOk = canAccessHallOfFameRoute(loginState);

  if (!classroomOn) {
    return (
      <ClassroomRealmShell schoolId={schoolId}>
        <p className="p-8 text-center text-white/70">Classroom is not enabled for this school.</p>
      </ClassroomRealmShell>
    );
  }

  if (!staffOk) {
    return (
      <ClassroomRealmShell schoolId={schoolId}>
        <p className="p-8 text-center text-white/70">Staff sign-in is required to manage classroom.</p>
      </ClassroomRealmShell>
    );
  }

  const variant = loginState === 'teacher' ? 'teacher' : 'admin';

  return (
    <ClassroomRealmShell schoolId={schoolId}>
      <div className="classroom-realm-manage mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <StaffClassroomTab
          variant={variant}
          realmMode
          schoolId={schoolId}
          categories={categories}
          classes={classes}
          students={students}
          managerTeacherId={schoolWide ? undefined : activeTeacherId}
          schoolWideAccess={schoolWide}
          initialSection={initialSection}
          canEditRaffleSettings={loginState === 'admin' || loginState === 'developer'}
        />
      </div>
    </ClassroomRealmShell>
  );
}
