'use client';

import { useEffect, useRef } from 'react';
import { useFirestore } from '@/firebase';
import { hydrateClassroomPrefsFromFirestore } from '@/lib/db/classroomPrefsSync';

/**
 * Hydrates a teacher's Classroom Realm prefs from Firestore once per (school, teacher) pair.
 * Only runs for a concrete signed-in teacher — admins/developers viewing school-wide have no
 * personal prefs doc to hydrate from.
 */
export function useClassroomPrefsCloudSync(schoolId: string, teacherId: string | undefined) {
  const firestore = useFirestore();
  const hydratedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!firestore || !schoolId || !teacherId) return;
    const key = `${schoolId}:${teacherId}`;
    if (hydratedKeyRef.current === key) return;
    hydratedKeyRef.current = key;
    void hydrateClassroomPrefsFromFirestore(firestore, schoolId, teacherId);
  }, [firestore, schoolId, teacherId]);
}
