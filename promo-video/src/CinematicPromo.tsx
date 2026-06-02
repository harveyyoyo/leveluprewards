import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CINEMATIC, CT } from "./promo/cinematicTheme";
import { getCinematicVoiceProps } from "./promo/cinematicVoice";
import { defaultWidescreenPromoProps } from "./promo/widescreenPromoDefaults";
import { WIDESCREEN_BEATS, type WidescreenBeatId } from "./promo/widescreenBeatCatalog";
import { PromoClipVideo } from "./promo/PromoClipVideo";
import { WidescreenIntroLayout } from "./promo/WidescreenIntroLayout";
import { resolveMusicSrc, usePromoMusicVolume } from "./promo/promoMusic";
import { WidescreenVoiceover } from "./WidescreenVoiceover";
import {
  AchievementBadge,
  BrowserMockup,
  CinematicBg,
  GoldSparkles,
  LevelUpLogoAnimated,
  XPBar,
} from "./promo/cinematicComponents";
import { outfit, jakarta } from "./promo/shared";

// ─── Cinematic Scene Transition Overlay ──────────────────────────────────────────
const CinematicTransition: React.FC<{
  atFrame: number;
  duration?: number;
  type?: "slide" | "fade" | "wipe";
}> = ({ atFrame, duration = 24, type = "slide" }) => {
  const globalFrame = useCurrentFrame();
  const relativeFrame = globalFrame - atFrame;

  if (relativeFrame < 0 || relativeFrame >= duration) {
    return null;
  }

  const progress = relativeFrame / duration;

  if (type === "slide") {
    // Smooth dual-panel sweep transition
    const slidePos = interpolate(progress, [0, 0.5, 1], [-100, 0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return (
      <AbsoluteFill style={{ zIndex: 9999, pointerEvents: "none" }}>
        <div style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${slidePos}%`,
          width: "100%",
          background: `linear-gradient(90deg, transparent, ${CINEMATIC.gold}66 15%, ${CINEMATIC.navy} 35%, ${CINEMATIC.navy} 65%, ${CINEMATIC.cyan}66 85%, transparent)`,
          boxShadow: "0 0 120px rgba(0,0,0,0.9)"
        }} />
      </AbsoluteFill>
    );
  }

  if (type === "wipe") {
    // Elegant circular iris transition closing to solid navy and opening back up
    const radius = interpolate(progress, [0, 0.5, 1], [120, 0, 120], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return (
      <AbsoluteFill style={{ zIndex: 9999, pointerEvents: "none" }}>
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: CINEMATIC.navy,
          clipPath: `circle(${radius}% at 50% 50%)`
        }} />
      </AbsoluteFill>
    );
  }

  if (type === "fade") {
    // Soft navy dip — no white flash
    const opacity = interpolate(progress, [0, 0.5, 1], [0, 0.55, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <AbsoluteFill
        style={{
          zIndex: 9999,
          backgroundColor: CINEMATIC.navy,
          opacity,
          pointerEvents: "none",
        }}
      />
    );
  }

  return null;
};

// ─── Intro (logo → scan / earn / pick prizes) ────────────────────────────────
const CinematicIntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const copy = defaultWidescreenPromoProps.copy;
  const fadeIn = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      <CinematicBg totalFrames={CT.introEnd} />
      <GoldSparkles count={14} seed="intro" />
      <WidescreenIntroLayout
        eyebrow={copy?.introEyebrow ?? "Welcome to LevelUp"}
        durationFrames={CT.introEnd}
        variant="cinematic"
        logo={
          <LevelUpLogoAnimated
            startFrame={0}
            size={200}
            cream="#f0e8c8"
          />
        }
      />
    </AbsoluteFill>
  );
};

const CinematicVoiceBeat: React.FC<{
  beatId: Exclude<WidescreenBeatId, "intro">;
  durationFrames: number;
  xpStart: number;
  xpEnd: number;
}> = ({ beatId, durationFrames, xpStart, xpEnd }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat = WIDESCREEN_BEATS[beatId];
  const enter = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 100 },
  });

  return (
    <AbsoluteFill>
      <CinematicBg totalFrames={durationFrames} />
      <GoldSparkles count={10} seed={beatId} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          padding: "0 72px",
          gap: 64,
        }}
      >
        <div
          style={{
            flex: 1,
            opacity: enter,
            transform: `translateX(${interpolate(enter, [0, 1], [-80, 0])}px)`,
          }}
        >
          <BrowserMockup style={{ height: 660 }}>
            <PromoClipVideo clip={beat.clip} />
          </BrowserMockup>
        </div>
        <div
          style={{
            flex: "0 0 38%",
            opacity: enter,
            transform: `translateX(${interpolate(enter, [0, 1], [80, 0])}px)`,
          }}
        >
          <p
            style={{
              fontFamily: outfit,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: beat.color,
              margin: "0 0 16px",
            }}
          >
            {beat.emoji} {beat.label}
          </p>
          <h2
            style={{
              fontFamily: outfit,
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              margin: 0,
              color: CINEMATIC.offWhite,
            }}
          >
            {beat.tagline}
          </h2>
        </div>
      </div>
      <AchievementBadge
        emoji={beat.emoji}
        title={beat.label}
        xp={40}
        startFrame={24}
        endFrame={Math.min(durationFrames - 8, 120)}
        color={beat.color}
      />
      <XPBar
        progress={interpolate(frame, [0, durationFrames], [xpStart, xpEnd], {
          extrapolateRight: "clamp",
        })}
      />
    </AbsoluteFill>
  );
};

const PortalVoiceScene: React.FC = () => (
  <CinematicVoiceBeat
    beatId="outro"
    durationFrames={CT.outroEnd - CT.feature3End}
    xpStart={0.72}
    xpEnd={0.88}
  />
);

// ─── Outro / CTA ──────────────────────────────────────────────────────────────
const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const copy = defaultWidescreenPromoProps.copy;
  const outroDuration = CT.total - CT.outroEnd;
  const fadeIn = interpolate(frame, [0, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headlineE = spring({ fps, frame: frame - 10, config: { damping: 12, stiffness: 110 } });
  const ctaE = spring({ fps, frame: frame - 45, config: { damping: 13, stiffness: 100 } });
  const pulse = 1 + Math.sin(frame * 0.14) * 0.028;
  const ringScale = (delay: number) => interpolate(frame, [delay, delay + 90], [0.4, 2.0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const ringOpacity = (delay: number) => interpolate(frame, [delay, delay + 90], [0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: fadeIn }}>
      <CinematicBg totalFrames={outroDuration} />
      <GoldSparkles count={22} seed="outro" />

      {/* Radiating rings */}
      {[0, 40, 80, 120].map((delay) => (
        <div key={delay} style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", border: `2px solid ${CINEMATIC.gold}`, transform: `scale(${ringScale(delay)})`, opacity: ringOpacity(delay), pointerEvents: "none" }} />
      ))}

      <div style={{ textAlign: "center", zIndex: 2, position: "relative" }}>
        <p style={{ fontFamily: outfit, fontSize: 15, fontWeight: 700, letterSpacing: 6, textTransform: "uppercase", color: CINEMATIC.gold, margin: "0 0 16px", transform: `scale(${headlineE})`, opacity: headlineE }}>
          {copy?.outroHeadline ?? "Scanning only"}
        </p>
        <h2 style={{ fontFamily: outfit, fontSize: 110, fontWeight: 800, lineHeight: 0.9, letterSpacing: -4, margin: "0 0 12px", transform: `scale(${headlineE})`, background: `linear-gradient(135deg,${CINEMATIC.offWhite} 0%,${CINEMATIC.gold} 50%,${CINEMATIC.offWhite} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: `drop-shadow(0 0 80px rgba(245,200,66,0.5))` }}>
          Start free<br />today
        </h2>
        <p style={{ fontFamily: jakarta, fontSize: 24, color: CINEMATIC.textMuted, margin: "20px 0 48px", transform: `scale(${headlineE})`, opacity: headlineE }}>
          {copy?.outroSubline ?? "Just a quick scan and you're done"}
        </p>

        {/* CTA button */}
        <div style={{ display: "inline-block", padding: "26px 72px", borderRadius: 60, background: `linear-gradient(135deg,${CINEMATIC.gold},#c9a830)`, boxShadow: `0 0 70px rgba(245,200,66,0.55), 0 24px 60px rgba(0,0,0,0.5)`, fontFamily: outfit, fontSize: 38, fontWeight: 800, color: CINEMATIC.navy, letterSpacing: -0.5, transform: `scale(${ctaE * pulse})` }}>
          leveluprewards.app
        </div>

        <p style={{ fontFamily: jakarta, fontSize: 16, color: CINEMATIC.textDim, marginTop: 36 }}>
          Free to start · No credit card needed · Setup in 20 minutes
        </p>
      </div>

      {/* Final achievement */}
      <AchievementBadge emoji="🏅" title="Level Up Your School" xp={250} startFrame={80} color={CINEMATIC.gold} />
      <XPBar progress={interpolate(frame, [0, outroDuration], [0.88, 1.0], { extrapolateRight: "clamp" })} />
    </AbsoluteFill>
  );
};

// ─── Root Composition ─────────────────────────────────────────────────────────
export const CinematicPromo: React.FC = () => {
  const voice = getCinematicVoiceProps();
  const musicVol = usePromoMusicVolume({
    totalFrames: voice.timing.total,
    musicVolume: defaultWidescreenPromoProps.musicVolume,
    musicDuckRatio: defaultWidescreenPromoProps.musicDuckRatio,
    musicStyle: defaultWidescreenPromoProps.musicStyle,
    narration: voice.narration,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: CINEMATIC.navy, color: "white", overflow: "hidden" }}>
      <Audio
        src={staticFile(resolveMusicSrc(defaultWidescreenPromoProps.musicSrc))}
        volume={musicVol}
        loop
      />
      <WidescreenVoiceover narration={voice.narration} timing={voice.timing} />
      
      {/* Scene transitions — slide/wipe only; fades are soft navy dips */}
      <CinematicTransition atFrame={CT.introEnd - 12} type="slide" duration={24} />
      <CinematicTransition atFrame={CT.feature1End - 14} type="wipe" duration={28} />
      <CinematicTransition atFrame={CT.feature2End - 12} type="slide" duration={24} />
      <CinematicTransition atFrame={CT.feature3End - 10} type="wipe" duration={20} />

      <Sequence durationInFrames={CT.introEnd}>
        <CinematicIntroScene />
      </Sequence>
      <Sequence from={CT.introEnd} durationInFrames={CT.feature1End - CT.introEnd}>
        <CinematicVoiceBeat
          beatId="selector"
          durationFrames={CT.feature1End - CT.introEnd}
          xpStart={0.14}
          xpEnd={0.33}
        />
      </Sequence>
      <Sequence from={CT.feature1End} durationInFrames={CT.feature2End - CT.feature1End}>
        <CinematicVoiceBeat
          beatId="home"
          durationFrames={CT.feature2End - CT.feature1End}
          xpStart={0.33}
          xpEnd={0.52}
        />
      </Sequence>
      <Sequence from={CT.feature2End} durationInFrames={CT.feature3End - CT.feature2End}>
        <CinematicVoiceBeat
          beatId="dashboard"
          durationFrames={CT.feature3End - CT.feature2End}
          xpStart={0.52}
          xpEnd={0.72}
        />
      </Sequence>
      <Sequence from={CT.feature3End} durationInFrames={CT.outroEnd - CT.feature3End}>
        <PortalVoiceScene />
      </Sequence>
      <Sequence from={CT.outroEnd} durationInFrames={CT.total - CT.outroEnd}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};
