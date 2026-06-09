import React from "react";
import { OffthreadVideo, staticFile, useVideoConfig } from "remotion";

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
    <div style={{ width: "100%", height: "100%", background: "#f8fafc" }}>
      <OffthreadVideo
        src={staticFile(clip.src)}
        playbackRate={clip.playbackRate ?? 1}
        trimBefore={trimBefore}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "brightness(1.08) contrast(1.06) saturate(1.04)",
        }}
      />
    </div>
  );
};
