'use client';

import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Class, Student, Teacher } from '@/lib/types';
import { getStudentNickname } from '@/lib/utils';

/** Read-only roster data shared with the main app (students, classes, teachers). */
export function useOfficeSharedData(schoolId: string | null, enabled: boolean) {
  const firestore = useFirestore();
  const canLoad = Boolean(enabled && schoolId && firestore);

  const studentsQuery = useMemoFirebase(
    () => (canLoad ? collection(firestore!, 'schools', schoolId!, 'students') : null),
    [firestore, schoolId, canLoad],
  );
  const classesQuery = useMemoFirebase(
    () => (canLoad ? collection(firestore!, 'schools', schoolId!, 'classes') : null),
    [firestore, schoolId, canLoad],
  );
  const teachersQuery = useMemoFirebase(
    () => (canLoad ? collection(firestore!, 'schools', schoolId!, 'teachers') : null),
    [firestore, schoolId, canLoad],
  );

  const { data: studentsRaw, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);
  const { data: classesRaw, isLoading: classesLoading } = useCollection<Class>(classesQuery);
  const { data: teachersRaw, isLoading: teachersLoading } = useCollection<Teacher>(teachersQuery);

  const students = studentsRaw ?? [];
  const classes = classesRaw ?? [];

  const classNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of classes) map.set(c.id, c.name);
    return map;
  }, [classes]);

  const teacherNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of teachersRaw ?? []) map.set(t.id, t.name);
    return map;
  }, [teachersRaw]);

  const studentLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students) {
      map.set(s.id, `${getStudentNickname(s)} ${s.lastName}`.trim());
    }
    return map;
  }, [students]);

  return {
    students,
    classes,
    classNameById,
    teacherNameById,
    studentLabelById,
    isLoading: studentsLoading || classesLoading || teachersLoading,
  };
}
