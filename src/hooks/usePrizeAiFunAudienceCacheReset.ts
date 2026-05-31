'use client';

import { useEffect, useRef } from 'react';
import { clearPrizeAiFunSchoolClientCache } from '@/lib/prizes/prizeAiFunClientStorage';
import { studentAgeYearsFromBirthday } from '@/lib/students/studentAiFunAge';

/**
 * Prefetched AI Fun jokes/riddles/fortunes (and recent acrostics) are stored per school + coarse age band.
 * Refills are skipped while stock is "full", so a birthday edit can leave stale lines
 * even when the API would use a new exact age. Clear browser cache when the audience signal changes.
 */
export function usePrizeAiFunAudienceCacheReset(
  schoolId: string | null | undefined,
  studentId: string | undefined,
  student: { birthday?: string | null } | null | undefined,
) {
  const gate = useRef<{
    studentId?: string;
    ready: boolean;
    birthday: string | null;
    ageYears: number | undefined;
  }>({ ready: false, birthday: null, ageYears: undefined });

  useEffect(() => {
    if (!schoolId || !studentId || !student) return;

    const g = gate.current;
    if (g.studentId !== studentId) {
      g.studentId = studentId;
      g.ready = false;
      g.birthday = null;
      g.ageYears = undefined;
    }

    const nextBirthday = student.birthday ?? null;
    const nextAgeYears = studentAgeYearsFromBirthday(student.birthday);

    if (!g.ready) {
      g.ready = true;
      g.birthday = nextBirthday;
      g.ageYears = nextAgeYears;
      return;
    }

    if (g.birthday !== nextBirthday || g.ageYears !== nextAgeYears) {
      g.birthday = nextBirthday;
      g.ageYears = nextAgeYears;
      clearPrizeAiFunSchoolClientCache(schoolId);
    }
  }, [schoolId, studentId, student, student?.birthday]);
}
