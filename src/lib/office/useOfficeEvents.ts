'use client';

import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { OfficeEvent } from '@/lib/office/types';
import { withoutArchived } from '@/lib/office/officeUtils';

export function useOfficeEvents(schoolId: string | null) {
  const firestore = useFirestore();

  const eventsQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'officeEvents') : null),
    [firestore, schoolId],
  );

  const { data, isLoading, error } = useCollection<OfficeEvent>(eventsQuery, {
    reportPermissionErrors: false,
  });
  const events = useMemo(() => withoutArchived(data).sort((a, b) => a.date.localeCompare(b.date)), [data]);
  return { events, isLoading, error };
}
