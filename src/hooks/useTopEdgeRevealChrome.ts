'use client';

import { useEffect, useRef, useState } from 'react';
import { GLOBAL_HEADER_HEIGHT_CSS_VAR } from '@/components/layout/HoverRevealHeaderShell';

/** Pointer within this band from the viewport top reveals tucked chrome. */
export const TOP_EDGE_REVEAL_PX = 12;

const HEADER_HEIGHT_FALLBACK_PX = 80;

function readGlobalHeaderHeightPx(): number {
  if (typeof document === 'undefined') return HEADER_HEIGHT_FALLBACK_PX;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(GLOBAL_HEADER_HEIGHT_CSS_VAR);
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : HEADER_HEIGHT_FALLBACK_PX;
}

/**
 * Keeps chrome hidden until the pointer enters the top edge (or moves over the revealed header).
 * Used on student kiosk where inner panels scroll instead of the document.
 */
export function useTopEdgeRevealChrome(active: boolean) {
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);

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

    const onMouseMove = (event: MouseEvent) => {
      const y = event.clientY;
      if (y <= TOP_EDGE_REVEAL_PX) {
        setVisibleIfChanged(true);
        return;
      }
      if (!visibleRef.current) return;
      const headerHeight = readGlobalHeaderHeightPx();
      if (y > headerHeight) {
        setVisibleIfChanged(false);
      }
    };

    const onMouseLeave = () => setVisibleIfChanged(false);

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onMouseLeave);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.documentElement.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [active]);

  return visible;
}
