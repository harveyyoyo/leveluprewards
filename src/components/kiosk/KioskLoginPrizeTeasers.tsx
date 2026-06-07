'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection } from 'firebase/firestore';
import DynamicIcon from '@/components/DynamicIcon';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { isStudentRewardsUiOn } from '@/lib/productPillars';
import { prizeIsListed } from '@/lib/prizes/prizeUtils';
import type { Prize } from '@/lib/types';

type TeaserSpot = {
  id: number;
  prizeId: string;
  topPct: number;
  leftPct: number;
  durationMs: number;
  sizePx: number;
  rotateDeg: number;
};

const MAX_VISIBLE = 7;
const MIN_SPAWN_MS = 900;
const MAX_SPAWN_MS = 2200;

/** Pick a position in the margin bands around the central scan card. */
function randomTeaserPosition(): { topPct: number; leftPct: number } {
  const band = Math.floor(Math.random() * 4);
  if (band === 0) {
    return { topPct: 3 + Math.random() * 10, leftPct: 6 + Math.random() * 88 };
  }
  if (band === 1) {
    return { topPct: 86 + Math.random() * 8, leftPct: 6 + Math.random() * 88 };
  }
  if (band === 2) {
    return { topPct: 14 + Math.random() * 68, leftPct: 2 + Math.random() * 12 };
  }
  return { topPct: 14 + Math.random() * 68, leftPct: 86 + Math.random() * 10 };
}

export function KioskLoginPrizeTeasers({ schoolId }: { schoolId: string | null | undefined }) {
  const firestore = useFirestore();
  const { settings } = useSettings();
  const enabled =
    settings.enableKioskLoginPrizeTeasers === true && isStudentRewardsUiOn(settings);

  const prizesQuery = useMemoFirebase(
    () => (enabled && schoolId && firestore ? collection(firestore, 'schools', schoolId, 'prizes') : null),
    [enabled, schoolId, firestore],
  );
  const { data: prizesRaw } = useCollection<Prize>(prizesQuery);

  const listedPrizes = useMemo(
    () => (prizesRaw ?? []).filter(prizeIsListed),
    [prizesRaw],
  );

  const [spots, setSpots] = useState<TeaserSpot[]>([]);
  const nextIdRef = useRef(0);
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const spawnOne = useCallback(() => {
    if (!listedPrizes.length) return;
    const prize = listedPrizes[Math.floor(Math.random() * listedPrizes.length)]!;
    const pos = randomTeaserPosition();
    const durationMs = 2400 + Math.floor(Math.random() * 2200);
    const id = ++nextIdRef.current;

    setSpots((prev) => {
      const next = [
        ...prev,
        {
          id,
          prizeId: prize.id,
          topPct: pos.topPct,
          leftPct: pos.leftPct,
          durationMs,
          sizePx: 44 + Math.floor(Math.random() * 28),
          rotateDeg: -18 + Math.floor(Math.random() * 36),
        },
      ];
      return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next;
    });

    setTimeout(() => {
      setSpots((prev) => prev.filter((s) => s.id !== id));
    }, durationMs + 80);
  }, [listedPrizes]);

  useEffect(() => {
    if (!enabled || listedPrizes.length === 0 || reducedMotionRef.current) {
      setSpots([]);
      return;
    }

    const scheduleNext = () => {
      const delay = MIN_SPAWN_MS + Math.floor(Math.random() * (MAX_SPAWN_MS - MIN_SPAWN_MS));
      spawnTimerRef.current = setTimeout(() => {
        spawnOne();
        scheduleNext();
      }, delay);
    };

    spawnOne();
    scheduleNext();

    return () => {
      if (spawnTimerRef.current != null) clearTimeout(spawnTimerRef.current);
    };
  }, [enabled, listedPrizes.length, spawnOne]);

  const prizeById = useMemo(() => {
    const map = new Map<string, Prize>();
    for (const p of listedPrizes) map.set(p.id, p);
    return map;
  }, [listedPrizes]);

  if (!enabled || listedPrizes.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden motion-reduce:hidden"
      aria-hidden
    >
      {spots.map((spot) => {
        const prize = prizeById.get(spot.prizeId);
        if (!prize) return null;
        const showImage = settings.enablePrizeImages !== false && prize.imageUrl;

        return (
          <div
            key={spot.id}
            className="absolute"
            style={{
              top: `${spot.topPct}%`,
              left: `${spot.leftPct}%`,
              transform: `translate(-50%, -50%) rotate(${spot.rotateDeg}deg)`,
            }}
          >
            <div
              className="flex animate-kiosk-prize-teaser items-center justify-center"
              style={{
                width: spot.sizePx,
                height: spot.sizePx,
                animationDuration: `${spot.durationMs}ms`,
              }}
            >
            {showImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={prize.imageUrl}
                alt=""
                className="size-full rounded-xl object-cover opacity-[0.14] blur-[0.3px] dark:opacity-[0.11]"
                draggable={false}
              />
            ) : (
              <DynamicIcon
                name={prize.icon || 'Gift'}
                className="size-[70%] text-primary opacity-[0.13] dark:opacity-[0.1]"
                strokeWidth={1.35}
                aria-hidden
              />
            )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
