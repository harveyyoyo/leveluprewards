import { useCallback, useEffect, useRef } from "react";

type DragMode = "move" | "resize-end";

type DragState = {
  mode: DragMode;
  startX: number;
  initialStart: number;
  initialDuration: number;
  pixelsPerFrame: number;
  maxFrame: number;
  minDuration: number;
  onCommit: (start: number, duration: number) => void;
};

export function usePointerDrag() {
  const dragRef = useRef<DragState | null>(null);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const deltaFrames = Math.round((e.clientX - d.startX) / d.pixelsPerFrame);
      if (d.mode === "move") {
        const maxStart = d.maxFrame - d.minDuration;
        const nextStart = Math.max(
          0,
          Math.min(maxStart, d.initialStart + deltaFrames),
        );
        d.onCommit(nextStart, d.initialDuration);
      } else {
        const nextDur = Math.max(
          d.minDuration,
          Math.min(d.maxFrame - d.initialStart, d.initialDuration + deltaFrames),
        );
        d.onCommit(d.initialStart, nextDur);
      }
    };
    const onUp = () => endDrag();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [endDrag]);

  const startMove = useCallback(
    (e: React.PointerEvent, config: Omit<DragState, "mode" | "startX">) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      dragRef.current = { mode: "move", startX: e.clientX, ...config };
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    },
    [],
  );

  const startResizeEnd = useCallback(
    (e: React.PointerEvent, config: Omit<DragState, "mode" | "startX">) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      dragRef.current = { mode: "resize-end", startX: e.clientX, ...config };
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    },
    [],
  );

  return { startMove, startResizeEnd };
}
