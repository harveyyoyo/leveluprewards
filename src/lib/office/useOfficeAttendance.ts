'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { OfficeAttendanceEntry } from '@/lib/office/types';

/** New office collections: keep permission errors local until live lock rules are published. */
const LOCAL_PERMISSION_ERRORS = { reportPermissionErrors: false as const };

/** One day's attendance rows across all classes — used by the daily attendance-taking view. */
export function useOfficeAttendanceForDate(schoolId: string | null, date: string | null) {
  const firestore = useFirestore();

  const attendanceQuery = useMemoFirebase(
    () =>
      firestore && schoolId && date
        ? query(collection(firestore, 'schools', schoolId, 'officeAttendance'), where('date', '==', date))
        : null,
    [firestore, schoolId, date],
  );

  const { data, isLoading, error } = useCollection<OfficeAttendanceEntry>(
    attendanceQuery,
    LOCAL_PERMISSION_ERRORS,
  );
  // `data` is a stable reference while unchanged; `data ?? []` inline would create a fresh
  // empty array on every render while loading, which breaks memo/effect deps downstream.
  const entries = useMemo(() => data ?? [], [data]);
  return { entries, isLoading, error };
}

/** All attendance rows on or after a cutoff date — used for a school-wide attendance rate. */
export function useOfficeAttendanceSince(schoolId: string | null, cutoffIso: string | null) {
  const firestore = useFirestore();

  const attendanceQuery = useMemoFirebase(
    () =>
      firestore && schoolId && cutoffIso
        ? query(collection(firestore, 'schools', schoolId, 'officeAttendance'), where('date', '>=', cutoffIso))
        : null,
    [firestore, schoolId, cutoffIso],
  );

  const { data, isLoading, error } = useCollection<OfficeAttendanceEntry>(
    attendanceQuery,
    LOCAL_PERMISSION_ERRORS,
  );
  const entries = useMemo(() => data ?? [], [data]);
  return { entries, isLoading, error };
}

/** One student's attendance history, newest first — used on the student profile. */
export function useOfficeAttendanceForStudent(schoolId: string | null, studentId: string | null, enabled: boolean) {
  const firestore = useFirestore();

  const attendanceQuery = useMemoFirebase(
    () =>
      enabled && firestore && schoolId && studentId
        ? query(collection(firestore, 'schools', schoolId, 'officeAttendance'), where('studentId', '==', studentId))
        : null,
    [firestore, schoolId, studentId, enabled],
  );

  const { data, isLoading, error } = useCollection<OfficeAttendanceEntry>(
    attendanceQuery,
    LOCAL_PERMISSION_ERRORS,
  );
  const entries = useMemo(() => (data ?? []).slice().sort((a, b) => b.date.localeCompare(a.date)), [data]);
  return { entries, isLoading, error };
}
