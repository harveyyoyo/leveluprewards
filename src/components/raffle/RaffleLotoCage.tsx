'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Volume2, VolumeX } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';

const SPIN_MS = 4200;
const BALL_COUNT = 10;
const BALL_COLORS = [
  'hsl(0 72% 52%)',
  'hsl(220 70% 52%)',
  'hsl(145 55% 42%)',
  'hsl(42 90% 50%)',
  'hsl(280 55% 55%)',
  'hsl(12 80% 55%)',
];

export type LotoPoolEntry = { id: string; name: string };

type RaffleLotoCageProps = {
  pool: readonly LotoPoolEntry[];
  title?: string;
  pickWinner: () => LotoPoolEntry | null;
  onSpinFinished?: (winner: LotoPoolEntry) => void | Promise<void>;
  resetKey?: number | string;
  embedded?: boolean;
  pullLocked?: boolean;
  embeddedFooter?: string | null;
};

type BallVisual = { key: string; name: string; color: string; x: number; y: number; delay: number };

function sampleNames(pool: readonly LotoPoolEntry[], count: number): string[] {
  if (!pool.length) return Array(count).fill('—');
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(pool[Math.floor(Math.random() * pool.length)]!.name);
  }
  return out;
}

function buildTumbleBalls(pool: readonly LotoPoolEntry[]): BallVisual[] {
  const names = sampleNames(pool, BALL_COUNT);
  return names.map((name, i) => ({
    key: `t-${i}-${name}`,
    name,
    color: BALL_COLORS[i % BALL_COLORS.length]!,
    x: 18 + ((i * 37) % 64),
    y: 12 + ((i * 23) % 58),
    delay: (i % 5) * 0.08,
  }));
}

