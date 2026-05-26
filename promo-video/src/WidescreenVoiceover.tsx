import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { getCuePlayDuration } from "./promo/widescreenPromoHelpers";
import type { WidescreenPromoProps } from "./promo/widescreenPromoSchema";

export const WidescreenVoiceover: React.FC<
  Pick<WidescreenPromoProps, "narration" | "timing">
> = ({ narration, timing }) => (
  <>
    {narration.map((cue, index) => {
      const playDuration = getCuePlayDuration(
        cue,
        index,
        narration,
        timing.total,
      );
      return (
        <Sequence
          key={cue.id}
          from={cue.startFrame}
          durationInFrames={playDuration}
          premountFor={15}
        >
          <Audio src={staticFile(cue.file)} volume={1} />
        </Sequence>
      );
    })}
  </>
);
