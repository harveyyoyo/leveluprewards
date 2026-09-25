'use client';

import { useMemo } from 'react';
import { collection, orderBy, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { startOfLocalDayMs, useMinuteClock } from '@/hooks/useMinuteClock';
import type { AttendanceLogEntry } from '@/lib/types';

export type TodayAttendanceStatus = 'unknown' | 'absent' | 'on-time' | 'late';

export type TodayAttendanceRecord = {
  status: TodayAttendanceStatus;
  logId: string;
  signedInAt: number;
};

/** Latest sign-in per student for today (when Attendance pillar is in use). */
export function useTodayAttendanceRecords(
  schoolId: string,
  enabled: boolean,
): Map<string, TodayAttendanceRecord> {
  const firestore = useFirestore();
  // Moves to the next day at midnight, so a screen left on overnight starts fresh.
  const dayStart = startOfLocalDayMs(useMinuteClock());

  // Every check-in since midnight (no cap), so early arrivals at a big school aren't dropped.
  const logQuery = useMemoFirebase(
    () =>
      enabled && schoolId
        ? query(
            collection(firestore, 'schools', schoolId, 'attendanceLog'),
            where('signedInAt', '>=', dayStart),
            orderBy('signedInAt', 'desc'),
          )
        : null,
    [enabled, firestore, schoolId, dayStart],
  );
  const { data: logs } = useCollection<AttendanceLogEntry>(logQuery);

  return useMemo(() => {
    const map = new Map<string, TodayAttendanceRecord>();
    if (!enabled || !logs?.length) return map;
    for (const entry of logs) {
      if (!entry.studentId || map.has(entry.studentId)) continue;
      if (Number(entry.signedInAt || 0) < dayStart) continue;
      const logId = entry.id || `${entry.studentId}_${entry.sessionId || entry.signedInAt}`;
      map.set(entry.studentId, {
        status: entry.onTime === false ? 'late' : 'on-time',
        logId,
        signedInAt: Number(entry.signedInAt || 0),
      });
    }
    return map;
  }, [dayStart, enabled, logs]);
}

export function useTodayAttendanceMap(schoolId: string, enabled: boolean): Map<string, TodayAttendanceStatus> {
  const records = useTodayAttendanceRecords(schoolId, enabled);
  return useMemo(() => {
    const map = new Map<string, TodayAttendanceStatus>();
    records.forEach((record, studentId) => map.set(studentId, record.status));
    return map;
  }, [records]);
}

export function attendanceStatusForStudent(
  map: Map<string, TodayAttendanceStatus>,
  studentId: string,
  attendanceEnabled: boolean,
): TodayAttendanceStatus {
  if (!attendanceEnabled) return 'unknown';
  return map.get(studentId) ?? 'absent';
}
