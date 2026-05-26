import React, { useEffect, useMemo, useRef } from "react";
import type { TimelineBoundary, TimelineItem, TimelineProps, TimelineTrack } from "./types";
import { usePointerDrag } from "./usePointerDrag";

const DEFAULT_PPF = 2.2;
const MIN_SEGMENT = 15;

function frameLabel(frame: number, fps: number): string {
  const sec = frame / fps;
  return `${sec.toFixed(1)}s`;
}

const TimelineItemBlock: React.FC<{
  item: TimelineItem;
  trackId: string;
  pixelsPerFrame: number;
  maxFrame: number;
  locked?: boolean;
  onUpdate: (trackId: string, itemId: string, start: number, duration: number) => void;
}> = ({ item, trackId, pixelsPerFrame, maxFrame, locked, onUpdate }) => {
  const { startMove, startResizeEnd } = usePointerDrag();
  const minDur = item.minDuration ?? MIN_SEGMENT;

  const commit = (start: number, duration: number) => {
    onUpdate(trackId, item.id, start, duration);
  };

  return (
    <div
      className="tl-item"
      style={{
        left: item.start * pixelsPerFrame,
        width: Math.max(8, item.duration * pixelsPerFrame),
        background: item.color,
      }}
      title={
        item.subtitle
          ? `${item.label}\n${item.subtitle}\n${item.start}–${item.start + item.duration}f`
          : `${item.label} · ${item.start}–${item.start + item.duration}f`
      }
    >
      <div
        className={`tl-item-body ${locked ? "tl-item-locked" : ""}`}
        onPointerDown={
          locked
            ? undefined
            : (e) =>
                startMove(e, {
                  initialStart: item.start,
                  initialDuration: item.duration,
                  pixelsPerFrame,
                  maxFrame,
                  minDuration: minDur,
                  onCommit: commit,
                })
        }
      >
        <span className="tl-item-label">
          {item.label}
          {item.subtitle ? (
            <span className="tl-item-sub">{item.subtitle}</span>
          ) : null}
        </span>
      </div>
      {!locked && (
        <div
          className="tl-item-handle tl-item-handle-end"
          onPointerDown={(e) =>
            startResizeEnd(e, {
              initialStart: item.start,
              initialDuration: item.duration,
              pixelsPerFrame,
              maxFrame,
              minDuration: minDur,
              onCommit: commit,
            })
          }
        />
      )}
    </div>
  );
};

const BoundaryHandle: React.FC<{
  boundary: TimelineBoundary;
  pixelsPerFrame: number;
  minFrame: number;
  maxFrame: number;
  onDrag: (id: string, frame: number) => void;
}> = ({ boundary, pixelsPerFrame, minFrame, maxFrame, onDrag }) => {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startFrame = useRef(0);

  return (
    <div
      className="tl-boundary"
      style={{ left: boundary.frame * pixelsPerFrame - 4 }}
      title={boundary.label ?? boundary.id}
      onPointerDown={(e) => {
        e.preventDefault();
        dragging.current = true;
        startX.current = e.clientX;
        startFrame.current = boundary.frame;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        document.body.style.cursor = "col-resize";
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        const delta = Math.round((e.clientX - startX.current) / pixelsPerFrame);
        const next = Math.max(minFrame, Math.min(maxFrame, startFrame.current + delta));
        onDrag(boundary.id, next);
      }}
      onPointerUp={() => {
        dragging.current = false;
        document.body.style.cursor = "";
      }}
    />
  );
};

/**
 * Lightweight drag timeline (MIT) — move/resize clips, drag video cut boundaries.
 */
function frameFromPointer(
  clientX: number,
  canvasEl: HTMLElement,
  scrollLeft: number,
  pixelsPerFrame: number,
  durationFrames: number,
): number {
  const rect = canvasEl.getBoundingClientRect();
  const x = clientX - rect.left + scrollLeft;
  const frame = Math.round(x / pixelsPerFrame);
  return Math.max(0, Math.min(durationFrames - 1, frame));
}

