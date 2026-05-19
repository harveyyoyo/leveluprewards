import React from "react";
import { loadFont as loadOutfit } from "@remotion/google-fonts/Outfit";
import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND } from "./theme";

export const outfit = loadOutfit("normal", {
  weights: ["600", "700", "800"],
  subsets: ["latin"],
}).fontFamily;

export const jakarta = loadJakarta("normal", {
  weights: ["400", "600", "700"],
  subsets: ["latin"],
}).fontFamily;

const GlowOrb: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
  <div
    style={{
      position: "absolute",
      borderRadius: "50%",
      filter: "blur(70px)",
      pointerEvents: "none",
      ...style,
    }}
  />
);

export const PromoBackground: React.FC<{ totalFrames: number }> = ({
  totalFrames,
}) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const orbY = interpolate(frame, [0, totalFrames], [height + 120, -320], {
    extrapolateRight: "clamp",
  });
  const orbX = interpolate(frame, [0, totalFrames], [-280, 180], {
    extrapolateRight: "clamp",
  });

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(127, 0, 255, 0.28), transparent 70%)",
        }}
      />
      <GlowOrb
        style={{
          top: orbY,
          left: orbX,
          width: 720,
          height: 720,
          background:
            "radial-gradient(circle, rgba(255, 0, 127, 0.2) 0%, transparent 72%)",
        }}
      />
      <GlowOrb
        style={{
          bottom: -120,
          right: -80,
          width: 560,
          height: 560,
          background:
            "radial-gradient(circle, rgba(76, 201, 240, 0.18) 0%, transparent 72%)",
        }}
      />
    </>
  );
};

export const PromoIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleScale = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 110 },
  });
  const subtitleOpacity = interpolate(frame, [18, 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const subtitleY = interpolate(frame, [18, 36], [28, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: "0 56px",
      }}
    >
      <div style={{ textAlign: "center", zIndex: 2 }}>
        <p
          style={{
            fontFamily: outfit,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: BRAND.cyan,
            margin: 0,
            opacity: subtitleOpacity,
          }}
        >
          School Rewards System
        </p>
        <h1
          style={{
            fontFamily: outfit,
            fontSize: 108,
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: -3,
            margin: "20px 0 0",
            transform: `scale(${titleScale})`,
            background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.purple})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          LevelUp
        </h1>
        <p
          style={{
            fontFamily: jakarta,
            fontSize: 36,
            fontWeight: 600,
            color: BRAND.textMuted,
            marginTop: 28,
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
          }}
        >
          Motivate. Reward. Elevate.
        </p>
      </div>
    </AbsoluteFill>
  );
};

export const PromoOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 90 },
  });
  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const pulse = interpolate(Math.sin(frame * 0.1), [-1, 1], [1, 1.05]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#06050e",
        opacity: fadeIn,
        padding: "0 56px",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h2
          style={{
            fontFamily: outfit,
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.05,
            margin: 0,
            transform: `scale(${scale})`,
            background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.purple})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Transform your
          <br />
          classroom today
        </h2>
        <p
          style={{
            fontFamily: jakarta,
            fontSize: 26,
            color: BRAND.textMuted,
            marginTop: 24,
            marginBottom: 64,
          }}
        >
          Built for teachers, students, and admins.
        </p>
        <div
          style={{
            display: "inline-block",
            padding: "22px 56px",
            borderRadius: 50,
            background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.purple})`,
            boxShadow: "0 16px 40px rgba(255, 0, 127, 0.45)",
            fontFamily: outfit,
            fontSize: 32,
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

export type FeatureCalloutConfig = {
  start: number;
  end: number;
  emoji: string;
  title: string;
  body: string;
  color: string;
};

export const FeatureCallout: React.FC<{
  callout: FeatureCalloutConfig;
  globalFrame: number;
}> = ({ callout, globalFrame }) => {
  const { fps } = useVideoConfig();
  const localFrame = globalFrame - callout.start;
  const progress = spring({
    fps,
    frame: localFrame,
    config: { damping: 13, stiffness: 120 },
  });
  const opacity = interpolate(
    globalFrame,
    [callout.start, callout.start + 12, callout.end - 12, callout.end],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  if (globalFrame < callout.start || globalFrame > callout.end) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: 200,
        width: 920,
        padding: "32px 40px",
        borderRadius: 28,
        background: "rgba(18, 17, 36, 0.88)",
        border: `1px solid ${callout.color}55`,
        boxShadow: "0 24px 50px rgba(0,0,0,0.45)",
        opacity,
        transform: `scale(${progress}) translateY(${interpolate(progress, [0, 1], [40, 0])}px)`,
        zIndex: 30,
        display: "flex",
        gap: 24,
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: 56 }}>{callout.emoji}</span>
      <div>
        <h3
          style={{
            margin: 0,
            fontFamily: outfit,
            fontSize: 34,
            fontWeight: 800,
            color: callout.color,
          }}
        >
          {callout.title}
        </h3>
        <p
          style={{
            margin: "8px 0 0",
            fontFamily: jakarta,
            fontSize: 22,
            color: BRAND.textMuted,
            lineHeight: 1.45,
          }}
        >
          {callout.body}
        </p>
      </div>
    </div>
  );
};

export const DeviceChrome: React.FC<{
  children: React.ReactNode;
  cardScale: number;
  cardY: number;
  tiltX: number;
  tiltY: number;
}> = ({ children, cardScale, cardY, tiltX, tiltY }) => (
  <div
    style={{
      width: 1008,
      height: 580,
      marginTop: 80,
      borderRadius: 28,
      border: "1px solid rgba(255, 255, 255, 0.12)",
      background: "#0c0a1a",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      boxShadow:
        "0 40px 100px -15px rgba(0, 0, 0, 0.85), 0 0 50px rgba(127, 0, 255, 0.22)",
      transform: `scale(${cardScale}) translateY(${cardY}px) perspective(1400px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
    }}
  >
    <div
      style={{
        height: 48,
        background: "#121124",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 10,
      }}
    >
      {["#ff5f56", "#ffbd2e", "#27c93f"].map((color) => (
        <div
          key={color}
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: color,
          }}
        />
      ))}
      <div
        style={{
          flex: 1,
          marginLeft: 12,
          textAlign: "center",
          fontFamily: jakarta,
          fontSize: 14,
          color: "#94a3b8",
          background: "rgba(0,0,0,0.35)",
          borderRadius: 8,
          padding: "6px 0",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        portal.leveluprewards.app
      </div>
    </div>
    <div style={{ flex: 1, height: "calc(100% - 48px)", background: "#000" }}>
      {children}
    </div>
  </div>
);
