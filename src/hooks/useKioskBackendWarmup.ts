'use client';

import { useEffect, useRef } from 'react';
import type { Firestore } from 'firebase/firestore';
import { getDocFromServer } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';
import { httpsCallable } from 'firebase/functions';
import { schoolPublicDocRef } from '@/lib/schoolPublic';

const WARMUP_INTERVAL_MS = 2 * 60 * 1000;
const MIN_WARMUP_GAP_MS = 30 * 1000;

export function useKioskBackendWarmup({
  enabled,
  firestore,
  functions,
  schoolId,
}: {
  enabled: boolean;
  firestore: Firestore | null | undefined;
  functions: Functions | null | undefined;
  schoolId: string | null | undefined;
}) {
  const lastRunAtRef = useRef(0);

  useEffect(() => {
    const sid = schoolId?.trim().toLowerCase();
    if (!enabled || !sid || !firestore || !functions) return;
    if (typeof window === 'undefined') return;

    let cancelled = false;
    let initialTimer: number | null = null;
    let intervalTimer: number | null = null;

    const runWarmup = async (force = false) => {
      if (cancelled) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      if (document.visibilityState !== 'visible') return;

      const now = Date.now();
      if (!force && now - lastRunAtRef.current < MIN_WARMUP_GAP_MS) return;
      lastRunAtRef.current = now;

      const payload = { schoolId: sid, warmup: true };
      await Promise.allSettled([
        httpsCallable(functions, 'lookupStudentByBadge')(payload),
        httpsCallable(functions, 'redeemCouponServer')(payload),
        httpsCallable(functions, 'signInAttendance')(payload),
        httpsCallable(functions, 'redeemPrizeServer')(payload),
        getDocFromServer(schoolPublicDocRef(firestore, sid)),
      ]);
    };

    initialTimer = window.setTimeout(() => void runWarmup(true), 1500);
    intervalTimer = window.setInterval(() => void runWarmup(), WARMUP_INTERVAL_MS);

    const onWake = () => void runWarmup();
    window.addEventListener('online', onWake);
    document.addEventListener('visibilitychange', onWake);

    return () => {
      cancelled = true;
      if (initialTimer) window.clearTimeout(initialTimer);
      if (intervalTimer) window.clearInterval(intervalTimer);
      window.removeEventListener('online', onWake);
      document.removeEventListener('visibilitychange', onWake);
    };
  }, [enabled, firestore, functions, schoolId]);
}
