import React from "react";
import {
  Easing,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CINEMATIC } from "./cinematicTheme";
import { jakarta, outfit } from "./shared";

// ─── Background ──────────────────────────────────────────────────────────────

export const CinematicBg: React.FC<{ totalFrames: number }> = ({
  totalFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const drift = interpolate(frame, [0, totalFrames], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <>
      {/* Base gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(145deg, ${CINEMATIC.navy} 0%, ${CINEMATIC.navyMid} 55%, ${CINEMATIC.navy} 100%)`,
        }}
      />
      {/* Gold top-left orb */}
      <div
        style={{
          position: "absolute",
          top: -80 + drift * 60,
          left: -120 + drift * 100,
          width: width * 0.5,
          height: height * 0.6,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(245,200,66,0.13) 0%, transparent 70%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />
      {/* Cyan bottom-right orb */}
      <div
        style={{
          position: "absolute",
          bottom: -60,
          right: -80 + drift * -40,
          width: width * 0.4,
          height: height * 0.5,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(76,201,240,0.12) 0%, transparent 70%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />
      {/* Subtle dot grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.025,
          backgroundImage: `radial-gradient(circle, rgba(245,200,66,0.9) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          pointerEvents: "none",
        }}
      />
    </>
  );
};

// ─── Cinematic LevelUp Logo (Remotion port of landing page SVG) ───────────────

const BAR_COUNT = 16;
const ARROW_PATH = "M 400 60 L 760 420 L 560 420 L 560 660 L 240 660 L 240 420 L 40 420 Z";

export const LevelUpLogoAnimated: React.FC<{
  startFrame?: number;
  size?: number;
  cream?: string;
}> = ({ startFrame = 0, size = 280, cream = "#f0e8c8" }) => {
  const frame = useCurrentFrame();
  const f = frame - startFrame; // local time

  const shaftLeft = 252, shaftRight = 548;
  const slot = (shaftRight - shaftLeft) / BAR_COUNT;

  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const barW = slot * 0.5;
    const x = shaftLeft + i * slot + (slot - barW) / 2;
    const tall = Math.sin((i / (BAR_COUNT - 1)) * Math.PI);
    const h = 130 + tall * 340;
    const y = 650 - h;
    const riseStart = Math.round((0.45 + i * 0.06) * 30); // delay in frames
    const scaleY = interpolate(f, [riseStart, riseStart + 33], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
    const opacity = interpolate(f, [riseStart, riseStart + 10], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });
    return { x, y, h, barW, scaleY, opacity, key: i };
  });

  // Arrow stroke draw (pathLength=1, dashoffset 1→0)
  const arrowDraw = interpolate(f, [3, 66], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const arrowFill = interpolate(f, [6, 18], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  // Wordmark slide-up
  const wordmarkY = interpolate(f, [54, 78], [28, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const wordmarkOpacity = interpolate(f, [54, 78], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const lineScale = interpolate(f, [66, 90], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const subOpacity = interpolate(f, [78, 96], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  // Floating bob
  const bob = Math.sin(f * 0.05) * 6;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, transform: `translateY(${bob}px)` }}>
      {/* Glow halo */}
      <div style={{ position: "absolute", width: size * 1.8, height: size * 1.8, borderRadius: "50%", background: "radial-gradient(circle, rgba(76,201,240,0.22) 0%, transparent 65%)", filter: "blur(40px)", pointerEvents: "none" }} />
      <svg viewBox="0 0 800 720" width={size} height={size * 0.9} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="luc-bar-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={cream} stopOpacity={0.35} />
            <stop offset="60%" stopColor={cream} stopOpacity={0.95} />
            <stop offset="100%" stopColor={cream} stopOpacity={1} />
          </linearGradient>
          <linearGradient id="luc-stroke-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#c9a830" />
            <stop offset="100%" stopColor={cream} />
          </linearGradient>
          <clipPath id="luc-arrow-clip">
            <path d={ARROW_PATH} />
          </clipPath>
          <filter id="luc-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Arrow fill */}
        <path d={ARROW_PATH} fill="rgba(15,32,64,0.9)" opacity={arrowFill} />
        {/* Bars inside arrow */}
        <g clipPath="url(#luc-arrow-clip)">
          {bars.map((b) => (
            <rect
              key={b.key}
              x={b.x}
              y={b.y + b.h * (1 - b.scaleY)}
              width={b.barW}
              height={b.h * b.scaleY}
              rx={2}
              fill="url(#luc-bar-grad)"
              opacity={b.opacity}
            />
          ))}
        </g>
        {/* Arrow outline draw */}
        <path
          d={ARROW_PATH}
          pathLength={1}
          fill="none"
          stroke="url(#luc-stroke-grad)"
          strokeWidth={8}
          strokeLinejoin="round"
          strokeLinecap="round"
          filter="url(#luc-soft-glow)"
          strokeDasharray={1}
          strokeDashoffset={arrowDraw}
          opacity={1 - arrowDraw * 0.3}
        />
      </svg>
      {/* Wordmark */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, overflow: "hidden", paddingBottom: 4 }}>
        <div style={{ fontFamily: outfit, fontSize: size * 0.13, fontWeight: 900, letterSpacing: "0.32em", paddingLeft: "0.32em", color: cream, transform: `translateY(${wordmarkY}px)`, opacity: wordmarkOpacity }}>
          LEVEL UP
        </div>
        <div style={{ height: 1, width: size, background: cream, opacity: 0.35 * lineScale, transform: `scaleX(${lineScale})`, transformOrigin: "center" }} />
        <div style={{ fontFamily: outfit, fontSize: size * 0.048, letterSpacing: "0.5em", paddingLeft: "0.5em", color: cream, opacity: subOpacity * 0.6 }}>
          School rewards system
        </div>
      </div>
    </div>
  );
};

// ─── XP Progress Bar ──────────────────────────────────────────────────────────

export const XPBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div
    style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 5,
      background: "rgba(255,255,255,0.06)",
      zIndex: 100,
    }}
  >
    <div
      style={{
        width: `${Math.min(progress, 1) * 100}%`,
        height: "100%",
        background: `linear-gradient(90deg, ${CINEMATIC.gold}, ${CINEMATIC.cyan})`,
        boxShadow: `0 0 16px ${CINEMATIC.gold}99`,
      }}
    />
  </div>
);

// ─── Sparkles ─────────────────────────────────────────────────────────────────

export const GoldSparkles: React.FC<{ count?: number; seed?: string }> = ({
  count = 14,
  seed = "gold",
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const x = random(`${seed}-x-${i}`) * width;
        const y = random(`${seed}-y-${i}`) * height;
        const size = 1.5 + random(`${seed}-s-${i}`) * 3;
        const twinkle = Math.sin(frame * 0.18 + i * 1.8) * 0.5 + 0.5;
        const color =
          i % 3 === 0 ? CINEMATIC.gold : i % 3 === 1 ? CINEMATIC.cyan : CINEMATIC.offWhite;
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
              background: color,
              opacity: twinkle * 0.55,
              boxShadow: `0 0 ${size * 4}px ${color}`,
            }}
          />
        );
      })}
    </>
  );
};

