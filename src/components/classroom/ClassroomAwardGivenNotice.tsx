'use client';

import { AnimatePresence, motion } from 'framer-motion';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

export function classroomAwardGivenMessage(
  studentLabel: string,
  points: number,
  awardLabel: string,
): string {
  const who = studentLabel.trim();
  const reason = awardLabel.trim();
  const amount = `+${Math.abs(points)}`;
  if (who && reason) return `You awarded ${who} ${amount} · ${reason}`;
  if (who) return `You awarded ${who} ${amount}`;
  if (reason) return `You awarded ${amount} · ${reason}`;
  return `You awarded ${amount}`;
}

export function ClassroomAwardGivenNotice({
  visible,
  studentLabel,
  points,
  awardLabel,
}: {
  visible: boolean;
  studentLabel: string;
  points: number;
  awardLabel: string;
}) {
  const message = classroomAwardGivenMessage(studentLabel, points, awardLabel);

  return (
    <AnimatePresence>
      {visible && points > 0 ? (
        <motion.div
          key={message}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={spring}
          // `bg-emerald-500` reads ~2.4:1 against the emerald-50/white text
          // below — `emerald-700` (already the border color) clears AA.
          className="pointer-events-none absolute left-1/2 top-2 z-40 w-[min(22rem,calc(100%-1rem))] -translate-x-1/2 rounded-2xl border-2 border-emerald-800 bg-emerald-700 px-3 py-2 text-center shadow-lg shadow-emerald-900/20"
        >
          <p className="text-[11px] font-black uppercase tracking-wide text-emerald-50">Points awarded</p>
          <p className="text-sm font-bold leading-snug tracking-normal text-white">{message}</p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
