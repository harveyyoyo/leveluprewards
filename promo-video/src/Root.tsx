import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { ShortPromo } from "./ShortPromo";
import { CapturedPromo } from "./CapturedPromo";
import { LandscapePromo } from "./LandscapePromo";
import { CAPTURED_TIMING } from "./promo/capturedPromoTiming";
import { LANDSCAPE_TIMING } from "./promo/landscapePromoTiming";
import { TIMING } from "./promo/theme";
import { MY_COMP_FPS, MY_COMP_TOTAL } from "./promo/myCompTiming";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LandscapePromo"
        component={LandscapePromo}
        durationInFrames={LANDSCAPE_TIMING.total}
        fps={LANDSCAPE_TIMING.fps}
        width={1920}
        height={1080}
      />
      <Composition
        id="CapturedPromo"
        component={CapturedPromo}
        durationInFrames={CAPTURED_TIMING.total}
        fps={CAPTURED_TIMING.fps}
        width={1080}
        height={1920}
      />
      <Composition
        id="ShortPromo"
        component={ShortPromo}
        durationInFrames={TIMING.total}
        fps={TIMING.fps}
        width={1080}
        height={1920}
      />
      <Composition
        id="MyComp"
        component={MyComposition}
        durationInFrames={MY_COMP_TOTAL}
        fps={MY_COMP_FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
