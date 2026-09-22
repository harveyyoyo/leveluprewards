'use client';

import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { OfficeForm } from '@/lib/office/types';

export function useOfficeForms(schoolId: string | null) {
  const firestore = useFirestore();

  const formsQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'officeForms') : null),
    [firestore, schoolId],
  );

  const { data, isLoading } = useCollection<OfficeForm>(formsQuery);
  const forms = useMemo(
    () => (data ?? []).slice().sort((a, b) => b.createdAt - a.createdAt),
    [data],
  );
  return { forms, isLoading };
}
