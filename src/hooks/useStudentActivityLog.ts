'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  type Firestore,
} from 'firebase/firestore';
import { getReadableErrorMessage } from '@/lib/errorMessage';
import { getStudentNickname } from '@/lib/utils';
import type { useToast } from '@/hooks/use-toast';
import type { Student } from '@/lib/types';

export interface StudentActivityRow {
  id: string;
  studentId: string;
  studentName: string;
  date: number;
  desc: string;
  amount: number;
}

type ToastFn = ReturnType<typeof useToast>['toast'];

export function useStudentActivityLog({
  enabled,
  schoolId,
  students,
  firestore,
  toast,
}: {
  enabled: boolean;
  schoolId: string;
  students: Student[] | null | undefined;
  firestore: Firestore;
  toast: ToastFn;
}) {
  const [studentActivityLog, setStudentActivityLog] = useState<StudentActivityRow[]>([]);
  const [studentActivityLogLoading, setStudentActivityLogLoading] = useState(false);

  const loadStudentActivityLog = useCallback(async () => {
    if (!schoolId || !students?.length) {
      setStudentActivityLog([]);
      return;
    }
    setStudentActivityLogLoading(true);
    try {
      const rows: StudentActivityRow[] = [];
      await Promise.all(
        students.map(async (s) => {
          const activitiesRef = collection(firestore, 'schools', schoolId, 'students', s.id, 'activities');
          const q = query(activitiesRef, orderBy('date', 'desc'), fsLimit(40));
          const snap = await getDocs(q);
          const studentName = `${getStudentNickname(s)} ${s.lastName || ''}`.trim() || s.id;
          snap.forEach((docSnap) => {
            const data = docSnap.data() as { date?: number; desc?: string; amount?: number };
            rows.push({
              id: `${s.id}_${docSnap.id}`,
              studentId: s.id,
              studentName,
              date: data.date ?? 0,
              desc: data.desc ?? 'Activity',
              amount: Number(data.amount ?? 0),
            });
          });
        }),
      );
      rows.sort((a, b) => b.date - a.date);
      setStudentActivityLog(rows.slice(0, 300));
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Failed to load student activity',
        description: getReadableErrorMessage(error, 'Could not load student activity log.'),
      });
      setStudentActivityLog([]);
    } finally {
      setStudentActivityLogLoading(false);
    }
  }, [schoolId, students, firestore, toast]);

  useEffect(() => {
    if (!enabled || !schoolId || !students?.length) return;
    void loadStudentActivityLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, schoolId, students]);

  return {
    studentActivityLog,
    studentActivityLogLoading,
    loadStudentActivityLog,
  } as const;
}
