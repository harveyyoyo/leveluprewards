'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Sparkles, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

const REEL_COUNT = 3;
const ROW_H = 88;
/** Copies of the name pool per reel — need headroom so base offset + spin travel stays inside strip height. */
const REEL_POOL_COPIES = 48;
/** Last segment starts this many "pools" from the end (room for extraLoops × L rows of travel). */
const REEL_SEG_FROM_END_POOLS = 10;

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
      for (let i = 0; i < REEL_POOL_COPIES; i++) arr.push(...labels);
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

      setReelSnap(true);
      setOffsets(Array(REEL_COUNT).fill(0));
      await nextFrame();
      await nextFrame();

      // Extra travel in whole "pool" cycles (L rows) — same names align every L rows. Never add
      // extraLoops × full strip height: that pushes translateY past the reel DOM and shows blank.
      const extraLoops = 2 + Math.floor(Math.random() * 3);
      const segStart = Math.max(0, reelStrips[0].length - REEL_SEG_FROM_END_POOLS * L);

      setReelSnap(false);
      setOffsets(
        reelStrips.map((strip) => {
          const targetIdx = segStart + winnerIdx;
          const basePx = targetIdx * ROW_H;
          const maxExtraByLength = Math.max(0, Math.floor((strip.length - 1 - targetIdx) / L) - 1);
          const loops = Math.min(extraLoops, maxExtraByLength);
          return basePx + loops * L * ROW_H;
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
    ? 'relative overflow-hidden rounded-[1.75rem] border border-border bg-gradient-to-b from-muted/50 to-background text-foreground shadow-sm'
    : 'min-h-screen relative overflow-hidden bg-background text-foreground';

  /** Inline colors avoid globals.css `.font-black { color: hsl(var(--primary)) }` overriding `text-foreground` on light cards. */
  const reelNameStyle = (fontSize: number): CSSProperties => ({
    height: ROW_H,
    fontSize,
    fontWeight: 800,
    color: 'hsl(var(--card-foreground))',
  });

  return (
    <div className={cn(shell, 'jackpot-machine')} data-jackpot-machine>
      <style>{`
        @keyframes jp-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.88; } }
        @keyframes jp-bulb { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes jp-shine { from { transform: translateX(-120%); } to { transform: translateX(220%); } }
        @keyframes jp-fall { to { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
        @keyframes jp-glow { 0%,100% { filter: drop-shadow(0 0 10px hsl(var(--primary) / 0.45)); } 50% { filter: drop-shadow(0 0 18px hsl(var(--primary) / 0.65)); } }
      `}</style>

      {!embedded ? (
        <>
          <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        </>
      )}

      <div className={embedded ? 'relative px-1 py-2 md:px-2' : 'relative mx-auto max-w-6xl px-6 py-10'}>
        <header className="mb-4 flex items-center justify-between md:mb-6">
          <div className="flex min-w-0 items-center gap-3">
            <Sparkles
              className="h-6 w-6 shrink-0 text-primary md:h-7 md:w-7"
              style={{ animation: 'jp-glow 2s ease-in-out infinite' }}
            />
            <h2
              className="truncate text-xl tracking-tight md:text-3xl"
              style={{ color: 'hsl(var(--foreground))', fontWeight: 900 }}
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="shrink-0 rounded-full border border-border bg-muted/80 p-2 transition hover:bg-muted"
            style={{ color: 'hsl(var(--foreground))' }}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </header>

        <div className="relative">
          <div
            className={cn(
              'relative rounded-[1.5rem] border-2 border-primary/45 p-4 md:rounded-[2rem] md:p-8',
              'bg-gradient-to-b from-primary/25 via-card to-card',
              'shadow-[inset_0_1px_0_hsl(var(--primary-foreground)/0.12),0_20px_40px_-12px_hsl(var(--foreground)/0.12)]',
            )}
          >
            <div className="absolute -top-2 left-0 right-0 flex justify-around px-4 md:px-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.55)] md:h-3 md:w-3"
                  style={{ animation: `jp-bulb 0.9s ease-in-out ${i * 0.07}s infinite` }}
                />
              ))}
            </div>

            <div
              className={cn(
                'relative mb-4 overflow-hidden rounded-xl border border-primary/35 py-2.5 text-center md:mb-6 md:py-3',
                'bg-gradient-to-b from-muted to-muted/70 text-lg tracking-widest md:text-3xl',
              )}
              style={{ color: 'hsl(var(--foreground))', fontWeight: 800 }}
            >
              {winner ? `🎉 ${winner.toUpperCase()} 🎉` : pool.length === 0 ? '★ NO ENTRIES ★' : "★ WHO'S NEXT? ★"}
              <div
                className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                style={{ animation: 'jp-shine 2.4s ease-in-out infinite' }}
              />
            </div>

            <div
              className={cn(
                'relative grid grid-cols-3 gap-2 rounded-2xl border border-border bg-muted/40 p-3 md:gap-3 md:p-4',
                'shadow-[inset_0_2px_12px_hsl(var(--foreground)/0.06)]',
              )}
            >
              {reelStrips.map((strip, ri) => (
                <div
                  key={ri}
                  className="relative overflow-hidden rounded-xl border border-border bg-card shadow-inner"
                  style={{ height: ROW_H * 3 }}
                >
                  <div
                    className="relative z-[1]"
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
                        key={`${ri}-${ni}-${name}`}
                        className="flex w-full min-w-0 items-center justify-center px-1"
                        style={reelNameStyle(name.length > 8 ? 16 : embedded ? 18 : 24)}
                      >
                        <span className="min-w-0 max-w-full truncate">{name}</span>
                      </div>
                    ))}
                  </div>
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-20 rounded-lg border-2 border-primary ring-2 ring-primary/25"
                    style={{
                      top: ROW_H,
                      height: ROW_H,
                      boxShadow: '0 0 16px hsl(var(--primary) / 0.25)',
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-center md:mt-8">
              <button
                type="button"
                onClick={spin}
                disabled={spinning || pool.length === 0}
                className={cn(
                  'relative w-full max-w-sm rounded-full px-8 py-4 tracking-wider md:px-12 md:py-5 md:text-2xl',
                  'bg-primary shadow-md transition hover:bg-primary/90',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  'text-lg',
                )}
                style={{
                  color: 'hsl(var(--primary-foreground))',
                  fontWeight: 900,
                  boxShadow:
                    '0 6px 0 hsl(var(--primary) / 0.55), 0 12px 24px hsl(var(--foreground) / 0.12), inset 0 1px 0 hsl(var(--primary-foreground) / 0.2)',
                  animation: spinning ? 'none' : 'jp-pulse 1.6s ease-in-out infinite',
                }}
              >
                {spinning ? 'SPINNING…' : 'PULL!'}
              </button>
            </div>

            {embedded && pool.length > 0 ? (
              <p className="mt-4 px-2 text-center text-xs text-muted-foreground">
                Winner is chosen by raffle tickets (same odds as before). Three reels land on the same student.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {confetti ? (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
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
                  background: `hsl(${hue} 65% 55%)`,
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
