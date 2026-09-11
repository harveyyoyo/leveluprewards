"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ScreenOrientation } from "@/lib/displays/modularDisplaySchema";

/** Fit a TV-sized canvas into the workbench without reflowing its contents. */
export function DisplayCanvasPreview({
  orientation,
  children,
}: {
  orientation: ScreenOrientation;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const width = (orientation === "portrait" ? 720 : 1280) + 24;
  const height = (orientation === "portrait" ? 1280 : 720) + 24;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const resize = () => {
      setScale(
        Math.max(
          0,
          Math.min(
            1,
            container.clientWidth / width,
            container.clientHeight / height,
          ),
        ),
      );
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [width, height]);

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden"
      aria-label="TV preview"
    >
      <div
        className="relative shrink-0"
        style={{ width: width * scale, height: height * scale }}
      >
        <div
          className="absolute left-0 top-0 overflow-hidden rounded-[2.5rem] border-[12px] border-slate-900 bg-slate-950 shadow-2xl ring-1 ring-white/10"
          style={{
            width,
            height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            visibility: scale > 0 ? "visible" : "hidden",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
