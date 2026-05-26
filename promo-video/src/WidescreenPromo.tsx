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
import { WIDESCREEN_CLIPS } from "./promo/widescreenPromoTiming";
import {
  buildWidescreenSegments,
  getFlashBoundaries,
} from "./promo/widescreenPromoHelpers";
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
import type { WidescreenPromoProps } from "./promo/widescreenPromoSchema";
import { WidescreenVoiceover } from "./WidescreenVoiceover";

export { WidescreenPromoSchema } from "./promo/widescreenPromoSchema";
export { defaultWidescreenPromoProps } from "./promo/widescreenPromoDefaults";

const FLASH_FRAMES = 3;

const ClipVideo: React.FC<{
  clip: (typeof WIDESCREEN_CLIPS)[keyof typeof WIDESCREEN_CLIPS];
}> = ({ clip }) => {
  const { fps } = useVideoConfig();
  const trimBefore =
    clip.trimBeforeSec > 0 ? Math.round(clip.trimBeforeSec * fps) : undefined;

  return (
    <Video
      src={staticFile(clip.src)}
      playbackRate={clip.playbackRate}
      trimBefore={trimBefore}
      muted
      objectFit="cover"
      style={{ width: "100%", height: "100%" }}
    />
  );
};

const WidescreenMontage: React.FC<{
  timing: WidescreenPromoProps["timing"];
}> = ({ timing }) => {
  const frame = useCurrentFrame();
  const globalFrame = frame + timing.introEnd;
  const { fps } = useVideoConfig();
  const segments = buildWidescreenSegments(timing);

  const montageDuration = timing.actionEnd - timing.introEnd;
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

  const segDur = (end: number, start: number) => Math.max(1, end - start);
  const kioskSignInDur = segDur(timing.selectorEnd, timing.introEnd);
  const idCardsDur = segDur(timing.studentKioskEnd, timing.selectorEnd);
  const prizesDur = segDur(timing.studentHomeEnd, timing.studentKioskEnd);
  const scanDur = segDur(timing.dashboardEnd, timing.studentHomeEnd);
  const premountFor = Math.round(1 * fps);

  return (
    <AbsoluteFill>
      <ProgressRail progress={progress} color={activeSegment.color} />
      <Sparkles count={16} seed="widescreen-montage" />

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
          See it in action
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
          LevelUp in action
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
            <Series.Sequence durationInFrames={kioskSignInDur} premountFor={premountFor}>
              <ClipVideo clip={WIDESCREEN_CLIPS.studentHome} />
            </Series.Sequence>
            <Series.Sequence durationInFrames={idCardsDur} premountFor={premountFor}>
              <ClipVideo clip={WIDESCREEN_CLIPS.selector} />
            </Series.Sequence>
            <Series.Sequence durationInFrames={prizesDur} premountFor={premountFor}>
              <ClipVideo clip={WIDESCREEN_CLIPS.dashboard} />
            </Series.Sequence>
            <Series.Sequence durationInFrames={scanDur} premountFor={premountFor}>
              <ClipVideo clip={WIDESCREEN_CLIPS.action} />
            </Series.Sequence>
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
        boundaries={getFlashBoundaries(timing)}
        flashFrames={FLASH_FRAMES}
      />
    </AbsoluteFill>
  );
};

const DEFAULT_COPY = {
  introEyebrow: "Welcome to LevelUp",
  introTagline: "Rewards that move at the speed of your school",
  outroHeadline: "Built for scanning",
  outroSubline: "No keyboard · No mouse · No touchscreen",
};

export const WidescreenPromo: React.FC<WidescreenPromoProps> = ({
  timing,
  narration,
  copy,
  musicVolume,
  musicDuckRatio,
  musicStyle,
  musicSrc,
}) => {
  const onScreen = { ...DEFAULT_COPY, ...copy };
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
      <WidescreenVoiceover narration={narration} timing={timing} />
      <LandscapeBackground totalFrames={timing.total} />
      <Sequence durationInFrames={timing.introEnd}>
        <LandscapeIntro />
        <Sparkles count={20} seed="widescreen-intro" />
      </Sequence>
      <Sequence
        from={timing.introEnd}
        durationInFrames={timing.actionEnd - timing.introEnd}
      >
        <WidescreenMontage timing={timing} />
      </Sequence>
      <Sequence
        from={timing.actionEnd}
        durationInFrames={timing.total - timing.actionEnd}
      >
        <LandscapeOutro
          headline={onScreen.outroHeadline}
          subline={onScreen.outroSubline}
        />
        <Sparkles count={24} seed="widescreen-outro" />
      </Sequence>
    </AbsoluteFill>
  );
};
