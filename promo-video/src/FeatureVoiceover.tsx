import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { getFeatureCuePlayDuration } from "./promo/featurePromoHelpers";
import type { FeatureShowcasePromoProps } from "./promo/featurePromoSchema";

export const FeatureVoiceover: React.FC<
  Pick<FeatureShowcasePromoProps, "narration" | "timing">
> = ({ narration, timing }) => (
  <>
    {narration.map((cue, index) => {
      const playDuration = getFeatureCuePlayDuration(
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
