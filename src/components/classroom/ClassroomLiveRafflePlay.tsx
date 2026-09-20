'use client';

import { motion } from 'framer-motion';
import { ChevronDown, Dices, Disc3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import type { RafflePoolScope } from '@/lib/rafflePool';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

export function ClassroomLiveRafflePlay({
  eligibleCount,
  onTimeCount,
  attendanceAvailable,
  poolScope,
  onPoolScopeChange,
  statusText,
  winnerName,
  rulesOpen,
  onRulesOpenChange,
  rulesPanel,
  entriesCount,
  entriesOpen,
  onEntriesOpenChange,
  entriesPanel,
  onSpinReels,
  onSpinWheel,
  canSpin,
  projectorOn = false,
  onProjectorOnChange,
}: {
  eligibleCount: number;
  onTimeCount: number;
  attendanceAvailable: boolean;
  poolScope: RafflePoolScope;
  onPoolScopeChange: (scope: RafflePoolScope) => void;
  statusText: string;
  winnerName?: string | null;
  rulesOpen: boolean;
  onRulesOpenChange: (open: boolean) => void;
  rulesPanel: ReactNode;
  entriesCount: number;
  entriesOpen: boolean;
  onEntriesOpenChange: (open: boolean) => void;
  entriesPanel: ReactNode;
  onSpinReels: () => void;
  onSpinWheel: () => void;
  canSpin: boolean;
  projectorOn?: boolean;
  onProjectorOnChange?: (on: boolean) => void;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { ...spring, staggerChildren: 0.08 } },
      }}
      className="flex flex-col gap-3"
    >
      <section className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-700">Choose draw style</p>
        <div className="grid grid-cols-2 gap-2">
          <motion.div
            layoutId="classroom-raffle-style-jackpot"
            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: spring } }}
            className="flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-3 text-white shadow-lg shadow-violet-900/25"
          >
            <span className="text-3xl leading-none" aria-hidden>
              🎰
            </span>
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-black">
              <Dices className="h-4 w-4 shrink-0" aria-hidden />
              Jackpot (Reels)
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-white/85">Three reels. Big finish.</p>
            <button
              type="button"
              className="classroom-light-ink mt-3 inline-flex h-11 items-center justify-center rounded-xl bg-white text-sm font-black uppercase tracking-wide !text-[#0F172A] shadow-md transition hover:-translate-y-0.5 hover:bg-amber-200 hover:!text-[#0F172A] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSpin}
              onClick={onSpinReels}
            >
              <span className="classroom-light-ink !text-[#0F172A]">Spin Reels</span>
            </button>
          </motion.div>
          <motion.div
            layoutId="classroom-raffle-style-wheel"
            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: spring } }}
            className="flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-600 to-rose-600 p-3 text-white shadow-lg shadow-rose-900/25"
          >
            <span className="text-3xl leading-none" aria-hidden>
              🎡
            </span>
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-black">
              <Disc3 className="h-4 w-4 shrink-0" aria-hidden />
              Spinning Wheel
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-white/85">One spin. One winner.</p>
            <button
              type="button"
              className="classroom-light-ink mt-3 inline-flex h-11 items-center justify-center rounded-xl bg-white text-sm font-black uppercase tracking-wide !text-[#0F172A] shadow-md transition hover:-translate-y-0.5 hover:bg-amber-200 hover:!text-[#0F172A] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSpin}
              onClick={onSpinWheel}
            >
              <span className="classroom-light-ink !text-[#0F172A]">Spin Wheel</span>
            </button>
          </motion.div>
        </div>
        {onProjectorOnChange ? (
          <>
            <button
              type="button"
              role="switch"
              aria-checked={projectorOn}
              aria-label="Show on projector"
              className={cn(
                'classroom-light-ink classroom-readable mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-black tracking-normal',
                projectorOn
                  ? 'border-amber-400 bg-amber-200 !text-[#0F172A]'
                  : 'border-rose-200 bg-white !text-[#0F172A] hover:bg-amber-50',
              )}
              onClick={() => onProjectorOnChange(!projectorOn)}
            >
              <span className="tracking-normal">{projectorOn ? 'Show on projector ✓' : 'Show on projector'}</span>
            </button>
            {projectorOn ? (
              <p className="classroom-readable text-center text-[11px] font-semibold tracking-normal text-rose-800">
                The big spin shows on the class screen only.
              </p>
            ) : null}
          </>
        ) : null}
      </section>

      <motion.section
        variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: spring } }}
        className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50/80 p-3"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-700">Who&apos;s in the draw</p>
        <div
          role="radiogroup"
          aria-label="Who is in the draw"
          className="grid grid-cols-2 gap-1 rounded-xl bg-white p-1 shadow-inner"
        >
          <button
            type="button"
            role="radio"
            aria-checked={poolScope === 'eligible'}
            className={cn(
              'classroom-light-ink rounded-lg px-2 py-2 text-center text-xs font-semibold tracking-normal transition',
              poolScope === 'eligible'
                ? 'bg-rose-600 !text-white shadow-sm'
                : 'text-slate-800 hover:bg-rose-100',
            )}
            onClick={() => onPoolScopeChange('eligible')}
          >
            All Qualified ({eligibleCount})
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={poolScope === 'onTimeToday'}
            disabled={!attendanceAvailable}
            title={attendanceAvailable ? 'Only students who signed in on time today' : 'Turn on class sign-in to use this'}
            className={cn(
              'classroom-light-ink rounded-lg px-2 py-2 text-center text-xs font-semibold tracking-normal transition',
              poolScope === 'onTimeToday'
                ? 'bg-rose-600 !text-white shadow-sm'
                : 'text-slate-800 hover:bg-rose-100',
              !attendanceAvailable && 'cursor-not-allowed opacity-45 hover:bg-transparent',
            )}
            onClick={() => attendanceAvailable && onPoolScopeChange('onTimeToday')}
          >
            On-Time Only ({onTimeCount})
          </button>
        </div>
        <p className="classroom-light-ink whitespace-normal rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-center text-sm font-semibold leading-relaxed tracking-normal text-slate-900">
          {statusText.split('•').map((part, index) => (
            <span key={`${part}-${index}`}>
              {index > 0 ? ' • ' : null}
              {part.trim()}
            </span>
          ))}
        </p>
        {winnerName ? (
          <p className="text-center text-sm font-black text-rose-800">Last winner: {winnerName}</p>
        ) : null}
      </motion.section>

      <motion.div
        variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: spring } }}
        className="space-y-1.5"
      >
        <LiveRaffleAccordion
          open={rulesOpen}
          onOpenChange={onRulesOpenChange}
          label="Advanced Pool Rules & Ticket Costs"
        >
          {rulesPanel}
        </LiveRaffleAccordion>
        <LiveRaffleAccordion
          open={entriesOpen}
          onOpenChange={onEntriesOpenChange}
          label={`Preview ${entriesCount} ${entriesCount === 1 ? 'Entry' : 'Entries'}`}
        >
          {entriesPanel}
        </LiveRaffleAccordion>
      </motion.div>
    </motion.div>
  );
}

function LiveRaffleAccordion({
  open,
  onOpenChange,
  label,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-black text-slate-800 hover:bg-slate-50"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <span>{label}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open ? <div className="max-h-[min(18rem,40vh)] overflow-y-auto border-t border-slate-200 p-3">{children}</div> : null}
    </div>
  );
}
