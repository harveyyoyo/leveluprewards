'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Freezes `value` while the user scrolls inside `scrollRootRef` (or the window).
 * Applies the latest value after scrolling stops so live Firestore feeds do not jank scroll.
 */
export function useScrollPausedValue<T>(
  value: T,
  scrollRootRef: RefObject<HTMLElement | null>,
  pauseMs = 280,
): T {
  const latestRef = useRef(value);
  const frozenRef = useRef(value);
  const pausedRef = useRef(false);
  const [epoch, setEpoch] = useState(0);

  latestRef.current = value;

  useEffect(() => {
    if (!pausedRef.current) {
      frozenRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    const target: HTMLElement | Window = scrollRootRef.current ?? window;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      if (!pausedRef.current) return;
      pausedRef.current = false;
      frozenRef.current = latestRef.current;
      setEpoch((n) => n + 1);
    };

    const onScroll = () => {
      if (!pausedRef.current) {
        pausedRef.current = true;
        frozenRef.current = latestRef.current;
        setEpoch((n) => n + 1);
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, pauseMs);
    };

    target.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      target.removeEventListener('scroll', onScroll, { capture: true });
      if (timer) clearTimeout(timer);
    };
  }, [scrollRootRef, pauseMs]);

  return pausedRef.current ? frozenRef.current : value;
}
