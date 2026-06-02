'use client';

import { useEffect, useRef } from 'react';

type UseClassroomIdleExitOptions = {
  enabled: boolean;
  idleMs: number;
  onExit: () => void;
};

/**
 * Idle timer for full-screen classroom view — separate from staff admin auto-logout.
 * Returns to portal (or caller-defined exit) after inactivity.
 */
export function useClassroomIdleExit({ enabled, idleMs, onExit }: UseClassroomIdleExitOptions) {
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  useEffect(() => {
    if (!enabled) return;

    const safeIdleMs =
      typeof idleMs === 'number' && Number.isFinite(idleMs) && idleMs > 0
        ? Math.min(idleMs, 24 * 60 * 60 * 1000)
        : 15 * 60 * 1000;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let sessionEndAt = 0;
    const lastNoisyActivityAtRef = { current: 0 };
    const NOISE_THROTTLE_MS = 750;
    const noisyTypes = new Set(['mousemove', 'scroll', 'wheel']);

    const arm = () => {
      sessionEndAt = Date.now() + safeIdleMs;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (typeof document !== 'undefined' && document.querySelector('[data-settings-open="true"]')) {
          arm();
          return;
        }
        onExitRef.current();
      }, safeIdleMs);
    };

    const checkExpired = () => {
      if (Date.now() >= sessionEndAt) {
        if (typeof document !== 'undefined' && document.querySelector('[data-settings-open="true"]')) {
          arm();
        } else {
          onExitRef.current();
        }
      }
    };

    const onActivity = (ev: Event) => {
      if (noisyTypes.has(ev.type)) {
        const now = Date.now();
        if (now - lastNoisyActivityAtRef.current < NOISE_THROTTLE_MS) return;
        lastNoisyActivityAtRef.current = now;
      }
      arm();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkExpired();
    };

    arm();
    const events: (keyof WindowEventMap)[] = [
      'mousedown',
      'keydown',
      'touchstart',
      'pointerdown',
      'click',
      'mousemove',
      'scroll',
      'wheel',
    ];
    for (const ev of events) {
      window.addEventListener(ev, onActivity, { passive: true });
    }
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onActivity);

    return () => {
      if (timer) clearTimeout(timer);
      for (const ev of events) {
        window.removeEventListener(ev, onActivity);
      }
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onActivity);
    };
  }, [enabled, idleMs]);
}
