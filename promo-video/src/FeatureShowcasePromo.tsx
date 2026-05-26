import React from "react";
import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  Series,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  buildFeatureMontageSegments,
  getFeatureFlashBoundaries,
  segmentDurationFrames,
} from "./promo/featurePromoHelpers";
import type { FeatureClipConfig } from "./promo/featurePromoCatalog";
import {
  LandscapeBackground,
  LandscapeBrowser,
  LandscapeIntro,
  LandscapeOutro,
  LandscapeSidebar,
  ProgressRail,
  SegmentFlash,
  Sparkles,
} from "./promo/landscapeShared";
import { outfit } from "./promo/shared";
import { resolveMusicSrc, usePromoMusicVolume } from "./promo/promoMusic";
import { BRAND } from "./promo/theme";
import type { FeatureShowcasePromoProps } from "./promo/featurePromoSchema";
import { FeatureShowcasePromoSchema } from "./promo/featurePromoSchema";
import { FeatureVoiceover } from "./FeatureVoiceover";

export { FeatureShowcasePromoSchema };
export {
  defaultFeaturePromoPropsByVariant,
  getDefaultFeaturePromoProps,
} from "./promo/featurePromoDefaults";

const FLASH_FRAMES = 3;

const FeatureClipVideo: React.FC<{ clip: FeatureClipConfig }> = ({ clip }) => {
  const { fps } = useVideoConfig();
  const trimBefore =
    clip.trimBeforeSec && clip.trimBeforeSec > 0
      ? Math.round(clip.trimBeforeSec * fps)
      : undefined;

  return (
    <Video
      src={staticFile(clip.src)}
      playbackRate={clip.playbackRate ?? 1.08}
      trimBefore={trimBefore}
      muted
      objectFit="cover"
      style={{ width: "100%", height: "100%" }}
    />
  );
};

const FeatureMontage: React.FC<{
  timing: FeatureShowcasePromoProps["timing"];
  copy: FeatureShowcasePromoProps["copy"];
}> = ({ timing, copy }) => {
  const frame = useCurrentFrame();
  const globalFrame = frame + timing.introEnd;
  const { fps } = useVideoConfig();
  const segments = buildFeatureMontageSegments(timing);
  const montageEnd = timing.segmentEnds[timing.segmentEnds.length - 1] ?? timing.introEnd;
  const montageDuration = montageEnd - timing.introEnd;

  const entrance = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 100 },
  });
  const cardScale = interpolate(entrance, [0, 1], [0.88, 1]);
  const rotateY = interpolate(entrance, [0, 1], [-6, -2]);
  const kenBurn = interpolate(frame, [0, montageDuration], [1, 1.06], {
    extrapolateRight: "clamp",
  });

  const progress = interpolate(frame, [0, montageDuration], [0, 1], {
    extrapolateRight: "clamp",
  });

  const activeSegment =
    segments.find(
      (s) => globalFrame >= s.globalStart && globalFrame < s.globalEnd,
    ) ?? segments[0];
  const segmentLocalFrame = globalFrame - activeSegment.globalStart;
  const segmentIndex = segments.indexOf(activeSegment);
  const premountFor = Math.round(1 * fps);

  return (
    <AbsoluteFill>
      <ProgressRail progress={progress} color={activeSegment.color} />
      <Sparkles count={18} seed="feature-montage" />

      <div
        style={{
          position: "absolute",
          top: 72,
          left: 64,
          zIndex: 15,
        }}
      >
        <span
          style={{
            fontFamily: outfit,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: BRAND.cyan,
          }}
        >
          {copy.montageSubtitle}
        </span>
        <h2
          style={{
            fontFamily: outfit,
            fontSize: 36,
            fontWeight: 800,
            margin: "6px 0 0",
            background: `linear-gradient(90deg, ${BRAND.pink}, ${BRAND.cyan})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {copy.montageTitle}
        </h2>
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          top: 100,
          display: "flex",
          alignItems: "center",
          padding: "0 56px 48px",
          gap: 40,
        }}
      >
        <LandscapeBrowser scale={cardScale} rotateY={rotateY} kenBurn={kenBurn}>
          <Series>
            {segments.map((seg, i) => (
              <Series.Sequence
                key={seg.id}
                durationInFrames={segmentDurationFrames(timing, i)}
                premountFor={premountFor}
              >
                <FeatureClipVideo clip={seg.clip} />
              </Series.Sequence>
            ))}
          </Series>
        </LandscapeBrowser>

        <LandscapeSidebar
          segmentIndex={segmentIndex}
          emoji={activeSegment.emoji}
          label={activeSegment.label}
          tagline={activeSegment.tagline}
          color={activeSegment.color}
          accent={activeSegment.accent}
          localFrame={segmentLocalFrame}
        />
      </div>

      <SegmentFlash
        globalFrame={globalFrame}
        boundaries={getFeatureFlashBoundaries(timing)}
        flashFrames={FLASH_FRAMES}
      />
    </AbsoluteFill>
  );
};

export const FeatureShowcasePromo: React.FC<FeatureShowcasePromoProps> = ({
  timing,
  narration,
  copy,
  musicVolume,
  musicDuckRatio,
  musicStyle,
  musicSrc,
}) => {
  const montageEnd =
    timing.segmentEnds[timing.segmentEnds.length - 1] ?? timing.introEnd;
  const musicVol = usePromoMusicVolume({
    totalFrames: timing.total,
    musicVolume,
    musicDuckRatio,
    musicStyle,
    narration,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg, color: "white" }}>
      <Audio
        src={staticFile(resolveMusicSrc(musicSrc))}
        volume={musicVol}
        loop
      />
      <FeatureVoiceover narration={narration} timing={timing} />
      <LandscapeBackground totalFrames={timing.total} />
      <Sequence durationInFrames={timing.introEnd}>
        <LandscapeIntro
          eyebrow={copy.introEyebrow}
          tagline={copy.introTagline}
        />
        <Sparkles count={20} seed="feature-intro" />
      </Sequence>
      <Sequence
        from={timing.introEnd}
        durationInFrames={montageEnd - timing.introEnd}
      >
        <FeatureMontage timing={timing} copy={copy} />
      </Sequence>
      <Sequence
        from={montageEnd}
        durationInFrames={timing.total - montageEnd}
      >
        <LandscapeOutro
          headline={copy.outroHeadline}
          subline={copy.outroSubline}
        />
        <Sparkles count={24} seed="feature-outro" />
      </Sequence>
    </AbsoluteFill>
  );
};
