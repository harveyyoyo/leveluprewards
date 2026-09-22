'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { OfficeAuditLogEntry } from '@/lib/office/types';

/**
 * Recent change history for one office entity (student, class, teacher, …), read from the
 * shared append-only `officeAuditLog` collection. Filters by `entityId` only (not `entityType`)
 * since Firestore auto-generated ids are effectively unique across collections — this avoids
 * needing a composite index for entityId + entityType.
 */
export function useOfficeEntityHistory(schoolId: string | null, entityId: string | null, enabled: boolean) {
  const firestore = useFirestore();

  const historyQuery = useMemoFirebase(
    () =>
      enabled && firestore && schoolId && entityId
        ? query(
            collection(firestore, 'schools', schoolId, 'officeAuditLog'),
            where('entityId', '==', entityId),
          )
        : null,
    [firestore, schoolId, entityId, enabled],
  );

  const { data, isLoading } = useCollection<OfficeAuditLogEntry>(historyQuery);

  const entries = useMemo(() => {
    return (data ?? []).slice().sort((a, b) => b.changedAt - a.changedAt);
  }, [data]);

  return { entries, isLoading };
}
