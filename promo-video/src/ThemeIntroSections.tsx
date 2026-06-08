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
import { jakarta, outfit } from "./promo/shared";

export const THEME_INTRO_DURATION = 180;

export type ThemeIntroId =
  | "arcade"
  | "broadcast"
  | "district"
  | "sports"
  | "yearbook"
  | "comic"
  | "gamify";

type ThemeIntroConfig = {
  id: ThemeIntroId;
  compositionId: string;
  title: string;
  eyebrow: string;
  tagline: string;
  badge: string;
  bg: string;
  primary: string;
  secondary: string;
  accent: string;
  ink: string;
  muted: string;
  panel: string;
  chrome: string;
  mode:
    | "arcade"
    | "broadcast"
    | "district"
    | "sports"
    | "yearbook"
    | "comic"
    | "gamify";
};

export const THEME_INTROS: ThemeIntroConfig[] = [
  {
    id: "arcade",
    compositionId: "ThemeIntroArcadeCabinet",
    title: "LevelUp",
    eyebrow: "Reward mode",
    tagline: "Scan in. Earn points. Unlock the next win.",
    badge: "+50 XP unlocked",
    bg: "linear-gradient(135deg, #100720 0%, #07152b 56%, #1a1228 100%)",
    primary: "#22d3ee",
    secondary: "#fbbf24",
    accent: "#fb7185",
    ink: "#f8fafc",
    muted: "#bae6fd",
    panel: "#0f172a",
    chrome: "#1f1b44",
    mode: "arcade",
  },
  {
    id: "broadcast",
    compositionId: "ThemeIntroMorningAnnouncements",
    title: "LevelUp Live",
    eyebrow: "Morning announcements",
    tagline: "Today's wins, rewards, and shout-outs are on air.",
    badge: "Live reward update",
    bg: "linear-gradient(135deg, #111827 0%, #172554 54%, #7f1d1d 100%)",
    primary: "#f8fafc",
    secondary: "#dc2626",
    accent: "#60a5fa",
    ink: "#f8fafc",
    muted: "#dbeafe",
    panel: "#f8fafc",
    chrome: "#111827",
    mode: "broadcast",
  },
  {
    id: "district",
    compositionId: "ThemeIntroCleanDistrictPitch",
    title: "LevelUp",
    eyebrow: "District ready",
    tagline: "A calm, clear rewards platform for every campus.",
    badge: "Audit-friendly",
    bg: "linear-gradient(135deg, #eef7f5 0%, #f8fafc 54%, #e0f2fe 100%)",
    primary: "#0f766e",
    secondary: "#2563eb",
    accent: "#16a34a",
    ink: "#0f172a",
    muted: "#475569",
    panel: "#ffffff",
    chrome: "#e2e8f0",
    mode: "district",
  },
  {
    id: "sports",
    compositionId: "ThemeIntroChampionshipSports",
    title: "LevelUp",
    eyebrow: "Championship rewards",
    tagline: "House points, streaks, and wins with scoreboard energy.",
    badge: "House points +120",
    bg: "linear-gradient(135deg, #064e3b 0%, #052e16 52%, #111827 100%)",
    primary: "#bef264",
    secondary: "#facc15",
    accent: "#38bdf8",
    ink: "#f8fafc",
    muted: "#d9f99d",
    panel: "#06281d",
    chrome: "#111827",
    mode: "sports",
  },
  {
    id: "yearbook",
    compositionId: "ThemeIntroYearbookMemories",
    title: "LevelUp",
    eyebrow: "Yearbook memories",
    tagline: "Small moments from the school day, saved as big wins.",
    badge: "Today's win",
    bg: "linear-gradient(135deg, #1f2937 0%, #334155 60%, #78350f 100%)",
    primary: "#fed7aa",
    secondary: "#fbbf24",
    accent: "#93c5fd",
    ink: "#fff7ed",
    muted: "#ffedd5",
    panel: "#fff7ed",
    chrome: "#d6b48c",
    mode: "yearbook",
  },
  {
    id: "comic",
    compositionId: "ThemeIntroComicBookRewards",
    title: "LevelUp",
    eyebrow: "Comic book rewards",
    tagline: "Bold wins, big panels, and reward moments that pop.",
    badge: "Pow! redeemed",
    bg: "linear-gradient(135deg, #991b1b 0%, #1d4ed8 56%, #111827 100%)",
    primary: "#facc15",
    secondary: "#f8fafc",
    accent: "#ef4444",
    ink: "#fefce8",
    muted: "#fef3c7",
    panel: "#fefce8",
    chrome: "#0f172a",
    mode: "comic",
  },
  {
    id: "gamify",
    compositionId: "ThemeIntroGamify",
    title: "LevelUp",
    eyebrow: "Gamify every day",
    tagline: "Quests, streaks, badges, and rewards that make progress visible.",
    badge: "Daily quest complete",
    bg: "linear-gradient(135deg, #101828 0%, #102a43 44%, #14532d 100%)",
    primary: "#34d399",
    secondary: "#fbbf24",
    accent: "#60a5fa",
    ink: "#ecfeff",
    muted: "#bbf7d0",
    panel: "#082f2a",
    chrome: "#0f172a",
    mode: "gamify",
  },
];

