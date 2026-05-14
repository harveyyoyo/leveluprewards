'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Shuffle, Volume2, VolumeX, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';

export type RaffleWheelSlice = { id: string; name: string; weight: number };

const WHEEL_COLORS = [
  'oklch(0.62 0.22 25)',
  'oklch(0.55 0.2 260)',
  'oklch(0.7 0.2 145)',
  'oklch(0.85 0.18 90)',
];

const CX = 250;
const CY = 250;
const R = 240;
const SPIN_MS = 4500;

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const [x1, y1] = polar(cx, cy, r, end);
  const [x2, y2] = polar(cx, cy, r, start);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 0 ${x2} ${y2} Z`;
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

type RaffleSpinWheelProps = {
  slices: readonly RaffleWheelSlice[];
  title?: string;
  pickWinner: () => { id: string; name: string } | null;
  onSpinFinished?: (winner: { id: string; name: string }) => void | Promise<void>;
  resetKey?: number | string;
  embedded?: boolean;
  pullLocked?: boolean;
  embeddedFooter?: string | null;
};

export function RaffleSpinWheel({
  slices,
  title = 'Wheel of names',
  pickWinner,
  onSpinFinished,
  resetKey = 0,
  embedded = false,
  pullLocked = false,
  embeddedFooter = null,
}: RaffleSpinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<{ id: string; name: string } | null>(null);
  const [showWin, setShowWin] = useState(false);
  const [muted, setMuted] = useState(false);
  const [transitionOn, setTransitionOn] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const spinRunId = useRef(0);
  const spinFinished = useRef(false);
  const pendingWinner = useRef<{ id: string; name: string } | null>(null);
  const tickTimers = useRef<number[]>([]);

  const clearTickTimers = () => {
    tickTimers.current.forEach((t) => window.clearTimeout(t));
    tickTimers.current = [];
  };

  useEffect(() => {
    clearTickTimers();
    spinRunId.current += 1;
    spinFinished.current = false;
    pendingWinner.current = null;
    setRotation(0);
    setSpinning(false);
    setWinner(null);
    setShowWin(false);
    setTransitionOn(false);
  }, [resetKey]);

  useEffect(() => {
    return () => clearTickTimers();
  }, []);

  const getCtx = useCallback(() => {
    if (muted || typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      audioCtxRef.current = new AC();
    }
    if (audioCtxRef.current.state === 'suspended') void audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, [muted]);

  const tick = useCallback(
    (freq = 1200, dur = 0.05, vol = 0.14) => {
      const ctx = getCtx();
      if (!ctx) return;
      const t0 = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(freq, t0);
      o.frequency.exponentialRampToValueAtTime(freq * 0.5, t0 + dur);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + dur);
    },
    [getCtx],
  );

  const playWin = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      const t0 = ctx.currentTime + i * 0.09;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.2, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      o.connect(g).connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 0.55);
    });
  }, [getCtx]);

  const segments = useMemo(() => {
    const total = slices.reduce((sum, slice) => sum + Math.max(1, slice.weight), 0);
    if (!slices.length || total <= 0) return [];

    let acc = 0;
    return slices.map((slice, i) => {
      const weight = Math.max(1, slice.weight);
      const start = (acc / total) * 360;
      acc += weight;
      const end = (acc / total) * 360;
      const mid = start + (end - start) / 2;
      const color = WHEEL_COLORS[i % WHEEL_COLORS.length];
      const safeColor =
        slices.length % WHEEL_COLORS.length !== 0 && i === slices.length - 1 && color === WHEEL_COLORS[0]
          ? WHEEL_COLORS[2]
          : color;
      return { ...slice, start, end, mid, color: safeColor };
    });
  }, [slices]);

  const totalTickets = useMemo(
    () => slices.reduce((total, slice) => total + Math.max(1, slice.weight), 0),
    [slices],
  );

  const fontSize = useMemo(() => {
    const n = Math.max(slices.length, 1);
    if (n <= 6) return 28;
    if (n <= 12) return 24;
    if (n <= 20) return 20;
    if (n <= 32) return 16;
    if (n <= 50) return 13;
    if (n <= 80) return 10;
    if (n <= 120) return 8;
    return 6;
  }, [slices.length]);

  const longest = useMemo(
    () => slices.reduce((max, slice) => Math.max(max, slice.name.length), 0),
    [slices],
  );

  const adjustedFont = Math.max(5, Math.min(fontSize, Math.floor(360 / Math.max(longest, 4))));

  const scheduleTicks = useCallback(
    (deltaDeg: number, durationMs: number, runId: number) => {
      clearTickTimers();
      const averageSegment = 360 / Math.max(slices.length, 1);
      const crossings = Math.min(90, Math.floor(deltaDeg / averageSegment));
      const invEase = (p: number) => 1 - Math.pow(1 - p, 1 / 3.2);

      for (let k = 1; k <= crossings; k += 1) {
        const p = (k * averageSegment) / deltaDeg;
        const tMs = invEase(p) * durationMs;
        const speed = 1 - p;
        const freq = 700 + speed * 700;
        const id = window.setTimeout(() => {
          if (spinRunId.current === runId && !muted) tick(freq, 0.05, 0.13);
        }, tMs);
        tickTimers.current.push(id);
      }
    },
    [muted, slices.length, tick],
  );

  const finishSpin = useCallback(
    async (runId: number) => {
      if (spinFinished.current || spinRunId.current !== runId) return;
      const picked = pendingWinner.current;
      if (!picked) return;

      spinFinished.current = true;
      clearTickTimers();
      setSpinning(false);
      setWinner(picked);
      setShowWin(true);
      setTransitionOn(false);
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#fde047', '#3b82f6', '#ef4444', '#10b981'],
        disableForReducedMotion: true,
        zIndex: 9999,
      });
      if (!muted) playWin();

      try {
        await Promise.resolve(onSpinFinished?.(picked));
      } catch {
        /* ignore */
      }
    },
    [muted, onSpinFinished, playWin],
  );

  const spin = useCallback(() => {
    if (spinning || pullLocked || slices.length < 2) return;
    const picked = pickWinner();
    if (!picked) return;

    const segment = segments.find((s) => s.id === picked.id);
    if (!segment) return;

    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    spinRunId.current += 1;
    const runId = spinRunId.current;
    pendingWinner.current = picked;
    spinFinished.current = false;
    setShowWin(false);
    setWinner(null);

    if (!muted) {
      // Initialize/resume AudioContext synchronously within the user gesture
      getCtx();
    }

    if (reduceMotion) {
      void finishSpin(runId);
      return;
    }

    void (async () => {
      const base = Math.ceil(rotation / 360) * 360;
      const turns = 5 + Math.floor(Math.random() * 3);
      // Pointer is on the right side (3 o'clock = 90deg from top).
      const targetMod = normalizeDegrees(90 - segment.mid);
      const next = base + 360 * turns + targetMod;
      const delta = next - rotation;

      setSpinning(true);
      setTransitionOn(false);
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      setTransitionOn(true);
      setRotation(next);

      if (!muted) {
        scheduleTicks(delta, SPIN_MS, runId);
      }
      window.setTimeout(() => void finishSpin(runId), SPIN_MS + 80);
    })();
  }, [
    finishSpin,
    getCtx,
    muted,
    pickWinner,
    pullLocked,
    rotation,
    scheduleTicks,
    segments,
    slices.length,
    spinning,
  ]);

  const closeWinner = () => setShowWin(false);

  const shellStyle = {
    background:
      'linear-gradient(180deg, oklch(0.97 0.02 20), oklch(0.93 0.04 350) 50%, oklch(0.95 0.03 20))',
  };

  return (
    <div
      className={cn(
        'raffle-spin-wheel relative overflow-hidden text-slate-800',
        embedded ? 'rounded-2xl border border-slate-200 shadow-sm' : 'min-h-screen',
      )}
      style={shellStyle}
      data-raffle-spin-wheel
      data-legacy-motion-root="jackpot"
    >
      <style>{`
        @keyframes wn-pop { 0%{transform:scale(0.5);opacity:0} 60%{transform:scale(1.08);opacity:1} 100%{transform:scale(1)} }
        @keyframes wn-bounce { 0%,100%{transform:translateY(-50%) translateX(0)} 50%{transform:translateY(-50%) translateX(-6px)} }
      `}</style>

      <header className={cn('relative z-10 flex items-center justify-between', embedded ? 'px-4 py-3' : 'px-6 py-4')}>
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="h-8 w-8 shrink-0 rounded-full"
            style={{
              background: `conic-gradient(${WHEEL_COLORS[0]} 0 25%, ${WHEEL_COLORS[3]} 0 50%, ${WHEEL_COLORS[1]} 0 75%, ${WHEEL_COLORS[2]} 0 100%)`,
            }}
          />
          <span className="truncate text-xl font-bold tracking-tight" style={{ color: 'oklch(0.3 0.02 280)' }}>
            {title}
          </span>
        </div>
        <button
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70 text-slate-700 shadow-sm hover:bg-white"
          type="button"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </header>

      <main
        className={cn(
          'relative z-10 mx-auto flex max-w-7xl flex-col items-start gap-8 px-4 pb-8 lg:flex-row lg:items-center',
          !embedded && 'px-6 pb-16',
        )}
      >
        <div className="relative mx-auto flex-1">
          <div className="relative mx-auto" style={{ width: 'min(560px, 90vw)', aspectRatio: '1 / 1' }}>
            <div
              className="absolute right-[-14px] top-1/2 z-20 -translate-y-1/2"
              style={{ animation: spinning ? 'wn-bounce 0.15s ease-in-out infinite' : 'none' }}
            >
              <svg width="46" height="40" viewBox="0 0 46 40" aria-hidden>
                <path
                  d="M44 20 L6 2 Q14 20 6 38 Z"
                  fill="oklch(0.6 0.24 25)"
                  stroke="oklch(0.35 0.18 25)"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <svg
              viewBox="0 0 500 500"
              className="h-full w-full"
              role="img"
              aria-label="Raffle wheel"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: transitionOn && spinning ? 'transform 4.5s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
                filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.18))',
              }}
            >
              <circle cx={CX} cy={CY} r={R + 4} fill="white" />
              {segments.length ? (
                segments.map((segment, i) => {
                  const [tx, ty] = polar(CX, CY, CX, segment.mid);
                  return (
                    <g key={`${segment.id}-${i}`}>
                      <path d={arcPath(CX, CY, R, segment.start, segment.end)} fill={segment.color} />
                      <g transform={`translate(${tx} ${ty}) rotate(${segment.mid - 90})`}>
                        <text
                          x={-R * 0.08}
                          textAnchor="end"
                          dominantBaseline="middle"
                          fontSize={adjustedFont}
                          fontWeight="700"
                          fill="white"
                          fontFamily="system-ui, -apple-system, sans-serif"
                          style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.25)', strokeWidth: 1 }}
                        >
                          {segment.name}
                        </text>
                      </g>
                    </g>
                  );
                })
              ) : (
                <circle cx={CX} cy={CY} r={R} fill="oklch(0.9 0.02 270)" />
              )}
              <circle cx={CX} cy={CY} r={R} fill="none" stroke="white" strokeWidth="3" />
            </svg>

            <button
              onClick={spin}
              disabled={spinning || pullLocked || slices.length < 2}
              aria-label={spinning ? 'SPINNING' : pullLocked ? 'SAVING' : winner ? 'SPIN AGAIN' : 'SPIN!'}
              className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-center font-bold uppercase tracking-wide text-slate-700 shadow-[0_6px_18px_rgba(0,0,0,0.15)] transition active:scale-95 disabled:opacity-70"
              style={{
                width: '26%',
                height: '26%',
                fontSize: 'clamp(11px, 1.6vw, 15px)',
                lineHeight: 1.15,
              }}
              type="button"
            >
              {spinning ? (
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              ) : pullLocked ? (
                'Saving'
              ) : winner ? (
                winner.name
              ) : (
                'Click to spin'
              )}
            </button>
          </div>
        </div>

        <aside className="w-full lg:w-80">
          <div className="rounded-2xl bg-white p-4 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                Entries <span className="text-slate-400">({slices.length})</span>
              </h2>
              <div className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-500">
                <Shuffle className="h-4 w-4" />
                Weighted
              </div>
            </div>

            <ul className="max-h-[360px] overflow-auto pr-1">
              {slices.map((slice, i) => (
                <li
                  key={`${slice.id}-${i}`}
                  className="group flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
                >
                  <span className="flex min-w-0 items-center gap-2 text-slate-700">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: WHEEL_COLORS[i % WHEEL_COLORS.length] }}
                    />
                    <span className="truncate">{slice.name}</span>
                  </span>
                  <span className="ml-2 shrink-0 text-xs font-bold text-slate-400">{Math.max(1, slice.weight)}</span>
                </li>
              ))}
              {!slices.length && (
                <li className="px-2 py-4 text-center text-xs text-slate-400">No entries yet.</li>
              )}
            </ul>

            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              <div className="flex justify-between gap-3">
                <span>Total tickets</span>
                <span className="font-bold text-slate-700">{totalTickets}</span>
              </div>
            </div>

            {embedded && slices.length > 0 ? (
              <p className="mt-3 text-center text-xs text-slate-500">
                {embeddedFooter ??
                  'Slice size matches ticket weight. If deduct-on-pull is on, points update after the spin completes.'}
              </p>
            ) : null}
          </div>
        </aside>
      </main>

      {showWin && winner ? (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/35 p-6"
          onClick={closeWinner}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl"
            style={{ animation: 'wn-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            <button
              onClick={closeWinner}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
              aria-label="Close winner"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">The winner is</div>
            <div className="mt-3 break-words text-5xl font-black text-slate-800">{winner.name}</div>
            <div className="mt-6 flex justify-center">
              <button
                onClick={closeWinner}
                className="rounded-md px-5 py-2 text-sm font-bold text-white"
                style={{ background: WHEEL_COLORS[2] }}
                type="button"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