export function RaffleLotoCage({
  pool,
  title = 'Loto draw',
  pickWinner,
  onSpinFinished,
  resetKey = 0,
  embedded = false,
  pullLocked = false,
  embeddedFooter = null,
}: RaffleLotoCageProps) {
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<LotoPoolEntry | null>(null);
  const [muted, setMuted] = useState(false);
  const [tumbleBalls, setTumbleBalls] = useState<BallVisual[]>(() => buildTumbleBalls(pool));
  const [exitBall, setExitBall] = useState(false);

  const audioRef = useRef<AudioContext | null>(null);
  const tickTimers = useRef<number[]>([]);
  const spinRunId = useRef(0);
  const pendingWinner = useRef<LotoPoolEntry | null>(null);
  const spinFinished = useRef(false);

  const clearTickTimers = () => {
    tickTimers.current.forEach((t) => window.clearTimeout(t));
    tickTimers.current = [];
  };

  const scheduleTimer = (fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    tickTimers.current.push(id);
    return id;
  };

  useEffect(() => {
    clearTickTimers();
    spinRunId.current += 1;
    pendingWinner.current = null;
    spinFinished.current = false;
    setSpinning(false);
    setWinner(null);
    setExitBall(false);
    setTumbleBalls(buildTumbleBalls(pool));
  }, [resetKey]);

  useEffect(() => {
    return () => clearTickTimers();
  }, []);

  const getCtx = useCallback(() => {
    if (muted) return null;
    if (!audioRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioRef.current = new Ctx();
    }
    return audioRef.current;
  }, [muted]);

  const beep = useCallback(
    (freq: number, dur = 0.04, vol = 0.12, type: OscillatorType = 'square') => {
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
    },
    [getCtx],
  );

  const playWin = useCallback(() => {
    const notes = [392, 494, 587, 784];
    notes.forEach((f, i) => scheduleTimer(() => beep(f, 0.16, 0.18, 'triangle'), i * 85));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beep]);

  const finishSpin = useCallback(
    async (runId: number) => {
      if (spinFinished.current || spinRunId.current !== runId) return;
      const picked = pendingWinner.current;
      if (!picked) return;

      spinFinished.current = true;
      clearTickTimers();
      setSpinning(false);
      setWinner(picked);
      setExitBall(true);
      confetti({
        particleCount: 140,
        spread: 75,
        origin: { y: 0.55 },
        colors: ['#fde047', '#ef4444', '#3b82f6', '#22c55e'],
        disableForReducedMotion: true,
        zIndex: 9999,
      });
      if (!muted) playWin();
      try {
        await Promise.resolve(onSpinFinished?.(picked));
      } catch {
        /* parent handles errors */
      }
    },
    [muted, onSpinFinished, playWin],
  );

  const cageLabel = useMemo(() => {
    if (winner) return `🎉 ${winner.name.toUpperCase()} 🎉`;
    if (pool.length === 0) return '★ NO ENTRIES ★';
    return spinning ? '★ MIXING… ★' : "★ WHO'S NEXT? ★";
  }, [pool.length, spinning, winner]);

  const draw = () => {
    if (spinning || pool.length === 0) return;

    const picked = pickWinner();
    if (!picked) return;

    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    if (reduceMotion) {
      setWinner(picked);
      void (async () => {
        if (!muted) playWin();
        try {
          await Promise.resolve(onSpinFinished?.(picked));
        } catch {
          /* ignore */
        }
      })();
      return;
    }

    const ctx = getCtx();
    if (ctx?.state === 'suspended') {
      try {
        void ctx.resume();
      } catch {
        /* ignore */
      }
    }

    pendingWinner.current = picked;
    spinFinished.current = false;
    const runId = spinRunId.current + 1;
    spinRunId.current = runId;

    setWinner(null);
    setExitBall(false);
    setSpinning(true);
    setTumbleBalls(buildTumbleBalls(pool));

    let t = 0;
    while (t < SPIN_MS - 200) {
      const p = t / SPIN_MS;
      const interval = 28 + p * p * 140;
      scheduleTimer(() => {
        if (spinRunId.current === runId) {
          beep(520 + (1 - p) * 400, 0.022, 0.06, 'square');
          if (Math.random() > 0.65) {
            setTumbleBalls(buildTumbleBalls(pool));
          }
        }
      }, t);
      t += interval;
    }

    scheduleTimer(() => {
      if (spinRunId.current === runId) beep(880, 0.12, 0.15, 'triangle');
    }, SPIN_MS - 180);

    scheduleTimer(() => void finishSpin(runId), SPIN_MS + 80);
  };

  const shell = embedded
    ? 'relative overflow-hidden rounded-[1.75rem] border border-border bg-gradient-to-b from-muted/50 to-background text-foreground shadow-sm'
    : 'min-h-screen relative overflow-hidden bg-background text-foreground';

  const winnerColor = winner
    ? BALL_COLORS[Math.max(0, pool.findIndex((p) => p.id === winner.id)) % BALL_COLORS.length]!
    : BALL_COLORS[0]!;

  const cageSize = embedded ? 260 : 320;
  const ballSize = embedded ? 44 : 52;
  const ballOffset = ballSize / 2;

  return (
    <div className={cn(shell, 'raffle-loto-cage')} data-raffle-loto-cage data-legacy-motion-root="jackpot">
      <style>{`
        @keyframes loto-cage-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes loto-cage-rock { 0%,100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }
        @keyframes loto-ball-bounce {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(6px, -10px) scale(1.05); }
          50% { transform: translate(-8px, 4px) scale(0.95); }
          75% { transform: translate(4px, 8px) scale(1.02); }
        }
        @keyframes loto-ball-exit {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          40% { transform: translateY(28px) scale(1.08); opacity: 1; }
          100% { transform: translateY(118px) scale(1.12); opacity: 1; }
        }
        @keyframes loto-shine { from { transform: translateX(-120%); } to { transform: translateX(220%); } }
        @keyframes loto-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
      `}</style>

      {!embedded ? (
        <>
          <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-amber-500/15 blur-3xl" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        </>
      )}

      <div className={embedded ? 'relative px-1 py-2 md:px-2' : 'relative mx-auto max-w-4xl px-6 py-10'}>
        <header className="mb-4 flex items-center justify-between md:mb-6">
          <h2
            className="truncate text-xl tracking-tight md:text-3xl"
            style={{ color: 'hsl(var(--foreground))', fontWeight: 900 }}
          >
            {title}
          </h2>
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

        <div
          className={cn(
            'relative rounded-[1.5rem] border-2 border-primary/40 p-4 md:rounded-[2rem] md:p-8',
            'bg-gradient-to-b from-amber-500/10 via-card to-card',
            'shadow-[inset_0_1px_0_hsl(var(--primary-foreground)/0.1),0_16px_36px_-14px_hsl(var(--foreground)/0.14)]',
          )}
        >
          <div
            className={cn(
              'relative mb-4 overflow-hidden rounded-xl border border-primary/30 py-2.5 text-center text-lg tracking-widest md:mb-6 md:py-3 md:text-2xl',
              'bg-gradient-to-b from-muted to-muted/70',
            )}
            style={{ color: 'hsl(var(--foreground))', fontWeight: 800 }}
          >
            {cageLabel}
            <div
              className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
              style={{ animation: spinning || winner ? 'loto-shine 2s ease-in-out infinite' : undefined }}
            />
          </div>

          <div className="relative mx-auto flex max-w-md flex-col items-center">
            <div
              className="relative"
              style={{
                width: cageSize,
                height: cageSize,
                animation: spinning ? 'loto-cage-rock 0.45s ease-in-out infinite' : undefined,
              }}
            >
              <svg
                viewBox="0 0 200 200"
                className="absolute inset-0 h-full w-full"
                aria-hidden
                style={{ animation: spinning ? 'loto-cage-spin 2.8s linear infinite' : undefined }}
              >
                <defs>
                  <radialGradient id="loto-cage-shine" cx="35%" cy="30%" r="65%">
                    <stop offset="0%" stopColor="hsl(var(--primary) / 0.35)" />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>
                </defs>
                <ellipse cx="100" cy="100" rx="88" ry="88" fill="url(#loto-cage-shine)" />
                {[0, 30, 60, 90, 120, 150].map((deg) => (
                  <ellipse
                    key={`h-${deg}`}
                    cx="100"
                    cy="100"
                    rx="88"
                    ry="88"
                    fill="none"
                    stroke="hsl(var(--foreground) / 0.22)"
                    strokeWidth="1.2"
                    transform={`rotate(${deg} 100 100) scale(1 0.35)`}
                  />
                ))}
                {[0, 45, 90, 135].map((deg) => (
                  <ellipse
                    key={`v-${deg}`}
                    cx="100"
                    cy="100"
                    rx="88"
                    ry="88"
                    fill="none"
                    stroke="hsl(var(--foreground) / 0.28)"
                    strokeWidth="1.4"
                    transform={`rotate(${deg} 100 100)`}
                  />
                ))}
                <circle
                  cx="100"
                  cy="100"
                  r="88"
                  fill="none"
                  stroke="hsl(var(--primary) / 0.55)"
                  strokeWidth="2.5"
                />
                <path
                  d="M 100 12 L 100 28 M 100 172 L 100 188"
                  stroke="hsl(var(--muted-foreground) / 0.5)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>

              <div className="absolute inset-[14%] overflow-hidden rounded-full" aria-hidden={!!winner && exitBall}>
                {!exitBall &&
                  tumbleBalls.map((ball) => (
                    <div
                      key={ball.key}
                      className="absolute flex items-center justify-center rounded-full border-2 border-white/40 shadow-md"
                      style={{
                        left: `${ball.x}%`,
                        top: `${ball.y}%`,
                        width: ballSize,
                        height: ballSize,
                        marginLeft: -ballOffset,
                        marginTop: -ballOffset,
                        background: `radial-gradient(circle at 32% 28%, #fff 0%, ${ball.color} 55%, ${ball.color} 100%)`,
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: embedded ? 9 : 10,
                        animation: spinning
                          ? `loto-ball-bounce 0.55s ease-in-out ${ball.delay}s infinite`
                          : undefined,
                        opacity: spinning ? 1 : 0.85,
                      }}
                    >
                      <span className="max-w-[90%] truncate px-0.5 text-center drop-shadow-sm">
                        {ball.name.length > 7 ? `${ball.name.slice(0, 6)}…` : ball.name}
                      </span>
                    </div>
                  ))}
              </div>

              <div
                className="absolute -right-2 top-1/2 hidden h-16 w-8 -translate-y-1/2 rounded-r-lg border border-border bg-muted shadow-sm sm:block"
                aria-hidden
              >
                <div
                  className="absolute right-1 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-primary shadow"
                  style={{ animation: spinning ? 'loto-cage-spin 0.6s linear infinite' : undefined }}
                />
              </div>
            </div>

            <div className="relative -mt-2 flex flex-col items-center" style={{ height: embedded ? 130 : 150 }}>
              <div
                className="h-14 w-10 rounded-b-2xl border-x-2 border-b-2 border-primary/35 bg-gradient-to-b from-muted/80 to-muted"
                aria-hidden
              />
              {winner && exitBall ? (
                <div
                  className="absolute top-2 flex items-center justify-center rounded-full border-2 border-white/50 shadow-lg"
                  style={{
                    width: ballSize + 8,
                    height: ballSize + 8,
                    background: `radial-gradient(circle at 32% 28%, #fff 0%, ${winnerColor} 50%, ${winnerColor} 100%)`,
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: embedded ? 11 : 12,
                    animation: 'loto-ball-exit 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                  }}
                >
                  <span className="max-w-[92%] truncate px-1 text-center drop-shadow-md">{winner.name}</span>
                </div>
              ) : null}
            </div>

            {!spinning && !winner && pool.length > 0 ? (
              <div
                className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
                aria-hidden
              >
                <div className="rounded-xl border border-border/60 bg-background/75 px-4 py-2 text-center backdrop-blur-sm">
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.28em] text-muted-foreground">Ready</p>
                  <p className="mt-0.5 text-sm font-semibold">Turn the cage</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex justify-center md:mt-8">
            <button
              type="button"
              onClick={draw}
              disabled={spinning || pullLocked || pool.length === 0}
              className={cn(
                'relative inline-flex w-full max-w-sm items-center justify-center rounded-full px-8 py-4 tracking-wider md:px-12 md:py-5 md:text-2xl',
                'bg-primary shadow-md transition hover:bg-primary/90',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'text-lg',
              )}
              style={{
                color: 'hsl(var(--primary-foreground))',
                fontWeight: 900,
                boxShadow:
                  '0 6px 0 hsl(var(--primary) / 0.55), 0 12px 24px hsl(var(--foreground) / 0.12), inset 0 1px 0 hsl(var(--primary-foreground) / 0.2)',
                animation: spinning ? 'none' : 'loto-pulse 1.6s ease-in-out infinite',
              }}
            >
              {spinning ? 'DRAWING…' : pullLocked ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 shrink-0 animate-spin" aria-hidden />
                  SAVING…
                </>
              ) : (
                'DRAW!'
              )}
            </button>
          </div>

          {embedded && pool.length > 0 ? (
            <p className="mt-4 px-2 text-center text-xs text-muted-foreground">
              {embeddedFooter ??
                'Odds follow ticket counts from current points. If “Deduct points when you pull” is on, each eligible student loses points for all of their ticket slots after the draw.'}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}