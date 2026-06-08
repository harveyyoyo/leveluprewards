'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, limit, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { RecessPassActive } from '@/lib/types';

/** Live map of students currently checked out for a break/bathroom (keyed by studentId). */
export function useActiveRecessPasses(schoolId: string, enabled: boolean): Map<string, RecessPassActive> {
  const firestore = useFirestore();
  const [tick, setTick] = useState(0);

  const activeQuery = useMemoFirebase(
    () =>
      enabled && schoolId
        ? query(collection(firestore, 'schools', schoolId, 'recessActive'), limit(120))
        : null,
    [enabled, firestore, schoolId],
  );
  const { data: rows } = useCollection<RecessPassActive>(activeQuery);

  // Re-render every second so elapsed timers stay live while anyone is out.
  useEffect(() => {
    if (!enabled || !rows?.length) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [enabled, rows?.length]);

  return useMemo(() => {
    void tick;
    const map = new Map<string, RecessPassActive>();
    if (!enabled || !rows?.length) return map;
    for (const row of rows) {
      if (row.studentId) map.set(row.studentId, row);
    }
    return map;
  }, [enabled, rows, tick]);
}
