import React from "react";
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
  buildWidescreenSegments,
  getFlashBoundaries,
} from "./promo/widescreenPromoHelpers";
import { WIDESCREEN_BEATS } from "./promo/widescreenBeatCatalog";
import { PromoClipVideo } from "./promo/PromoClipVideo";
import { WidescreenIntroLayout } from "./promo/WidescreenIntroLayout";
import {
  LandscapeBackground,
  LandscapeBrowser,
  LandscapeOutro,
  LandscapeSidebar,
  ProgressRail,
  SegmentFlash,
  Sparkles,
} from "./promo/landscapeShared";
import { resolveMusicSrc, usePromoMusicVolume } from "./promo/promoMusic";
import { BRAND } from "./promo/theme";
import type { WidescreenPromoProps } from "./promo/widescreenPromoSchema";
import { WidescreenVoiceover } from "./WidescreenVoiceover";

export { WidescreenPromoSchema } from "./promo/widescreenPromoSchema";
export { defaultWidescreenPromoProps } from "./promo/widescreenPromoDefaults";

const FLASH_FRAMES = 3;

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
  const idCardsDur = segDur(timing.selectorEnd, timing.introEnd);
  const kioskDur = segDur(timing.studentKioskEnd, timing.selectorEnd);
  const prizesDur = segDur(timing.studentHomeEnd, timing.studentKioskEnd);
  const portalDur = segDur(timing.dashboardEnd, timing.studentHomeEnd);
  const premountFor = Math.round(1 * fps);

  return (
    <AbsoluteFill>
      <ProgressRail progress={progress} color={activeSegment.color} />
      <Sparkles count={16} seed="widescreen-montage" />

      <div
        style={{
          position: "absolute",
          inset: 0,
          top: 56,
          display: "flex",
          alignItems: "center",
          padding: "0 40px 40px",
          gap: 32,
        }}
      >
        <LandscapeBrowser scale={cardScale} rotateY={rotateY} kenBurn={kenBurn}>
          <Series>
            <Series.Sequence durationInFrames={idCardsDur} premountFor={premountFor}>
              <PromoClipVideo clip={WIDESCREEN_BEATS.selector.clip} />
            </Series.Sequence>
            <Series.Sequence durationInFrames={kioskDur} premountFor={premountFor}>
              <PromoClipVideo clip={WIDESCREEN_BEATS.home.clip} />
            </Series.Sequence>
            <Series.Sequence durationInFrames={prizesDur} premountFor={premountFor}>
              <PromoClipVideo clip={WIDESCREEN_BEATS.dashboard.clip} />
            </Series.Sequence>
            <Series.Sequence durationInFrames={portalDur} premountFor={premountFor}>
              <PromoClipVideo clip={WIDESCREEN_BEATS.outro.clip} />
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
  introTagline: "Rewards built for schools",
  outroHeadline: "Scanning only",
  outroSubline: "Just a quick scan and you're done",
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
        <WidescreenIntroLayout
          eyebrow={onScreen.introEyebrow ?? "Welcome to LevelUp"}
          durationFrames={timing.introEnd}
        />
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
