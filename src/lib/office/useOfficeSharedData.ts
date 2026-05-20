'use client';

import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { OfficeClass, OfficeStudent } from '@/lib/office/types';
import { hasVerifiedOfficeFirestoreAccess } from '@/lib/office/officeAccess';
import { getOfficeStudentFullName } from '@/lib/office/officeUtils';

/** Office-only roster (not the rewards arcade `students` / `classes` collections). */
export function useOfficeSharedData(schoolId: string | null, enabled: boolean) {
  const firestore = useFirestore();
  const { loginState, isAdmin, isOffice, isInitialized } = useAppContext();
  const roleVerified = hasVerifiedOfficeFirestoreAccess({ loginState, isAdmin, isOffice });
  const canLoad = Boolean(enabled && schoolId && firestore && isInitialized && roleVerified);

  const studentsQuery = useMemoFirebase(
    () => (canLoad ? collection(firestore!, 'schools', schoolId!, 'officeStudents') : null),
    [firestore, schoolId, canLoad],
  );
  const classesQuery = useMemoFirebase(
    () => (canLoad ? collection(firestore!, 'schools', schoolId!, 'officeClasses') : null),
    [firestore, schoolId, canLoad],
  );

  const { data: studentsRaw, isLoading: studentsLoading } = useCollection<OfficeStudent>(studentsQuery);
  const { data: classesRaw, isLoading: classesLoading } = useCollection<OfficeClass>(classesQuery);

  const students = studentsRaw ?? [];
  const classes = classesRaw ?? [];

  const classNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of classes) map.set(c.id, c.name);
    return map;
  }, [classes]);

  const studentLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students) {
      map.set(s.id, getOfficeStudentFullName(s));
    }
    return map;
  }, [students]);

  return {
    students,
    classes,
    classNameById,
    studentLabelById,
    isLoading: studentsLoading || classesLoading,
  };
}
