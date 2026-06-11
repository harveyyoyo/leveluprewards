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
import { CT } from "./promo/cinematicTheme";
import { getCinematicVoiceProps } from "./promo/cinematicVoice";
import { LevelUpLogoAnimated } from "./promo/cinematicComponents";
import { PromoClipVideo } from "./promo/PromoClipVideo";
import { resolveMusicSrc, usePromoMusicVolume } from "./promo/promoMusic";
import { jakarta, outfit } from "./promo/shared";
import { defaultWidescreenPromoProps } from "./promo/widescreenPromoDefaults";
import { WIDESCREEN_BEATS, type WidescreenBeatId } from "./promo/widescreenBeatCatalog";
import { WidescreenVoiceover } from "./WidescreenVoiceover";

const RETRO = {
  black: "#120b2f",
  purple: "#271155",
  panel: "#1b1644",
  blue: "#26d9ff",
  pink: "#ff4fd8",
  yellow: "#ffe766",
  green: "#4dff88",
  cream: "#fff7d6",
  ink: "#110a26",
} as const;

const PixelBg: React.FC<{ level: number }> = ({ level }) => {
  const frame = useCurrentFrame();
  const y = (frame * 3 + level * 29) % 64;

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, ${RETRO.black}, #07193e 54%, #12051f)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.24,
          backgroundImage:
            `linear-gradient(${RETRO.blue}22 2px, transparent 2px), linear-gradient(90deg, ${RETRO.pink}1f 2px, transparent 2px)`,
          backgroundSize: "64px 64px",
          backgroundPosition: `0 ${y}px`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.16,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.22) 1px, transparent 1px)",
          backgroundSize: "100% 8px",
        }}
      />
      {Array.from({ length: 18 }).map((_, i) => {
        const left = (i * 127 + level * 53) % 1040;
        const top = ((i * 211 + frame * (1.2 + (i % 3))) % 2100) - 120;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left,
              top,
              width: 10 + (i % 4) * 8,
              height: 10 + (i % 5) * 8,
              background: i % 2 ? RETRO.pink : RETRO.blue,
              opacity: 0.16 + (i % 4) * 0.04,
              boxShadow: `0 0 22px ${i % 2 ? RETRO.pink : RETRO.blue}`,
            }}
          />
        );
      })}
    </>
  );
};

const ArcadeHeader: React.FC<{ level: number; score: number; color?: string }> = ({
  level,
  score,
  color = RETRO.yellow,
}) => (
  <div
    style={{
      position: "absolute",
      top: 42,
      left: 42,
      right: 42,
      display: "grid",
      gridTemplateColumns: "1fr auto 1fr",
      alignItems: "center",
      zIndex: 20,
      fontFamily: outfit,
      color: RETRO.cream,
      textTransform: "uppercase",
      letterSpacing: 2,
      fontWeight: 900,
      textShadow: `0 0 18px ${color}`,
    }}
  >
    <div style={{ fontSize: 24 }}>Level {level}</div>
    <div
      style={{
        padding: "12px 24px",
        background: RETRO.ink,
        border: `4px solid ${color}`,
        boxShadow: `8px 8px 0 ${RETRO.black}, 0 0 26px ${color}88`,
        fontSize: 25,
      }}
    >
      Score {Math.round(score).toLocaleString("en-US")}
    </div>
    <div style={{ textAlign: "right", fontSize: 24 }}>1P Ready</div>
  </div>
);

