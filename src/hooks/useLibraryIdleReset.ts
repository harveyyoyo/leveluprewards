'use client';

import { useEffect, useRef, useState } from 'react';

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
    const touch = () => { deadline = Date.now() + seconds * 1000; setRemaining(seconds); };
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (!left && !expired) { expired = true; resetRef.current(); }
    };
    window.addEventListener('pointerdown', touch);
    window.addEventListener('keydown', touch);
    document.addEventListener('visibilitychange', tick);
    const interval = setInterval(tick, 1000);
    return () => { clearInterval(interval); window.removeEventListener('pointerdown', touch); window.removeEventListener('keydown', touch); document.removeEventListener('visibilitychange', tick); };
  }, [active, seconds]);
  return remaining;
}
