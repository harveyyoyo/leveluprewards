'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Volume2, VolumeX } from 'lucide-react';

const REEL_COUNT = 3;
const ROW_H = 88;

export type JackpotPoolEntry = { id: string; name: string };

type JackpotMachineProps = {
  pool: readonly JackpotPoolEntry[];
  title?: string;
  /** Called at spin start; must return the real winner (e.g. ticket-weighted). */
  pickWinner: () => JackpotPoolEntry | null;
  onSpinFinished?: (winner: JackpotPoolEntry) => void;
  /** Increment or change to reset reels, banner, and timers (e.g. after generating tickets). */
  resetKey?: number | string;
  /** Omit full-page chrome; sit inside admin card. */
  embedded?: boolean;
};

export function JackpotMachine({
  pool,
  title = 'Class Jackpot',
  pickWinner,
  onSpinFinished,
  resetKey = 0,
  embedded = false,
}: JackpotMachineProps) {
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [offsets, setOffsets] = useState<number[]>(() => Array(REEL_COUNT).fill(0));
  /** When true, reel transform has no transition (instant snap before each spin). */
  const [reelSnap, setReelSnap] = useState(false);
  const [confetti, setConfetti] = useState(false);

  const audioRef = useRef<AudioContext | null>(null);
  const tickTimers = useRef<number[]>([]);

  const clearTickTimers = () => {
    tickTimers.current.forEach((t) => window.clearTimeout(t));
    tickTimers.current = [];
  };

  useEffect(() => {
    clearTickTimers();
    setSpinning(false);
    setWinner(null);
    setConfetti(false);
    setOffsets(Array(REEL_COUNT).fill(0));
    setReelSnap(false);
  }, [resetKey]);

  useEffect(() => {
    return () => {
      clearTickTimers();
    };
  }, []);

  const getCtx = () => {
    if (muted) return null;
    if (!audioRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioRef.current = new Ctx();
    }
    return audioRef.current;
  };

  const resumeAudioIfNeeded = async () => {
    const ctx = getCtx();
    if (!ctx || ctx.state !== 'suspended') return;
    try {
      await ctx.resume();
    } catch {
      /* ignore */
    }
  };

  const beep = (freq: number, dur = 0.05, vol = 0.15, type: OscillatorType = 'square') => {
    const ctx = getCtx();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  };

  const playWin = () => {
    const ctx = getCtx();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => window.setTimeout(() => beep(f, 0.18, 0.2, 'triangle'), i * 90));
    window.setTimeout(() => {
      [1046.5, 1318.5, 1568].forEach((f) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.value = 0.12;
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        o.connect(g).connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 1.2);
      });
    }, 380);
  };

  const labels = useMemo(() => (pool.length ? pool.map((p) => p.name) : ['—']), [pool]);

  const reelStrips = useMemo(() => {
    return Array.from({ length: REEL_COUNT }, () => {
      const arr: string[] = [];
      for (let i = 0; i < 30; i++) arr.push(...labels);
      return arr;
    });
  }, [labels]);

  const spin = () => {
    if (spinning || pool.length === 0) return;

    const picked = pickWinner();
    if (!picked) return;

    const winnerIdx = pool.findIndex((p) => p.id === picked.id);
    if (winnerIdx < 0) return;

    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    if (reduceMotion) {
      setWinner(picked.name);
      setConfetti(true);
      void resumeAudioIfNeeded().then(() => {
        if (!muted) playWin();
      });
      onSpinFinished?.(picked);
      return;
    }

    void (async () => {
      const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      setSpinning(true);
      setWinner(null);
      setConfetti(false);
      if (!muted) await resumeAudioIfNeeded();

      const L = pool.length;
      clearTickTimers();

      const baseDur = 2400;
      const stagger = 600;

      // Snap reels to top with no CSS transition, then animate a long path (full-strip loops).
      // Otherwise the 2nd+ spin often reuses the same transform and the browser animates almost nothing.
      setReelSnap(true);
      setOffsets(Array(REEL_COUNT).fill(0));
      await nextFrame();
      await nextFrame();

      const strip0 = reelStrips[0];
      const stripPeriodPx = strip0.length * ROW_H;
      const extraLoops = 2 + Math.floor(Math.random() * 3);

      setReelSnap(false);
      setOffsets(
        reelStrips.map((strip) => {
          const segStart = strip.length - L * 2;
          const targetIdx = segStart + winnerIdx;
          const basePx = targetIdx * ROW_H;
          return basePx + extraLoops * strip.length * ROW_H;
        }),
      );

      const totalDur = baseDur + stagger * (REEL_COUNT - 1) + 200;
      let t = 0;
      while (t < totalDur) {
        const p = t / totalDur;
        const interval = 40 + p * 180;
        const id = window.setTimeout(() => beep(700 + (1 - p) * 600, 0.03, 0.08, 'square'), t);
        tickTimers.current.push(id);
        t += interval;
      }

      const finishId = window.setTimeout(() => {
        setSpinning(false);
        setWinner(picked.name);
        setConfetti(true);
        if (!muted) playWin();
        onSpinFinished?.(picked);
      }, totalDur);
      tickTimers.current.push(finishId as unknown as number);
    })();
  };

  const shell = embedded
    ? 'relative overflow-hidden rounded-[1.75rem] text-white'
    : 'min-h-screen relative overflow-hidden bg-[oklch(0.18_0.04_280)] text-white';

  return (
    <div className={shell}>
      <style>{`
        @keyframes jp-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.85; } }
        @keyframes jp-bulb { 0%,100% { opacity: 1; box-shadow: 0 0 18px oklch(0.85 0.18 90); } 50% { opacity: 0.4; box-shadow: 0 0 6px oklch(0.85 0.18 90); } }
        @keyframes jp-shine { from { transform: translateX(-120%); } to { transform: translateX(220%); } }
        @keyframes jp-fall { to { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
        @keyframes jp-glow { 0%,100% { filter: drop-shadow(0 0 24px oklch(0.85 0.2 80)); } 50% { filter: drop-shadow(0 0 48px oklch(0.85 0.2 80)); } }
        .jp-reel-mask { mask-image: linear-gradient(to bottom, transparent, black 18%, black 82%, transparent); -webkit-mask-image: linear-gradient(to bottom, transparent, black 18%, black 82%, transparent); }
      `}</style>

      {!embedded ? (
        <>
          <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[oklch(0.6_0.25_30)] blur-3xl opacity-40" />
          <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[oklch(0.6_0.25_300)] blur-3xl opacity-40" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-[oklch(0.6_0.25_30)] blur-3xl opacity-30" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-[oklch(0.6_0.25_300)] blur-3xl opacity-30" />
        </>
      )}

      <div className={embedded ? 'relative px-1 py-2 md:px-2' : 'relative max-w-6xl mx-auto px-6 py-10'}>
        <header className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles
              className="h-6 w-6 md:h-7 md:w-7 shrink-0 text-[oklch(0.9_0.18_90)]"
              style={{ animation: 'jp-glow 2s ease-in-out infinite' }}
            />
            <h2 className="text-xl md:text-3xl font-black tracking-tight truncate">{title}</h2>
          </div>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition shrink-0"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </header>

        <div className="relative">
          <div
            className="relative rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-8"
            style={{
              background: 'linear-gradient(180deg, oklch(0.55 0.18 30), oklch(0.4 0.2 25))',
              boxShadow:
                'inset 0 4px 12px oklch(0.95 0.05 80 / 0.4), inset 0 -8px 24px oklch(0.2 0.1 25), 0 30px 60px -20px oklch(0.1 0.05 280)',
              border: '4px solid oklch(0.85 0.15 85)',
            }}
          >
            <div className="absolute -top-2 left-0 right-0 flex justify-around px-4 md:px-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full bg-[oklch(0.9_0.2_90)]"
                  style={{ animation: `jp-bulb 0.9s ease-in-out ${i * 0.07}s infinite` }}
                />
              ))}
            </div>

            <div
              className="relative overflow-hidden rounded-xl mb-4 md:mb-6 py-2.5 md:py-3 text-center text-lg md:text-3xl font-black tracking-widest"
              style={{
                background: 'linear-gradient(180deg, oklch(0.25 0.08 280), oklch(0.15 0.05 280))',
                border: '2px solid oklch(0.85 0.15 85)',
                color: 'oklch(0.95 0.18 85)',
                textShadow: '0 0 16px oklch(0.85 0.2 80)',
              }}
            >
              {winner ? `🎉 ${winner.toUpperCase()} 🎉` : pool.length === 0 ? '★ NO ENTRIES ★' : "★ WHO'S NEXT? ★"}
              <div
                className="absolute inset-y-0 w-1/3 pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent, oklch(1 0 0 / 0.25), transparent)',
                  animation: 'jp-shine 2.4s ease-in-out infinite',
                }}
              />
            </div>

            <div
              className="relative grid grid-cols-3 gap-2 md:gap-3 p-3 md:p-4 rounded-2xl"
              style={{
                background: 'linear-gradient(180deg, oklch(0.12 0.03 280), oklch(0.2 0.04 280))',
                boxShadow: 'inset 0 4px 16px oklch(0 0 0 / 0.6)',
                border: '3px solid oklch(0.75 0.15 80)',
              }}
            >
              {reelStrips.map((strip, ri) => (
                <div
                  key={ri}
                  className="jp-reel-mask relative overflow-hidden rounded-xl bg-white"
                  style={{ height: ROW_H * 3 }}
                >
                  <div
                    style={{
                      transform: `translateY(-${offsets[ri] - ROW_H}px)`,
                      transition:
                        spinning && !reelSnap
                          ? `transform ${2400 + ri * 600}ms cubic-bezier(0.16, 1, 0.3, 1)`
                          : 'none',
                    }}
                  >
                    {strip.map((name, ni) => (
                      <div
                        key={ni}
                        className="flex items-center justify-center font-black text-[oklch(0.25_0.1_280)] px-1"
                        style={{ height: ROW_H, fontSize: name.length > 8 ? 16 : embedded ? 18 : 24 }}
                      >
                        <span className="truncate max-w-full">{name}</span>
                      </div>
                    ))}
                  </div>
                  <div
                    className="pointer-events-none absolute left-0 right-0"
                    style={{
                      top: ROW_H,
                      height: ROW_H,
                      border: '3px solid oklch(0.75 0.2 30)',
                      borderRadius: 8,
                      boxShadow: '0 0 20px oklch(0.75 0.2 30 / 0.6)',
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 md:mt-8 flex justify-center">
              <button
                type="button"
                onClick={spin}
                disabled={spinning || pool.length === 0}
                className="relative px-8 md:px-12 py-4 md:py-5 rounded-full font-black text-lg md:text-2xl tracking-wider disabled:opacity-50 disabled:cursor-not-allowed w-full max-w-sm"
                style={{
                  background: 'linear-gradient(180deg, oklch(0.9 0.2 85), oklch(0.7 0.22 50))',
                  color: 'oklch(0.2 0.1 30)',
                  boxShadow:
                    '0 8px 0 oklch(0.45 0.18 30), 0 16px 32px oklch(0 0 0 / 0.4), inset 0 2px 4px oklch(1 0 0 / 0.5)',
                  animation: spinning ? 'none' : 'jp-pulse 1.6s ease-in-out infinite',
                }}
              >
                {spinning ? 'SPINNING…' : 'PULL!'}
              </button>
            </div>

            {embedded && pool.length > 0 ? (
              <p className="mt-4 text-center text-xs text-white/70 px-2">
                Winner is chosen by raffle tickets (same odds as before). Three reels land on the same student.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {confetti ? (
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-50">
          {Array.from({ length: 80 }).map((_, i) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 0.6;
            const dur = 2.4 + Math.random() * 2;
            const size = 6 + Math.random() * 8;
            const hue = Math.floor(Math.random() * 360);
            return (
              <div
                key={i}
                className="absolute -top-4"
                style={{
                  left: `${left}%`,
                  width: size,
                  height: size * 1.6,
                  background: `oklch(0.7 0.2 ${hue})`,
                  borderRadius: 2,
                  animation: `jp-fall ${dur}s linear ${delay}s forwards`,
                }}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
