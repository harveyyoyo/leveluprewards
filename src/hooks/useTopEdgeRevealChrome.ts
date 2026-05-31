'use client';

import { useEffect, useRef, useState } from 'react';

/** Pointer within this many px of the top edge reveals chrome. */
export const TOP_EDGE_REVEAL_PX = 48;

export function useTopEdgeRevealChrome(active: boolean, hideAfterMs = 2500) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const reveal = (event: MouseEvent) => {
      if (event.clientY > TOP_EDGE_REVEAL_PX) return;
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        timerRef.current = null;
      }, hideAfterMs);
    };

    window.addEventListener('mousemove', reveal, { passive: true });
    return () => {
      window.removeEventListener('mousemove', reveal);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [active, hideAfterMs]);

  return visible;
}
