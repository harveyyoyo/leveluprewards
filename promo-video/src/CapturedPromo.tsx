import React from "react";
import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  Sequence,
  Series,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  CALLOUTS,
  CAPTURED_TIMING,
  CLIPS,
} from "./promo/capturedPromoTiming";
import {
  DeviceChrome,
  FeatureCallout,
  outfit,
  PromoBackground,
  PromoIntro,
  PromoOutro,
} from "./promo/shared";
import { BRAND } from "./promo/theme";

const T = CAPTURED_TIMING;

const ClipVideo: React.FC<{
  clip: (typeof CLIPS)[keyof typeof CLIPS];
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

const segmentLabel = (globalFrame: number) => {
  if (globalFrame < T.selectorEnd) return "Choose your portal";
  if (globalFrame < T.studentKioskEnd) return "Student kiosk";
  if (globalFrame < T.studentHomeEnd) return "Student home";
  if (globalFrame < T.dashboardEnd) return "Teacher tools";
  return "Reward students";
};

const WalkthroughMontage: React.FC = () => {
  const frame = useCurrentFrame();
  const globalFrame = frame + T.introEnd;
  const { fps } = useVideoConfig();

  const entrance = spring({
    fps,
    frame,
    config: { damping: 16, stiffness: 88 },
  });
  const cardY = interpolate(entrance, [0, 1], [360, 0]);
  const cardScale = interpolate(entrance, [0, 1], [0.82, 1]);
  const tiltX = interpolate(frame, [0, T.actionEnd - T.introEnd], [10, 4], {
    extrapolateRight: "clamp",
  });
  const tiltY = interpolate(frame, [0, T.actionEnd - T.introEnd], [-8, -3], {
    extrapolateRight: "clamp",
  });

  const montageStart = T.introEnd;
  const selectorDur = T.selectorEnd - montageStart;
  const kioskDur = T.studentKioskEnd - T.selectorEnd;
  const homeDur = T.studentHomeEnd - T.studentKioskEnd;
  const dashboardDur = T.dashboardEnd - T.studentHomeEnd;
  const actionDur = T.actionEnd - T.dashboardEnd;
  const premountFor = Math.round(1 * fps);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: "0 36px",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 120,
          width: "100%",
          textAlign: "center",
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontFamily: outfit,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: BRAND.pink,
            background: "rgba(255, 0, 127, 0.12)",
            border: "1px solid rgba(255, 0, 127, 0.35)",
            padding: "8px 22px",
            borderRadius: 40,
          }}
        >
          {segmentLabel(globalFrame)}
        </span>
        <h2
          style={{
            fontFamily: outfit,
            fontSize: 52,
            fontWeight: 800,
            margin: "16px 0 0",
            background: `linear-gradient(135deg, ${BRAND.cyan}, ${BRAND.blue})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          LevelUp in action
        </h2>
      </div>

      <DeviceChrome
        cardScale={cardScale}
        cardY={cardY}
        tiltX={tiltX}
        tiltY={tiltY}
      >
        <Series>
          <Series.Sequence durationInFrames={selectorDur} premountFor={premountFor}>
            <ClipVideo clip={CLIPS.selector} />
          </Series.Sequence>
          <Series.Sequence durationInFrames={kioskDur} premountFor={premountFor}>
            <ClipVideo clip={CLIPS.studentKiosk} />
          </Series.Sequence>
          <Series.Sequence durationInFrames={homeDur} premountFor={premountFor}>
            <ClipVideo clip={CLIPS.studentHome} />
          </Series.Sequence>
          <Series.Sequence durationInFrames={dashboardDur} premountFor={premountFor}>
            <ClipVideo clip={CLIPS.dashboard} />
          </Series.Sequence>
          <Series.Sequence durationInFrames={actionDur} premountFor={premountFor}>
            <ClipVideo clip={CLIPS.action} />
          </Series.Sequence>
        </Series>
      </DeviceChrome>

      {CALLOUTS.map((callout) => (
        <FeatureCallout
          key={callout.title}
          callout={callout}
          globalFrame={globalFrame}
        />
      ))}
    </AbsoluteFill>
  );
};

export const CapturedPromo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg, color: "white" }}>
      <PromoBackground totalFrames={T.total} />
      <Sequence durationInFrames={T.introEnd}>
        <PromoIntro />
      </Sequence>
      <Sequence from={T.introEnd} durationInFrames={T.actionEnd - T.introEnd}>
        <WalkthroughMontage />
      </Sequence>
      <Sequence from={T.actionEnd} durationInFrames={T.total - T.actionEnd}>
        <PromoOutro />
      </Sequence>
    </AbsoluteFill>
  );
};
