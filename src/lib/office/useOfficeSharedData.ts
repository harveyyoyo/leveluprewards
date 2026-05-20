'use client';

import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Class, Student, Teacher } from '@/lib/types';
import { getStudentNickname } from '@/lib/utils';

export function useOfficeSharedData(schoolId: string | null, enabled: boolean) {
  const firestore = useFirestore();

  const studentsQuery = useMemoFirebase(
    () => (firestore && schoolId && enabled ? collection(firestore, 'schools', schoolId, 'students') : null),
    [firestore, schoolId, enabled],
  );
  const classesQuery = useMemoFirebase(
    () => (firestore && schoolId && enabled ? collection(firestore, 'schools', schoolId, 'classes') : null),
    [firestore, schoolId, enabled],
  );
  const teachersQuery = useMemoFirebase(
    () => (firestore && schoolId && enabled ? collection(firestore, 'schools', schoolId, 'teachers') : null),
    [firestore, schoolId, enabled],
  );

  const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);
  const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesQuery);
  const { data: teachers, isLoading: teachersLoading } = useCollection<Teacher>(teachersQuery);

  const classNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of classes ?? []) map.set(c.id, c.name);
    return map;
  }, [classes]);

  const teacherNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of teachers ?? []) map.set(t.id, t.name);
    return map;
  }, [teachers]);

  const studentLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students ?? []) {
      map.set(s.id, `${getStudentNickname(s)} ${s.lastName}`.trim());
    }
    return map;
  }, [students]);

  const sortedStudents = useMemo(() => {
    return (students ?? []).slice().sort((a, b) => {
      const ln = a.lastName.localeCompare(b.lastName);
      if (ln !== 0) return ln;
      return getStudentNickname(a).localeCompare(getStudentNickname(b));
    });
  }, [students]);

  return {
    students: sortedStudents,
    classes: classes ?? [],
    teachers: teachers ?? [],
    classNameById,
    teacherNameById,
    studentLabelById,
    isLoading: studentsLoading || classesLoading || teachersLoading,
  };
}
