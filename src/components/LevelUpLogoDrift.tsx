import { cn } from '@/lib/utils';

/** Soft drift variant: arrow floats upward slowly with steady ghost trails (student kiosk). */
export function LevelUpLogoDrift({ className }: { className?: string }) {
  const arrowPath =
    'M 400 80 L 740 420 L 560 420 L 560 660 L 240 660 L 240 420 L 60 420 Z';

  return (
    <div
      className={cn(
        'level-up-logo-drift relative flex select-none flex-col items-center justify-center gap-6',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-16 rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, oklch(0.62 0.16 250 / 0.25), transparent 70%)',
          animation: 'lud-glow 7s ease-in-out infinite',
        }}
      />

      <div className="relative aspect-[800/720] w-[min(28vw,200px)] max-w-full">
        <svg
          viewBox="0 0 800 720"
          className="h-full w-full overflow-visible"
          aria-label="Level Up drifting logo"
          style={{
            animation: 'lud-drift 5.5s ease-in-out infinite',
            backfaceVisibility: 'hidden',
            transform: 'translate3d(0, 0, 0)',
            willChange: 'transform',
          }}
        >
          <defs>
            <linearGradient id="lud-drift-fill" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="var(--brand-cream)" stopOpacity="0.05" />
              <stop offset="100%" stopColor="var(--brand-cream)" stopOpacity="0.18" />
            </linearGradient>
          </defs>

          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={arrowPath}
              fill="none"
              stroke="var(--brand-cream)"
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{
                opacity: 0.12 - i * 0.03,
              }}
            />
          ))}

          <path
            d={arrowPath}
            fill="url(#lud-drift-fill)"
            stroke="var(--brand-cream)"
            strokeWidth={2.25}
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength={1}
            style={{
              strokeDasharray: 1,
              strokeDashoffset: 1,
              animation:
                'lud-arrow-draw 2.4s cubic-bezier(0.65,0,0.35,1) 0.3s forwards',
            }}
          />
        </svg>
      </div>

      <div className="flex flex-col items-center">
        <h1
          className="font-extralight leading-none text-[color:var(--brand-cream)]"
          style={{
            fontSize: 'clamp(0.95rem, 2.4vw, 1.35rem)',
            letterSpacing: '0.38em',
            paddingLeft: '0.38em',
            opacity: 0,
            animation: 'lud-fade-in 1.4s ease-out 1.6s forwards',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          LEVEL UP
        </h1>
      </div>
    </div>
  );
}
