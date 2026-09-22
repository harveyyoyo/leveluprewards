'use client';

import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { OfficeEvent } from '@/lib/office/types';

export function useOfficeEvents(schoolId: string | null) {
  const firestore = useFirestore();

  const eventsQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'officeEvents') : null),
    [firestore, schoolId],
  );

  const { data, isLoading } = useCollection<OfficeEvent>(eventsQuery);
  const events = useMemo(() => (data ?? []).slice().sort((a, b) => a.date.localeCompare(b.date)), [data]);
  return { events, isLoading };
}
