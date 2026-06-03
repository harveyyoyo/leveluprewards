import React from "react";
import { Video } from "@remotion/media";
import { staticFile, useVideoConfig } from "remotion";

type ClipSpec = {
  src: string;
  playbackRate?: number;
  trimBeforeSec?: number;
};

export const PromoClipVideo: React.FC<{ clip: ClipSpec }> = ({ clip }) => {
  const { fps } = useVideoConfig();
  const trimBefore =
    clip.trimBeforeSec && clip.trimBeforeSec > 0
      ? Math.round(clip.trimBeforeSec * fps)
      : undefined;

  return (
    <Video
      src={staticFile(clip.src)}
      playbackRate={clip.playbackRate ?? 1}
      trimBefore={trimBefore}
      muted
      objectFit="cover"
      style={{ width: "100%", height: "100%" }}
    />
  );
};
