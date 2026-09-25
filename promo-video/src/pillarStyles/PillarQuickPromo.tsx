import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, interpolate, staticFile } from "remotion";
import { AttendanceStyle } from "./AttendanceStyle";
import { ClassroomStyle } from "./ClassroomStyle";
import { HousesStyle } from "./HousesStyle";
import { LibraryStyle } from "./LibraryStyle";
import { OfficeStyle } from "./OfficeStyle";
import { FlashFX } from "./PillarStyleShared";
import { PILLAR_QUICK_PROMOS, PILLAR_QUICK_TOTAL_FRAMES, type PillarQuickPromoId } from "./pillarStyleData";
import { RewardsStyle } from "./RewardsStyle";

export type PillarQuickPromoProps = {
  pillarId: PillarQuickPromoId;
};

export const PillarQuickPromo: React.FC<PillarQuickPromoProps> = ({
  pillarId,
}) => {
  const data = PILLAR_QUICK_PROMOS[pillarId];
  const scene = (() => {
    switch (pillarId) {
      case "rewards":
        return <RewardsStyle />;
      case "attendance":
        return <AttendanceStyle />;
      case "library":
        return <LibraryStyle />;
      case "classroom":
        return <ClassroomStyle />;
      case "office":
        return <OfficeStyle />;
      case "houses":
        return <HousesStyle />;
    }
  })();

  return (
    <AbsoluteFill style={{ backgroundColor: "#04030a" }}>
      <Audio
        src={staticFile("background-music.mp3")}
        trimBefore={data.musicTrimFrames}
        playbackRate={data.musicRate}
        volume={(audioFrame) =>
          interpolate(
            audioFrame,
            [0, 12, PILLAR_QUICK_TOTAL_FRAMES - 30, PILLAR_QUICK_TOTAL_FRAMES],
            [0, 0.24, 0.24, 0],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            },
          )
        }
      />
      {scene}
      <FlashFX color={data.color} />
    </AbsoluteFill>
  );
};
