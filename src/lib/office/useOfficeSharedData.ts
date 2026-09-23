'use client';

import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { OfficeClass, OfficeFamily, OfficeStudent, OfficeTeacher } from '@/lib/office/types';
import { hasVerifiedOfficeFirestoreAccess } from '@/lib/office/officeAccess';
import { getOfficeStudentFullName, withoutArchived } from '@/lib/office/officeUtils';
import { safeString } from '@/lib/safeDisplayValue';

/** Office roster collections (`officeStudents`, `officeClasses`, `officeTeachers`). */
export function useOfficeSharedData(schoolId: string | null, enabled: boolean) {
  const firestore = useFirestore();
  const { loginState, isAdmin, isOffice, isInitialized } = useAppContext();
  const roleVerified = hasVerifiedOfficeFirestoreAccess({ loginState, isAdmin, isOffice, schoolId });
  const canLoad = Boolean(enabled && schoolId && firestore && isInitialized && roleVerified);

  const studentsQuery = useMemoFirebase(
    () => (canLoad ? collection(firestore!, 'schools', schoolId!, 'officeStudents') : null),
    [firestore, schoolId, canLoad],
  );
  const classesQuery = useMemoFirebase(
    () => (canLoad ? collection(firestore!, 'schools', schoolId!, 'officeClasses') : null),
    [firestore, schoolId, canLoad],
  );
  const teachersQuery = useMemoFirebase(
    () => (canLoad ? collection(firestore!, 'schools', schoolId!, 'officeTeachers') : null),
    [firestore, schoolId, canLoad],
  );
  const familiesQuery = useMemoFirebase(
    () => (canLoad ? collection(firestore!, 'schools', schoolId!, 'officeFamilies') : null),
    [firestore, schoolId, canLoad],
  );

  const { data: studentsRaw, isLoading: studentsLoading } = useCollection<OfficeStudent>(studentsQuery);
  const { data: classesRaw, isLoading: classesLoading } = useCollection<OfficeClass>(classesQuery);
  const { data: teachersRaw, isLoading: teachersLoading } = useCollection<OfficeTeacher>(teachersQuery);
  const { data: familiesRaw, isLoading: familiesLoading } = useCollection<OfficeFamily>(familiesQuery);

  // Removed records are hidden from lists, but the name lookups below keep them so
  // history and past records still show who they were.
  const students = useMemo(() => withoutArchived(studentsRaw), [studentsRaw]);
  const classes = useMemo(() => withoutArchived(classesRaw), [classesRaw]);
  const teachers = useMemo(() => withoutArchived(teachersRaw), [teachersRaw]);
  const families = useMemo(() => withoutArchived(familiesRaw), [familiesRaw]);

  const classNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of classesRaw ?? []) map.set(c.id, safeString(c.name));
    return map;
  }, [classesRaw]);

  const studentLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of studentsRaw ?? []) {
      map.set(s.id, getOfficeStudentFullName(s));
    }
    return map;
  }, [studentsRaw]);

  const teacherNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of teachersRaw ?? []) map.set(t.id, safeString(t.name));
    return map;
  }, [teachersRaw]);

  const familyById = useMemo(() => {
    const map = new Map<string, OfficeFamily>();
    for (const f of familiesRaw ?? []) map.set(f.id, f);
    return map;
  }, [familiesRaw]);

  return {
    students,
    classes,
    teachers,
    families,
    familyById,
    classNameById,
    studentLabelById,
    teacherNameById,
    isLoading: studentsLoading || classesLoading || teachersLoading || familiesLoading,
  };
}
