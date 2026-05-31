'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Visible strip when the header is tucked away (pull-down affordance). */
export const HEADER_PEEK_PX = 12;

/** Fallback until ResizeObserver measures the live header. */
const HEADER_RESERVE_FALLBACK_PX = 80;

type HoverRevealHeaderShellProps = {
  children: ReactNode;
  visible: boolean;
  className?: string;
  /** When false, the header fully slides off-screen (no peek strip). */
  peekWhenHidden?: boolean;
};

export function HoverRevealHeaderShell({
  children,
  visible,
  className,
  peekWhenHidden = true,
}: HoverRevealHeaderShellProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(HEADER_RESERVE_FALLBACK_PX);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    const measure = () => {
      const next = Math.ceil(el.getBoundingClientRect().height);
      if (next > 0) setHeaderHeight(next);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const reservedHeight = visible
    ? headerHeight
    : peekWhenHidden
      ? HEADER_PEEK_PX
      : 0;

  return (
    <>
      <div
        ref={innerRef}
        className={cn(
          'fixed inset-x-0 top-0 z-[200] transition-transform duration-300 ease-out no-print',
          visible && 'translate-y-0',
          className,
        )}
        style={
          visible
            ? undefined
            : peekWhenHidden
              ? { transform: `translateY(calc(-100% + ${HEADER_PEEK_PX}px))` }
              : { transform: 'translateY(-100%)' }
        }
        aria-hidden={false}
      >
        {children}
        {!visible && peekWhenHidden ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 flex h-3 items-center justify-center"
            aria-hidden
          >
            <span className="inline-flex items-center gap-0.5 rounded-full border border-border/40 bg-card/90 px-2 py-0.5 shadow-sm backdrop-blur-sm">
              <span className="h-0.5 w-5 rounded-full bg-primary/35" />
              <ChevronDown className="h-2.5 w-2.5 text-primary/50" aria-hidden />
            </span>
          </div>
        ) : null}
      </div>
      <div
        className="shrink-0 transition-[height] duration-300 ease-out no-print"
        style={{ height: reservedHeight }}
        aria-hidden
      />
    </>
  );
}
