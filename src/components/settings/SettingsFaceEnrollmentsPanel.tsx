'use client';

import { collection } from 'firebase/firestore';
import { useAppContext } from '@/components/AppProvider';
import { AdminFaceEnrollmentList } from '@/components/admin/AdminFaceEnrollmentList';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Student } from '@/lib/types';

/** Face enrollment roster for the settings modal (loads students on demand). */
export function SettingsFaceEnrollmentsPanel() {
  const { schoolId } = useAppContext();
  const firestore = useFirestore();
  const studentsQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'students') : null),
    [firestore, schoolId],
  );
  const { data: students } = useCollection<Student>(studentsQuery);

  return <AdminFaceEnrollmentList students={students} collapsible={false} />;
}
