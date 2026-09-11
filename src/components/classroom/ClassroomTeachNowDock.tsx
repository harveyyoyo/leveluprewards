'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Dices, Shuffle, Sparkles, Timer, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClassroomWhosOutPulse } from '@/components/classroom/ClassroomWhosOutPulse';
import { RandomStudentPickerModal } from '@/components/classroom/RandomStudentPickerModal';
import { useClassroomTeachNow } from '@/hooks/useClassroomTeachNow';
import { classroomRealmManageHref } from '@/lib/classroomRealmUrl';
import { isClassroomRaffleSectionVisible } from '@/lib/classroom/classroomTabSections';
import { useSettings } from '@/components/providers/SettingsProvider';
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
  const teach = useClassroomTeachNow({
    schoolId,
    classes,
    students,
    variant,
    activeTeacherId,
  });
  const [isRandomModalOpen, setIsRandomModalOpen] = useState(false);
  const { settings } = useSettings();
  const showRaffle = isClassroomRaffleSectionVisible(settings, variant);

  if (teach.availableClasses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className={cn('mx-auto max-w-5xl px-6', className)}
      >
        <div className="rounded-3xl border border-white/12 bg-white/[0.06] p-5 text-center text-sm text-white/60 backdrop-blur-md">
          Add a class and students first — then random pick, bathroom passes, and raffle show up here.
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className={cn('mx-auto max-w-5xl px-6', className)}
    >
      <motion.div
        layoutId="classroom-teach-now"
        className="rounded-3xl border border-white/30 bg-black/55 p-4 shadow-xl shadow-black/40 backdrop-blur-md sm:p-5"
      >
        <p
          className="mb-3 text-[10px] font-black uppercase tracking-[0.28em]"
          style={{ color: 'var(--cr-accent-text)' }}
        >
          Today&apos;s class
        </p>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-[180px] sm:w-[220px]">
              <Select value={teach.selectedClassId} onValueChange={teach.setSelectedClassId}>
                <SelectTrigger className="h-10 rounded-2xl border-white/20 bg-white/8 font-bold text-sm text-white">
                  <SelectValue placeholder="Pick a class" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {teach.availableClasses.map((cls) => (
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
                {teach.classStudents.length} students
              </span>
              {teach.attendanceOn ? (
                <span className="inline-flex h-8 items-center gap-2 rounded-xl border border-white/12 bg-white/8 px-2.5">
                  <span className="text-emerald-300">{teach.attendanceStats.present} here</span>
                  {teach.attendanceStats.late > 0 ? (
                    <span className="text-amber-300">{teach.attendanceStats.late} late</span>
                  ) : null}
                  {teach.attendanceStats.absent > 0 ? (
                    <span className="text-rose-300">{teach.attendanceStats.absent} out</span>
                  ) : null}
                </span>
              ) : null}
              <span
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-xl px-2.5',
                  teach.classActivePasses.length > 0
                    ? 'bg-amber-400 font-black text-black'
                    : 'border border-white/12 bg-white/8 text-white/70',
                )}
              >
                <Timer className="h-3.5 w-3.5" aria-hidden />
                {teach.classActivePasses.length > 0
                  ? `${teach.classActivePasses.length} on bathroom pass`
                  : 'Nobody out'}
              </span>
              <span
                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/12 bg-white/8 px-2.5"
                style={{ color: 'var(--cr-accent-text)' }}
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                +{teach.sessionPoints} pts this session
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRandomModalOpen(true)}
              disabled={teach.classStudents.length === 0}
              className="h-9 rounded-xl border-amber-300/40 bg-amber-400/10 font-bold text-xs text-amber-100 hover:bg-amber-400/20 hover:text-white"
            >
              <Shuffle className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Random pick
            </Button>
            {showRaffle ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 rounded-xl border-white/20 bg-white/8 font-bold text-xs text-white hover:bg-white/14 hover:text-white"
              >
                <Link href={classroomRealmManageHref(schoolId, 'raffle')}>
                  <Dices className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Raffle
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <ClassroomWhosOutPulse
          className="mt-4"
          passes={teach.classActivePasses}
          maxMinutes={teach.bathroomMaxMinutes}
          onReturn={(id) => void teach.handleEndPass(id)}
        />
      </motion.div>

      <RandomStudentPickerModal
        isOpen={isRandomModalOpen}
        onClose={() => setIsRandomModalOpen(false)}
        students={teach.classStudents}
        onAward={teach.handleRandomAward}
        defaultPoints={5}
        defaultReason="Random student spotlight"
      />
    </motion.div>
  );
}
