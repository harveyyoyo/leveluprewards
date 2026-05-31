'use client';

import { useEffect, useRef, useState } from 'react';

/** Within this many px of the scroll top, chrome stays visible. */
export const SCROLL_TOP_REVEAL_PX = 8;

export function useScrollTopRevealChrome(active: boolean) {
  const [visible, setVisible] = useState(true);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setVisible(true);
      return;
    }

    const readScrollTop = () =>
      window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;

    const sync = () => {
      setVisible(readScrollTop() <= SCROLL_TOP_REVEAL_PX);
    };

    const onScroll = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        sync();
      });
    };

    sync();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  return visible;
}
