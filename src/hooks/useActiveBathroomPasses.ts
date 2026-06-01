'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, limit, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { BathroomPassActive } from '@/lib/types';

/** Live map of students currently on a bathroom pass. */
export function useActiveBathroomPasses(schoolId: string, enabled: boolean): Map<string, BathroomPassActive> {
  const firestore = useFirestore();
  const [tick, setTick] = useState(0);

  const activeQuery = useMemoFirebase(
    () =>
      enabled && schoolId
        ? query(collection(firestore, 'schools', schoolId, 'bathroomActive'), limit(120))
        : null,
    [enabled, firestore, schoolId],
  );
  const { data: rows } = useCollection<BathroomPassActive>(activeQuery);

  useEffect(() => {
    if (!enabled || !rows?.length) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [enabled, rows?.length]);

  return useMemo(() => {
    void tick;
    const map = new Map<string, BathroomPassActive>();
    if (!enabled || !rows?.length) return map;
    for (const row of rows) {
      if (row.studentId) map.set(row.studentId, row);
    }
    return map;
  }, [enabled, rows, tick]);
}
