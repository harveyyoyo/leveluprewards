'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, QrCode, Shuffle, Sparkles, Timer, Users } from 'lucide-react';
import { cn, getStudentNickname } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useFirestore } from '@/firebase';
import { isPillarOn } from '@/lib/productPillars';
import { useTodayAttendanceMap } from '@/hooks/useTodayAttendanceMap';
import { useActiveBathroomPasses } from '@/hooks/useActiveBathroomPasses';
import { endBathroomPass } from '@/lib/db/bathroom';
import { awardClassroomPoints } from '@/lib/classroom/classroomPointsClient';
import {
  loadClassroomSession,
  subscribeClassroomSessionUpdates,
  type ClassroomSessionData,
} from '@/lib/classroomSeatingChart';
import { ClassroomScreenPairModal } from '@/components/classroom/ClassroomScreenPairModal';
import { RandomStudentPickerModal } from '@/components/classroom/RandomStudentPickerModal';
import { useToast } from '@/hooks/use-toast';
import type { Class, Student } from '@/lib/types';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

export function ClassroomTeachNowDock({
  schoolId,
  classes,
  students,
  variant,
  activeTeacherId,
  className,
}: {
  schoolId: string;
  classes: Class[];
  students: Student[];
  variant: 'admin' | 'teacher';
  activeTeacherId?: string;
  className?: string;
}) {
  const { settings } = useSettings();
  const { toast } = useToast();
  const firestore = useFirestore();
  const attendanceOn = isPillarOn(settings, 'payAttendance');
  const seatingScope = variant === 'admin' ? 'admin' : activeTeacherId || 'staff';

  const availableClasses = useMemo(
    () => classes.slice().sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    [classes],
  );

  const [selectedClassId, setSelectedClassId] = useState<string>(availableClasses[0]?.id || '');
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [isRandomModalOpen, setIsRandomModalOpen] = useState(false);
  const [sessionPoints, setSessionPoints] = useState(0);

  useEffect(() => {
    if (!selectedClassId && availableClasses.length > 0) {
      setSelectedClassId(availableClasses[0].id);
    }
  }, [availableClasses, selectedClassId]);

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

  const classActivePasses = useMemo(() => {
    const classStudentIds = new Set(classStudents.map((s) => s.id));
    const list: { studentId: string; studentName: string }[] = [];
    for (const [studentId, pass] of activePasses.entries()) {
      if (!classStudentIds.has(studentId)) continue;
      const s = classStudents.find((stud) => stud.id === studentId);
      list.push({
        studentId,
        studentName: s ? getStudentNickname(s) : 'Student',
      });
    }
    return list;
  }, [classStudents, activePasses]);

  const handleEndPass = async (studentId: string) => {
    try {
      await endBathroomPass(firestore, schoolId, studentId, settings.bathroomMaxMinutes || 5);
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

  if (availableClasses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className={cn('mx-auto max-w-5xl px-6', className)}
      >
        <div className="rounded-3xl border border-white/12 bg-white/[0.06] p-5 text-center text-sm text-white/60 backdrop-blur-md">
          Add a class and students first — then random pick, bathroom passes, and TV pairing show up here.
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
      className={cn('mx-auto max-w-5xl px-6', className)}
    >
      <motion.div
        variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
        transition={spring}
        className="rounded-3xl border border-white/12 bg-white/[0.06] p-4 shadow-xl shadow-black/20 backdrop-blur-md sm:p-5"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-[180px] sm:w-[220px]">
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="h-10 rounded-2xl border-white/20 bg-white/8 font-bold text-sm text-white">
                  <SelectValue placeholder="Pick a class" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {availableClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id} className="font-semibold">
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/12 bg-white/8 px-2.5 text-white/80">
                <Users className="h-3.5 w-3.5" aria-hidden />
                {classStudents.length} students
              </span>
              {attendanceOn ? (
                <span className="inline-flex h-8 items-center gap-2 rounded-xl border border-white/12 bg-white/8 px-2.5">
                  <span className="text-emerald-300">{attendanceStats.present} here</span>
                  {attendanceStats.late > 0 ? (
                    <span className="text-amber-300">{attendanceStats.late} late</span>
                  ) : null}
                  {attendanceStats.absent > 0 ? (
                    <span className="text-rose-300">{attendanceStats.absent} out</span>
                  ) : null}
                </span>
              ) : null}
              {classActivePasses.length > 0 ? (
                <span className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-amber-400 px-2.5 font-black text-black">
                  <Timer className="h-3.5 w-3.5" aria-hidden />
                  {classActivePasses.length} on bathroom pass
                </span>
              ) : null}
              <span
                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/12 bg-white/8 px-2.5"
                style={{ color: 'var(--cr-accent-text)' }}
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                +{sessionPoints} pts this session
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRandomModalOpen(true)}
              disabled={classStudents.length === 0}
              className="h-9 rounded-xl border-amber-300/40 bg-amber-400/10 font-bold text-xs text-amber-100 hover:bg-amber-400/20 hover:text-white"
            >
              <Shuffle className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Random pick
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPairModalOpen(true)}
              className="h-9 rounded-xl border-white/20 bg-white/8 font-bold text-xs text-white hover:bg-white/14 hover:text-white"
            >
              <QrCode className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Pair TV
            </Button>
          </div>
        </div>

        {classActivePasses.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-3">
            <p className="text-xs font-semibold text-amber-100">
              Out on a pass:{' '}
              <span className="font-bold text-white">
                {classActivePasses.map((p) => p.studentName).join(', ')}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {classActivePasses.map((p) => (
                <Button
                  key={p.studentId}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleEndPass(p.studentId)}
                  className="h-7 rounded-lg border-amber-200/40 bg-black/20 text-[11px] font-bold text-amber-50 hover:bg-amber-400/20"
                >
                  <Check className="mr-1 h-3 w-3 text-emerald-300" aria-hidden />
                  Return {p.studentName}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </motion.div>

      <ClassroomScreenPairModal
        isOpen={isPairModalOpen}
        onClose={() => setIsPairModalOpen(false)}
        schoolId={schoolId}
        classId={selectedClassId}
        classNameLabel={activeClass?.name || 'Classroom'}
        scope={seatingScope}
      />
      <RandomStudentPickerModal
        isOpen={isRandomModalOpen}
        onClose={() => setIsRandomModalOpen(false)}
        students={classStudents}
        onAward={handleRandomAward}
        defaultPoints={5}
        defaultReason="Random student spotlight"
      />
    </motion.div>
  );
}
