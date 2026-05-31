'use client';

import { useMemo } from 'react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { AttendanceLogEntry } from '@/lib/types';

export type TodayAttendanceStatus = 'unknown' | 'absent' | 'on-time' | 'late';

function startOfLocalDayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Latest sign-in per student for today (when Attendance pillar is in use). */
export function useTodayAttendanceMap(schoolId: string, enabled: boolean): Map<string, TodayAttendanceStatus> {
  const firestore = useFirestore();
  const dayStart = useMemo(() => startOfLocalDayMs(), []);

  const logQuery = useMemoFirebase(
    () =>
      enabled && schoolId
        ? query(collection(firestore, 'schools', schoolId, 'attendanceLog'), orderBy('signedInAt', 'desc'), limit(250))
        : null,
    [enabled, firestore, schoolId],
  );
  const { data: logs } = useCollection<AttendanceLogEntry>(logQuery);

  return useMemo(() => {
    const map = new Map<string, TodayAttendanceStatus>();
    if (!enabled || !logs?.length) return map;
    for (const entry of logs) {
      if (!entry.studentId || map.has(entry.studentId)) continue;
      if (Number(entry.signedInAt || 0) < dayStart) continue;
      map.set(entry.studentId, entry.onTime === false ? 'late' : 'on-time');
    }
    return map;
  }, [dayStart, enabled, logs]);
}

export function attendanceStatusForStudent(
  map: Map<string, TodayAttendanceStatus>,
  studentId: string,
  attendanceEnabled: boolean,
): TodayAttendanceStatus {
  if (!attendanceEnabled) return 'unknown';
  return map.get(studentId) ?? 'absent';
}
