'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RaffleWheelSlice = { id: string; name: string; weight: number };

const CX = 110;
const CY = 110;
const R = 100;
const SPIN_MS = 4800;

function polarToCartesian(cx: number, cy: number, radius: number, angleDegCwFromTop: number) {
  const rad = ((angleDegCwFromTop - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

/** Wedge from startDeg to endDeg (degrees clockwise from top, end > start). */
function wedgePath(startDeg: number, endDeg: number): string {
  const start = polarToCartesian(CX, CY, R, endDeg);
  const end = polarToCartesian(CX, CY, R, startDeg);
  const sweep = endDeg - startDeg;
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
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

function sliceHue(index: number) {
  return (210 + index * 47) % 360;
}

export function RaffleSpinWheel({
  slices,
  title = 'Class wheel',
  pickWinner,
  onSpinFinished,
  resetKey = 0,
  embedded = false,
  pullLocked = false,
  embeddedFooter = null,
}: RaffleSpinWheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [transitionOn, setTransitionOn] = useState(false);

  const audioRef = useRef<AudioContext | null>(null);
  const spinRunId = useRef(0);
  const pendingWinner = useRef<{ id: string; name: string } | null>(null);
  const spinFinished = useRef(false);
  const tickTimers = useRef<number[]>([]);

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
    setTransitionOn(false);
    setRotation(0);
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

  const resumeAudioIfNeeded = async () => {
    const ctx = getCtx();
    if (!ctx || ctx.state !== 'suspended') return;
    try {
      await ctx.resume();
    } catch {
      /* ignore */
    }
  };

  const beep = useCallback(
    (freq: number, dur = 0.06, vol = 0.14, type: OscillatorType = 'triangle') => {
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
    const ctx = getCtx();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => scheduleTimer(() => beep(f, 0.16, 0.18, 'triangle'), i * 85));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scheduleTimer uses tickTimers ref
  }, [getCtx, beep]);

  const segments = useMemo(() => {
    if (!slices.length) return [];
    const total = slices.reduce((s, x) => s + Math.max(1, x.weight), 0);
    let acc = 0;
    return slices.map((sl, i) => {
      const w = Math.max(1, sl.weight);
      const start = (acc / total) * 360;
      acc += w;
      const end = (acc / total) * 360;
      const mid = (start + end) / 2;
      return { ...sl, start, end, mid, hue: sliceHue(i) };
    });
  }, [slices]);

  const finishSpin = useCallback(
    async (runId: number) => {
      if (spinFinished.current || spinRunId.current !== runId) return;
      const picked = pendingWinner.current;
      if (!picked) return;
      spinFinished.current = true;
      clearTickTimers();
      setSpinning(false);
      setTransitionOn(false);
      setWinner(picked.name);
      if (!muted) playWin();
      try {
        await Promise.resolve(onSpinFinished?.(picked));
      } catch {
        /* ignore */
      }
    },
    [muted, onSpinFinished, playWin],
  );

  const spin = () => {
    if (spinning || slices.length === 0) return;
    const picked = pickWinner();
    if (!picked) return;

    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    if (reduceMotion) {
      setWinner(picked.name);
      void (async () => {
        await resumeAudioIfNeeded();
        if (!muted) playWin();
        try {
          await Promise.resolve(onSpinFinished?.(picked));
        } catch {
          /* ignore */
        }
      })();
      return;
    }

    const segIdx = segments.findIndex((s) => s.id === picked.id);
    if (segIdx < 0) return;

    void (async () => {
      await resumeAudioIfNeeded();
      const mid = segments[segIdx]!.mid;
      spinRunId.current += 1;
      const runId = spinRunId.current;

      setSpinning(true);
      setWinner(null);
      pendingWinner.current = picked;
      spinFinished.current = false;

      setTransitionOn(false);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      setTransitionOn(true);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      setRotation((prev) => {
        const rotMod = ((prev % 360) + 360) % 360;
        let deltaMod = (360 - ((mid + rotMod) % 360)) % 360;
        if (deltaMod < 24) deltaMod += 360;
        const spins = 5 + Math.floor(Math.random() * 2);
        return prev + spins * 360 + deltaMod;
      });

      if (!muted) beep(420, 0.05, 0.08);
      scheduleTimer(() => void finishSpin(runId), SPIN_MS + 80);
    })();
  };

  const shell = embedded
    ? 'relative overflow-hidden rounded-[1.75rem] border border-border bg-gradient-to-b from-muted/50 to-background text-foreground shadow-sm'
    : 'min-h-screen relative overflow-hidden bg-background text-foreground';

  const labelFont = Math.max(9, Math.min(13, Math.floor(220 / Math.max(6, segments.length))));

  return (
    <div className={cn(shell, 'raffle-spin-wheel')} data-raffle-spin-wheel data-legacy-motion-root="jackpot">
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
              style={{ animation: 'jp-wheel-glow 2s ease-in-out infinite' }}
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

        <style>{`
          @keyframes jp-wheel-glow { 0%,100% { filter: drop-shadow(0 0 8px hsl(var(--primary) / 0.4)); } 50% { filter: drop-shadow(0 0 16px hsl(var(--primary) / 0.55)); } }
        `}</style>

        <div className="relative">
          <div
            className={cn(
              'relative rounded-[1.5rem] border-2 border-primary/45 p-4 md:rounded-[2rem] md:p-8',
              'bg-gradient-to-b from-primary/25 via-card to-card',
              'shadow-[inset_0_1px_0_hsl(var(--primary-foreground)/0.12),0_20px_40px_-12px_hsl(var(--foreground)/0.12)]',
            )}
          >
            <div
              className={cn(
                'relative mb-4 overflow-hidden rounded-xl border border-primary/35 py-2.5 text-center md:mb-6 md:py-3',
                'bg-gradient-to-b from-muted to-muted/70 text-lg tracking-widest md:text-3xl',
              )}
              style={{ color: 'hsl(var(--foreground))', fontWeight: 800 }}
            >
              {winner ? `🎉 ${winner.toUpperCase()} 🎉` : slices.length === 0 ? '★ NO ENTRIES ★' : "★ SPIN THE WHEEL ★"}
            </div>

            <div className="relative mx-auto flex max-w-[min(100%,22rem)] justify-center px-2 pb-2 md:max-w-md">
              {/* Pointer */}
              <div
                className="pointer-events-none absolute left-1/2 top-1 z-20 -translate-x-1/2"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '14px solid transparent',
                  borderRight: '14px solid transparent',
                  borderTop: '22px solid hsl(var(--primary))',
                  filter: 'drop-shadow(0 2px 4px hsl(var(--foreground) / 0.25))',
                }}
                aria-hidden
              />
              <div
                className="aspect-square w-full max-w-[280px] md:max-w-[320px]"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: transitionOn && spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.85, 0.18, 1)` : 'none',
                  transformOrigin: '50% 50%',
                }}
              >
                <svg viewBox="0 0 220 220" className="h-full w-full" role="img" aria-label="Raffle wheel">
                  <circle cx={CX} cy={CY} r={R + 4} fill="none" stroke="hsl(var(--border))" strokeWidth={6} />
                  {segments.map((seg, i) => (
                    <path
                      key={`${seg.id}-${i}`}
                      d={wedgePath(seg.start, seg.end)}
                      fill={`hsl(${seg.hue} 62% ${embedded ? 52 : 50}% / 0.92)`}
                      stroke="hsl(var(--card))"
                      strokeWidth={1.5}
                    />
                  ))}
                  {segments.map((seg, i) => {
                    const t = polarToCartesian(CX, CY, R * 0.62, seg.mid);
                    const short =
                      seg.name.length > 10 ? `${seg.name.slice(0, 9).trimEnd()}…` : seg.name;
                    return (
                      <text
                        key={`t-${seg.id}-${i}`}
                        x={t.x}
                        y={t.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="hsl(0 0% 100% / 0.95)"
                        stroke="hsl(0 0% 0% / 0.35)"
                        strokeWidth={0.6}
                        paintOrder="stroke fill"
                        fontSize={labelFont}
                        fontWeight={800}
                      >
                        {short}
                      </text>
                    );
                  })}
                  <circle cx={CX} cy={CY} r={18} fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth={3} />
                </svg>
              </div>
            </div>

            <div className="mt-6 flex justify-center md:mt-8">
              <button
                type="button"
                onClick={spin}
                disabled={spinning || pullLocked || slices.length === 0}
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
                }}
              >
                {spinning ? 'SPINNING…' : pullLocked ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 shrink-0 animate-spin" aria-hidden />
                    SAVING…
                  </>
                ) : (
                  'SPIN!'
                )}
              </button>
            </div>

            {embedded && slices.length > 0 ? (
              <p className="mt-4 px-2 text-center text-xs text-muted-foreground">
                {embeddedFooter ??
                  'Slice size matches ticket weight. If deduct-on-pull is on, points update after the spin completes.'}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