const getIntro = (id: ThemeIntroId): ThemeIntroConfig =>
  THEME_INTROS.find((intro) => intro.id === id) ?? THEME_INTROS[0];

const BackgroundTexture: React.FC<{ config: ThemeIntroConfig }> = ({
  config,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const drift = interpolate(frame, [0, THEME_INTRO_DURATION], [0, 1], {
    extrapolateRight: "clamp",
  });

  if (config.mode === "district") {
    return (
      <>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: config.bg,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -120 + drift * 60,
            top: -180,
            width: 560,
            height: 560,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(20, 184, 166, 0.2), transparent 68%)",
          }}
        />
      </>
    );
  }

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: config.bg,
        }}
      />
      {config.mode === "arcade" ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.2,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)",
            backgroundSize: "100% 7px",
          }}
        />
      ) : null}
      {config.mode === "broadcast" ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.18,
            backgroundImage:
              "linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "72px 100%",
          }}
        />
      ) : null}
      {config.mode === "sports" ? (
        <div
          style={{
            position: "absolute",
            inset: 48,
            border: "3px solid rgba(255,255,255,0.18)",
            borderRadius: 18,
          }}
        />
      ) : null}
      {config.mode === "yearbook" ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.16,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.45) 1px, transparent 1px)",
            backgroundSize: "34px 34px",
          }}
        />
      ) : null}
      {config.mode === "comic" ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.22) 1px, transparent 1px)",
            backgroundSize: "13px 13px",
          }}
        />
      ) : null}
      {config.mode === "gamify" ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.18,
            backgroundImage:
              "linear-gradient(120deg, rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(60deg, rgba(52,211,153,0.38) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: -160 + drift * 120,
          top: -120,
          width: width * 0.48,
          height: height * 0.72,
          borderRadius: "50%",
          filter: "blur(90px)",
          background: config.primary,
          opacity: config.mode === "comic" ? 0.12 : 0.18,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -180,
          bottom: -160 + drift * 80,
          width: width * 0.42,
          height: height * 0.58,
          borderRadius: "50%",
          filter: "blur(90px)",
          background: config.accent,
          opacity: 0.18,
        }}
      />
    </>
  );
};

