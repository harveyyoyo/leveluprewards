'use client';

import { useEffect, useRef, useState } from 'react';

/** Near the top — always keep chrome visible. */
export const SCROLL_TOP_REVEAL_PX = 32;
/** Must scroll past this before hide-on-scroll-down applies. */
export const SCROLL_HIDE_MIN_PX = 96;
/** Minimum per-frame scroll delta to treat as intentional direction. */
const SCROLL_DIRECTION_DELTA_PX = 8;

function isDocumentScrollTarget(target: EventTarget | null): boolean {
  return (
    target === document ||
    target === document.documentElement ||
    target === document.body
  );
}

function readScrollTop(target: EventTarget | null): number {
  if (isDocumentScrollTarget(target)) {
    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }
  if (target instanceof Element) {
    return target.scrollTop;
  }
  return window.scrollY || document.documentElement.scrollTop || 0;
}

export function useScrollTopRevealChrome(active: boolean) {
  const [visible, setVisible] = useState(true);
  const visibleRef = useRef(true);
  const lastWindowScrollRef = useRef(0);
  const lastScrollByTargetRef = useRef(new WeakMap<EventTarget, number>());
  const rafRef = useRef<number | null>(null);
  const pendingTargetRef = useRef<EventTarget | null>(null);

  useEffect(() => {
    if (!active) {
      visibleRef.current = true;
      setVisible(true);
      return;
    }

    const setVisibleIfChanged = (next: boolean) => {
      if (next === visibleRef.current) return;
      visibleRef.current = next;
      setVisible(next);
    };

    const sync = (target: EventTarget | null) => {
      const scrollTarget = target ?? document.documentElement;
      const y = readScrollTop(scrollTarget);

      let lastY: number;
      if (isDocumentScrollTarget(scrollTarget)) {
        lastY = lastWindowScrollRef.current;
        lastWindowScrollRef.current = y;
      } else {
        const map = lastScrollByTargetRef.current;
        lastY = map.get(scrollTarget) ?? y;
        map.set(scrollTarget, y);
      }

      const delta = y - lastY;

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

    lastWindowScrollRef.current = readScrollTop(document.documentElement);
    sync(document.documentElement);

    const onScroll = (event: Event) => {
      pendingTargetRef.current = event.target;
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        sync(pendingTargetRef.current);
      });
    };

    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener('scroll', onScroll, true);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  return visible;
}
