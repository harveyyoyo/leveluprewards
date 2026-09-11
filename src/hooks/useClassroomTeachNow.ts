'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFirestore } from '@/firebase';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useTodayAttendanceMap } from '@/hooks/useTodayAttendanceMap';
import { useActiveBathroomPasses } from '@/hooks/useActiveBathroomPasses';
import { useToast } from '@/hooks/use-toast';
import { endBathroomPass } from '@/lib/db/bathroom';
import { awardClassroomPoints } from '@/lib/classroom/classroomPointsClient';
import {
  pickClassroomActiveClass,
  rememberClassroomActiveClass,
} from '@/lib/classroom/classroomActiveClass';
import {
  loadClassroomSession,
  subscribeClassroomSessionUpdates,
  type ClassroomSessionData,
} from '@/lib/classroomSeatingChart';
import { isPillarOn } from '@/lib/productPillars';
import { getStudentNickname } from '@/lib/utils';
import type { Class, Student } from '@/lib/types';

export function useClassroomTeachNow({
  schoolId,
  classes,
  students,
  variant,
  activeTeacherId,
  initialClassId,
}: {
  schoolId: string;
  classes: Class[];
  students: Student[];
  variant: 'admin' | 'teacher';
  activeTeacherId?: string;
  initialClassId?: string;
}) {
  const { settings } = useSettings();
  const { toast } = useToast();
  const firestore = useFirestore();
  const attendanceOn = isPillarOn(settings, 'payAttendance');
  const seatingScope = variant === 'admin' ? 'admin' : activeTeacherId || 'staff';
  const bathroomMaxMinutes = Math.min(30, Math.max(1, settings.bathroomMaxMinutes ?? 5));

  const availableClasses = useMemo(
    () => classes.slice().sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    [classes],
  );

  const [selectedClassId, setSelectedClassId] = useState(() =>
    pickClassroomActiveClass(availableClasses, initialClassId),
  );
  const [sessionPoints, setSessionPoints] = useState(0);

  useEffect(() => {
    const next = pickClassroomActiveClass(availableClasses, initialClassId || selectedClassId);
    if (next && next !== selectedClassId) {
      setSelectedClassId(next);
    }
    // Only re-pick when the roster or an explicit class id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableClasses, initialClassId]);

  useEffect(() => {
    if (selectedClassId) rememberClassroomActiveClass(selectedClassId);
  }, [selectedClassId]);

  const activeClass = useMemo(
    () => availableClasses.find((c) => c.id === selectedClassId) || availableClasses[0] || null,
    [availableClasses, selectedClassId],
  );

  const classStudents = useMemo(() => {
    if (!activeClass) return students;
    return students.filter((s) => s.classId === activeClass.id);
  }, [students, activeClass]);

  const attendanceMap = useTodayAttendanceMap(schoolId, attendanceOn);
  const activePasses = useActiveBathroomPasses(schoolId, true);

  useEffect(() => {
    if (!schoolId || !selectedClassId) return;
    const initialSession = loadClassroomSession(schoolId, seatingScope, selectedClassId);
    setSessionPoints(Object.values(initialSession.totals || {}).reduce((a, b) => a + b, 0));

    const unsubscribe = subscribeClassroomSessionUpdates((_key, data: ClassroomSessionData) => {
      setSessionPoints(Object.values(data.totals || {}).reduce((a, b) => a + b, 0));
    });
    return () => unsubscribe();
  }, [schoolId, seatingScope, selectedClassId]);

  const attendanceStats = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    for (const student of classStudents) {
      const status = attendanceMap.get(student.id);
      if (status === 'on-time') present++;
      else if (status === 'late') late++;
      else if (status === 'absent') absent++;
    }
    return { present, late, absent };
  }, [classStudents, attendanceMap]);

  const allActivePasses = useMemo(() => {
    const list: { studentId: string; studentName: string; startedAt: number }[] = [];
    for (const [studentId, pass] of activePasses.entries()) {
      const s = students.find((stud) => stud.id === studentId);
      list.push({
        studentId,
        studentName: s ? getStudentNickname(s) : pass.studentName || 'Student',
        startedAt: pass.startedAt || Date.now(),
      });
    }
    return list;
  }, [students, activePasses]);

  const classActivePasses = useMemo(() => {
    const classStudentIds = new Set(classStudents.map((s) => s.id));
    return allActivePasses.filter((p) => classStudentIds.has(p.studentId));
  }, [classStudents, allActivePasses]);

  const handleEndPass = async (studentId: string) => {
    try {
      await endBathroomPass(firestore, schoolId, studentId, bathroomMaxMinutes);
      toast({
        title: 'Back in class',
        description: 'Bathroom pass ended.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Could not end pass',
        description: 'Please try again.',
      });
    }
  };

  const handleRandomAward = async (studentId: string, pts: number, reason: string) => {
    const result = await awardClassroomPoints(firestore, {
      schoolId,
      studentIds: [studentId],
      signedDelta: pts,
      description: reason,
      rewardsMode: true,
      classId: selectedClassId,
      className: activeClass?.name,
      teacherId: activeTeacherId || '',
      teacherName: variant === 'admin' ? 'Administrator' : 'Teacher',
    });
    if (!result.success) {
      throw new Error(result.message);
    }
    toast({
      title: 'Spotlight awarded',
      description: `Gave +${pts} points.`,
    });
  };

  return {
    attendanceOn,
    seatingScope,
    bathroomMaxMinutes,
    availableClasses,
    selectedClassId,
    setSelectedClassId,
    activeClass,
    classStudents,
    sessionPoints,
    attendanceStats,
    allActivePasses,
    classActivePasses,
    handleEndPass,
    handleRandomAward,
  };
}
