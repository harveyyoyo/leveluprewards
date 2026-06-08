'use client';

import { useEffect, useState } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { RecessPassActive } from '@/lib/types';

/** Live subscription to one student's active recess checkout (doc id = studentId). */
export function useStudentRecessPass(
  schoolId: string,
  studentId: string | null | undefined,
  enabled: boolean,
): RecessPassActive | null {
  const firestore = useFirestore();
  const [tick, setTick] = useState(0);

  const activeRef = useMemoFirebase(
    () =>
      enabled && schoolId && studentId
        ? doc(firestore, 'schools', schoolId, 'recessActive', studentId)
        : null,
    [enabled, firestore, schoolId, studentId],
  );
  const { data } = useDoc<RecessPassActive>(activeRef);

  useEffect(() => {
    if (!enabled || !data?.startedAt) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [enabled, data?.startedAt]);

  void tick;
  return data ?? null;
}
