import "./index.css";
import { Composition, Folder } from "remotion";
import { CinematicPromo } from "./CinematicPromo";
import { LongFeaturePromo, LONG_PROMO_DURATION } from "./LongFeaturePromo";
import { RetroGamingVerticalPromo } from "./RetroGamingVerticalPromo";
import {
  PillarsShortPromo,
  PILLARS_PROMO_TOTAL_FRAMES,
} from "./PillarsShortPromo";
import { CLAUDE_2026_09_24_VIDEOS, CLAUDE_2026_09_25_BATCH4, CLAUDE_2026_09_25_OTHER_STYLES, CLAUDE_2026_09_25_TEASERS, CLAUDE_2026_09_25_VIDEOS } from "./claude-2026-09-24";
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
import {
  EXTENDED_VARIANT,
  SQUARE_VARIANT,
  TEASER_VARIANT,
} from "./promo/promoVariants";
import {
  THEME_INTRO_DURATION,
  THEME_INTROS,
  ThemeIntroSection,
} from "./ThemeIntroSections";
// @ts-expect-error: Imported build-metadata.json does not have an explicit TypeScript declaration file
import metadata from "./build-metadata.json";
import { CT } from "./promo/cinematicTheme";

export const RemotionRoot: React.FC = () => {
  const isDev = process.env.NODE_ENV === "development";
  const cinematicId = isDev
    ? `CinematicLevelUpPromo-${metadata.cinematicUpdated}`
    : "CinematicLevelUpPromo";
  const longPromoId = isDev
    ? `LongFeaturePromo-${metadata.longPromoUpdated}`
    : "LongFeaturePromo";

  return (
    <>
      {/* Dev cache-busting aliases when running Remotion Studio */}
      {isDev && cinematicId !== "CinematicLevelUpPromo" && (
        <Composition
          id={cinematicId}
          component={CinematicPromo}
          durationInFrames={CT.total}
          fps={30}
          width={1920}
          height={1080}
        />
      )}
      {isDev && longPromoId !== "LongFeaturePromo" && (
        <Composition
          id={longPromoId}
          component={LongFeaturePromo}
          durationInFrames={LONG_PROMO_DURATION}
          fps={30}
          width={1920}
          height={1080}
        />
      )}

      {/* Flagship Cinematic Promos */}
      <Composition
        id="CinematicLevelUpPromo"
        component={CinematicPromo}
        durationInFrames={CT.total}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="CinematicLevelUpPromoVertical"
        component={CinematicPromo}
        durationInFrames={CT.total}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="RetroGamingLevelUpPromoVertical"
        component={RetroGamingVerticalPromo}
        durationInFrames={CT.total}
        fps={30}
        width={1080}
        height={1920}
      />

      {/* Product Pillars Short Promo (Rewards, Attendance, Library, Classroom) */}
      <Composition
        id="PillarsShortPromo"
        component={PillarsShortPromo}
        durationInFrames={PILLARS_PROMO_TOTAL_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="PillarsShortPromoVertical"
        component={PillarsShortPromo}
        durationInFrames={PILLARS_PROMO_TOTAL_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="PillarsShortPromoSquare"
        component={PillarsShortPromo}
        durationInFrames={PILLARS_PROMO_TOTAL_FRAMES}
        fps={30}
        width={1080}
        height={1080}
      />

      {/* Made by Claude on 2026-09-24: one short narrated video per pillar, each in its own style */}
      <Folder name="Claude-made-2026-09-24-Pillar-Spotlights">
        {CLAUDE_2026_09_24_VIDEOS.map((v) => (
          <Composition
            key={v.id}
            id={v.id}
            component={v.component}
            durationInFrames={v.durationInFrames}
            fps={30}
            width={v.width}
            height={v.height}
          />
        ))}
      </Folder>

      <Folder name="Claude-made-2026-09-25-Cartoon-Stories">
        {CLAUDE_2026_09_25_VIDEOS.map((v) => (
          <Composition
            key={v.id}
            id={v.id}
            component={v.component}
            durationInFrames={v.durationInFrames}
            fps={30}
            width={v.width}
            height={v.height}
          />
        ))}
      </Folder>

      <Folder name="Claude-made-2026-09-25-Teasers-6s">
        {CLAUDE_2026_09_25_TEASERS.map((v) => (
          <Composition
            key={v.id}
            id={v.id}
            component={v.component}
            durationInFrames={v.durationInFrames}
            fps={30}
            width={v.width}
            height={v.height}
          />
        ))}
      </Folder>

      <Folder name="Claude-made-2026-09-25-Batch4-MoreFeatures">
        {CLAUDE_2026_09_25_BATCH4.map((v) => (
          <Composition
            key={v.id}
            id={v.id}
            component={v.component}
            durationInFrames={v.durationInFrames}
            fps={30}
            width={v.width}
            height={v.height}
          />
        ))}
      </Folder>

      <Folder name="Claude-made-2026-09-25-Other-Promo-Styles">
        {CLAUDE_2026_09_25_OTHER_STYLES.map((v) => (
          <Composition
            key={v.id}
            id={v.id}
            component={v.component}
            durationInFrames={v.durationInFrames}
            fps={30}
            width={v.width}
            height={v.height}
          />
        ))}
      </Folder>

      {/* Long Feature Showcase Promo */}
      <Composition
        id="LongFeaturePromo"
        component={LongFeaturePromo}
        durationInFrames={LONG_PROMO_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Standard Widescreen Promo */}
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

      {/* Feature Showcase Variants (Audio Styles & Visual Themes) */}
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
        id="FeaturePromoAurora"
        component={FeatureShowcasePromo}
        durationInFrames={defaultFeaturePromoPropsByVariant.aurora.timing.total}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultFeaturePromoPropsByVariant.aurora}
        schema={FeatureShowcasePromoSchema}
      />
      <Composition
        id="FeaturePromoChalkboard"
        component={FeatureShowcasePromo}
        durationInFrames={defaultFeaturePromoPropsByVariant.chalkboard.timing.total}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultFeaturePromoPropsByVariant.chalkboard}
        schema={FeatureShowcasePromoSchema}
      />
      <Composition
        id="FeaturePromoArcade"
        component={FeatureShowcasePromo}
        durationInFrames={defaultFeaturePromoPropsByVariant.arcade.timing.total}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultFeaturePromoPropsByVariant.arcade}
        schema={FeatureShowcasePromoSchema}
      />

      {/* Short & Social Formats */}
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

      {/* Theme Intros (6-second stingers) */}
      {THEME_INTROS.map((intro) => (
        <Composition
          key={intro.id}
          id={intro.compositionId}
          component={ThemeIntroSection}
          durationInFrames={THEME_INTRO_DURATION}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{ id: intro.id }}
        />
      ))}
    </>
  );
};
