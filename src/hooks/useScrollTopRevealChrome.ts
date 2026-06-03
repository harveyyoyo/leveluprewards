'use client';

import { useEffect, useRef, useState } from 'react';

/** Near the top — always keep chrome visible. */
export const SCROLL_TOP_REVEAL_PX = 32;
/** Must scroll past this before hide-on-scroll-down applies. */
export const SCROLL_HIDE_MIN_PX = 96;
/** Minimum per-frame scroll delta to treat as intentional direction. */
const SCROLL_DIRECTION_DELTA_PX = 8;

export function useScrollTopRevealChrome(active: boolean) {
  const [visible, setVisible] = useState(true);
  const visibleRef = useRef(true);
  const lastScrollYRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      visibleRef.current = true;
      setVisible(true);
      return;
    }

    const readScrollTop = () =>
      window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;

    const setVisibleIfChanged = (next: boolean) => {
      if (next === visibleRef.current) return;
      visibleRef.current = next;
      setVisible(next);
    };

    const sync = () => {
      const y = readScrollTop();
      const delta = y - lastScrollYRef.current;
      lastScrollYRef.current = y;

      if (y <= SCROLL_TOP_REVEAL_PX) {
        setVisibleIfChanged(true);
        return;
      }

      if (delta < -SCROLL_DIRECTION_DELTA_PX) {
        setVisibleIfChanged(true);
        return;
      }

      if (delta > SCROLL_DIRECTION_DELTA_PX && y > SCROLL_HIDE_MIN_PX) {
        setVisibleIfChanged(false);
      }
    };

    lastScrollYRef.current = readScrollTop();
    sync();

    const onScroll = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        sync();
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  return visible;
}
