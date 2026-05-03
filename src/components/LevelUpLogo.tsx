import { cn } from '@/lib/utils';

const BAR_COUNT = 16;

/** Animated cinematic LEVEL UP logo (SVG + CSS): layered glow, chromatic arrow, looping rise, wordmark + underline. */
export function LevelUpLogo({ className }: { className?: string }) {
  const arrowPath =
    'M 400 60 L 760 420 L 560 420 L 560 660 L 240 660 L 240 420 L 40 420 Z';

  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const shaftLeft = 252;
    const shaftRight = 548;
    const slot = (shaftRight - shaftLeft) / BAR_COUNT;
    const barW = slot * 0.5;
    const x = shaftLeft + i * slot + (slot - barW) / 2;
    const tallness = Math.sin((i / (BAR_COUNT - 1)) * Math.PI);
    const minH = 130;
    const maxH = 470;
    const h = minH + tallness * (maxH - minH);
    const y = 650 - h;
    const delay = 0.45 + i * 0.06;
    const loopDelay = 4 + i * 0.08;
    return { x, y, h, barW, delay, loopDelay, key: i };
  });

  return (
    <div
      className={cn(
        'level-up-logo-cinematic relative flex select-none flex-col items-center justify-center gap-6',
        className,
      )}
      style={{ animation: 'luc-float 7s ease-in-out infinite' }}
    >
      <div
        aria-hidden
        className="absolute -inset-24 rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, oklch(0.62 0.16 250 / 0.45), transparent 65%)',
          animation: 'luc-glow 6s ease-in-out infinite',
        }}
      />
      <div
        aria-hidden
        className="absolute -inset-16 rounded-full blur-2xl"
        style={{
          background:
            'radial-gradient(circle, oklch(0.75 0.14 90 / 0.18), transparent 70%)',
          animation: 'luc-glow 8s ease-in-out 1s infinite reverse',
        }}
      />

      <div className="relative aspect-[800/720] w-[min(40vw,280px)]">
        <svg
          viewBox="0 0 800 720"
          className="h-full w-full overflow-visible"
          aria-label="Level Up animated logo"
        >
          <defs>
            <linearGradient id="lu-bar-grad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="var(--brand-cream)" stopOpacity="0.35" />
              <stop offset="60%" stopColor="var(--brand-cream)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="var(--brand-cream)" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="lu-stroke-grad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="oklch(0.78 0.13 90)" />
              <stop offset="100%" stopColor="var(--brand-cream)" />
            </linearGradient>
            <clipPath id="lu-arrow-clip">
              <path d={arrowPath} />
            </clipPath>
            <filter id="lu-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d={arrowPath}
            fill="oklch(0.28 0.06 252)"
            opacity={0}
            style={{
              animation: 'luc-fade-in 0.8s ease-out 0.2s forwards',
            }}
          />

          <g clipPath="url(#lu-arrow-clip)">
            {bars.map((b) => (
              <rect
                key={b.key}
                x={b.x}
                y={b.y}
                width={b.barW}
                height={b.h}
                rx={2}
                fill="url(#lu-bar-grad)"
                style={{
                  transformOrigin: `${b.x + b.barW / 2}px 650px`,
                  transform: 'scaleY(0)',
                  opacity: 0,
                  animation: `luc-bar-rise 1.1s cubic-bezier(0.22, 1, 0.36, 1) ${b.delay}s forwards, luc-bar-pulse 4s ease-in-out ${b.loopDelay}s infinite`,
                }}
              />
            ))}
          </g>

          <path
            d={arrowPath}
            pathLength={1}
            fill="none"
            stroke="url(#lu-stroke-grad)"
            strokeWidth={8}
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#lu-soft-glow)"
            style={{
              strokeDasharray: 1,
              strokeDashoffset: 1,
              opacity: 0,
              animation:
                'luc-arrow-draw 2.2s cubic-bezier(0.65, 0, 0.35, 1) 0.1s forwards',
            }}
          />
        </svg>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="overflow-hidden pb-1">
          <h1
            className="font-black leading-none text-[color:var(--brand-cream)]"
            style={{
              fontSize: 'clamp(1.5rem, 4.2vw, 2.75rem)',
              letterSpacing: '0.32em',
              paddingLeft: '0.32em',
              transform: 'translateY(28px)',
              opacity: 0,
              animation:
                'luc-text-reveal 1.4s cubic-bezier(0.22, 1, 0.36, 1) 1.8s forwards',
              fontFamily:
                "'Inter', system-ui, -apple-system, 'Helvetica Neue', sans-serif",
            }}
          >
            LEVEL UP
          </h1>
        </div>
        <div
          className="h-px origin-center bg-[color:var(--brand-cream)]"
          style={{
            width: 'min(40vw,280px)',
            opacity: 0.35,
            transform: 'scaleX(0)',
            animation: 'luc-line-grow 1.4s cubic-bezier(0.22,1,0.36,1) 2.2s forwards',
          }}
        />
        <p
          className="uppercase text-[color:var(--brand-cream)]/60"
          style={{
            fontSize: 'clamp(0.55rem, 1vw, 0.7rem)',
            letterSpacing: '0.5em',
            paddingLeft: '0.5em',
            opacity: 0,
            animation: 'luc-fade-in 1s ease-out 2.6s forwards',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          School rewards system
        </p>
      </div>
    </div>
  );
}