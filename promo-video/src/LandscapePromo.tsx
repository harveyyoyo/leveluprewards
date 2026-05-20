import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Img,
  Audio,
} from "remotion";
import {
  LANDSCAPE_CLIPS,
  LANDSCAPE_SEGMENTS,
  LANDSCAPE_TIMING,
} from "./promo/landscapePromoTiming";
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
import { BRAND } from "./promo/theme";

const T = LANDSCAPE_TIMING;

const FLASH_BOUNDARIES = [
  T.loginEnd,
  T.selectorEnd,
  T.studentKioskEnd,
  T.studentHomeEnd,
  T.dashboardEnd,
  T.actionEnd,
];

const ClipScreenshot: React.FC<{
  src: string;
}> = ({ src }) => {
  return (
    <Img
      src={staticFile(src)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  );
};

const LandscapeMontage: React.FC = () => {
  const frame = useCurrentFrame();
  const globalFrame = frame + T.introEnd;
  const { fps } = useVideoConfig();

  const montageDuration = T.actionEnd - T.introEnd;
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
    LANDSCAPE_SEGMENTS.find(
      (s) => globalFrame >= s.globalStart && globalFrame < s.globalEnd,
    ) ?? LANDSCAPE_SEGMENTS[0];
  const segmentLocalFrame = globalFrame - activeSegment.globalStart;
  const segmentIndex = LANDSCAPE_SEGMENTS.indexOf(activeSegment);

  const loginDur = T.loginEnd - T.introEnd;
  const selectorDur = T.selectorEnd - T.loginEnd;
  const kioskDur = T.studentKioskEnd - T.selectorEnd;
  const homeDur = T.studentHomeEnd - T.studentKioskEnd;
  const dashboardDur = T.dashboardEnd - T.studentHomeEnd;
  const actionDur = T.actionEnd - T.dashboardEnd;

  return (
    <AbsoluteFill>
      <ProgressRail progress={progress} color={activeSegment.color} />
      <Sparkles count={16} seed="montage" />

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
          Live walkthrough
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
          <Sequence from={0} durationInFrames={loginDur}>
            <ClipScreenshot src="walkthrough-login.png" />
          </Sequence>
          <Sequence from={loginDur} durationInFrames={selectorDur}>
            <ClipScreenshot src="walkthrough-selector.png" />
          </Sequence>
          <Sequence
            from={loginDur + selectorDur}
            durationInFrames={kioskDur}
          >
            <ClipScreenshot src="walkthrough-student-kiosk.png" />
          </Sequence>
          <Sequence
            from={loginDur + selectorDur + kioskDur}
            durationInFrames={homeDur}
          >
            <ClipScreenshot src="walkthrough-student-home.png" />
          </Sequence>
          <Sequence
            from={loginDur + selectorDur + kioskDur + homeDur}
            durationInFrames={dashboardDur}
          >
            <ClipScreenshot src="walkthrough-dashboard.png" />
          </Sequence>
          <Sequence
            from={loginDur + selectorDur + kioskDur + homeDur + dashboardDur}
            durationInFrames={actionDur}
          >
            <ClipScreenshot src="walkthrough-action.png" />
          </Sequence>
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

      <SegmentFlash globalFrame={globalFrame} boundaries={FLASH_BOUNDARIES} />
    </AbsoluteFill>
  );
};

export const LandscapePromo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg, color: "white" }}>
      <Audio src={staticFile("background-music.mp3")} volume={0.3} loop />
      <LandscapeBackground totalFrames={T.total} />
      <Sequence durationInFrames={T.introEnd}>
        <LandscapeIntro />
        <Sparkles count={20} seed="intro" />
      </Sequence>
      <Sequence from={T.introEnd} durationInFrames={T.actionEnd - T.introEnd}>
        <LandscapeMontage />
      </Sequence>
      <Sequence from={T.actionEnd} durationInFrames={T.total - T.actionEnd}>
        <LandscapeOutro />
        <Sparkles count={24} seed="outro" />
      </Sequence>
    </AbsoluteFill>
  );
};

