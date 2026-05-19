import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND } from "./theme";
import { jakarta, outfit } from "./shared";

const GlowOrb: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
  <div
    style={{
      position: "absolute",
      borderRadius: "50%",
      filter: "blur(90px)",
      pointerEvents: "none",
      ...style,
    }}
  />
);

export const LandscapeBackground: React.FC<{ totalFrames: number }> = ({
  totalFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const drift = interpolate(frame, [0, totalFrames], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(125deg, #03020a 0%, #0a0618 40%, #04030a 100%)",
        }}
      />
      <GlowOrb
        style={{
          top: -120 + drift * 80,
          left: -100 + drift * 140,
          width: width * 0.55,
          height: height * 0.7,
          background:
            "radial-gradient(circle, rgba(255, 0, 127, 0.22) 0%, transparent 70%)",
        }}
      />
      <GlowOrb
        style={{
          bottom: -80,
          right: -60,
          width: width * 0.45,
          height: height * 0.55,
          background:
            "radial-gradient(circle, rgba(127, 0, 255, 0.2) 0%, transparent 72%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.04,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />
    </>
  );
};

export const LandscapeIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const titlePop = spring({
    fps,
    frame: frame - 8,
    config: { damping: 12, stiffness: 140 },
  });
  const lineWidth = interpolate(frame, [20, 45], [0, width * 0.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const flash = interpolate(frame, [0, 4, 10], [1, 0.85, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subtitleIn = interpolate(frame, [28, 48], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const streakX = interpolate(frame, [0, 80], [-200, width + 200], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `rgba(255, 0, 127, ${flash * 0.35})`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: streakX,
          top: "42%",
          width: 280,
          height: 4,
          borderRadius: 4,
          filter: "blur(2px)",
          background: `linear-gradient(90deg, transparent, ${BRAND.cyan}, transparent)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          borderRadius: "50%",
          border: `2px solid rgba(255, 0, 127, ${0.15 + titlePop * 0.25})`,
          transform: `scale(${0.6 + titlePop * 0.5})`,
          opacity: titlePop,
        }}
      />
      <div style={{ textAlign: "center", zIndex: 2, position: "relative" }}>
        <p
          style={{
            fontFamily: outfit,
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: BRAND.cyan,
            margin: 0,
            opacity: subtitleIn,
          }}
        >
          School Rewards System
        </p>
        <h1
          style={{
            fontFamily: outfit,
            fontSize: 148,
            fontWeight: 800,
            lineHeight: 0.9,
            letterSpacing: -6,
            margin: "16px 0 0",
            transform: `scale(${titlePop})`,
            background: `linear-gradient(135deg, ${BRAND.pink} 0%, ${BRAND.purple} 50%, ${BRAND.cyan} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: `drop-shadow(0 0 40px rgba(255, 0, 127, ${titlePop * 0.5}))`,
          }}
        >
          LevelUp
        </h1>
        <div
          style={{
            height: 4,
            width: lineWidth,
            margin: "28px auto 0",
            borderRadius: 4,
            background: `linear-gradient(90deg, ${BRAND.pink}, ${BRAND.cyan})`,
          }}
        />
        <p
          style={{
            fontFamily: jakarta,
            fontSize: 32,
            fontWeight: 600,
            color: BRAND.textMuted,
            marginTop: 24,
            opacity: subtitleIn,
          }}
        >
          Motivate · Reward · Elevate
        </p>
      </div>
    </AbsoluteFill>
  );
};

export const LandscapeOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 100 },
  });
  const fade = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulse = 1 + Math.sin(frame * 0.12) * 0.04;
  const ring = interpolate(frame, [0, 120], [0.7, 1.15], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: fade,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          border: `3px solid rgba(127, 0, 255, ${0.25 * scale})`,
          transform: `scale(${ring})`,
          opacity: 0.6,
        }}
      />
      <div style={{ textAlign: "center", zIndex: 2, position: "relative" }}>
        <h2
          style={{
            fontFamily: outfit,
            fontSize: 88,
            fontWeight: 800,
            lineHeight: 1.02,
            margin: 0,
            transform: `scale(${scale})`,
            background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.purple}, ${BRAND.cyan})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Transform your classroom
        </h2>
        <p
          style={{
            fontFamily: jakarta,
            fontSize: 28,
            color: BRAND.textMuted,
            marginTop: 20,
            marginBottom: 48,
          }}
        >
          Teachers · Students · Admins — one portal.
        </p>
        <div
          style={{
            display: "inline-block",
            padding: "24px 64px",
            borderRadius: 60,
            background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.purple})`,
            boxShadow: `0 0 60px rgba(255, 0, 127, 0.55), 0 20px 50px rgba(0,0,0,0.5)`,
            fontFamily: outfit,
            fontSize: 36,
            fontWeight: 700,
            color: "white",
            transform: `scale(${scale * pulse})`,
          }}
        >
          leveluprewards.app
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const SegmentFlash: React.FC<{
  globalFrame: number;
  boundaries: number[];
}> = ({ globalFrame, boundaries }) => {
  const hit = boundaries.some((b) => globalFrame >= b && globalFrame < b + 5);
  if (!hit) return null;
  const local = boundaries.find(
    (b) => globalFrame >= b && globalFrame < b + 5,
  )!;
  const opacity = interpolate(globalFrame, [local, local + 5], [0.9, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, rgba(255,255,255,${opacity * 0.7}), rgba(255,0,127,${opacity * 0.35}))`,
        pointerEvents: "none",
        zIndex: 50,
      }}
    />
  );
};

