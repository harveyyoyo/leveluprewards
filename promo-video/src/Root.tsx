import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { ShortPromo } from "./ShortPromo";
import { CapturedPromo } from "./CapturedPromo";
import { LandscapePromo } from "./LandscapePromo";
import {
  WidescreenPromo,
  WidescreenPromoSchema,
  defaultWidescreenPromoProps,
} from "./WidescreenPromo";
import {
  FeatureShowcasePromo,
  FeatureShowcasePromoSchema,
  defaultFeaturePromoPropsByVariant,
} from "./FeatureShowcasePromo";
import { ExtendedPromo30, SquarePromo, TeaserPromo } from "./TeaserPromo";
import { CAPTURED_TIMING } from "./promo/capturedPromoTiming";
import {
  EXTENDED_VARIANT,
  SQUARE_VARIANT,
  TEASER_VARIANT,
} from "./promo/promoVariants";
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
        id="WidescreenPromo"
        component={WidescreenPromo}
        durationInFrames={defaultWidescreenPromoProps.timing.total}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultWidescreenPromoProps}
        schema={WidescreenPromoSchema}
      />
      <Composition
        id="FeaturePromoEpic"
        component={FeatureShowcasePromo}
        durationInFrames={defaultFeaturePromoPropsByVariant.epic.timing.total}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultFeaturePromoPropsByVariant.epic}
        schema={FeatureShowcasePromoSchema}
      />
      <Composition
        id="FeaturePromoWarm"
        component={FeatureShowcasePromo}
        durationInFrames={defaultFeaturePromoPropsByVariant.warm.timing.total}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultFeaturePromoPropsByVariant.warm}
        schema={FeatureShowcasePromoSchema}
      />
      <Composition
        id="FeaturePromoPro"
        component={FeatureShowcasePromo}
        durationInFrames={defaultFeaturePromoPropsByVariant.pro.timing.total}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultFeaturePromoPropsByVariant.pro}
        schema={FeatureShowcasePromoSchema}
      />
      <Composition
        id="FeaturePromoHype"
        component={FeatureShowcasePromo}
        durationInFrames={defaultFeaturePromoPropsByVariant.hype.timing.total}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultFeaturePromoPropsByVariant.hype}
        schema={FeatureShowcasePromoSchema}
      />
      <Composition
        id="FeaturePromoStory"
        component={FeatureShowcasePromo}
        durationInFrames={defaultFeaturePromoPropsByVariant.story.timing.total}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultFeaturePromoPropsByVariant.story}
        schema={FeatureShowcasePromoSchema}
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
        id="TeaserPromo"
        component={TeaserPromo}
        durationInFrames={TEASER_VARIANT.timing.total}
        fps={TEASER_VARIANT.timing.fps}
        width={TEASER_VARIANT.width}
        height={TEASER_VARIANT.height}
      />
      <Composition
        id="SquarePromo"
        component={SquarePromo}
        durationInFrames={SQUARE_VARIANT.timing.total}
        fps={SQUARE_VARIANT.timing.fps}
        width={SQUARE_VARIANT.width}
        height={SQUARE_VARIANT.height}
      />
      <Composition
        id="ExtendedPromo30"
        component={ExtendedPromo30}
        durationInFrames={EXTENDED_VARIANT.timing.total}
        fps={EXTENDED_VARIANT.timing.fps}
        width={EXTENDED_VARIANT.width}
        height={EXTENDED_VARIANT.height}
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