export const Timeline: React.FC<TimelineProps> = ({
  durationFrames,
  fps = 30,
  tracks,
  boundaries = [],
  onTracksChange,
  onBoundariesChange,
  currentFrame,
  onSeek,
  pixelsPerFrame = DEFAULT_PPF,
  className,
}) => {
  const width = durationFrames * pixelsPerFrame;
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentFrame == null || !scrollRef.current || !canvasRef.current) return;
    const playheadX = currentFrame * pixelsPerFrame;
    const { scrollLeft, clientWidth } = scrollRef.current;
    const margin = 80;
    if (playheadX < scrollLeft + margin) {
      scrollRef.current.scrollLeft = Math.max(0, playheadX - margin);
    } else if (playheadX > scrollLeft + clientWidth - margin) {
      scrollRef.current.scrollLeft = playheadX - clientWidth + margin;
    }
  }, [currentFrame, pixelsPerFrame]);

  const scrubFromEvent = (e: React.MouseEvent) => {
    if (!onSeek || !canvasRef.current || !scrollRef.current) return;
    if ((e.target as HTMLElement).closest(".tl-item, .tl-boundary, .tl-item-handle")) {
      return;
    }
    onSeek(
      frameFromPointer(
        e.clientX,
        canvasRef.current,
        scrollRef.current.scrollLeft,
        pixelsPerFrame,
        durationFrames,
      ),
    );
  };

  const updateItem = (
    trackId: string,
    itemId: string,
    start: number,
    duration: number,
  ) => {
    onTracksChange(
      tracks.map((t) =>
        t.id !== trackId
          ? t
          : {
              ...t,
              items: t.items.map((it) =>
                it.id === itemId ? { ...it, start, duration } : it,
              ),
            },
      ),
    );
  };

  const rulerMarks = useMemo(() => {
    const step = fps * 5;
    const marks: number[] = [];
    for (let f = 0; f <= durationFrames; f += step) marks.push(f);
    return marks;
  }, [durationFrames, fps]);

  const playheadLeft =
    currentFrame != null ? currentFrame * pixelsPerFrame : null;

  return (
    <div className={`tl-root ${className ?? ""}`}>
      <div className="tl-scroll" ref={scrollRef}>
        <div
          ref={canvasRef}
          className={`tl-canvas ${onSeek ? "tl-canvas-scrub" : ""}`}
          style={{ width }}
          onClick={scrubFromEvent}
          role={onSeek ? "slider" : undefined}
          aria-valuenow={currentFrame}
          aria-valuemin={0}
          aria-valuemax={durationFrames}
        >
          {playheadLeft != null && (
            <div
              className="tl-playhead"
              style={{ left: playheadLeft }}
              aria-hidden
            />
          )}
          <div className="tl-ruler">
            {rulerMarks.map((f) => (
              <span
                key={f}
                className="tl-ruler-tick"
                style={{ left: f * pixelsPerFrame }}
              >
                {frameLabel(f, fps)}
              </span>
            ))}
          </div>

          {tracks.map((track) => (
            <div key={track.id} className="tl-track-row">
              <div className="tl-track-label">{track.label}</div>
              <div
                className={`tl-track-lane ${track.items.some((i) => i.subtitle) ? "tl-track-lane-tall" : ""}`}
                style={{ width }}
              >
                {track.items.map((item) => (
                  <TimelineItemBlock
                    key={item.id}
                    item={item}
                    trackId={track.id}
                    pixelsPerFrame={pixelsPerFrame}
                    maxFrame={durationFrames}
                    locked={track.readOnly ?? track.mode === "boundaries"}
                    onUpdate={updateItem}
                  />
                ))}
                {track.mode === "boundaries" &&
                  [...boundaries]
                    .sort((a, b) => a.frame - b.frame)
                    .map((b, i, sorted) => {
                      const minFrame =
                        i === 0 ? MIN_SEGMENT : sorted[i - 1].frame + MIN_SEGMENT;
                      const maxFrame =
                        i === sorted.length - 1
                          ? durationFrames - MIN_SEGMENT
                          : sorted[i + 1].frame - MIN_SEGMENT;
                      return (
                        <BoundaryHandle
                          key={b.id}
                          boundary={b}
                          pixelsPerFrame={pixelsPerFrame}
                          minFrame={minFrame}
                          maxFrame={maxFrame}
                          onDrag={(id, frame) => {
                            if (!onBoundariesChange) return;
                            onBoundariesChange(
                              boundaries.map((x) =>
                                x.id === id ? { ...x, frame } : x,
                              ),
                            );
                          }}
                        />
                      );
                    })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export type { TimelineTrack, TimelineItem, TimelineBoundary };
