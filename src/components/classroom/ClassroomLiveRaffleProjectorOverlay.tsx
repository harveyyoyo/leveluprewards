'use client';

import { motion } from 'framer-motion';
import { JackpotMachine } from '@/components/raffle/JackpotMachine';
import { RaffleSpinWheel } from '@/components/raffle/RaffleSpinWheel';
import type { ClassroomSessionRaffleProjector } from '@/lib/classroomSeatingChart';

const spring = { type: 'spring' as const, stiffness: 260, damping: 28 };

export function ClassroomLiveRaffleProjectorOverlay({
  raffle,
}: {
  raffle: ClassroomSessionRaffleProjector;
}) {
  if (!raffle.show) return null;
  const pool = raffle.pool;
  const winner =
    pool.find((entry) => entry.id === raffle.winnerId) ??
    (raffle.winnerName ? { id: raffle.winnerId || 'winner', name: raffle.winnerName } : null);
  const spinning = raffle.spinId != null && raffle.spinId > 0;

  return (
    <motion.div
      layoutId="classroom-live-raffle-projector"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={spring}
      className="pointer-events-none absolute inset-3 z-30 flex items-center justify-center"
    >
      <div className="classroom-light-ink max-h-full w-full max-w-3xl overflow-auto rounded-3xl border border-white/20 bg-[#0b1220]/92 p-3 shadow-2xl shadow-black/40">
        <p className="mb-2 text-center text-xs font-black uppercase tracking-[0.16em] text-amber-200">
          Class raffle
        </p>
        {pool.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-6 text-center text-lg font-black !text-[#0F172A]">
            Getting the draw ready…
          </p>
        ) : raffle.mode === 'wheel' ? (
          <RaffleSpinWheel
            key={raffle.spinId ?? 'idle'}
            embedded
            title="Prize wheel"
            slices={pool.map((entry) => ({ ...entry, weight: 1 }))}
            pickWinner={() => winner ?? pool[0] ?? null}
            resetKey={raffle.spinId ?? 0}
            autoStart={spinning}
            embeddedFooter={null}
          />
        ) : (
          <JackpotMachine
            key={raffle.spinId ?? 'idle'}
            embedded
            title="Jackpot"
            pool={pool}
            pickWinner={() => winner ?? pool[0] ?? null}
            resetKey={raffle.spinId ?? 0}
            autoStart={spinning}
            embeddedFooter={null}
          />
        )}
        {raffle.winnerName ? (
          <p className="mt-2 text-center text-lg font-black text-amber-200">Winner: {raffle.winnerName}</p>
        ) : null}
      </div>
    </motion.div>
  );
}
