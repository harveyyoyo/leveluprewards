import React, { useMemo } from "react";
import type { WidescreenPromoProps } from "../promo/widescreenPromoSchema";
import { Timeline } from "./timeline";
import {
  boundariesToTiming,
  propsToTimeline,
  voiceTrackToNarration,
} from "./widescreenTimelineModel";

type Props = {
  value: WidescreenPromoProps;
  onChange: (next: WidescreenPromoProps) => void;
  currentFrame?: number;
  onSeek?: (frame: number) => void;
};

/**
 * Drag timeline for WidescreenPromo — video cut handles + movable voice clips.
 */
export const WidescreenTimelineEditor: React.FC<Props> = ({
  value,
  onChange,
  currentFrame,
  onSeek,
}) => {
  const { tracks, boundaries } = useMemo(
    () => propsToTimeline(value),
    [value],
  );

  return (
    <Timeline
      durationFrames={value.timing.total}
      fps={30}
      tracks={tracks}
      boundaries={boundaries}
      onTracksChange={(nextTracks) => {
        const voice = nextTracks.find((t) => t.id === "voice");
        if (!voice) return;
        onChange({
          ...value,
          timing: boundariesToTiming(boundaries, value.timing.total),
          narration: voiceTrackToNarration(voice, value),
        });
      }}
      onBoundariesChange={(nextBoundaries) => {
        onChange({
          ...value,
          timing: boundariesToTiming(nextBoundaries, value.timing.total),
        });
      }}
      currentFrame={currentFrame}
      onSeek={onSeek}
    />
  );
};
