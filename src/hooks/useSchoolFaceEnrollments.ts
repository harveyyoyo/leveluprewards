'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppContext } from '@/components/AppProvider';
import { useFirebase } from '@/firebase';
import {
  FACE_ENROLLMENT_CHANGED_EVENT,
  fetchSchoolFaceEnrollments,
  isActiveFaceEnrollment,
  type FaceEnrollmentRow,
} from '@/lib/faceEnrollment';
import type { Student } from '@/lib/types';

export function useSchoolFaceEnrollments(
  students: Student[] | null | undefined,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled !== false;
  const { schoolId } = useAppContext();
  const { functions } = useFirebase();
  const [rows, setRows] = useState<FaceEnrollmentRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !schoolId || !functions) return;
    setLoading(true);
    try {
      const result = await fetchSchoolFaceEnrollments(schoolId, functions, students);
      setRows(result.rows);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, schoolId, functions, students]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    const handler = () => void refresh();
    window.addEventListener(FACE_ENROLLMENT_CHANGED_EVENT, handler);
    return () => window.removeEventListener(FACE_ENROLLMENT_CHANGED_EVENT, handler);
  }, [enabled, refresh]);

  const activeByStudentId = useMemo(() => {
    const map = new Map<string, FaceEnrollmentRow>();
    for (const row of rows ?? []) {
      if (isActiveFaceEnrollment(row)) map.set(row.studentId, row);
    }
    return map;
  }, [rows]);

  const isStudentFaceEnrolled = useCallback(
    (studentId: string) => activeByStudentId.has(studentId),
    [activeByStudentId],
  );

  return {
    rows,
    activeByStudentId,
    isStudentFaceEnrolled,
    loading,
    refresh,
  };
}
