'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatBathroomElapsed, isBathroomOverLimit } from '@/lib/bathroom/formatBathroomElapsed';
import {
  classroomWhosOutDisplayName,
  classroomWhosOutShowsPassType,
  type ClassroomWhosOutPass,
} from '@/lib/classroom/classroomWhosOutPasses';
import { cn } from '@/lib/utils';

export type { ClassroomWhosOutPass };

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function chipClock(elapsedMs: number) {
  const totalSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function ClassroomWhosOutPulse({
  passes,
  maxMinutes = 5,
  onReturn,
  className,
  variant = 'bar',
}: {
  passes: ClassroomWhosOutPass[];
  maxMinutes?: number;
  onReturn?: (studentId: string) => void;
  className?: string;
  variant?: 'bar' | 'chip';
}) {
  const someoneOut = passes.length > 0;
  const showType = classroomWhosOutShowsPassType(passes);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (variant !== 'chip' || !someoneOut) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [someoneOut, variant]);

  if (variant === 'chip') {
    const lead = passes[0];
    const elapsed = lead?.startedAt ? now - lead.startedAt : 0;
    const leadLabel = lead
      ? `${firstName(lead.studentName || 'Student')} · ${lead.passLabel}`
      : 'Student';
    const label = !someoneOut
      ? 'Hall: All Clear'
      : passes.length > 1
        ? `${passes.length} out`
        : `${leadLabel} (${chipClock(elapsed)})`;
    const chipClass = cn(
      'classroom-light-ink classroom-header-chip classroom-readable inline-flex h-8 min-w-0 max-w-full items-center overflow-hidden whitespace-nowrap rounded-full border px-3 text-xs font-bold tracking-normal !text-[#102033]',
      someoneOut ? 'border-amber-400 bg-amber-100' : 'border-emerald-400 bg-emerald-100',
      className,
    );

    if (!someoneOut || !onReturn || !lead) {
      return (
        <motion.button
          type="button"
          layout
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className={chipClass}
          aria-label="Hall: All Clear"
          title="Everyone is in class"
          disabled
        >
          <span className="min-w-0 truncate">Hall: All Clear</span>
        </motion.button>
      );
    }

    return (
      <Popover modal>
        <PopoverTrigger asChild>
          <motion.button
            type="button"
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className={chipClass}
            aria-label={`Who is out: ${label}`}
            title="Tap to see who is out and send them back"
          >
            <span className="min-w-0 truncate">{label}</span>
          </motion.button>
        </PopoverTrigger>
        <PopoverContent
          className="classroom-light-ink classroom-readable z-[500] w-auto min-w-[20rem] max-w-[min(24rem,calc(100vw-1.5rem))] rounded-xl border border-amber-300 bg-white p-3 !text-[#102033] shadow-lg"
          align="center"
          collisionPadding={12}
        >
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0, transition: { ...spring, staggerChildren: 0.06 } },
            }}
            className="space-y-2"
          >
            <p className="classroom-readable text-xs font-bold tracking-normal !text-[#102033]">
              Who&apos;s out
            </p>
            {passes.map((p) => {
              const passElapsed = p.startedAt ? now - p.startedAt : 0;
              const over = p.startedAt ? isBathroomOverLimit(passElapsed, p.maxMinutes ?? maxMinutes) : false;
              const givenName = firstName(p.studentName || 'Student');
              const clock = p.startedAt ? chipClock(passElapsed) : null;
              return (
                <motion.div
                  key={`${p.source}-${p.studentId}`}
                  variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: spring } }}
                  className="flex items-center gap-3 rounded-xl border border-amber-200 bg-white px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'classroom-readable whitespace-normal break-words text-sm font-bold tracking-normal !text-[#102033]',
                        over && '!text-rose-800',
                      )}
                    >
                      {`${givenName} · ${p.passLabel}`}
                    </p>
                    {clock ? (
                      <p className="classroom-readable mt-0.5 font-mono text-xs font-semibold tabular-nums tracking-normal !text-[#102033]">
                        {clock}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-100 px-3 text-xs font-bold tracking-normal !text-[#102033] hover:bg-emerald-200"
                    aria-label={`Return ${givenName}`}
                    onClick={() => onReturn(p.studentId)}
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden />
                    Return
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        </PopoverContent>
      </Popover>
    );
  }

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
          someoneOut ? 'text-amber-100' : '!text-white',
        )}
      >
        <Timer className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {someoneOut ? (
          <>
            Who&apos;s out:{' '}
            <span className="font-bold text-white">
              {passes.map((p) => classroomWhosOutDisplayName(p, showType)).join(', ')}
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
            const limit = p.maxMinutes ?? maxMinutes;
            const over = p.startedAt ? isBathroomOverLimit(elapsed, limit) : false;
            const label = classroomWhosOutDisplayName(p, showType);
            return (
              <motion.div
                key={`${p.source}-${p.studentId}`}
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
                  Return {label}
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
