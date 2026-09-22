'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { OfficeStudentDocument } from '@/lib/office/types';

export function useOfficeStudentDocuments(schoolId: string | null, studentId: string | null, enabled: boolean) {
  const firestore = useFirestore();

  const docsQuery = useMemoFirebase(
    () =>
      enabled && firestore && schoolId && studentId
        ? query(
            collection(firestore, 'schools', schoolId, 'officeStudentDocuments'),
            where('studentId', '==', studentId),
          )
        : null,
    [firestore, schoolId, studentId, enabled],
  );

  const { data, isLoading } = useCollection<OfficeStudentDocument>(docsQuery);
  const documents = useMemo(() => (data ?? []).slice().sort((a, b) => b.uploadedAt - a.uploadedAt), [data]);
  return { documents, isLoading };
}
