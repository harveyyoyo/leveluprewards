import React from "react";
import { loadFont as loadOutfit } from "@remotion/google-fonts/Outfit";
import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";
import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND, TIMING } from "./promo/theme";

const { fontFamily: outfit } = loadOutfit("normal", {
  weights: ["600", "700", "800"],
  subsets: ["latin"],
});

const { fontFamily: jakarta } = loadJakarta("normal", {
  weights: ["400", "600", "700"],
  subsets: ["latin"],
});

const FEATURES = [
  {
    emoji: "⚡",
    title: "Award points instantly",
    body: "Teachers reward behavior and homework in one tap.",
    color: BRAND.pink,
    start: 90,
    end: 165,
  },
  {
    emoji: "🎮",
    title: "Students stay motivated",
    body: "Kiosk login, coupons, and prizes they actually want.",
    color: BRAND.cyan,
    start: 165,
    end: 255,
  },
  {
    emoji: "📊",
    title: "Everything in sync",
    body: "Live balances and class rosters across every device.",
    color: BRAND.purple,
    start: 255,
    end: 345,
  },
] as const;

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

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const orbY = interpolate(frame, [0, TIMING.total], [height + 120, -320], {
    extrapolateRight: "clamp",
  });
  const orbX = interpolate(frame, [0, TIMING.total], [-280, 180], {
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

const IntroScene: React.FC = () => {
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
      <GlowOrb
        style={{
          top: "22%",
          left: "50%",
          width: 520,
          height: 520,
          marginLeft: -260,
          background:
            "radial-gradient(circle, rgba(127, 0, 255, 0.35) 0%, transparent 70%)",
        }}
      />
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
            background: `linear-gradient(135deg, ${BRAND.pink} 0%, ${BRAND.purple} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 0 40px rgba(255, 0, 127, 0.35)",
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
            lineHeight: 1.35,
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
          }}
        >
          Motivate. Reward. Elevate.
        </p>
        <div
          style={{
            width: 120,
            height: 6,
            margin: "44px auto 0",
            borderRadius: 3,
            background: `linear-gradient(90deg, ${BRAND.pink}, ${BRAND.purple})`,
            opacity: subtitleOpacity,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const DemoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const globalFrame = frame + TIMING.introEnd;

  const entrance = spring({
    fps,
    frame,
    config: { damping: 16, stiffness: 88 },
  });
  const cardY = interpolate(entrance, [0, 1], [360, 0]);
  const cardScale = interpolate(entrance, [0, 1], [0.82, 1]);
  const tiltX = interpolate(frame, [0, 300], [10, 4], {
    extrapolateRight: "clamp",
  });
  const tiltY = interpolate(frame, [0, 300], [-8, -3], {
    extrapolateRight: "clamp",
  });

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
          zIndex: 5,
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
          See it in action
        </span>
      </div>

      <div
        style={{
          width: 1008,
          height: 580,
          marginTop: 80,
          borderRadius: 28,
          border: "1px solid rgba(255, 255, 255, 0.12)",
          background: "#0c0a1a",
          overflow: "hidden",
          boxShadow:
            "0 40px 100px -15px rgba(0, 0, 0, 0.85), 0 0 50px rgba(127, 0, 255, 0.22)",
          transform: `scale(${cardScale}) translateY(${cardY}px) perspective(1400px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
          position: "relative",
          filter: "none",
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
            leveluprewards.app
          </div>
        </div>
        <Video
          src={staticFile("walkthrough-fast.mp4")}
          playbackRate={2.15}
          muted
          objectFit="cover"
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {FEATURES.map((feature) => {
        const localFrame = globalFrame - feature.start;
        const progress = spring({
          fps,
          frame: localFrame,
          config: { damping: 13, stiffness: 120 },
        });
        const opacity = interpolate(
          globalFrame,
          [feature.start, feature.start + 12, feature.end - 12, feature.end],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

        if (globalFrame < feature.start || globalFrame > feature.end) {
          return null;
        }

        return (
          <div
            key={feature.title}
            style={{
              position: "absolute",
              bottom: 200,
              width: 920,
              padding: "32px 40px",
              borderRadius: 28,
              background: "rgba(18, 17, 36, 0.88)",
              border: `1px solid ${feature.color}55`,
              boxShadow: "0 24px 50px rgba(0,0,0,0.45)",
              opacity,
              transform: `scale(${progress}) translateY(${interpolate(progress, [0, 1], [40, 0])}px)`,
              zIndex: 20,
              display: "flex",
              gap: 24,
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 56 }}>{feature.emoji}</span>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontFamily: outfit,
                  fontSize: 34,
                  fontWeight: 800,
                  color: feature.color,
                }}
              >
                {feature.title}
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
                {feature.body}
              </p>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const OutroScene: React.FC = () => {
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
            letterSpacing: -2,
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

export const ShortPromo: React.FC = () => {
  const { introEnd, demoEnd, total } = TIMING;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg, color: "white" }}>
      <Background />
      <Sequence durationInFrames={introEnd}>
        <IntroScene />
      </Sequence>
      <Sequence from={introEnd} durationInFrames={demoEnd - introEnd}>
        <DemoScene />
      </Sequence>
      <Sequence from={demoEnd} durationInFrames={total - demoEnd}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};