const MiniPortal: React.FC<{ config: ThemeIntroConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    fps,
    frame: frame - 18,
    config: { damping: 15, stiffness: 90 },
  });
  const y = interpolate(enter, [0, 1], [80, 0]);
  const rotate =
    config.mode === "yearbook"
      ? -2
      : config.mode === "comic"
        ? -1
        : config.mode === "sports" || config.mode === "gamify"
          ? 0
          : -3;

  return (
    <div
      style={{
        position: "absolute",
        right: 92,
        bottom: 86,
        width: 850,
        height: 510,
        borderRadius: config.mode === "comic" ? 0 : config.mode === "gamify" ? 26 : 18,
        overflow: "hidden",
        background: config.panel,
        border:
          config.mode === "comic"
            ? "6px solid #0f172a"
            : `1px solid ${config.ink}22`,
        boxShadow:
          config.mode === "district"
            ? "0 28px 80px rgba(15, 23, 42, 0.16)"
            : `0 36px 100px rgba(0,0,0,0.44), 0 0 70px ${config.primary}44`,
        transform: `translateY(${y}px) scale(${0.9 + enter * 0.1}) rotate(${rotate}deg)`,
        opacity: enter,
      }}
    >
      <div
        style={{
          height: 46,
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "0 18px",
          background:
            config.mode === "district"
              ? "#e2e8f0"
              : `linear-gradient(90deg, ${config.chrome}, ${config.primary}44)`,
        }}
      >
        {["#ef4444", "#f59e0b", "#22c55e"].map((color) => (
          <div
            key={color}
            style={{
              width: 12,
              height: 12,
              borderRadius: 99,
              background: color,
            }}
          />
        ))}
        <div
          style={{
            flex: 1,
            marginLeft: 14,
            height: 24,
            borderRadius: 8,
            background:
              config.mode === "district"
                ? "rgba(255,255,255,0.78)"
                : "rgba(0,0,0,0.35)",
            color: config.mode === "district" ? "#64748b" : config.muted,
            fontFamily: jakarta,
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          portal.leveluprewards.app
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "138px 1fr",
          height: "calc(100% - 46px)",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            padding: 18,
            background:
              config.mode === "district"
                ? "#f1f5f9"
            : config.mode === "yearbook"
                  ? "#f5e6d3"
                  : config.mode === "gamify"
                    ? "#0b1f1d"
                    : "#111827",
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                height: 13,
                width: i === 0 ? 74 : 92,
                marginBottom: 16,
                borderRadius: 99,
                background:
                  i === 0 ? config.primary : `${config.mode === "district" ? "#cbd5e1" : "#ffffff33"}`,
              }}
            />
          ))}
        </div>
        <div style={{ padding: 28 }}>
          <div
            style={{
              width: 280,
              height: 22,
              borderRadius: 99,
              background: config.mode === "district" ? "#0f172a" : config.primary,
              marginBottom: 24,
            }}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
              marginBottom: 18,
            }}
          >
            {[config.primary, config.secondary, config.accent].map((color) => (
              <div
                key={color}
                style={{
                  height: 132,
                  borderRadius: config.mode === "comic" ? 0 : 14,
                  background: `linear-gradient(135deg, ${color}, ${color}88)`,
                  border:
                    config.mode === "comic"
                      ? "4px solid #0f172a"
                      : config.mode === "gamify"
                        ? "2px solid rgba(236, 254, 255, 0.18)"
                        : "1px solid rgba(15,23,42,0.1)",
                }}
              />
            ))}
          </div>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 12,
                width: `${82 - i * 16}%`,
                marginBottom: 11,
                borderRadius: 99,
                background: config.mode === "district" ? "#cbd5e1" : "#dbeafe",
                opacity: 0.9 - i * 0.16,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const FloatingBits: React.FC<{ config: ThemeIntroConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const count =
    config.mode === "district" ? 8 : config.mode === "comic" ? 22 : config.mode === "gamify" ? 26 : 16;

  return (
    <>
      {new Array(count).fill(0).map((_, i) => {
        const x = random(`${config.id}-x-${i}`) * width;
        const y = random(`${config.id}-y-${i}`) * height;
        const sway = Math.sin(frame * 0.04 + i) * 12;
        const size = 4 + random(`${config.id}-s-${i}`) * 18;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + sway,
              top: y,
              width:
                config.mode === "comic" || config.mode === "sports"
                  ? size * 2
                  : config.mode === "gamify"
                    ? size * 1.6
                  : size,
              height: size,
              borderRadius:
                config.mode === "comic"
                  ? 0
                  : config.mode === "gamify"
                    ? 6
                  : config.mode === "broadcast"
                    ? 2
                    : 99,
              background: i % 3 === 0 ? config.primary : i % 3 === 1 ? config.secondary : config.accent,
              opacity: 0.16 + random(`${config.id}-o-${i}`) * 0.32,
              transform: `rotate(${i * 17 + frame * 0.2}deg)`,
            }}
          />
        );
      })}
    </>
  );
};

