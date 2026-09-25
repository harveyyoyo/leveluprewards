'use client';

import { motion } from 'framer-motion';
import { Check, ClipboardCheck, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

const lightActionClass =
  'classroom-light-ink inline-flex h-11 min-w-[8.5rem] items-center justify-center gap-1.5 rounded-xl border-2 border-[#0F172A] px-4 text-sm font-bold leading-none !text-[#0F172A] shadow-sm';

export function ClassroomAttendanceModeBanner({
  onMarkAllPresent,
  onDone,
  onStartNewClass,
  busy = false,
}: {
  onMarkAllPresent: () => void;
  onDone: () => void;
  onStartNewClass?: () => void;
  busy?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      // `bg-emerald-500` only reads ~2.5:1 against the fixed white text below —
      // `emerald-700` clears AA (~5.5:1) while staying on-brand.
      className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border-2 border-[#0F172A] bg-emerald-700 px-5 py-4 shadow-md"
      role="status"
      aria-label="Attendance mode. Tap a desk for present or absent. Hold a desk for late."
    >
      <ClipboardCheck className="h-7 w-7 shrink-0 text-white" aria-hidden />
      <div className="min-w-0 flex-1">
        <p
          className="classroom-on-dark text-base font-black leading-snug sm:text-lg"
          style={{ color: '#fff' }}
        >
          Attendance Mode · Tap = Present/Absent · Hold = Late
        </p>
        <p className="classroom-on-dark mt-1 text-sm font-bold leading-snug" style={{ color: '#fff' }}>
          Right-click also works with a mouse.
        </p>
      </div>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { ...spring, staggerChildren: 0.06 } },
        }}
        className="flex flex-wrap items-center gap-2"
      >
        {onStartNewClass ? (
          <motion.button
            type="button"
            variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: spring } }}
            className={cn(lightActionClass, 'bg-white', busy && 'opacity-70')}
            style={{ color: '#0F172A' }}
            disabled={busy}
            onClick={onStartNewClass}
          >
            <RotateCcw className="h-4 w-4 shrink-0" aria-hidden />
            Start new class
          </motion.button>
        ) : null}
        <motion.button
          type="button"
          variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: spring } }}
          className={cn(lightActionClass, 'bg-white', busy && 'opacity-70')}
          style={{ color: '#0F172A' }}
          disabled={busy}
          onClick={onMarkAllPresent}
        >
          <Check className="h-4 w-4 shrink-0" aria-hidden />
          Mark All Present
        </motion.button>
        <motion.button
          type="button"
          variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: spring } }}
          className="classroom-on-dark inline-flex h-11 min-w-[8.5rem] items-center justify-center rounded-xl border-2 border-white/40 bg-[#0F172A] px-5 text-sm font-bold leading-none text-white shadow-md"
          style={{ color: '#fff', backgroundColor: '#0F172A' }}
          onClick={onDone}
        >
          Done / Save
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
