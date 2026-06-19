'use client';

import { memo } from 'react';
import type { House } from '@/lib/types';
import type { ClassroomCelebrationEffect } from '@/lib/classroomSeatingChart';
import { ClassroomEffectOverlay } from '@/components/points/classroomVisualTheme';
import { resolveHouseSortingCelebrationParts } from '@/lib/houses/houseSortingCelebration';

function CeremonyRevealFlash({
  runId,
  accentColor,
}: {
  runId: number;
  accentColor: string;
}) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <span
        key={`burst-${runId}`}
        className="absolute inset-0 animate-classroom-desk-flash-burst motion-reduce:opacity-60"
        style={{
          background: `radial-gradient(circle at 50% 50%, color-mix(in srgb, ${accentColor} 72%, transparent) 0%, color-mix(in srgb, ${accentColor} 34%, transparent) 48%, transparent 74%)`,
        }}
      />
      <span
        key={`wave-${runId}`}
        className="absolute inset-0 border-2 animate-classroom-desk-flash-wave motion-reduce:opacity-70"
        style={{ borderColor: `color-mix(in srgb, ${accentColor} 55%, transparent)` }}
      />
      <span key={`shine-${runId}`} className="absolute inset-0 overflow-hidden">
        <span className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-classroom-desk-flash-shine motion-reduce:opacity-40" />
      </span>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <span
          key={`spark-${runId}-${i}`}
          className="absolute h-2 w-2 rounded-full animate-classroom-desk-flash-spark motion-reduce:opacity-70"
          style={{
            left: `${10 + i * 11}%`,
            top: `${18 + (i % 4) * 16}%`,
            backgroundColor: accentColor,
            boxShadow: `0 0 10px color-mix(in srgb, ${accentColor} 80%, transparent)`,
            animationDelay: `${i * 0.05}s`,
          }}
        />
      ))}
    </div>
  );
}

function HouseSortingFlyUp({
  runId,
  house,
}: {
  runId: number;
  house: Pick<House, 'name' | 'color' | 'emoji'>;
}) {
  const accent = house.color || '#a78bfa';

  return (
    <div key={runId} className="flex w-max max-w-[min(92vw,24rem)] flex-col items-center text-center">
      <span
        className="animate-fly-up text-3xl font-black uppercase tracking-[0.2em] sm:text-4xl"
        style={{
          color: accent,
          filter: `drop-shadow(0 0 16px color-mix(in srgb, ${accent} 75%, transparent))`,
        }}
      >
        {house.emoji ? `${house.emoji} ` : ''}
        {house.name}
      </span>
    </div>
  );
}

export const HouseSortingCelebrationLayer = memo(function HouseSortingCelebrationLayer({
  runId,
  celebrationEffect,
  showFlyUp,
  house,
}: {
  runId: number;
  celebrationEffect: ClassroomCelebrationEffect;
  showFlyUp: boolean;
  house?: Pick<House, 'name' | 'color' | 'emoji'>;
}) {
  const { showFlash, particleEffect } = resolveHouseSortingCelebrationParts(celebrationEffect);
  const accentColor = house?.color ?? '#7c3aed';

  if (!showFlash && !particleEffect && !(showFlyUp && house)) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[25] overflow-hidden">
      {showFlash ? <CeremonyRevealFlash runId={runId} accentColor={accentColor} /> : null}
      {particleEffect ? (
        <ClassroomEffectOverlay effect={particleEffect} runId={runId} scope="viewport" />
      ) : null}
      {showFlyUp && house ? (
        <div className="pointer-events-none fixed left-1/2 top-[62%] z-[26] -translate-x-1/2 -translate-y-1/2">
          <HouseSortingFlyUp runId={runId} house={house} />
        </div>
      ) : null}
    </div>
  );
});
