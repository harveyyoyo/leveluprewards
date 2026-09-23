'use client';

import { useMemo } from 'react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { OfficeAuditLogEntry } from '@/lib/office/types';

/** Newest-first slice of the school-wide Office change history (`officeAuditLog`). */
export function useOfficeHistory(schoolId: string | null, maxEntries: number, enabled = true) {
  const firestore = useFirestore();

  const historyQuery = useMemoFirebase(
    () =>
      enabled && firestore && schoolId
        ? query(
            collection(firestore, 'schools', schoolId, 'officeAuditLog'),
            orderBy('changedAt', 'desc'),
            limit(maxEntries),
          )
        : null,
    [firestore, schoolId, maxEntries, enabled],
  );

  const { data, isLoading, error } = useCollection<OfficeAuditLogEntry>(historyQuery, {
    reportPermissionErrors: false,
  });
  const entries = useMemo(() => data ?? [], [data]);
  return { entries, isLoading, error, mayHaveMore: entries.length >= maxEntries };
}
