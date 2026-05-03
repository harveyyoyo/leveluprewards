import { cn } from '@/lib/utils';

/** Soft drift variant: arrow floats upward slowly with ghost trails (student kiosk). */
export function LevelUpLogoDrift({ className }: { className?: string }) {
  const arrowPath =
    'M 400 80 L 740 420 L 560 420 L 560 660 L 240 660 L 240 420 L 60 420 Z';

  return (
    <div
      className={cn(
        'level-up-logo-drift relative flex select-none flex-col items-center justify-center gap-10',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-20 rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, oklch(0.62 0.16 250 / 0.25), transparent 70%)',
          animation: 'lud-glow 7s ease-in-out infinite',
        }}
      />

      <div className="relative aspect-[800/720] w-[min(38vw,260px)] max-w-full">
        <svg
          viewBox="0 0 800 720"
          className="h-full w-full overflow-visible"
          aria-label="Level Up drifting logo"
          style={{ animation: 'lud-drift 5.5s ease-in-out infinite' }}
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
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{
                opacity: 0,
                animation: `lud-drift-trail 5.5s ease-in-out ${i * 0.5}s infinite`,
              }}
            />
          ))}

          <path
            d={arrowPath}
            fill="url(#lud-drift-fill)"
            stroke="var(--brand-cream)"
            strokeWidth={3}
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

      <div className="flex flex-col items-center gap-3">
        <h1
          className="font-extralight leading-none text-[color:var(--brand-cream)]"
          style={{
            fontSize: 'clamp(1.4rem, 3.6vw, 2.25rem)',
            letterSpacing: '0.45em',
            paddingLeft: '0.45em',
            opacity: 0,
            animation: 'lud-fade-in 1.4s ease-out 1.6s forwards',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          LEVEL UP
        </h1>
        <p
          className="uppercase text-[color:var(--brand-cream)]/50"
          style={{
            fontSize: 'clamp(0.55rem, 1vw, 0.7rem)',
            letterSpacing: '0.5em',
            paddingLeft: '0.5em',
            opacity: 0,
            animation: 'lud-fade-in 1.2s ease-out 2.2s forwards',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          Drift
        </p>
      </div>
    </div>
  );
}
