import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  Series,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FeatureVoiceover } from "./FeatureVoiceover";
import { CINEMATIC } from "./promo/cinematicTheme";
import {
  AchievementBadge,
  BrowserMockup,
  CinematicBg,
  GoldSparkles,
  LevelUpLogoAnimated,
  LetterReveal,
  XPBar,
} from "./promo/cinematicComponents";
import { CinematicTransition } from "./promo/cinematicTransition";
import { defaultFeaturePromoPropsByVariant } from "./promo/featurePromoDefaults";
import {
  buildFeatureMontageSegments,
  getFeatureFlashBoundaries,
  segmentDurationFrames,
} from "./promo/featurePromoHelpers";
import type { FeatureClipConfig } from "./promo/featurePromoCatalog";
import { ProgressRail, SegmentFlash } from "./promo/landscapeShared";
import { PromoClipVideo } from "./promo/PromoClipVideo";
import { resolveMusicSrc, usePromoMusicVolume } from "./promo/promoMusic";
import { outfit, jakarta } from "./promo/shared";

const epicProps = defaultFeaturePromoPropsByVariant.epic;
const { timing, narration, copy } = epicProps;

export const LONG_PROMO_DURATION = timing.total;

const montageEnd =
  timing.segmentEnds[timing.segmentEnds.length - 1] ?? timing.introEnd;
const montageDuration = montageEnd - timing.introEnd;
const FLASH_FRAMES = 4;

const CinematicFeatureClip: React.FC<{ clip: FeatureClipConfig }> = ({
  clip,
}) => <PromoClipVideo clip={clip} />;

const CinematicFeatureIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ fps, frame, config: { damping: 14, stiffness: 90 } });
  const progress = interpolate(frame, [0, timing.introEnd], [0, 0.08], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <CinematicBg totalFrames={timing.introEnd} />
      <GoldSparkles count={20} seed="long-intro" />
      <ProgressRail progress={progress} color={CINEMATIC.gold} />
      <div style={{ transform: `scale(${scale})`, textAlign: "center", zIndex: 2 }}>
        <LevelUpLogoAnimated startFrame={8} size={180} cream="#f0e8c8" />
        <p
          style={{
            fontFamily: outfit,
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: CINEMATIC.gold,
            marginTop: 28,
            marginBottom: 12,
          }}
        >
          {copy.introEyebrow}
        </p>
        <h1
          style={{
            fontFamily: outfit,
            fontSize: 72,
            fontWeight: 800,
            color: CINEMATIC.offWhite,
            margin: 0,
            letterSpacing: -2,
            lineHeight: 1.05,
          }}
        >
          <LetterReveal
            text={copy.introTagline}
            startFrame={18}
            charStyle={{ color: CINEMATIC.offWhite }}
          />
        </h1>
      </div>
    </AbsoluteFill>
  );
};

const CinematicFeatureMontage: React.FC = () => {
  const frame = useCurrentFrame();
  const globalFrame = frame + timing.introEnd;
  const { fps } = useVideoConfig();
  const segments = buildFeatureMontageSegments(timing);
  const premountFor = Math.round(fps);

  const entrance = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 100 },
  });
  const kenBurn = interpolate(frame, [0, montageDuration], [1, 1.06], {
    extrapolateRight: "clamp",
  });

  const activeSegment =
    segments.find(
      (s) => globalFrame >= s.globalStart && globalFrame < s.globalEnd,
    ) ?? segments[0];
  const segmentIndex = segments.indexOf(activeSegment);
  const segmentLocalFrame = globalFrame - activeSegment.globalStart;
  const segmentDur = Math.max(1, activeSegment.globalEnd - activeSegment.globalStart);
  const progress = interpolate(
    globalFrame,
    [timing.introEnd, montageEnd],
    [0.1, 0.92],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const enter = spring({
    fps,
    frame: segmentLocalFrame,
    config: { damping: 16, stiffness: 110 },
  });

  return (
    <AbsoluteFill>
      <CinematicBg totalFrames={montageDuration} />
      <GoldSparkles count={12} seed={`feat-${activeSegment.id}`} />
      <ProgressRail progress={progress} color={activeSegment.color} />

      <div
        style={{
          position: "absolute",
          top: 56,
          left: 72,
          zIndex: 16,
          fontFamily: outfit,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: CINEMATIC.textDim,
        }}
      >
        Feature {segmentIndex + 1} / {segments.length}
      </div>

      <div
        style={{
          position: "absolute",
          top: 88,
          left: 72,
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
            color: CINEMATIC.cyan,
          }}
        >
          {copy.montageSubtitle}
        </span>
        <h2
          style={{
            fontFamily: outfit,
            fontSize: 34,
            fontWeight: 800,
            margin: "6px 0 0",
            color: CINEMATIC.offWhite,
          }}
        >
          {copy.montageTitle}
        </h2>
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          padding: "100px 72px 48px",
          gap: 56,
        }}
      >
        <div
          style={{
            flex: 1.15,
            opacity: entrance,
            transform: `scale(${interpolate(entrance, [0, 1], [0.92, 1]) * kenBurn})`,
            transformOrigin: "center center",
          }}
        >
          <BrowserMockup style={{ height: 640 }}>
            <Series>
              {segments.map((seg, i) => (
                <Series.Sequence
                  key={seg.id}
                  durationInFrames={segmentDurationFrames(timing, i)}
                  premountFor={premountFor}
                >
                  <CinematicFeatureClip clip={seg.clip} />
                </Series.Sequence>
              ))}
            </Series>
          </BrowserMockup>
        </div>

        <div
          style={{
            flex: "0 0 36%",
            opacity: enter,
            transform: `translateX(${interpolate(enter, [0, 1], [48, 0])}px)`,
          }}
        >
          <p
            style={{
              fontFamily: outfit,
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: activeSegment.color,
              margin: "0 0 14px",
            }}
          >
            {activeSegment.emoji} {activeSegment.label}
          </p>
          <h3
            style={{
              fontFamily: outfit,
              fontSize: 52,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: -1.5,
              margin: 0,
              color: CINEMATIC.offWhite,
            }}
          >
            {activeSegment.tagline}
          </h3>
        </div>
      </div>

      <AchievementBadge
        emoji={activeSegment.emoji}
        title={activeSegment.label}
        xp={(segmentIndex + 1) * 20}
        startFrame={segmentLocalFrame > 0 ? 0 : 20}
        endFrame={Math.min(segmentDur - 10, 100)}
        color={activeSegment.color}
      />
    </AbsoluteFill>
  );
};

const CinematicFeatureOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const outroDuration = timing.total - montageEnd;
  const headlineE = spring({
    fps,
    frame: frame - 12,
    config: { damping: 12, stiffness: 110 },
  });
  const ctaE = spring({
    fps,
    frame: frame - 40,
    config: { damping: 13, stiffness: 100 },
  });
  const pulse = 1 + Math.sin(frame * 0.12) * 0.024;
  const progress = interpolate(frame, [0, outroDuration], [0.92, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <CinematicBg totalFrames={outroDuration} />
      <GoldSparkles count={28} seed="long-outro" />
      <ProgressRail progress={progress} color={CINEMATIC.gold} />
      <div
        style={{
          textAlign: "center",
          transform: `scale(${headlineE})`,
          opacity: headlineE,
        }}
      >
        <p
          style={{
            fontFamily: outfit,
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: CINEMATIC.gold,
            margin: "0 0 20px",
          }}
        >
          {copy.outroHeadline}
        </p>
        <h1
          style={{
            fontFamily: outfit,
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: -3,
            margin: 0,
            background: `linear-gradient(135deg, ${CINEMATIC.offWhite}, ${CINEMATIC.gold})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Level Up Your School
        </h1>
        <p
          style={{
            fontFamily: jakarta,
            fontSize: 28,
            color: CINEMATIC.textMuted,
            marginTop: 24,
            marginBottom: 44,
          }}
        >
          {copy.outroSubline}
        </p>
        <div
          style={{
            display: "inline-block",
            padding: "22px 64px",
            borderRadius: 56,
            background: `linear-gradient(135deg, ${CINEMATIC.gold}, #c9a830)`,
            boxShadow: "0 0 60px rgba(245,200,66,0.45)",
            fontFamily: outfit,
            fontSize: 34,
            fontWeight: 800,
            color: CINEMATIC.navy,
            transform: `scale(${ctaE * pulse})`,
          }}
        >
          leveluprewards.app
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const LongFeaturePromo: React.FC = () => {
  const globalFrame = useCurrentFrame();
  const musicVol = usePromoMusicVolume({
    totalFrames: timing.total,
    musicVolume: epicProps.musicVolume,
    musicDuckRatio: epicProps.musicDuckRatio,
    musicStyle: epicProps.musicStyle,
    musicSrc: epicProps.musicSrc,
    narration,
  });
  const flashBoundaries = [...getFeatureFlashBoundaries(timing), montageEnd];

  return (
    <AbsoluteFill style={{ backgroundColor: CINEMATIC.navy, overflow: "hidden" }}>
      <Audio
        src={staticFile(resolveMusicSrc(epicProps.musicSrc))}
        volume={musicVol}
        loop
      />
      <FeatureVoiceover narration={narration} timing={timing} />

      {timing.segmentEnds.map((boundary, i) => (
        <CinematicTransition
          key={boundary}
          atFrame={boundary - 10}
          type={i % 2 === 0 ? "wipe" : "slide"}
          duration={22}
        />
      ))}
      <CinematicTransition atFrame={montageEnd - 12} type="fade" duration={28} />

      <SegmentFlash
        globalFrame={globalFrame}
        boundaries={flashBoundaries}
        flashFrames={FLASH_FRAMES}
      />

      <Sequence durationInFrames={timing.introEnd}>
        <CinematicFeatureIntro />
      </Sequence>

      <Sequence
        from={timing.introEnd}
        durationInFrames={montageDuration}
      >
        <CinematicFeatureMontage />
      </Sequence>

      <Sequence from={montageEnd} durationInFrames={timing.total - montageEnd}>
        <CinematicFeatureOutro />
      </Sequence>

      <XPBar
        progress={interpolate(globalFrame, [0, timing.total], [0, 1], {
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.quad),
        })}
      />
    </AbsoluteFill>
  );
};
