'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { GLOBAL_HEADER_HEIGHT_CSS_VAR } from '@/components/layout/HoverRevealHeaderShell';

/** Pointer within this band from the viewport top reveals tucked chrome. */
export const TOP_EDGE_REVEAL_PX = 12;

/** After a touch reveals kiosk chrome, keep it available briefly so header controls stay reachable. */
const TOUCH_REVEAL_LINGER_MS = 4000;

const HEADER_HEIGHT_FALLBACK_PX = 80;

function readGlobalHeaderHeightPx(): number {
  if (typeof document === 'undefined') return HEADER_HEIGHT_FALLBACK_PX;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(GLOBAL_HEADER_HEIGHT_CSS_VAR);
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : HEADER_HEIGHT_FALLBACK_PX;
}

function updatePointerYVisibility(
  y: number,
  visibleRef: MutableRefObject<boolean>,
  setVisibleIfChanged: (next: boolean) => void,
) {
  if (y <= TOP_EDGE_REVEAL_PX) {
    setVisibleIfChanged(true);
    return;
  }
  if (!visibleRef.current) return;
  const headerHeight = readGlobalHeaderHeightPx();
  if (y > headerHeight) {
    setVisibleIfChanged(false);
  }
}

/**
 * Keeps chrome hidden until the pointer enters the top edge (or moves over the revealed header).
 * Touch screens also reveal chrome on tap; it lingers briefly so kiosk header controls stay reachable.
 * Used on student kiosk where inner panels scroll instead of the document.
 */
export function useTopEdgeRevealChrome(active: boolean) {
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const touchLingerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) {
      visibleRef.current = false;
      setVisible(false);
      return;
    }

    const setVisibleIfChanged = (next: boolean) => {
      if (next === visibleRef.current) return;
      visibleRef.current = next;
      setVisible(next);
    };

    const clearTouchLingerTimer = () => {
      if (touchLingerTimerRef.current) {
        clearTimeout(touchLingerTimerRef.current);
        touchLingerTimerRef.current = null;
      }
    };

    const scheduleTouchLingerHide = () => {
      clearTouchLingerTimer();
      touchLingerTimerRef.current = setTimeout(() => {
        touchLingerTimerRef.current = null;
        setVisibleIfChanged(false);
      }, TOUCH_REVEAL_LINGER_MS);
    };

    const onMouseMove = (event: MouseEvent) => {
      updatePointerYVisibility(event.clientY, visibleRef, setVisibleIfChanged);
    };

    const onMouseLeave = () => setVisibleIfChanged(false);

    const onTouchStart = () => {
      setVisibleIfChanged(true);
      scheduleTouchLingerHide();
    };

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      if (touch.clientY <= TOP_EDGE_REVEAL_PX) {
        setVisibleIfChanged(true);
        scheduleTouchLingerHide();
        return;
      }
      if (!visibleRef.current) return;
      const headerHeight = readGlobalHeaderHeightPx();
      if (touch.clientY > headerHeight) {
        setVisibleIfChanged(false);
        clearTouchLingerTimer();
        return;
      }
      scheduleTouchLingerHide();
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      clearTouchLingerTimer();
      window.removeEventListener('mousemove', onMouseMove);
      document.documentElement.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [active]);

  return visible;
}
