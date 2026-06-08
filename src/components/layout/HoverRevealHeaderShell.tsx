'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HeaderManagedShellProvider } from '@/components/layout/HeaderChromeContext';

/** Visible strip when the header is tucked away (pull-down affordance). */
export const HEADER_PEEK_PX = 20;

/** Fallback until ResizeObserver measures the live header. */
const HEADER_RESERVE_FALLBACK_PX = 80;

/** Measured global header height — used for overlay scroll-hide layout on staff portals. */
export const GLOBAL_HEADER_HEIGHT_CSS_VAR = '--global-header-height';

type HoverRevealHeaderShellProps = {
  children: ReactNode;
  visible: boolean;
  className?: string;
  /** When false, the header fully slides off-screen (no peek strip). */
  peekWhenHidden?: boolean;
  /**
   * spacer: in-flow height reserve below a fixed header.
   * overlay: fixed header + CSS var height — tuck/reveal on scroll.
   */
  layout?: 'spacer' | 'overlay';
};

export function HoverRevealHeaderShell({
  children,
  visible,
  className,
  peekWhenHidden = true,
  layout = 'spacer',
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

  useEffect(() => {
    if (layout !== 'overlay') return;
    document.documentElement.style.setProperty(GLOBAL_HEADER_HEIGHT_CSS_VAR, `${headerHeight}px`);
    return () => {
      document.documentElement.style.removeProperty(GLOBAL_HEADER_HEIGHT_CSS_VAR);
    };
  }, [headerHeight, layout]);

  const reservedHeight = visible
    ? headerHeight
    : peekWhenHidden
      ? HEADER_PEEK_PX
      : 0;

  const headerNode = (
    <div
      ref={innerRef}
      className={cn(
        'fixed inset-x-0 top-0 z-[200] will-change-transform transition-transform duration-200 ease-out no-print motion-reduce:transition-none',
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
          className="pointer-events-none absolute inset-x-0 bottom-0 flex h-5 items-center justify-center bg-gradient-to-b from-transparent via-card/60 to-card/90"
          aria-hidden
        >
          <span className="inline-flex items-center gap-0.5 rounded-full border border-border/50 bg-card px-2.5 py-0.5 shadow-md backdrop-blur-sm">
            <span className="h-0.5 w-6 rounded-full bg-primary/50" />
            <ChevronDown className="h-3 w-3 text-primary/70" aria-hidden />
          </span>
        </div>
      ) : null}
    </div>
  );

  if (layout === 'overlay') {
    return <HeaderManagedShellProvider>{headerNode}</HeaderManagedShellProvider>;
  }

  return (
    <HeaderManagedShellProvider>
      {headerNode}
      <div
        className={cn(
          'shrink-0 transition-[height] duration-200 ease-out no-print motion-reduce:transition-none',
        )}
        style={{ height: reservedHeight }}
        aria-hidden
      />
    </HeaderManagedShellProvider>
  );
}