const PixelFrame: React.FC<{
  clip: (typeof WIDESCREEN_BEATS)[Exclude<WidescreenBeatId, "intro">]["clip"];
  color: string;
  delay?: number;
}> = ({ clip, color, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    fps,
    frame: frame - delay,
    config: { damping: 11, stiffness: 120 },
  });
  const nudge = Math.sin(frame * 0.16) * 7;

  return (
    <div
      style={{
        width: 940,
        height: 740,
        padding: 18,
        background: RETRO.ink,
        border: `7px solid ${color}`,
        boxShadow: `14px 14px 0 ${RETRO.black}, 0 0 46px ${color}99`,
        transform: `translateY(${interpolate(enter, [0, 1], [110, nudge])}px) scale(${interpolate(enter, [0, 1], [0.86, 1])})`,
        opacity: enter,
      }}
    >
      <div
        style={{
          height: 46,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 14px",
          color: RETRO.cream,
          fontFamily: outfit,
          fontSize: 20,
          fontWeight: 900,
          letterSpacing: 2,
          textTransform: "uppercase",
          background: color,
        }}
      >
        <span style={{ width: 16, height: 16, background: RETRO.pink }} />
        <span style={{ width: 16, height: 16, background: RETRO.yellow }} />
        <span style={{ width: 16, height: 16, background: RETRO.green }} />
        <span style={{ color: RETRO.ink, marginLeft: 12 }}>Live school system</span>
      </div>
      <div style={{ height: 640, background: "#f8fafc", overflow: "hidden" }}>
        <PromoClipVideo clip={clip} />
      </div>
    </div>
  );
};

const PowerUp: React.FC<{
  label: string;
  value: string;
  color: string;
  start: number;
  x: number;
  y: number;
}> = ({ label, value, color, start, x, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ fps, frame: frame - start, config: { damping: 8, stiffness: 180 } });
  const opacity = interpolate(frame, [start - 5, start + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 260,
        padding: "18px 20px",
        background: RETRO.ink,
        border: `5px solid ${color}`,
        boxShadow: `10px 10px 0 ${RETRO.black}, 0 0 30px ${color}88`,
        transform: `scale(${pop}) rotate(${Math.sin(frame * 0.08 + x) * 2}deg)`,
        opacity,
        zIndex: 30,
      }}
    >
      <div
        style={{
          fontFamily: outfit,
          fontSize: 19,
          fontWeight: 900,
          letterSpacing: 2,
          textTransform: "uppercase",
          color,
        }}
      >
        Power up
      </div>
      <div
        style={{
          fontFamily: outfit,
          fontSize: 34,
          lineHeight: 1,
          marginTop: 8,
          fontWeight: 900,
          color: RETRO.cream,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: jakarta,
          fontSize: 18,
          marginTop: 8,
          fontWeight: 900,
          color: RETRO.yellow,
        }}
      >
        +{value} XP
      </div>
    </div>
  );
};

