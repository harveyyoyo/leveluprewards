'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, Zap } from 'lucide-react';
import type { ClassroomDesign } from '@/lib/classroomSeatingChart';
import { classroomSidebarToolAppearance, classroomSidebarToolTint } from '@/lib/classroom/classroomTokenTheme';
import { cn } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };
const PRESETS = [1, 2, 5, 10, 15, 20];

export function clampClassAwardPoints(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(99, Math.round(value)));
}

export function ClassroomWholeClassAwardControl({
  points,
  onPointsChange,
  onAward,
  disabled = false,
  design = 'aurora',
}: {
  points: number;
  onPointsChange: (points: number) => void;
  onAward: () => void;
  disabled?: boolean;
  design?: ClassroomDesign;
}) {
  const look = classroomSidebarToolAppearance(design, 'gold');
  const tint = classroomSidebarToolTint(design, 'gold');
  const ink = look.ink === 'dark' ? 'text-slate-900' : 'text-white';
  const amount = clampClassAwardPoints(points);
  const awardLabel = `Give everyone +${amount}`;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(amount));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(String(amount));
  }, [amount, editing]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const setPoints = (next: number) => {
    onPointsChange(clampClassAwardPoints(next));
  };

  const commitDraft = () => {
    const parsed = Number.parseInt(draft.replace(/[^\d]/g, ''), 10);
    setPoints(Number.isFinite(parsed) ? parsed : amount);
    setEditing(false);
  };

  return (
    <div className="classroom-whole-class-award w-full min-w-0 space-y-1.5">
      <div className="flex w-full overflow-hidden rounded-xl shadow-sm shadow-black/10 transition-all hover:shadow-md">
        <button
          type="button"
          className={cn(
            'inline-flex h-10 w-9 shrink-0 items-center justify-center border-0 font-black',
            ink,
          )}
          style={look.style}
          aria-label="Fewer points for everyone"
          onClick={() => setPoints(amount - 1)}
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <div className={cn('flex min-w-0 flex-1 items-stretch', ink)} style={look.style}>
          <button
            type="button"
            className="inline-flex shrink-0 items-center pl-2"
            disabled={disabled}
            onClick={onAward}
            title="Gives these points to every student on the chart"
            aria-label={awardLabel}
          >
            <Zap className={cn('h-4 w-4 shrink-0', ink)} aria-hidden />
          </button>
          {editing ? (
            <input
              ref={inputRef}
              inputMode="numeric"
              aria-label="Type points for everyone"
              className={cn('h-10 w-12 min-w-0 bg-transparent text-center text-sm font-black tabular-nums outline-none', ink)}
              value={draft}
              onChange={(event) => setDraft(event.target.value.replace(/[^\d]/g, '').slice(0, 2))}
              onBlur={commitDraft}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitDraft();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setDraft(String(amount));
                  setEditing(false);
                }
              }}
            />
          ) : (
            <button
              type="button"
              className={cn('h-10 min-w-[2.5rem] px-1 text-sm font-black tabular-nums', ink)}
              aria-label={`Change class points amount, currently ${amount}`}
              title="Click to type a number"
              onClick={() => setEditing(true)}
            >
              <motion.span layoutId="classroom-class-award-amount" transition={spring} className="whitespace-nowrap">
                +{amount}
              </motion.span>
            </button>
          )}
          <button
            type="button"
            className={cn('min-w-0 flex-1 pr-2 text-left text-xs font-black sm:text-sm', ink)}
            disabled={disabled}
            onClick={onAward}
            title="Gives these points to every student on the chart"
            aria-label={awardLabel}
          >
            <span className="whitespace-nowrap tracking-normal"> to Class</span>
          </button>
        </div>
        <button
          type="button"
          className={cn(
            'inline-flex h-10 w-9 shrink-0 items-center justify-center border-0 font-black',
            ink,
          )}
          style={look.style}
          aria-label="More points for everyone"
          onClick={() => setPoints(amount + 1)}
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { ...spring, staggerChildren: 0.04 } },
        }}
        className="grid grid-cols-6 gap-1"
        aria-label="Quick class points"
      >
        {PRESETS.map((preset) => (
          <motion.button
            key={preset}
            type="button"
            variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: spring } }}
            className={cn(
              'rounded-xl border px-1 py-1 text-[11px] font-medium tracking-normal shadow-sm shadow-black/10 transition-all hover:-translate-y-0.5 hover:shadow-md',
              amount === preset ? 'text-slate-900' : 'text-slate-800',
            )}
            style={{
              backgroundColor: amount === preset ? tint : 'color-mix(in oklab, white 55%, ' + tint + ')',
              borderColor: look.style.backgroundColor,
            }}
            onClick={() => setPoints(preset)}
          >
            +{preset}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
