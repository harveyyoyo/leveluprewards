'use client';

import { useEffect, useRef } from 'react';
import { useArcadeSound } from '@/hooks/useArcadeSound';

export function GlobalSoundListener() {
  const playSound = useArcadeSound();
  const lastHovered = useRef<Element | null>(null);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // We check for typical interactive elements.
      const interactiveEl = target.closest('button, a, [role="button"], [role="link"], label, select, input, .interactive-hover');

      if (interactiveEl && interactiveEl !== lastHovered.current) {
        playSound('click');
        lastHovered.current = interactiveEl;
      } else if (!interactiveEl) {
        lastHovered.current = null;
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget) {
        lastHovered.current = null;
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, [playSound]);

  return null;
}
