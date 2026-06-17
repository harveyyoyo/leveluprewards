'use client';

/** Classic kiosk +PTS fly-up (see `animate-fly-up` in globals.css). */
export function StudentKioskPointsFlyUp({
  points,
  animationKey,
}: {
  points: number;
  animationKey: number;
}) {
  return (
    <div
      key={animationKey}
      className="pointer-events-none fixed inset-0 z-[75] flex items-center justify-center"
      aria-hidden
    >
      <div className="animate-fly-up text-4xl font-black tracking-widest text-emerald-400 drop-shadow-[0_0_14px_rgba(52,211,153,0.75)] md:text-6xl">
        +{points} PTS
      </div>
    </div>
  );
}