export const LandscapeSidebar: React.FC<{
  segmentIndex: number;
  emoji: string;
  label: string;
  tagline: string;
  color: string;
  accent: string;
  localFrame: number;
}> = ({ segmentIndex, emoji, label, tagline, color, accent, localFrame }) => {
  const { fps } = useVideoConfig();
  const slide = spring({
    fps,
    frame: localFrame,
    config: { damping: 14, stiffness: 130 },
  });
  const numScale = spring({
    fps,
    frame: localFrame - 4,
    config: { damping: 10, stiffness: 160 },
  });

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 48px 0 40px",
        transform: `translateX(${interpolate(slide, [0, 1], [80, 0])}px)`,
        opacity: slide,
      }}
    >
      <span
        style={{
          fontFamily: outfit,
          fontSize: 120,
          fontWeight: 800,
          lineHeight: 1,
          transform: `scale(${numScale})`,
          display: "block",
          background: `linear-gradient(180deg, ${color}44, transparent)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: 8,
        }}
      >
        {String(segmentIndex + 1).padStart(2, "0")}
      </span>
      <span style={{ fontSize: 64, marginBottom: 16 }}>{emoji}</span>
      <h3
        style={{
          fontFamily: outfit,
          fontSize: 48,
          fontWeight: 800,
          margin: 0,
          color,
          textShadow: `0 0 40px ${color}66`,
        }}
      >
        {label}
      </h3>
      <div
        style={{
          width: 80,
          height: 5,
          borderRadius: 4,
          margin: "20px 0",
          background: `linear-gradient(90deg, ${color}, ${accent})`,
        }}
      />
      <p
        style={{
          fontFamily: jakarta,
          fontSize: 24,
          lineHeight: 1.5,
          color: BRAND.textMuted,
          margin: 0,
          maxWidth: 420,
        }}
      >
        {tagline}
      </p>
    </div>
  );
};

export const LandscapeBrowser: React.FC<{
  children: React.ReactNode;
  scale: number;
  rotateY: number;
  kenBurn: number;
}> = ({ children, scale, rotateY, kenBurn }) => (
  <div
    style={{
      width: 1080,
      height: 608,
      borderRadius: 20,
      border: "1px solid rgba(255, 255, 255, 0.14)",
      background: "#0c0a1a",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      boxShadow: `0 50px 120px -20px rgba(0,0,0,0.9),
        0 0 80px rgba(127, 0, 255, 0.35),
        inset 0 1px 0 rgba(255,255,255,0.08)`,
      transform: `scale(${scale}) perspective(1600px) rotateY(${rotateY}deg)`,
    }}
  >
    <div
      style={{
        height: 44,
        background: "linear-gradient(180deg, #1a1830, #121124)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 8,
      }}
    >
      {["#ff5f56", "#ffbd2e", "#27c93f"].map((c) => (
        <div
          key={c}
          style={{
            width: 11,
            height: 11,
            borderRadius: "50%",
            background: c,
          }}
        />
      ))}
      <div
        style={{
          flex: 1,
          marginLeft: 12,
          textAlign: "center",
          fontFamily: jakarta,
          fontSize: 13,
          color: "#94a3b8",
          background: "rgba(0,0,0,0.4)",
          borderRadius: 8,
          padding: "5px 0",
        }}
      >
        portal.leveluprewards.app
      </div>
    </div>
    <div
      style={{
        flex: 1,
        overflow: "hidden",
        transform: `scale(${kenBurn})`,
        transformOrigin: "center center",
      }}
    >
      {children}
    </div>
  </div>
);

export const ProgressRail: React.FC<{
  progress: number;
  color: string;
}> = ({ progress, color }) => (
  <div
    style={{
      position: "absolute",
      top: 48,
      left: 64,
      right: 64,
      height: 4,
      borderRadius: 4,
      background: "rgba(255,255,255,0.08)",
      zIndex: 20,
    }}
  >
    <div
      style={{
        width: `${progress * 100}%`,
        height: "100%",
        borderRadius: 4,
        background: `linear-gradient(90deg, ${color}, ${BRAND.cyan})`,
        boxShadow: `0 0 20px ${color}`,
      }}
    />
  </div>
);

export const Sparkles: React.FC<{ count?: number; seed?: string }> = ({
  count = 12,
  seed = "sparks",
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  return (
    <>
      {new Array(count).fill(0).map((_, i) => {
        const x = random(`${seed}-x-${i}`) * width;
        const y = random(`${seed}-y-${i}`) * height;
        const size = 2 + random(`${seed}-s-${i}`) * 4;
        const twinkle = Math.sin(frame * 0.15 + i * 2) * 0.5 + 0.5;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: BRAND.cyan,
              opacity: twinkle * 0.6,
              boxShadow: `0 0 ${size * 3}px ${BRAND.cyan}`,
            }}
          />
        );
      })}
    </>
  );
};