// ─── Achievement Badge ────────────────────────────────────────────────────────

export const AchievementBadge: React.FC<{
  emoji: string;
  title: string;
  xp: number;
  startFrame: number;
  endFrame?: number;
  color?: string;
}> = ({
  emoji,
  title,
  xp,
  startFrame,
  endFrame,
  color = CINEMATIC.gold,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < startFrame) return null;
  if (endFrame !== undefined && frame >= endFrame) return null;

  const enter = spring({
    fps,
    frame: frame - startFrame,
    config: { damping: 12, stiffness: 200 },
  });

  const exitOpacity =
    endFrame !== undefined
      ? interpolate(frame, [endFrame - 18, endFrame], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;

  const xpVal = Math.round(
    interpolate(frame, [startFrame, startFrame + 50], [0, xp], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    })
  );

  const shimmer = 1 + Math.sin(frame * 0.25) * 0.025;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 72,
        right: 72,
        transform: `translateY(${interpolate(enter, [0, 1], [100, 0])}px) scale(${enter * shimmer})`,
        opacity: enter * exitOpacity,
        zIndex: 60,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          background: `linear-gradient(135deg, ${CINEMATIC.navyMid}, ${CINEMATIC.navyLight})`,
          border: `2px solid ${color}`,
          borderRadius: 22,
          padding: "20px 32px",
          boxShadow: `0 0 48px ${color}55, 0 24px 48px rgba(0,0,0,0.55)`,
          minWidth: 360,
        }}
      >
        <span style={{ fontSize: 50, lineHeight: 1 }}>{emoji}</span>
        <div>
          <div
            style={{
              fontFamily: outfit,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 3.5,
              textTransform: "uppercase",
              color,
              marginBottom: 5,
            }}
          >
            Achievement Unlocked
          </div>
          <div
            style={{
              fontFamily: outfit,
              fontSize: 22,
              fontWeight: 800,
              color: CINEMATIC.offWhite,
              lineHeight: 1.1,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontFamily: jakarta,
              fontSize: 14,
              color: CINEMATIC.textMuted,
              marginTop: 4,
            }}
          >
            +{xpVal} XP earned
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Stat Counter ─────────────────────────────────────────────────────────────