const ThemeHeadline: React.FC<{ config: ThemeIntroConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = spring({
    fps,
    frame: frame - 8,
    config: { damping: 14, stiffness: 110 },
  });
  const fade = interpolate(frame, [12, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const badgeX = interpolate(frame, [34, 64], [-80, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 96,
        top: 108,
        width: 730,
        zIndex: 5,
        color: config.ink,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          padding:
            config.mode === "comic" ? "10px 16px 8px" : "10px 18px",
          borderRadius: config.mode === "comic" ? 0 : 999,
          background:
            config.mode === "district"
              ? "#ffffff"
              : config.mode === "comic"
                ? config.primary
                : `${config.primary}22`,
          border:
            config.mode === "comic"
              ? "4px solid #0f172a"
              : `1px solid ${config.primary}66`,
          boxShadow:
            config.mode === "comic"
              ? "8px 8px 0 #0f172a"
              : "0 18px 40px rgba(0,0,0,0.18)",
          transform: `translateX(${badgeX}px)`,
          opacity: fade,
          color: config.mode === "comic" ? "#111827" : config.ink,
          fontFamily: outfit,
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: config.mode === "district" ? 1 : 3,
          textTransform: "uppercase",
        }}
      >
        {config.eyebrow}
      </div>
      <h1
        style={{
          margin: "34px 0 0",
          fontFamily: outfit,
          fontSize:
            config.mode === "broadcast" ? 104 : config.mode === "comic" ? 112 : 122,
          lineHeight: 0.92,
          letterSpacing: 0,
          color: config.ink,
          textShadow:
            config.mode === "comic"
              ? "8px 8px 0 #0f172a"
              : config.mode === "arcade" || config.mode === "gamify"
                ? `0 0 36px ${config.primary}88`
                : "none",
          transform: `scale(${0.86 + title * 0.14})`,
          transformOrigin: "left center",
        }}
      >
        {config.title}
      </h1>
      <div
        style={{
          width: 430,
          height: config.mode === "comic" ? 10 : config.mode === "gamify" ? 8 : 5,
          borderRadius: 99,
          marginTop: 28,
          background: `linear-gradient(90deg, ${config.primary}, ${config.secondary}, ${config.accent})`,
          opacity: fade,
        }}
      />
      <p
        style={{
          margin: "28px 0 0",
          maxWidth: 610,
          fontFamily: jakarta,
          fontSize: 34,
          lineHeight: 1.22,
          fontWeight: 700,
          color: config.muted,
          opacity: fade,
        }}
      >
        {config.tagline}
      </p>
    </div>
  );
};

const ThemeBadge: React.FC<{ config: ThemeIntroConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({
    fps,
    frame: frame - 58,
    config: { damping: 11, stiffness: 160 },
  });

  return (
    <div
      style={{
        position: "absolute",
        right: 132,
        top: 112,
        zIndex: 7,
        padding: config.mode === "broadcast" ? "18px 28px" : "20px 32px",
        borderRadius:
          config.mode === "comic" ? 0 : config.mode === "broadcast" ? 4 : 999,
        background:
          config.mode === "broadcast"
            ? config.secondary
            : `linear-gradient(90deg, ${config.primary}, ${config.secondary})`,
        border:
          config.mode === "comic" ? "5px solid #0f172a" : "1px solid #ffffff44",
        boxShadow:
          config.mode === "comic"
            ? "9px 9px 0 #0f172a"
            : "0 18px 46px rgba(0,0,0,0.28)",
        transform: `scale(${pop}) rotate(${config.mode === "comic" ? 3 : 0}deg)`,
        opacity: pop,
        color:
          config.mode === "district" || config.mode === "comic"
            ? "#0f172a"
            : "#ffffff",
        fontFamily: outfit,
        fontSize: 24,
        fontWeight: 800,
        letterSpacing: 1,
        textTransform: "uppercase",
      }}
    >
      {config.badge}
    </div>
  );
};

const ArcadeIntro: React.FC<{ config: ThemeIntroConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cabinet = spring({ fps, frame: frame - 8, config: { damping: 13 } });
  const score = Math.round(
    interpolate(frame, [20, 92], [0, 12500], { extrapolateRight: "clamp" }),
  );
  const scan = interpolate(frame % 48, [0, 48], [-80, 1080]);

  return (
    <AbsoluteFill style={{ background: "#07081f", overflow: "hidden" }}>
      <BackgroundTexture config={config} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.18,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px)",
          backgroundSize: "100% 6px",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 78,
          top: 70,
          fontFamily: outfit,
          fontSize: 28,
          color: config.secondary,
          fontWeight: 800,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        High score {score.toLocaleString("en-US")}
      </div>
      <div
        style={{
          position: "absolute",
          left: 72,
          top: 160,
          width: 570,
          color: config.ink,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: outfit,
            fontSize: 122,
            lineHeight: 0.86,
            textShadow: `0 0 34px ${config.primary}`,
          }}
        >
          LevelUp
        </h1>
        <p
          style={{
            margin: "28px 0 0",
            fontFamily: jakarta,
            fontSize: 34,
            fontWeight: 800,
            color: config.muted,
            lineHeight: 1.2,
          }}
        >
          Scan. Earn. Redeem. Repeat.
        </p>
      </div>
      <div
        style={{
          position: "absolute",
          right: 100,
          top: 92,
          width: 720,
          height: 820,
          borderRadius: 34,
          padding: 38,
          background: "linear-gradient(180deg, #2d1b69, #0f172a 72%)",
          border: `8px solid ${config.primary}`,
          boxShadow: `0 0 80px ${config.primary}88`,
          transform: `translateY(${interpolate(cabinet, [0, 1], [100, 0])}px) rotate(${interpolate(cabinet, [0, 1], [-5, 0])}deg)`,
        }}
      >
        <div
          style={{
            height: 420,
            borderRadius: 18,
            background: "#020617",
            border: "5px solid #111827",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: scan,
              left: 0,
              right: 0,
              height: 70,
              background: `linear-gradient(180deg, transparent, ${config.primary}55, transparent)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 42,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 18,
            }}
          >
            {["Kiosk", "Prizes", "Badges", "Raffle"].map((label, i) => (
              <div
                key={label}
                style={{
                  borderRadius: 12,
                  background:
                    i % 2 === 0
                      ? `linear-gradient(135deg, ${config.primary}, #0ea5e9)`
                      : `linear-gradient(135deg, ${config.secondary}, ${config.accent})`,
                  color: "#03111f",
                  fontFamily: outfit,
                  fontSize: 28,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            marginTop: 42,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              width: 170,
              height: 170,
              borderRadius: "50%",
              background: config.secondary,
              boxShadow: `0 0 44px ${config.secondary}`,
            }}
          />
          <div
            style={{
              width: 280,
              height: 32,
              borderRadius: 999,
              background: "#020617",
              border: "4px solid #475569",
            }}
          />
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: config.accent,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const BroadcastIntro: React.FC<{ config: ThemeIntroConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const wipe = interpolate(frame, [10, 42], [-1920, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const ticker = interpolate(frame, [0, THEME_INTRO_DURATION], [1920, -900]);

  return (
    <AbsoluteFill style={{ background: "#0f172a", overflow: "hidden" }}>
      <BackgroundTexture config={config} />
      <div
        style={{
          position: "absolute",
          inset: "58px 70px 190px",
          border: "2px solid rgba(255,255,255,0.28)",
          background: "linear-gradient(135deg, rgba(15,23,42,0.86), rgba(30,64,175,0.5))",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 112,
          top: 104,
          width: 1120,
          height: 620,
          background: "#111827",
          border: "10px solid #e5e7eb",
          boxShadow: "0 40px 110px rgba(0,0,0,0.48)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, #1e3a8a, #111827 55%, #7f1d1d)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 70,
            bottom: 70,
            fontFamily: outfit,
            fontSize: 92,
            lineHeight: 0.95,
            fontWeight: 800,
            color: config.ink,
          }}
        >
          LevelUp
          <br />
          Live
        </div>
        <div
          style={{
            position: "absolute",
            right: 50,
            top: 46,
            padding: "12px 24px",
            background: config.secondary,
            color: "#fff",
            fontFamily: outfit,
            fontSize: 24,
            fontWeight: 800,
          }}
        >
          ON AIR
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: wipe,
          right: 0,
          bottom: 130,
          height: 120,
          background: config.secondary,
          color: "white",
          display: "flex",
          alignItems: "center",
          paddingLeft: 110,
          fontFamily: outfit,
          fontSize: 46,
          fontWeight: 800,
          textTransform: "uppercase",
        }}
      >
        Live reward update
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 58,
          height: 52,
          background: "#020617",
          overflow: "hidden",
          color: "#dbeafe",
          fontFamily: jakarta,
          fontSize: 24,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ transform: `translateX(${ticker}px)`, whiteSpace: "nowrap" }}>
          Kiosk check-ins live now  •  Prize shop open  •  New student badges unlocked  •  Teacher shout-outs rolling
        </div>
      </div>
    </AbsoluteFill>
  );
};

const DistrictIntro: React.FC<{ config: ThemeIntroConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const slide = spring({ fps: 30, frame: frame - 12, config: { damping: 16 } });
  const bar = interpolate(frame, [34, 100], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#f8fafc", overflow: "hidden" }}>
      <BackgroundTexture config={config} />
      <div
        style={{
          position: "absolute",
          left: 86,
          top: 86,
          right: 86,
          bottom: 86,
          borderRadius: 34,
          background: "rgba(255,255,255,0.82)",
          boxShadow: "0 28px 100px rgba(15,23,42,0.12)",
          display: "grid",
          gridTemplateColumns: "0.9fr 1.25fr",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "74px 62px", color: config.ink }}>
          <p
            style={{
              margin: 0,
              fontFamily: outfit,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: config.primary,
            }}
          >
            District readiness brief
          </p>
          <h1
            style={{
              margin: "24px 0 0",
              fontFamily: outfit,
              fontSize: 84,
              lineHeight: 0.96,
              color: "#0f172a",
            }}
          >
            LevelUp
            <br />
            for every campus
          </h1>
          <p
            style={{
              margin: "28px 0 0",
              fontFamily: jakarta,
              fontSize: 27,
              lineHeight: 1.35,
              fontWeight: 700,
              color: config.muted,
            }}
          >
            A quiet, reliable rollout story for administrators, teachers, and front office teams.
          </p>
        </div>
        <div
          style={{
            padding: 58,
            background: "#eef7f5",
            transform: `translateX(${interpolate(slide, [0, 1], [110, 0])}px)`,
          }}
        >
          {[
            ["Schools synced", "12", config.primary],
            ["Staff workflows", "4", config.secondary],
            ["Student touchpoints", "Live", config.accent],
          ].map(([label, value, color], i) => (
            <div
              key={label}
              style={{
                height: 142,
                marginBottom: 24,
                borderRadius: 20,
                background: "#fff",
                padding: 28,
                boxShadow: "0 16px 40px rgba(15,23,42,0.08)",
                border: "1px solid rgba(15,23,42,0.08)",
              }}
            >
              <div
                style={{
                  fontFamily: jakarta,
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#334155",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  marginTop: 12,
                  fontFamily: outfit,
                  fontSize: 44,
                  fontWeight: 800,
                  color,
                }}
              >
                {value}
              </div>
              <div
                style={{
                  marginTop: 12,
                  height: 8,
                  width: `${(0.42 + i * 0.18) * bar * 100}%`,
                  borderRadius: 99,
                  background: color,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SportsIntro: React.FC<{ config: ThemeIntroConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const clock = Math.max(0, 6 - Math.floor(frame / 30));
  const home = Math.round(interpolate(frame, [0, 120], [0, 120], { extrapolateRight: "clamp" }));
  const away = Math.round(interpolate(frame, [0, 120], [0, 96], { extrapolateRight: "clamp" }));

  return (
    <AbsoluteFill style={{ background: "#052e16", overflow: "hidden" }}>
      <BackgroundTexture config={config} />
      <div
        style={{
          position: "absolute",
          inset: 54,
          border: "4px solid rgba(255,255,255,0.22)",
          borderRadius: 24,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 160,
          right: 160,
          top: 116,
          height: 520,
          borderRadius: 26,
          background: "#020617",
          border: `8px solid ${config.primary}`,
          boxShadow: "0 32px 90px rgba(0,0,0,0.5)",
          display: "grid",
          gridTemplateColumns: "1fr 360px 1fr",
          alignItems: "center",
          padding: 42,
          color: config.ink,
        }}
      >
        {[
          ["HOUSE", home],
          ["GRADE", away],
        ].map(([label, value]) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: outfit,
                fontSize: 34,
                color: config.primary,
                letterSpacing: 5,
                fontWeight: 800,
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontFamily: outfit,
                fontSize: 148,
                lineHeight: 1,
                fontWeight: 800,
                color: config.secondary,
              }}
            >
              {value}
            </div>
          </div>
        ))}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: outfit, fontSize: 118, color: "#fff", fontWeight: 800 }}>
            0:{String(clock).padStart(2, "0")}
          </div>
          <div
            style={{
              margin: "20px auto 0",
              width: 260,
              padding: "18px 0",
              borderRadius: 999,
              background: config.primary,
              color: "#052e16",
              fontFamily: outfit,
              fontSize: 28,
              fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            LevelUp
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 210,
          bottom: 170,
          fontFamily: jakarta,
          fontSize: 42,
          color: config.muted,
          fontWeight: 800,
        }}
      >
        Reward streaks become a school-wide scoreboard.
      </div>
    </AbsoluteFill>
  );
};

const YearbookIntro: React.FC<{ config: ThemeIntroConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const spread = spring({ fps: 30, frame: frame - 10, config: { damping: 14 } });

  return (
    <AbsoluteFill style={{ background: "#293548", overflow: "hidden" }}>
      <BackgroundTexture config={config} />
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 80,
          right: 120,
          bottom: 80,
          borderRadius: 18,
          background: "#f7ead7",
          boxShadow: "0 40px 100px rgba(0,0,0,0.35)",
          padding: 58,
          color: "#451a03",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 44,
          transform: `scale(${0.94 + spread * 0.06})`,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: outfit,
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#92400e",
            }}
          >
            Yearbook memories
          </div>
          <h1
            style={{
              margin: "32px 0 0",
              fontFamily: outfit,
              fontSize: 92,
              lineHeight: 0.95,
            }}
          >
            Wins worth
            <br />
            remembering
          </h1>
          <p
            style={{
              margin: "28px 0 0",
              fontFamily: jakarta,
              fontSize: 30,
              lineHeight: 1.32,
              fontWeight: 700,
              color: "#78350f",
            }}
          >
            Turn little moments from the school day into pages students can feel proud of.
          </p>
        </div>
        <div style={{ position: "relative" }}>
          {[
            ["Kiosk scan", -6, 10, 20],
            ["Badge earned", 5, 250, 90],
            ["Prize redeemed", -3, 120, 340],
          ].map(([label, rot, left, top], i) => (
            <div
              key={label}
              style={{
                position: "absolute",
                left,
                top,
                width: 310,
                height: 220,
                background: "#fffaf0",
                padding: 18,
                boxShadow: "0 18px 42px rgba(69,26,3,0.2)",
                transform: `rotate(${rot}deg) translateY(${interpolate(spread, [0, 1], [50 + i * 24, 0])}px)`,
              }}
            >
              <div
                style={{
                  height: 142,
                  background: `linear-gradient(135deg, ${i === 0 ? config.primary : i === 1 ? config.secondary : config.accent}, #ffffff)`,
                }}
              />
              <div
                style={{
                  marginTop: 14,
                  fontFamily: outfit,
                  fontSize: 23,
                  fontWeight: 800,
                  color: "#451a03",
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ComicIntro: React.FC<{ config: ThemeIntroConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const pop = spring({ fps: 30, frame: frame - 38, config: { damping: 9, stiffness: 170 } });

  return (
    <AbsoluteFill style={{ background: "#1d4ed8", overflow: "hidden" }}>
      <BackgroundTexture config={config} />
      <div
        style={{
          position: "absolute",
          inset: 52,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 24,
        }}
      >
        {["Scan in", "Earn points", "Pick reward", "Celebrate"].map((label, i) => (
          <div
            key={label}
            style={{
              background:
                i === 0
                  ? "#fef3c7"
                  : i === 1
                    ? "#fee2e2"
                    : i === 2
                      ? "#dbeafe"
                      : "#dcfce7",
              border: "8px solid #0f172a",
              boxShadow: "8px 8px 0 #0f172a",
              padding: 34,
              color: "#0f172a",
              transform: `translateY(${interpolate(frame, [i * 8, i * 8 + 26], [80, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}px)`,
            }}
          >
            <div
              style={{
                fontFamily: outfit,
                fontSize: 52,
                fontWeight: 800,
                textTransform: "uppercase",
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 610,
          top: 354,
          width: 700,
          padding: "42px 48px",
          background: config.primary,
          border: "9px solid #0f172a",
          boxShadow: "14px 14px 0 #0f172a",
          transform: `scale(${pop}) rotate(-4deg)`,
          color: "#0f172a",
          textAlign: "center",
        }}
      >
        <div style={{ fontFamily: outfit, fontSize: 106, lineHeight: 0.9, fontWeight: 800 }}>
          LevelUp!
        </div>
        <div style={{ marginTop: 18, fontFamily: outfit, fontSize: 32, fontWeight: 800 }}>
          Rewards that pop
        </div>
      </div>
    </AbsoluteFill>
  );
};

const GamifyIntro: React.FC<{ config: ThemeIntroConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [12, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#071f1c", overflow: "hidden" }}>
      <BackgroundTexture config={config} />
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 90,
          width: 560,
          color: config.ink,
        }}
      >
        <div
          style={{
            fontFamily: outfit,
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: config.primary,
          }}
        >
          Quest board
        </div>
        <h1 style={{ margin: "24px 0 0", fontFamily: outfit, fontSize: 104, lineHeight: 0.92 }}>
          Gamify
          <br />
          the day
        </h1>
        <p
          style={{
            margin: "28px 0 0",
            fontFamily: jakarta,
            fontSize: 31,
            lineHeight: 1.26,
            fontWeight: 800,
            color: config.muted,
          }}
        >
          Streaks, badges, levels, and quests make every reward feel like progress.
        </p>
      </div>
      <div
        style={{
          position: "absolute",
          right: 100,
          top: 95,
          bottom: 95,
          width: 920,
          borderRadius: 32,
          background: "rgba(8,47,42,0.92)",
          border: "1px solid rgba(236,254,255,0.16)",
          padding: 56,
          boxShadow: `0 0 90px ${config.primary}44`,
        }}
      >
        <div
          style={{
            height: 28,
            borderRadius: 999,
            background: "rgba(236,254,255,0.12)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${config.primary}, ${config.secondary})`,
            }}
          />
        </div>
        <div style={{ position: "relative", height: 670 }}>
          {[
            ["Scan", 70, 430],
            ["Streak", 260, 260],
            ["Badge", 470, 390],
            ["Prize", 670, 185],
          ].map(([label, left, top], i) => {
            const unlocked = progress > i * 0.24;
            return (
              <div
                key={label}
                style={{
                  position: "absolute",
                  left,
                  top,
                  width: 170,
                  height: 170,
                  borderRadius: 28,
                  background: unlocked ? config.primary : "rgba(236,254,255,0.12)",
                  color: unlocked ? "#052e16" : "#bbf7d0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: outfit,
                  fontSize: 30,
                  fontWeight: 800,
                  boxShadow: unlocked ? `0 0 44px ${config.primary}` : "none",
                  transform: `scale(${unlocked ? 1 : 0.86})`,
                }}
              >
                {label}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ThemeIntroSection: React.FC<{ id: ThemeIntroId }> = ({ id }) => {
  const config = getIntro(id);

  if (config.mode === "arcade") return <ArcadeIntro config={config} />;
  if (config.mode === "broadcast") return <BroadcastIntro config={config} />;
  if (config.mode === "district") return <DistrictIntro config={config} />;
  if (config.mode === "sports") return <SportsIntro config={config} />;
  if (config.mode === "yearbook") return <YearbookIntro config={config} />;
  if (config.mode === "comic") return <ComicIntro config={config} />;
  if (config.mode === "gamify") return <GamifyIntro config={config} />;

  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#0f172a" }}>
      <BackgroundTexture config={config} />
      <FloatingBits config={config} />
      <ThemeHeadline config={config} />
      <MiniPortal config={config} />
      <ThemeBadge config={config} />
    </AbsoluteFill>
  );
};
