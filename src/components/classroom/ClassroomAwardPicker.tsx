'use client';

import { motion } from 'framer-motion';
import { replaceForbiddenQuickTapLabel } from '@/lib/classroom/classroomAwardLabel';
import type { ClassroomSeatingPrefs } from '@/lib/classroomSeatingChart';
import type { Student } from '@/lib/types';
import { cn, getStudentNickname } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

const PILL_LOOKS = [
  { emoji: '🌟', className: 'bg-amber-100 text-amber-950 border-amber-200 hover:bg-amber-200' },
  { emoji: '💡', className: 'bg-sky-100 text-sky-950 border-sky-200 hover:bg-sky-200' },
  { emoji: '🤝', className: 'bg-violet-100 text-violet-950 border-violet-200 hover:bg-violet-200' },
  { emoji: '🎯', className: 'bg-emerald-100 text-emerald-950 border-emerald-200 hover:bg-emerald-200' },
  { emoji: '🔥', className: 'bg-rose-100 text-rose-950 border-rose-200 hover:bg-rose-200' },
] as const;

function awardLook(label: string, index: number) {
  const lower = label.toLowerCase();
  if (lower.includes('super')) return PILL_LOOKS[0];
  if (lower.includes('question') || lower.includes('insight')) return PILL_LOOKS[1];
  if (lower.includes('team') || lower.includes('help')) return PILL_LOOKS[2];
  if (lower.includes('effort') || lower.includes('job')) return PILL_LOOKS[3];
  return PILL_LOOKS[index % PILL_LOOKS.length];
}

export function ClassroomAwardPicker({
  student,
  prefs,
  onPick,
  onBehaviorNote,
  onCancel,
}: {
  student: Student;
  prefs: ClassroomSeatingPrefs;
  onPick: (points: number, description: string) => void;
  onBehaviorNote?: () => void;
  onCancel: () => void;
}) {
  const awards = prefs.quickAwards.filter(Boolean);
  const defaultAward =
    awards.find((award) => award.points === prefs.defaultPoints) ??
    awards.find((award) => award.description === prefs.defaultDescription) ??
    null;
  const otherAwards = awards.filter((award) => award !== defaultAward);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-label={`Award points to ${getStudentNickname(student)}`}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={spring}
        className="classroom-light-ink max-h-[min(90vh,640px)] w-full max-w-sm overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <p className="text-center text-sm font-black text-slate-900">{getStudentNickname(student)}</p>
        <p className="mb-3 text-center text-xs font-semibold text-slate-600">Pick an award</p>

        {defaultAward ? (
          <button
            type="button"
            // `bg-emerald-500` reads ~2.5:1 against the fixed white text —
            // `emerald-700` clears AA (~5.5:1); `emerald-800` on hover stays readable too.
            className="mx-auto mb-3 inline-flex h-8 items-center gap-1 rounded-full bg-emerald-700 px-3 text-xs font-black text-white shadow-sm shadow-emerald-700/20 hover:bg-emerald-800"
            onClick={(event) => {
              event.stopPropagation();
              onPick(defaultAward.points, defaultAward.description);
            }}
          >
            <span aria-hidden>⚡</span>
            Quick +{defaultAward.points}
          </button>
        ) : null}

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { ...spring, staggerChildren: 0.05 } },
          }}
          className="grid grid-cols-2 gap-2"
        >
          {otherAwards.map((award, index) => {
            const look = awardLook(award.label, index);
            return (
              <motion.button
                key={award.id}
                type="button"
                variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: spring } }}
                className={cn(
                  'inline-flex min-h-[4.25rem] flex-col items-start justify-center gap-1 rounded-2xl border px-3 py-2 text-left shadow-sm shadow-black/5 transition hover:-translate-y-0.5 hover:shadow-md',
                  look.className,
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  onPick(award.points, award.description);
                }}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {look.emoji}
                </span>
                <span className="text-xs font-black leading-tight">{replaceForbiddenQuickTapLabel(award.label)}</span>
                <span className="text-xs font-bold tabular-nums">+{award.points}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {onBehaviorNote ? (
          <button
            type="button"
            className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100"
            onClick={(event) => {
              event.stopPropagation();
              onBehaviorNote();
            }}
          >
            Behavior note
          </button>
        ) : null}
        <button
          type="button"
          className="mt-1.5 w-full rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          onClick={(event) => {
            event.stopPropagation();
            onCancel();
          }}
        >
          Cancel
        </button>
      </motion.div>
    </div>
  );
}
