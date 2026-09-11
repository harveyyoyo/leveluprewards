'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClassroomWhosOutPulse } from '@/components/classroom/ClassroomWhosOutPulse';
import { RandomStudentPickerModal } from '@/components/classroom/RandomStudentPickerModal';
import { classroomRealmHref } from '@/lib/classroomRealmUrl';
import type { Student } from '@/lib/types';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

export function ClassroomLiveTeachChrome({
  schoolId,
  classNameLabel,
  students,
  sessionPoints,
  passes,
  bathroomMaxMinutes,
  onReturn,
  onAward,
}: {
  schoolId: string;
  classId: string;
  classNameLabel: string;
  scope: string;
  students: Student[];
  sessionPoints: number;
  passes: { studentId: string; studentName: string; startedAt?: number }[];
  bathroomMaxMinutes: number;
  onReturn: (studentId: string) => void;
  onAward: (studentId: string, points: number, reason: string) => Promise<void>;
}) {
  const [randomOpen, setRandomOpen] = useState(false);

  return (
    <>
      <motion.div
        layoutId="classroom-teach-now"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="shrink-0 border-b border-white/12 bg-black/35 px-3 py-2.5 backdrop-blur-md"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              asChild
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-xl border-white/20 bg-white/8 text-xs font-bold text-white hover:bg-white/14 hover:text-white"
            >
              <Link href={classroomRealmHref(schoolId, '')}>
                <Home className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Ready for class
              </Link>
            </Button>
            <p className="text-xs font-bold text-white/80">{classNameLabel}</p>
            <span
              className="inline-flex h-7 items-center rounded-lg border border-white/12 bg-white/8 px-2 text-[11px] font-bold"
              style={{ color: 'var(--cr-accent-text)' }}
            >
              +{sessionPoints} this session
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRandomOpen(true)}
              disabled={students.length === 0}
              className="h-8 rounded-xl border-amber-300/40 bg-amber-400/10 text-xs font-bold text-amber-100 hover:bg-amber-400/20 hover:text-white"
            >
              <Shuffle className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Random pick
            </Button>
          </div>
        </div>
        <ClassroomWhosOutPulse
          className="mt-2"
          passes={passes}
          maxMinutes={bathroomMaxMinutes}
          onReturn={onReturn}
        />
      </motion.div>
      <RandomStudentPickerModal
        isOpen={randomOpen}
        onClose={() => setRandomOpen(false)}
        students={students}
        onAward={onAward}
        defaultPoints={5}
        defaultReason="Random student spotlight"
      />
    </>
  );
}
