'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TabsList } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AdminMainTabsListProps = Omit<React.ComponentPropsWithoutRef<typeof TabsList>, 'children'> & {
  activeTabValue?: string;
  /** Pinned controls (e.g. Add more) — fixed on the right, never scrolls with tabs. */
  endAction?: React.ReactNode;
  children: React.ReactNode;
};

const SCROLL_STEP_PX = 220;
const FADE_WIDTH_PX = 48;

/**
 * Admin main tab row: active tab stays centered in the scroll area; Add more on the right.
 */
export function AdminMainTabsList({
  className,
  children,
  activeTabValue,
  endAction,
  ...props
}: AdminMainTabsListProps) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = React.useState(false);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [scrollPercent, setScrollPercent] = React.useState(0);
  const [thumbWidthPercent, setThumbWidthPercent] = React.useState(100);
  const [edgePadding, setEdgePadding] = React.useState({ left: 0, right: 0 });

  const updateScrollHints = React.useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const overflow = max > 2;
    setHasOverflow(overflow);
    setCanScrollLeft(overflow && el.scrollLeft > 2);
    setCanScrollRight(overflow && el.scrollLeft < max - 2);
    setScrollPercent(overflow && max > 0 ? (el.scrollLeft / max) * 100 : 0);
    setThumbWidthPercent(
      overflow && el.scrollWidth > 0 ? (el.clientWidth / el.scrollWidth) * 100 : 100,
    );
  }, []);

  const centerActiveTab = React.useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      const list = listRef.current;
      if (!list) return;

      const active = list.querySelector<HTMLElement>('[data-state="active"]');
      if (!active) return;

      const tabEl = active.closest<HTMLElement>('[draggable]') ?? active;

      // Measure with no edge padding so centering stays accurate.
      list.style.paddingLeft = '0px';
      list.style.paddingRight = '0px';

      const viewportCenter = list.clientWidth / 2;
      const tabCenter = tabEl.offsetLeft + tabEl.offsetWidth / 2;

      const tabs = list.querySelectorAll<HTMLElement>('[draggable]');
      let contentEnd = 0;
      tabs.forEach((tab) => {
        contentEnd = Math.max(contentEnd, tab.offsetLeft + tab.offsetWidth);
      });

      const maxScroll = Math.max(0, list.scrollWidth - list.clientWidth);

      if (maxScroll > 2) {
        setEdgePadding({ left: 0, right: 0 });
        const target = tabCenter - viewportCenter;
        list.scrollTo({
          left: Math.max(0, Math.min(target, maxScroll)),
          behavior,
        });
      } else {
        list.scrollLeft = 0;
        setEdgePadding({
          left: Math.max(0, viewportCenter - tabCenter),
          right: Math.max(0, viewportCenter - (contentEnd - tabCenter)),
        });
      }

      requestAnimationFrame(updateScrollHints);
    },
    [updateScrollHints],
  );

  const scrollBy = React.useCallback((delta: number) => {
    listRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  }, []);

  React.useLayoutEffect(() => {
    centerActiveTab('auto');
    const el = listRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => centerActiveTab('auto'));
    el.addEventListener('scroll', updateScrollHints, { passive: true });
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', updateScrollHints);
      ro.disconnect();
    };
  }, [centerActiveTab, updateScrollHints, children]);

  React.useLayoutEffect(() => {
    centerActiveTab('smooth');
  }, [activeTabValue, centerActiveTab]);

  React.useLayoutEffect(() => {
    updateScrollHints();
  }, [edgePadding, updateScrollHints]);

  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-col gap-1.5 rounded-2xl border bg-muted/50 p-2 shadow-sm',
        className,
      )}
    >
      <div className="flex min-w-0 items-stretch gap-2">
        <div className="flex min-w-0 flex-1 items-stretch gap-1">
          {hasOverflow ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-auto shrink-0 self-stretch rounded-xl"
              disabled={!canScrollLeft}
              onClick={() => scrollBy(-SCROLL_STEP_PX)}
              aria-label="Earlier sections"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : null}

          <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl">
            {hasOverflow && canScrollLeft ? (
              <div
                className="pointer-events-none absolute inset-y-0 left-0 z-10 bg-gradient-to-r from-muted from-25% via-muted/80 to-transparent"
                style={{ width: FADE_WIDTH_PX }}
                aria-hidden
              />
            ) : null}
            {hasOverflow && canScrollRight ? (
              <div
                className="pointer-events-none absolute inset-y-0 right-0 z-10 bg-gradient-to-l from-muted from-25% via-muted/80 to-transparent"
                style={{ width: FADE_WIDTH_PX }}
                aria-hidden
              />
            ) : null}

            <TabsList
              ref={listRef}
              className={cn(
                'flex h-auto w-full min-w-0 gap-2 rounded-xl border-0 bg-transparent p-0 shadow-none',
                'max-h-[3.25rem] flex-nowrap items-stretch justify-start overflow-x-auto overflow-y-hidden',
                '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                '[scroll-snap-type:x_proximity]',
              )}
              style={{
                paddingLeft: edgePadding.left,
                paddingRight: edgePadding.right,
              }}
              aria-label={hasOverflow ? 'Section tabs, more off screen' : 'Section tabs'}
              {...props}
            >
              {children}
            </TabsList>
          </div>

          {hasOverflow ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-auto shrink-0 self-stretch rounded-xl"
              disabled={!canScrollRight}
              onClick={() => scrollBy(SCROLL_STEP_PX)}
              aria-label="More sections"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        {endAction ? <div className="flex shrink-0 items-stretch">{endAction}</div> : null}
      </div>

      {hasOverflow ? (
        <div
          className="h-1 w-full overflow-hidden rounded-full bg-muted-foreground/20"
          role="presentation"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-primary/80 transition-[width,margin-left] duration-150"
            style={{
              width: `${Math.max(14, thumbWidthPercent)}%`,
              marginLeft: `${(scrollPercent * (100 - thumbWidthPercent)) / 100}%`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
