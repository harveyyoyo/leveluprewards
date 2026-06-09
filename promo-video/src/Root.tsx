import "./index.css";
import { Composition } from "remotion";
import { CinematicPromo } from "./CinematicPromo";
import { LongFeaturePromo, LONG_PROMO_DURATION } from "./LongFeaturePromo";
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
      {isDev ? (
        metadata.newer === "longPromo" ? (
          <>
            <Composition
              id={longPromoId}
              component={LongFeaturePromo}
              durationInFrames={LONG_PROMO_DURATION}
              fps={30}
              width={1920}
              height={1080}
            />
            <Composition
              id={cinematicId}
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
          </>
        ) : (
          <>
            <Composition
              id={cinematicId}
              component={CinematicPromo}
              durationInFrames={CT.total}
              fps={30}
              width={1920}
              height={1080}
            />
            <Composition
              id={longPromoId}
              component={LongFeaturePromo}
              durationInFrames={LONG_PROMO_DURATION}
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
          </>
        )
      ) : (
        <>
          <Composition
            id={cinematicId}
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
            id={longPromoId}
            component={LongFeaturePromo}
            durationInFrames={LONG_PROMO_DURATION}
            fps={30}
            width={1920}
            height={1080}
          />
        </>
      )}

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
