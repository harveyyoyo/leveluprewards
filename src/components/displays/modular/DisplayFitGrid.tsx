"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { positiveInteger } from "@/lib/displays/displayRanking";
import type { ModularScreenConfig } from "@/lib/displays/modularDisplaySchema";

/** Shrink only overflowing card content, keeping the grid and card headings stable. */
export function FitCardContent({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    if (!outer.current || !inner.current) return;
    const fit = () => {
      if (!outer.current || !inner.current) return;
      setScale(
        Math.min(
          1,
          outer.current.clientHeight / Math.max(1, inner.current.scrollHeight),
          outer.current.clientWidth / Math.max(1, inner.current.scrollWidth),
        ),
      );
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(outer.current);
    observer.observe(inner.current);
    return () => observer.disconnect();
  }, [children]);
  return (
    <div ref={outer} className="relative min-h-0 flex-1 overflow-hidden">
      <div
        ref={inner}
        style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
        className="w-full"
      >
        {children}
      </div>
    </div>
  );
}

export function DisplayFitGrid({
  children,
  config,
  pageTick,
}: {
  children: ReactNode;
  config: ModularScreenConfig;
  pageTick: number;
}) {
  const cards = Children.toArray(children);
  const capacity = positiveInteger(
    config.modulesPerPage,
    config.orientation === "portrait" ? 6 : 9,
    12,
  );
  const pageCount = Math.max(1, Math.ceil(cards.length / capacity));
  const page = pageTick % pageCount;
  const visible = cards.slice(page * capacity, (page + 1) * capacity);
  const count = visible.length;
  const automaticColumns =
    config.orientation === "portrait"
      ? count <= 4
        ? 1
        : 2
      : count <= 3
        ? Math.max(1, count)
        : count === 4
          ? 2
          : count <= 6 || count === 9
            ? 3
            : 4;
  const columns = config.gridColumns || automaticColumns;
  const rows = Math.max(1, Math.ceil(visible.length / columns));
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2" data-display-fit-grid>
      <div
        className="grid min-h-0 flex-1 gap-3"
        style={{
          gridTemplateColumns: `repeat(${columns},minmax(0,1fr))`,
          gridTemplateRows: `repeat(${rows},minmax(0,1fr))`,
        }}
      >
        {visible.map((card, index) => (
          <div
            key={index}
            className="min-h-0 min-w-0"
            style={{
              gridColumn:
                !config.gridColumns &&
                index === visible.length - 1 &&
                visible.length % columns
                  ? `span ${columns - (visible.length % columns) + 1}`
                  : undefined,
            }}
          >
            {card}
          </div>
        ))}
      </div>
      {pageCount > 1 && (
        <p
          className="shrink-0 text-center text-xs font-semibold"
          aria-live="off"
        >
          Screen {page + 1} of {pageCount} · Changes every{" "}
          {positiveInteger(config.pageSeconds, 10, 120)} seconds
        </p>
      )}
    </div>
  );
}

export function pageItems<T>(items: T[], pageTick: number, capacity: number) {
  const size = positiveInteger(capacity, 3, 20);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = pageTick % pages;
  return { items: items.slice(page * size, (page + 1) * size), page, pages };
}
