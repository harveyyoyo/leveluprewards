'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { OfficeDeskLogEntry } from '@/lib/office/types';
import { withoutArchived } from '@/lib/office/officeUtils';

const LOCAL_PERMISSION_ERRORS = { reportPermissionErrors: false as const };

const byTime = (a: OfficeDeskLogEntry, b: OfficeDeskLogEntry) =>
  `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);

/** One day's front-desk log, earliest first. `error` is set until the database allows this log. */
export function useOfficeDeskLogForDate(schoolId: string | null, date: string | null) {
  const firestore = useFirestore();
  const logQuery = useMemoFirebase(
    () =>
      firestore && schoolId && date
        ? query(collection(firestore, 'schools', schoolId, 'officeDeskLog'), where('date', '==', date))
        : null,
    [firestore, schoolId, date],
  );
  const { data, isLoading, error } = useCollection<OfficeDeskLogEntry>(logQuery, LOCAL_PERMISSION_ERRORS);
  const entries = useMemo(() => withoutArchived(data).sort(byTime), [data]);
  return { entries, isLoading, error };
}

/** One student's front-desk log, newest first. */
export function useOfficeDeskLogForStudent(schoolId: string | null, studentId: string | null, enabled: boolean) {
  const firestore = useFirestore();
  const logQuery = useMemoFirebase(
    () =>
      enabled && firestore && schoolId && studentId
        ? query(collection(firestore, 'schools', schoolId, 'officeDeskLog'), where('studentId', '==', studentId))
        : null,
    [firestore, schoolId, studentId, enabled],
  );
  const { data, isLoading, error } = useCollection<OfficeDeskLogEntry>(logQuery, LOCAL_PERMISSION_ERRORS);
  const entries = useMemo(() => withoutArchived(data).sort(byTime).reverse(), [data]);
  return { entries, isLoading, error };
}
