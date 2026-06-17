'use client';

import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { SssStudent } from '@/lib/sss/types';

export function useSssStudents(schoolId: string | null | undefined, enabled: boolean) {
  const firestore = useFirestore();
  const query = useMemoFirebase(
    () =>
      enabled && firestore && schoolId
        ? collection(firestore, 'schools', schoolId, 'sssStudents')
        : null,
    [firestore, schoolId, enabled],
  );
  const { data, isLoading, error } = useCollection<SssStudent>(query);
  return { students: data ?? [], isLoading, error };
}
