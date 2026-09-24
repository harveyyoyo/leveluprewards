'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { OfficeAuditLogEntry } from '@/lib/office/types';

/** Loaded once per school per visit: Home's shortcuts don't need to follow every change live. */
const cache = new Map<string, OfficeAuditLogEntry[]>();

/**
 * The latest entries of the school's change history, read once (not kept open), for ranking the
 * jobs someone does most. Empty while loading or if history can't be read.
 */
export function useOfficeRecentHistory(schoolId: string | null, maxEntries: number, enabled = true) {
  const firestore = useFirestore();
  const cacheKey = schoolId ? `${schoolId}|${maxEntries}` : '';
  const [entries, setEntries] = useState<OfficeAuditLogEntry[]>(() => cache.get(cacheKey) ?? []);

  useEffect(() => {
    if (!enabled || !firestore || !schoolId) return;
    const cached = cache.get(cacheKey);
    if (cached) {
      setEntries(cached);
      return;
    }
    let cancelled = false;
    getDocs(query(collection(firestore, 'schools', schoolId, 'officeAuditLog'), orderBy('changedAt', 'desc'), limit(maxEntries)))
      .then((snap) => {
        const rows = snap.docs.map((d) => ({ ...(d.data() as Omit<OfficeAuditLogEntry, 'id'>), id: d.id }));
        cache.set(cacheKey, rows);
        if (!cancelled) setEntries(rows);
      })
      .catch(() => {
        // No access to history: Home just shows the everyday shortcuts.
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, firestore, schoolId, maxEntries, cacheKey]);

  return entries;
}
