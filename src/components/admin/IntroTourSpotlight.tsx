'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const SPOTLIGHT_PADDING = 10;

function isVisibleIntroTourElement(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
    return false;
  }
  return true;
}

/** Prefer a visible match when multiple nodes share the same tour id. */
export function queryIntroTourTarget(targetId: string): Element | null {
  const nodes = document.querySelectorAll(`[data-intro-tour="${targetId}"]`);
  if (nodes.length === 0) return null;
  if (nodes.length === 1) return nodes[0];

  let best: Element | null = null;
  let bestScore = -1;
  for (const el of nodes) {
    if (!isVisibleIntroTourElement(el)) continue;
    const rect = el.getBoundingClientRect();
    const score = rect.width * rect.height + rect.right;
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best ?? nodes[0];
}

export function measureIntroTourTarget(targetId?: string): SpotlightRect | null {
  if (!targetId) return null;
  const el = queryIntroTourTarget(targetId);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  return {
    top: r.top - SPOTLIGHT_PADDING,
    left: r.left - SPOTLIGHT_PADDING,
    width: r.width + SPOTLIGHT_PADDING * 2,
    height: r.height + SPOTLIGHT_PADDING * 2,
  };
}

type Props = {
  targetId?: string;
  active: boolean;
};

export function IntroTourSpotlight({ targetId, active }: Props) {
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [helpRect, setHelpRect] = useState<SpotlightRect | null>(null);

  const measure = useCallback(() => {
    if (!active || !targetId) {
      setRect(null);
      setHelpRect(null);
      return;
    }
    setRect(measureIntroTourTarget(targetId));
    setHelpRect(measureIntroTourTarget('staff-ai-help'));
  }, [active, targetId]);

  useEffect(() => {
    measure();
    if (!active || !targetId) return;

    const el = queryIntroTourTarget(targetId);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth', inline: 'nearest' });

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (el && ro) ro.observe(el);

    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    const tick = window.setInterval(measure, 400);

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      window.clearInterval(tick);
    };
  }, [active, targetId, measure]);

  if (!active || !rect || typeof document === 'undefined') return null;

  const maskId = `intro-tour-spotlight-${targetId ?? 'default'}`;
  const cutoutRx = 12;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[199]" aria-hidden>
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={rect.left}
              y={rect.top}
              width={rect.width}
              height={rect.height}
              rx={cutoutRx}
              fill="black"
            />
            {helpRect && (
              <rect
                x={helpRect.left + 4}
                y={helpRect.top + 4}
                width={helpRect.width - 8}
                height={helpRect.height - 8}
                rx={100}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.14)"
          mask={`url(#${maskId})`}
          className="transition-opacity duration-500 ease-out motion-reduce:transition-none"
        />
      </svg>
      <div
        className="absolute rounded-xl border-2 border-primary bg-transparent shadow-[0_0_0_3px_hsl(var(--primary)/0.35),0_0_24px_hsl(var(--primary)/0.25)] transition-all duration-500 ease-out motion-reduce:transition-none"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
      />
      <div
        className="absolute rounded-xl border-2 border-primary/45 motion-safe:animate-pulse motion-reduce:animate-none"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
        }}
      />
    </div>,
    document.body,
  );
}
