'use client';

import { useEffect, useRef, useState } from 'react';

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'mousemove', 'keydown', 'wheel', 'touchstart'] as const;

/** Shared stations clear the borrower after inactivity; in-flight saves pause the timer. */
export function useLibraryIdleReset(active: boolean, onReset: () => void, seconds = 60) {
  const resetRef = useRef(onReset);
  resetRef.current = onReset;
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    setRemaining(seconds);
    if (!active) return;
    let deadline = Date.now() + seconds * 1000;
    let expired = false;
    const touch = () => {
      deadline = Date.now() + seconds * 1000;
      setRemaining((prev) => (prev === seconds ? prev : seconds));
    };
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (!left && !expired) {
        expired = true;
        resetRef.current();
      }
    };
    const opts: AddEventListenerOptions = { passive: true };
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, touch, opts);
    }
    document.addEventListener('visibilitychange', tick);
    const interval = setInterval(tick, 1000);
    return () => {
      clearInterval(interval);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, touch);
      }
      document.removeEventListener('visibilitychange', tick);
    };
  }, [active, seconds]);
  return remaining;
}