const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const logo = spring({ fps: 30, frame: frame - 12, config: { damping: 10, stiffness: 120 } });
  const title = spring({ fps: 30, frame: frame - 48, config: { damping: 9, stiffness: 150 } });
  const fill = interpolate(frame, [70, CT.introEnd - 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <PixelBg level={1} />
      <ArcadeHeader level={1} score={interpolate(frame, [0, CT.introEnd], [0, 1250])} />
      <div
        style={{
          position: "absolute",
          top: 220,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          transform: `scale(${logo})`,
        }}
      >
        <LevelUpLogoAnimated size={310} cream={RETRO.cream} showSubline={false} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 74,
          right: 74,
          bottom: 310,
          textAlign: "center",
          transform: `translateY(${interpolate(title, [0, 1], [80, 0])}px)`,
          opacity: title,
        }}
      >
        <div
          style={{
            fontFamily: outfit,
            fontSize: 104,
            lineHeight: 0.9,
            fontWeight: 900,
            color: RETRO.yellow,
            textTransform: "uppercase",
            textShadow: `8px 8px 0 ${RETRO.pink}, 0 0 34px ${RETRO.yellow}`,
          }}
        >
          Reward
          <br />
          Quest
        </div>
        <div
          style={{
            margin: "42px auto 0",
            height: 34,
            border: `5px solid ${RETRO.cream}`,
            background: RETRO.ink,
            padding: 5,
            width: 760,
            boxShadow: `0 0 36px ${RETRO.blue}88`,
          }}
        >
          <div style={{ width: `${fill * 100}%`, height: "100%", background: RETRO.green }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const FeatureScene: React.FC<{
  beatId: Exclude<WidescreenBeatId, "intro">;
  level: number;
  durationFrames: number;
  color: string;
}> = ({ beatId, level, durationFrames, color }) => {
  const frame = useCurrentFrame();
  const beat = WIDESCREEN_BEATS[beatId];
  const title = spring({ fps: 30, frame: frame - 18, config: { damping: 12, stiffness: 130 } });

  return (
    <AbsoluteFill>
      <PixelBg level={level} />
      <ArcadeHeader
        level={level}
        color={color}
        score={interpolate(frame, [0, durationFrames], [level * 1400, level * 1400 + 875])}
      />
      <div
        style={{
          position: "absolute",
          top: 145,
          left: 70,
          right: 70,
          textAlign: "center",
          transform: `translateY(${interpolate(title, [0, 1], [-42, 0])}px)`,
          opacity: title,
        }}
      >
        <div
          style={{
            fontFamily: outfit,
            fontSize: 24,
            fontWeight: 900,
            letterSpacing: 4,
            textTransform: "uppercase",
            color,
          }}
        >
          {beat.label}
        </div>
        <div
          style={{
            fontFamily: outfit,
            fontSize: 64,
            lineHeight: 0.95,
            fontWeight: 900,
            marginTop: 12,
            color: RETRO.cream,
            textShadow: `6px 6px 0 ${RETRO.black}, 0 0 24px ${color}`,
          }}
        >
          {beat.tagline}
        </div>
      </div>
      <div style={{ position: "absolute", left: 70, right: 70, top: 470 }}>
        <PixelFrame clip={beat.clip} color={color} delay={8} />
      </div>
      <PowerUp label="Combo" value="50" color={RETRO.green} start={42} x={66} y={1280} />
      <PowerUp label="Badge" value="75" color={RETRO.pink} start={78} x={754} y={1378} />
      <PowerUp label="Streak" value="100" color={RETRO.yellow} start={112} x={394} y={1520} />
    </AbsoluteFill>
  );
};

const ScanQuestScene: React.FC = () => {
  const frame = useCurrentFrame();
  const duration = CT.outroEnd - CT.feature3End;
  const scan = interpolate(frame, [32, duration - 30], [360, 1200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <AbsoluteFill>
      <PixelBg level={5} />
      <ArcadeHeader
        level={5}
        color={RETRO.green}
        score={interpolate(frame, [0, duration], [6400, 7777])}
      />
      <div
        style={{
          position: "absolute",
          left: 76,
          right: 76,
          top: 210,
          textAlign: "center",
          fontFamily: outfit,
          fontSize: 76,
          lineHeight: 0.95,
          fontWeight: 900,
          color: RETRO.cream,
          textTransform: "uppercase",
          textShadow: `7px 7px 0 ${RETRO.pink}, 0 0 30px ${RETRO.green}`,
        }}
      >
        No buttons.
        <br />
        Just scan.
      </div>
      <div
        style={{
          position: "absolute",
          left: 112,
          right: 112,
          top: 610,
          height: 760,
          background: RETRO.ink,
          border: `8px solid ${RETRO.green}`,
          boxShadow: `14px 14px 0 ${RETRO.black}, 0 0 60px ${RETRO.green}88`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 70,
            right: 70,
            top: 120,
            height: 360,
            background: RETRO.cream,
            border: `6px solid ${RETRO.yellow}`,
            boxShadow: `0 0 36px ${RETRO.yellow}88`,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 36,
              left: 38,
              fontFamily: outfit,
              fontSize: 38,
              fontWeight: 900,
              color: RETRO.ink,
            }}
          >
            Student ID
          </div>
          <div
            style={{
              position: "absolute",
              left: 44,
              right: 44,
              bottom: 56,
              height: 96,
              background:
                "repeating-linear-gradient(90deg, #110a26 0 9px, transparent 9px 16px, #110a26 16px 28px, transparent 28px 38px)",
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: scan - 610,
            height: 12,
            background: RETRO.blue,
            boxShadow: `0 0 42px ${RETRO.blue}`,
          }}
        />
        {["keyboard", "mouse", "touch"].map((label, i) => (
          <div
            key={label}
            style={{
              position: "absolute",
              left: 80 + i * 245,
              bottom: 64,
              width: 180,
              height: 122,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: RETRO.panel,
              border: `5px solid ${RETRO.pink}`,
              color: RETRO.pink,
              fontFamily: outfit,
              fontSize: 25,
              fontWeight: 900,
              textTransform: "uppercase",
              textDecoration: "line-through",
            }}
          >
            No {label}
          </div>
        ))}
      </div>
      <PowerUp label="Auto check-in" value="150" color={RETRO.green} start={96} x={340} y={1455} />
    </AbsoluteFill>
  );
};

const FinalBossScene: React.FC = () => {
  const frame = useCurrentFrame();
  const outroDuration = CT.total - CT.outroEnd;
  const logo = spring({ fps: 30, frame: frame - 8, config: { damping: 10, stiffness: 115 } });
  const cta = spring({ fps: 30, frame: frame - 52, config: { damping: 9, stiffness: 130 } });

  return (
    <AbsoluteFill>
      <PixelBg level={6} />
      <ArcadeHeader
        level={6}
        color={RETRO.yellow}
        score={interpolate(frame, [0, outroDuration], [8000, 9999])}
      />
      <div
        style={{
          position: "absolute",
          top: 250,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          transform: `scale(${logo})`,
        }}
      >
        <LevelUpLogoAnimated size={340} cream={RETRO.cream} showSubline={false} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          bottom: 315,
          textAlign: "center",
          transform: `translateY(${interpolate(cta, [0, 1], [90, 0])}px) scale(${cta})`,
          opacity: cta,
        }}
      >
        <div
          style={{
            fontFamily: outfit,
            fontSize: 92,
            lineHeight: 0.92,
            fontWeight: 900,
            color: RETRO.yellow,
            textTransform: "uppercase",
            textShadow: `8px 8px 0 ${RETRO.pink}, 0 0 36px ${RETRO.yellow}`,
          }}
        >
          Try it out
          <br />
          free
        </div>
        <div
          style={{
            display: "inline-block",
            marginTop: 52,
            padding: "24px 42px",
            background: RETRO.green,
            border: `7px solid ${RETRO.cream}`,
            boxShadow: `12px 12px 0 ${RETRO.black}, 0 0 44px ${RETRO.green}`,
            fontFamily: outfit,
            fontSize: 42,
            fontWeight: 900,
            color: RETRO.ink,
          }}
        >
          leveluprewards.app
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const RetroGamingVerticalPromo: React.FC = () => {
  const voice = getCinematicVoiceProps();
  const musicVol = usePromoMusicVolume({
    totalFrames: voice.timing.total,
    musicVolume: defaultWidescreenPromoProps.musicVolume,
    musicDuckRatio: defaultWidescreenPromoProps.musicDuckRatio,
    musicStyle: defaultWidescreenPromoProps.musicStyle,
    narration: voice.narration,
  });

  return (
    <AbsoluteFill style={{ background: RETRO.black, overflow: "hidden" }}>
      <Audio
        src={staticFile(resolveMusicSrc(defaultWidescreenPromoProps.musicSrc))}
        volume={musicVol}
        loop
      />
      <WidescreenVoiceover narration={voice.narration} timing={voice.timing} />

      <Sequence durationInFrames={CT.introEnd}>
        <IntroScene />
      </Sequence>
      <Sequence from={CT.introEnd} durationInFrames={CT.feature1End - CT.introEnd}>
        <FeatureScene
          beatId="selector"
          level={2}
          durationFrames={CT.feature1End - CT.introEnd}
          color={RETRO.blue}
        />
      </Sequence>
      <Sequence from={CT.feature1End} durationInFrames={CT.feature2End - CT.feature1End}>
        <FeatureScene
          beatId="home"
          level={3}
          durationFrames={CT.feature2End - CT.feature1End}
          color={RETRO.pink}
        />
      </Sequence>
      <Sequence from={CT.feature2End} durationInFrames={CT.feature3End - CT.feature2End}>
        <FeatureScene
          beatId="dashboard"
          level={4}
          durationFrames={CT.feature3End - CT.feature2End}
          color={RETRO.yellow}
        />
      </Sequence>
      <Sequence from={CT.feature3End} durationInFrames={CT.outroEnd - CT.feature3End}>
        <ScanQuestScene />
      </Sequence>
      <Sequence from={CT.outroEnd} durationInFrames={CT.total - CT.outroEnd}>
        <FinalBossScene />
      </Sequence>
    </AbsoluteFill>
  );
};
