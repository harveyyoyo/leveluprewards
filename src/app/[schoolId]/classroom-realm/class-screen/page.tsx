'use client';

import { useDeferredValue, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { collection } from 'firebase/firestore';
import { Monitor } from 'lucide-react';
import { ClassroomRealmShell } from '@/components/classroom/ClassroomRealmShell';
import { ClassroomRoomDisplaySection } from '@/components/classroom/ClassroomRoomDisplaySection';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { canAccessHallOfFameRoute } from '@/lib/hallOfFameAccess';
import { isClassroomPillarOn } from '@/lib/productPillars';
import { studentsInTeacherScope } from '@/lib/reportsScope';
import { isLeadershipPersonnel } from '@/lib/teacherPersonnelRole';
import { classroomRealmHref } from '@/lib/classroomRealmUrl';
import type { Class, Student, Teacher } from '@/lib/types';

export default function ClassroomRealmClassScreenPage() {
  const params = useParams();
  const schoolId = String(params.schoolId || '');
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
  const teachersQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'teachers') : null),
    [firestore, schoolId],
  );

  const { data: allStudents } = useCollection<Student>(studentsQuery);
  const { data: allClasses } = useCollection<Class>(classesQuery);
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

  const deferredStudents = useDeferredValue(students);
  const seatingScope = schoolWide ? 'admin' : activeTeacherId || 'staff';

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
        <p className="p-8 text-center text-white/70">Staff sign-in is required.</p>
      </ClassroomRealmShell>
    );
  }

  return (
    <ClassroomRealmShell schoolId={schoolId}>
      <div className="classroom-realm-manage mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                backgroundImage: 'linear-gradient(135deg, var(--cr-accent-from), var(--cr-accent-to))',
              }}
            >
              <Monitor className="h-5 w-5" style={{ color: 'var(--cr-on-accent)' }} aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Class screen</h1>
              <p className="text-sm text-white/55">Student-facing mirror — no behavior notes.</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            asChild
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Link href={classroomRealmHref(schoolId, 'manage') + '?section=room-display'}>
              Full room display settings
            </Link>
          </Button>
        </div>

        <ClassroomRoomDisplaySection
          schoolId={schoolId}
          scope={seatingScope}
          classes={classes}
          students={deferredStudents}
        />
      </div>
    </ClassroomRealmShell>
  );
}
