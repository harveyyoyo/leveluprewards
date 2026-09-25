'use client';

import { useEffect, useState } from 'react';

function currentMinuteMs(): number {
  return Math.floor(Date.now() / 60_000) * 60_000;
}

/**
 * The current time, rounded down to the minute, that re-renders when the minute changes.
 * For screens left open all day (Today board, class screens) so "current period" and
 * "today" keep moving instead of freezing at the moment the page opened.
 */
export function useMinuteClock(): number {
  const [now, setNow] = useState(currentMinuteMs);
  useEffect(() => {
    const tick = () => setNow((prev) => {
      const next = currentMinuteMs();
      return next === prev ? prev : next;
    });
    const id = window.setInterval(tick, 15_000);
    // Catch up right away when a sleeping tablet or hidden tab comes back.
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return now;
}

/** Midnight at the start of the day containing `nowMs`, on this device's clock. */
export function startOfLocalDayMs(nowMs: number): number {
  const d = new Date(nowMs);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