export const StatCounter: React.FC<{
  to: number;
  from?: number;
  suffix?: string;
  prefix?: string;
  startFrame: number;
  duration?: number;
  style?: React.CSSProperties;
}> = ({
  to,
  from = 0,
  suffix = "",
  prefix = "",
  startFrame,
  duration = 70,
  style,
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );
  const value = Math.round(from + (to - from) * progress);
  return (
    <span style={style}>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
};

// ─── Letter Reveal ────────────────────────────────────────────────────────────

export const LetterReveal: React.FC<{
  text: string;
  startFrame: number;
  stagger?: number;
  style?: React.CSSProperties;
  charStyle?: React.CSSProperties;
}> = ({ text, startFrame, stagger = 2, style, charStyle }) => {
  const frame = useCurrentFrame();

  return (
    <span style={{ display: "inline-block", ...style }}>
      {text.split("").map((char, i) => {
        const cf = frame - startFrame - i * stagger;
        const opacity = interpolate(cf, [0, 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const y = interpolate(cf, [0, 10], [16, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity,
              transform: `translateY(${y}px)`,
              ...charStyle,
            }}
          >
            {char === " " ? "\u00a0" : char}
          </span>
        );
      })}
    </span>
  );
};

// ─── Browser Mockup ───────────────────────────────────────────────────────────

export const BrowserMockup: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div
    style={{
      borderRadius: 20,
      border: `1px solid ${CINEMATIC.gold}33`,
      background: CINEMATIC.navyMid,
      overflow: "hidden",
      boxShadow: `0 48px 120px -20px rgba(0,0,0,0.85), 0 0 80px rgba(245,200,66,0.12)`,
      display: "flex",
      flexDirection: "column",
      ...style,
    }}
  >
    {/* Chrome bar */}
    <div
      style={{
        height: 42,
        background: CINEMATIC.navy,
        borderBottom: `1px solid ${CINEMATIC.gold}1a`,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 8,
        flexShrink: 0,
      }}
    >
      {["#ff5f56", "#ffbd2e", "#27c93f"].map((c) => (
        <div
          key={c}
          style={{ width: 11, height: 11, borderRadius: "50%", background: c }}
        />
      ))}
      <div
        style={{
          flex: 1,
          marginLeft: 10,
          textAlign: "center",
          fontFamily: jakarta,
          fontSize: 13,
          color: CINEMATIC.textMuted,
          background: "rgba(0,0,0,0.35)",
          borderRadius: 8,
          padding: "4px 0",
        }}
      >
        portal.leveluprewards.app
      </div>
    </div>
    <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
  </div>
);

// ─── Floating Prize Card ──────────────────────────────────────────────────────

export const FloatingPrizeCard: React.FC<{
  emoji: string;
  label: string;
  points: number;
  startFrame: number;
  offsetX?: number;
  offsetY?: number;
  seed?: string;
  color?: string;
}> = ({
  emoji,
  label,
  points,
  startFrame,
  offsetX = 0,
  offsetY = 0,
  seed = "card",
  color = CINEMATIC.gold,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < startFrame) return null;

  const enter = spring({
    fps,
    frame: frame - startFrame,
    config: { damping: 13, stiffness: 160 },
  });

  const floatY = Math.sin(frame * 0.06 + random(seed) * 6) * 8;
  const floatX = Math.cos(frame * 0.04 + random(seed) * 4) * 5;

  return (
    <div
      style={{
        position: "absolute",
        left: `calc(50% + ${offsetX}px)`,
        top: `calc(50% + ${offsetY}px)`,
        transform: `translate(-50%, -50%) translateY(${floatY + interpolate(enter, [0, 1], [60, 0])}px) translateX(${floatX}px) scale(${enter})`,
        opacity: enter,
        zIndex: 20,
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg, ${CINEMATIC.navyMid}, ${CINEMATIC.navyLight})`,
          border: `2px solid ${color}55`,
          borderRadius: 18,
          padding: "20px 28px",
          boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 30px ${color}33`,
          display: "flex",
          alignItems: "center",
          gap: 14,
          minWidth: 220,
        }}
      >
        <span style={{ fontSize: 40 }}>{emoji}</span>
        <div>
          <div
            style={{
              fontFamily: outfit,
              fontSize: 18,
              fontWeight: 800,
              color: CINEMATIC.offWhite,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontFamily: jakarta,
              fontSize: 14,
              color,
              marginTop: 2,
              fontWeight: 600,
            }}
          >
            {points} pts
          </div>
        </div>
      </div>
    </div>
  );
};


