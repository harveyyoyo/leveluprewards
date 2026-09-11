'use client';

import { motion } from 'framer-motion';
import { Check, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBathroomElapsed, isBathroomOverLimit } from '@/lib/bathroom/formatBathroomElapsed';
import { cn } from '@/lib/utils';

export type ClassroomWhosOutPass = {
  studentId: string;
  studentName: string;
  startedAt?: number;
};

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

export function ClassroomWhosOutPulse({
  passes,
  maxMinutes = 5,
  onReturn,
  className,
}: {
  passes: ClassroomWhosOutPass[];
  maxMinutes?: number;
  onReturn?: (studentId: string) => void;
  className?: string;
}) {
  const someoneOut = passes.length > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3',
        someoneOut
          ? 'border-amber-300/30 bg-amber-400/10'
          : 'border-white/12 bg-white/6',
        className,
      )}
      aria-live="polite"
    >
      <p
        className={cn(
          'flex items-center gap-2 text-xs font-semibold',
          someoneOut ? 'text-amber-100' : 'text-white/70',
        )}
      >
        <Timer className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {someoneOut ? (
          <>
            Who&apos;s out:{' '}
            <span className="font-bold text-white">
              {passes.map((p) => p.studentName).join(', ')}
            </span>
          </>
        ) : (
          <span>Who&apos;s out: everyone is in class</span>
        )}
      </p>
      {someoneOut && onReturn ? (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
          className="flex flex-wrap gap-2"
        >
          {passes.map((p) => {
            const elapsed = p.startedAt ? Date.now() - p.startedAt : 0;
            const over = p.startedAt ? isBathroomOverLimit(elapsed, maxMinutes) : false;
            return (
              <motion.div
                key={p.studentId}
                variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
                transition={spring}
              >
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onReturn(p.studentId)}
                  className={cn(
                    'h-7 rounded-lg text-[11px] font-bold',
                    over
                      ? 'border-rose-300/50 bg-rose-500/20 text-rose-50 hover:bg-rose-500/30'
                      : 'border-amber-200/40 bg-black/20 text-amber-50 hover:bg-amber-400/20',
                  )}
                >
                  <Check className="mr-1 h-3 w-3 text-emerald-300" aria-hidden />
                  Return {p.studentName}
                  {p.startedAt ? (
                    <span className="ml-1.5 font-mono tabular-nums">
                      {formatBathroomElapsed(elapsed)}
                    </span>
                  ) : null}
                </Button>
              </motion.div>
            );
          })}
        </motion.div>
      ) : null}
    </motion.div>
  );
}
