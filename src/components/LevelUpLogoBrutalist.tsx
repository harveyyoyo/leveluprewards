import { cn } from '@/lib/utils';

export function LevelUpLogoBrutalist({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'level-up-logo-brutalist relative flex w-[min(90vw,720px)] select-none flex-col items-start gap-4',
        className,
      )}
    >
      <div
        className="lu-brutalist-anim text-[10px] uppercase tracking-[0.4em] text-black/70"
        style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          animation: 'lu-fade-in 0.6s ease-out forwards',
        }}
      >
        ISSUE 001 / VOL.{'\u221e'} / NO COMPROMISE
      </div>

      <div
        className="lu-brutalist-anim lu-brutalist-line h-px w-full bg-black"
        style={{
          transform: 'scaleX(0)',
          transformOrigin: 'left',
          animation: 'lu-line-grow 0.8s cubic-bezier(0.22,1,0.36,1) 0.1s forwards',
        }}
      />

      <h1
        className="lu-brutalist-anim font-black uppercase leading-[0.85] text-black"
        style={{
          fontSize: 'clamp(4rem, 14vw, 12rem)',
          letterSpacing: '-0.04em',
          fontFamily: "'Archivo Black', 'Inter', system-ui, sans-serif",
          opacity: 0,
          animation: 'lu-text-reveal 0.9s cubic-bezier(0.22,1,0.36,1) 0.3s forwards',
        }}
      >
        LEVEL
        <br />
        <span className="inline-flex items-baseline gap-3">
          UP
          <span
            aria-hidden
            className="lu-brutalist-anim inline-block bg-black"
            style={{
              width: 'clamp(2rem,6vw,4.5rem)',
              height: 'clamp(2rem,6vw,4.5rem)',
              transform: 'scale(0)',
              animation: 'ed-dot-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.9s forwards',
            }}
          />
        </span>
      </h1>

      <div
        className="lu-brutalist-anim lu-brutalist-line h-px w-full bg-black"
        style={{
          transform: 'scaleX(0)',
          transformOrigin: 'right',
          animation: 'lu-line-grow 0.8s cubic-bezier(0.22,1,0.36,1) 1.1s forwards',
        }}
      />

      <div
        className="lu-brutalist-anim flex w-full justify-between text-[10px] uppercase tracking-[0.3em] text-black/70"
        style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          opacity: 0,
          animation: 'lu-fade-in 0.6s ease-out 1.3s forwards',
        }}
      >
        <span>{'\u2191 RISE \u2014 RISE \u2014 RISE'}</span>
        <span>EST. NOW</span>
      </div>
    </div>
  );
}