'use client';

import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { OfficeForm } from '@/lib/office/types';
import { withoutArchived } from '@/lib/office/officeUtils';

export function useOfficeForms(schoolId: string | null) {
  const firestore = useFirestore();

  const formsQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'officeForms') : null),
    [firestore, schoolId],
  );

  const { data, isLoading, error } = useCollection<OfficeForm>(formsQuery, {
    reportPermissionErrors: false,
  });
  const forms = useMemo(
    () => withoutArchived(data).sort((a, b) => b.createdAt - a.createdAt),
    [data],
  );
  return { forms, isLoading, error };
}
