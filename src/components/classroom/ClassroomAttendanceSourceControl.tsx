'use client';

import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, IdCard, RotateCcw, Settings2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { ClassroomAttendanceSource } from '@/lib/classroom/classroomAttendanceSource';
import { type ClassroomDesign } from '@/components/points/classroomVisualTheme';
import { cn } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

export function ClassroomAttendanceSourceControl({
  triggerClassName,
  triggerStyle,
  source,
  takingAttendance,
  onSourceChange,
  onStartNewClass,
}: {
  design: ClassroomDesign;
  isFullscreen: boolean;
  triggerClassName: string;
  triggerStyle?: CSSProperties;
  source: ClassroomAttendanceSource;
  takingAttendance: boolean;
  onSourceChange: (source: ClassroomAttendanceSource) => void;
  onStartNewClass?: () => void;
}) {
  const cardScan = source === 'card-scan' && !takingAttendance;
  return (
    <Popover modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          style={triggerStyle}
          className={cn(
            triggerClassName,
            takingAttendance && 'ring-2 ring-[#0F172A] ring-offset-1',
          )}
          aria-label={
            takingAttendance
              ? 'Attendance: manual roll call. Open settings'
              : cardScan
                ? 'Attendance: Badge reader active. Open settings'
                : 'Attendance settings'
          }
          title="Choose card scan or manual roll call"
        >
          {cardScan ? <IdCard className="h-4 w-4 shrink-0" aria-hidden /> : <ClipboardCheck className="h-4 w-4 shrink-0" aria-hidden />}
          <span className="min-w-0 flex-1 text-left tracking-normal">
            {takingAttendance
              ? 'Taking roll — tap desks'
              : cardScan
                ? 'Attendance: Badge reader active'
                : 'Attendance: Manual roll call'}
          </span>
          <Settings2 className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="z-[500] w-80 rounded-xl p-3" align="start" collisionPadding={12}>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { ...spring, staggerChildren: 0.06 } },
          }}
          className="space-y-2"
        >
          <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Attendance source</p>
          <motion.button
            type="button"
            variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: spring } }}
            className={cn(
              'flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm',
              source === 'card-scan' && !takingAttendance
                ? 'border-emerald-400 bg-emerald-50 text-[#102033]'
                : 'border-border hover:bg-muted/60',
            )}
            onClick={() => onSourceChange('card-scan')}
          >
            <span className="mt-0.5 text-base" aria-hidden>
              {source === 'card-scan' && !takingAttendance ? '◉' : '○'}
            </span>
            <span>
              <span className="block font-black">Student badge / Card scan</span>
              <span className="block text-xs text-muted-foreground">Automatic — desks update when kids check in</span>
            </span>
          </motion.button>
          <motion.button
            type="button"
            variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: spring } }}
            className={cn(
              'flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm',
              takingAttendance || source === 'manual'
                ? 'border-sky-400 bg-sky-50 text-[#0b1f33]'
                : 'border-border hover:bg-muted/60',
            )}
            onClick={() => onSourceChange('manual')}
          >
            <span className="mt-0.5 text-base" aria-hidden>
              {takingAttendance || source === 'manual' ? '◉' : '○'}
            </span>
            <span>
              <span className="block font-black">Manual screen roll call</span>
              <span className="block text-xs text-muted-foreground">Tap desks to mark who is here</span>
            </span>
          </motion.button>
          {onStartNewClass ? (
            <motion.button
              type="button"
              variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: spring } }}
              className="classroom-on-dark mt-1 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0F172A] bg-[#0F172A] px-3 py-3 text-sm font-black text-white shadow-sm hover:bg-[#1e293b]"
              style={{ color: '#fff', backgroundColor: '#0F172A' }}
              onClick={onStartNewClass}
            >
              <RotateCcw className="h-4 w-4 shrink-0" aria-hidden />
              Start new class
            </motion.button>
          ) : null}
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}
