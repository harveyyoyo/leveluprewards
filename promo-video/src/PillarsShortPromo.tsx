import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CAPTURE_PATHS } from "./promo/captureLibraryPaths";
import { jakarta, outfit } from "./promo/shared";

export const PILLARS_PROMO_TOTAL_FRAMES = 840; // 28 seconds @ 30fps

interface PillarData {
  id: string;
  pillarNumber: string;
  label: string;
  title: string;
  subtitle: string;
  color: string;
  glowColor: string;
  icon: string;
  image: string;
  floatingTag: string;
  badges: string[];
}

const PILLARS: PillarData[] = [
  {
    id: "rewards",
    pillarNumber: "01",
    label: "Rewards",
    title: "Rewards & Student Economy",
    subtitle:
      "Turn positive behavior into student motivation with instant points, prize browsing, and simple redemptions.",
    color: "#38bdf8",
    glowColor: "rgba(56, 189, 248, 0.28)",
    icon: "💳",
    image: CAPTURE_PATHS.marketingKioskRewardsLive,
    floatingTag: "Live Student Prize Shop",
    badges: [
      "Points & Category Awards",
      "Kiosk Self-Service",
      "Printed & Digital Coupons",
      "Student Home Portal",
    ],
  },
  {
    id: "attendance",
    pillarNumber: "02",
    label: "Attendance",
    title: "Attendance & Punctuality",
    subtitle:
      "Encourage on-time arrivals with period check-ins, automated logs, and streak rewards students look forward to.",
    color: "#4ade80",
    glowColor: "rgba(74, 222, 128, 0.28)",
    icon: "⏱️",
    image: CAPTURE_PATHS.marketingAdminAttendance,
    floatingTag: "Period Routines & Logs",
    badges: [
      "Period-Based Sign-In",
      "On-Time Streak Points",
      "Daily Attendance Logs",
      "Automated Reports",
    ],
  },
  {
    id: "library",
    pillarNumber: "03",
    label: "Library",
    title: "School Library & Reading",
    subtitle:
      "Bring book circulation, barcode scans, and reading milestones into the same student recognition system.",
    color: "#2dd4bf",
    glowColor: "rgba(45, 212, 191, 0.28)",
    icon: "📚",
    image: CAPTURE_PATHS.marketingAdminLibrary,
    floatingTag: "Catalog & Circulation",
    badges: [
      "Barcode & ISBN Scans",
      "Student Self-Checkout",
      "Due Date Tracking",
      "Reading Milestones",
    ],
  },
  {
    id: "classroom",
    pillarNumber: "04",
    label: "Classroom",
    title: "Classroom Management",
    subtitle:
      "Give teachers fast seating-chart tools, quick point recognition, and live classroom screens during the day.",
    color: "#facc15",
    glowColor: "rgba(250, 204, 21, 0.28)",
    icon: "🏫",
    image: CAPTURE_PATHS.marketingClassroomSeating,
    floatingTag: "Interactive Seating Grid",
    badges: [
      "One-Tap Desk Awards",
      "Interactive Seating Chart",
      "Live Room Displays",
      "Teacher Behavior Notes",
    ],
  },
];

const SCENE_RANGES = [
  { start: 0, end: 105 }, // Scene 0: Intro (3.5s)
  { start: 105, end: 270 }, // Scene 1: Rewards (5.5s)
  { start: 270, end: 435 }, // Scene 2: Attendance (5.5s)
  { start: 435, end: 600 }, // Scene 3: Library (5.5s)
  { start: 600, end: 745 }, // Scene 4: Classroom (4.8s)
  { start: 745, end: 840 }, // Scene 5: Outro (3.2s)
];

export const PillarsShortPromo: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const isPortrait = height > width;
  const isSquare = height === width;

  // Active scene calculation
  let activeSceneIndex = 0;
  for (let i = 0; i < SCENE_RANGES.length; i++) {
    if (frame >= SCENE_RANGES[i].start && frame < SCENE_RANGES[i].end) {
      activeSceneIndex = i;
      break;
    }
  }
  if (frame >= SCENE_RANGES[SCENE_RANGES.length - 1].end) {
    activeSceneIndex = SCENE_RANGES.length - 1;
  }

  // Active pillar (0 to 3) when in scenes 1-4
  const activePillarIndex = Math.max(
    0,
    Math.min(3, activeSceneIndex >= 1 && activeSceneIndex <= 4 ? activeSceneIndex - 1 : 0),
  );
  const activePillar = PILLARS[activePillarIndex];

  // Dynamic ambient glow colors
  const activeGlow =
    activeSceneIndex === 0
      ? "rgba(99, 102, 241, 0.28)" // Intro indigo
      : activeSceneIndex === 5
        ? "rgba(168, 85, 247, 0.28)" // Outro purple
        : activePillar.glowColor;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#070a13",
        color: "#ffffff",
        fontFamily: jakarta,
        overflow: "hidden",
      }}
    >
      {/* Background Audio */}
      <Audio
        src={staticFile("background-music.mp3")}
        volume={(f) =>
          interpolate(f, [0, 30, 800, 840], [0, 0.42, 0.42, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />

      {/* Dynamic Ambient Background Glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 80% 50% at 50% -10%, ${activeGlow}, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -160,
          right: -120,
          width: 600,
          height: 600,
          borderRadius: "50%",
          filter: "blur(90px)",
          background: activeGlow,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: -140,
          width: 500,
          height: 500,
          borderRadius: "50%",
          filter: "blur(100px)",
          background: "rgba(14, 165, 233, 0.12)",
          pointerEvents: "none",
        }}
      />

      {/* Subtle Grid Pattern Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.6,
          pointerEvents: "none",
        }}
      />

      {/* Persistent Top Navigation Bar */}
      <TopNavigation
        frame={frame}
        activePillarIndex={activePillarIndex}
        inPillarsMode={activeSceneIndex >= 1 && activeSceneIndex <= 4}
        isPortrait={isPortrait}
      />

      {/* Scene 0: Hook & Title */}
      {frame < SCENE_RANGES[0].end && (
        <IntroScene
          frame={frame}
          fps={fps}
          isPortrait={isPortrait}
          isSquare={isSquare}
        />
      )}

      {/* Scenes 1 - 4: Individual Pillars */}
      {PILLARS.map((pillar, idx) => {
        const sceneRange = SCENE_RANGES[idx + 1];
        if (frame < sceneRange.start - 10 || frame > sceneRange.end + 10) {
          return null;
        }

        const localFrame = frame - sceneRange.start;
        const duration = sceneRange.end - sceneRange.start;

        return (
          <PillarScene
            key={pillar.id}
            pillar={pillar}
            localFrame={localFrame}
            duration={duration}
            fps={fps}
            isPortrait={isPortrait}
            isSquare={isSquare}
          />
        );
      })}

      {/* Scene 5: Outro & Call to Action */}
      {frame >= SCENE_RANGES[5].start - 10 && (
        <OutroScene
          frame={frame - SCENE_RANGES[5].start}
          fps={fps}
          isPortrait={isPortrait}
          isSquare={isSquare}
        />
      )}

      {/* Bottom Progress Rail */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 6,
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          zIndex: 99,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, (frame / PILLARS_PROMO_TOTAL_FRAMES) * 100)}%`,
            background:
              activeSceneIndex >= 1 && activeSceneIndex <= 4
                ? `linear-gradient(90deg, #38bdf8, ${activePillar.color})`
                : "linear-gradient(90deg, #6366f1, #a855f7)",
            boxShadow: `0 0 12px ${activePillar.color}`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Top Navigation Header
// ---------------------------------------------------------------------------
const TopNavigation: React.FC<{
  frame: number;
  activePillarIndex: number;
  inPillarsMode: boolean;
  isPortrait: boolean;
}> = ({ frame, activePillarIndex, inPillarsMode, isPortrait }) => {
  const headerOpacity = interpolate(frame, [8, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: isPortrait ? 52 : 36,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: isPortrait ? "0 48px" : "0 64px",
        zIndex: 50,
        opacity: headerOpacity,
      }}
    >
      {/* Brand Logo & Tag */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: isPortrait ? 48 : 42,
            height: isPortrait ? 48 : 42,
            borderRadius: 12,
            background: "linear-gradient(135deg, #38bdf8, #818cf8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isPortrait ? 26 : 22,
            fontWeight: 800,
            boxShadow: "0 0 20px rgba(56, 189, 248, 0.4)",
          }}
        >
          ▲
        </div>
        <div>
          <div
            style={{
              fontFamily: outfit,
              fontSize: isPortrait ? 28 : 22,
              fontWeight: 800,
              letterSpacing: "-0.5px",
              lineHeight: 1.1,
            }}
          >
            LevelUp<span style={{ color: "#38bdf8" }}>Rewards</span>
          </div>
          <div
            style={{
              fontSize: isPortrait ? 15 : 12,
              color: "#94a3b8",
              fontWeight: 600,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            School Culture Platform
          </div>
        </div>
      </div>

      {/* Pillar Stepper Chips (Widescreen & Square) */}
      {!isPortrait && (
        <div
          style={{
            display: "flex",
            gap: 10,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(12px)",
          }}
        >
          {PILLARS.map((p, i) => {
            const isActive = inPillarsMode && activePillarIndex === i;
            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                  color: isActive ? "#ffffff" : "#94a3b8",
                  backgroundColor: isActive ? p.color : "transparent",
                  boxShadow: isActive ? `0 0 16px ${p.color}` : "none",
                }}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Single Pill Indicator for Portrait */}
      {isPortrait && inPillarsMode && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: PILLARS[activePillarIndex].color,
            color: "#0f172a",
            padding: "8px 18px",
            borderRadius: 999,
            fontSize: 16,
            fontWeight: 800,
            boxShadow: `0 0 20px ${PILLARS[activePillarIndex].color}`,
          }}
        >
          <span>{PILLARS[activePillarIndex].icon}</span>
          <span>
            {PILLARS[activePillarIndex].pillarNumber} ·{" "}
            {PILLARS[activePillarIndex].label}
          </span>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Scene 0: Hook & Intro
// ---------------------------------------------------------------------------
const IntroScene: React.FC<{
  frame: number;
  fps: number;
  isPortrait: boolean;
  isSquare: boolean;
}> = ({ frame, fps, isPortrait, isSquare }) => {
  const badgeScale = spring({
    fps,
    frame: frame - 6,
    config: { damping: 14, stiffness: 120 },
  });

  const titleScale = spring({
    fps,
    frame: frame - 16,
    config: { damping: 14, stiffness: 100 },
  });

  const subtitleOpacity = interpolate(frame, [26, 46], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sceneFadeOut = interpolate(frame, [90, 105], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: isPortrait ? "0 40px" : "0 80px",
        textAlign: "center",
        opacity: sceneFadeOut,
      }}
    >
      {/* Category Eyebrow Badge */}
      <div
        style={{
          transform: `scale(${badgeScale})`,
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          backgroundColor: "rgba(56, 189, 248, 0.14)",
          border: "1px solid rgba(56, 189, 248, 0.4)",
          color: "#38bdf8",
          padding: isPortrait ? "10px 24px" : "8px 20px",
          borderRadius: 999,
          fontSize: isPortrait ? 18 : 15,
          fontWeight: 800,
          letterSpacing: "1px",
          textTransform: "uppercase",
          marginBottom: 24,
          boxShadow: "0 0 24px rgba(56, 189, 248, 0.25)",
        }}
      >
        <span>★</span>
        <span>The Four Foundations</span>
        <span>★</span>
      </div>

      {/* Main Punchy Hook Title */}
      <div
        style={{
          transform: `scale(${titleScale})`,
          fontFamily: outfit,
          fontSize: isPortrait ? 68 : isSquare ? 56 : 76,
          fontWeight: 800,
          lineHeight: 1.08,
          letterSpacing: "-1.5px",
          maxWidth: isPortrait ? 960 : 1200,
          marginBottom: 24,
        }}
      >
        Four Pillars.
        <br />
        <span
          style={{
            background:
              "linear-gradient(135deg, #38bdf8 0%, #a855f7 50%, #facc15 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          One Connected System.
        </span>
      </div>

      {/* Subtitle */}
      <div
        style={{
          opacity: subtitleOpacity,
          fontSize: isPortrait ? 26 : 22,
          color: "#cbd5e1",
          maxWidth: isPortrait ? 880 : 860,
          lineHeight: 1.45,
          fontWeight: 500,
          marginBottom: 44,
        }}
      >
        Everything your school needs to organize student motivation, attendance
        habits, reading incentives, and classroom routines.
      </div>

      {/* 4 Pillars Preview Grid */}
      <div
        style={{
          opacity: subtitleOpacity,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: isPortrait ? 16 : 20,
          maxWidth: isPortrait ? 900 : 1200,
        }}
      >
        {PILLARS.map((p, idx) => {
          const itemSpring = spring({
            fps,
            frame: frame - 18 - idx * 4,
            config: { damping: 15, stiffness: 120 },
          });

          return (
            <div
              key={p.id}
              style={{
                transform: `scale(${itemSpring})`,
                display: "flex",
                alignItems: "center",
                gap: 12,
                backgroundColor: "rgba(15, 23, 42, 0.75)",
                border: `1.5px solid ${p.color}`,
                padding: isPortrait ? "14px 24px" : "12px 22px",
                borderRadius: 16,
                boxShadow: `0 8px 24px rgba(0, 0, 0, 0.4), 0 0 16px ${p.glowColor}`,
              }}
            >
              <span style={{ fontSize: isPortrait ? 28 : 24 }}>{p.icon}</span>
              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    fontFamily: outfit,
                    fontSize: isPortrait ? 18 : 16,
                    fontWeight: 700,
                    color: "#ffffff",
                  }}
                >
                  {p.label}
                </div>
                <div
                  style={{
                    fontSize: isPortrait ? 13 : 11,
                    color: p.color,
                    fontWeight: 700,
                  }}
                >
                  Pillar {p.pillarNumber}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Scenes 1 - 4: Dynamic Pillar Walkthrough Scene
// ---------------------------------------------------------------------------
const PillarScene: React.FC<{
  pillar: PillarData;
  localFrame: number;
  duration: number;
  fps: number;
  isPortrait: boolean;
  isSquare: boolean;
}> = ({
  pillar,
  localFrame,
  duration,
  fps,
  isPortrait,
  isSquare,
}) => {
  // Enter & exit transitions
  const enterSpring = spring({
    fps,
    frame: localFrame,
    config: { damping: 15, stiffness: 110 },
  });

  const exitOpacity = interpolate(
    localFrame,
    [duration - 14, duration],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const imageZoom = interpolate(localFrame, [0, duration], [1, 1.05], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        opacity: exitOpacity,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: isPortrait ? "130px 48px 60px" : "100px 64px 40px",
        zIndex: 20,
      }}
    >
      {/* Landscape Widescreen 2-Column Layout */}
      {!isPortrait && !isSquare ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.05fr 1.25fr",
            gap: 56,
            alignItems: "center",
            width: "100%",
            maxWidth: 1680,
          }}
        >
          {/* Left Column: Text & Badges */}
          <div style={{ transform: `scale(${enterSpring})` }}>
            {/* Number & Pillar Eyebrow */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                backgroundColor: pillar.glowColor,
                border: `1px solid ${pillar.color}`,
                color: pillar.color,
                padding: "8px 18px",
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              <span>{pillar.icon}</span>
              <span>PILLAR {pillar.pillarNumber}</span>
            </div>

            {/* Headline */}
            <h2
              style={{
                fontFamily: outfit,
                fontSize: 54,
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-1px",
                color: "#ffffff",
                margin: "0 0 16px",
              }}
            >
              {pillar.title}
            </h2>

            {/* Subtitle Description */}
            <p
              style={{
                fontSize: 22,
                color: "#cbd5e1",
                lineHeight: 1.45,
                margin: "0 0 32px",
                maxWidth: 620,
              }}
            >
              {pillar.subtitle}
            </p>

            {/* 4 Feature Badges Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              {pillar.badges.map((badge, idx) => {
                const badgeSpring = spring({
                  fps,
                  frame: localFrame - 8 - idx * 4,
                  config: { damping: 15, stiffness: 120 },
                });

                return (
                  <div
                    key={badge}
                    style={{
                      transform: `scale(${badgeSpring})`,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      backgroundColor: "rgba(15, 23, 42, 0.75)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      padding: "12px 18px",
                      borderRadius: 14,
                      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: pillar.color,
                        boxShadow: `0 0 8px ${pillar.color}`,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#f1f5f9",
                      }}
                    >
                      {badge}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Screenshot Showcase */}
          <div
            style={{
              position: "relative",
              transform: `scale(${enterSpring})`,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                borderRadius: 20,
                overflow: "hidden",
                border: `2px solid ${pillar.color}`,
                boxShadow: `0 24px 60px rgba(0, 0, 0, 0.7), 0 0 40px ${pillar.glowColor}`,
                backgroundColor: "#0f172a",
              }}
            >
              {/* Fake Browser Top Chrome */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 18px",
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <div style={{ display: "flex", gap: 7 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: "#ef4444",
                    }}
                  />
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: "#eab308",
                    }}
                  />
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: "#22c55e",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    fontWeight: 600,
                  }}
                >
                  leveluprewards.app · {pillar.label}
                </div>
                <div style={{ width: 40 }} />
              </div>

              {/* Real App Screenshot Image */}
              <div style={{ overflow: "hidden", height: 500 }}>
                <Img
                  src={staticFile(pillar.image)}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top center",
                    transform: `scale(${imageZoom})`,
                  }}
                />
              </div>

              {/* Floating Pill Tag */}
              <div
                style={{
                  position: "absolute",
                  bottom: 20,
                  right: 24,
                  backgroundColor: "rgba(15, 23, 42, 0.92)",
                  border: `1.5px solid ${pillar.color}`,
                  color: "#ffffff",
                  padding: "8px 18px",
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 800,
                  backdropFilter: "blur(12px)",
                  boxShadow: `0 8px 24px rgba(0, 0, 0, 0.5), 0 0 16px ${pillar.glowColor}`,
                }}
              >
                ★ {pillar.floatingTag}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Vertical / Portrait Phone Layout */
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            transform: `scale(${enterSpring})`,
            textAlign: "center",
          }}
        >
          {/* Pillar Eyebrow Chip */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: pillar.glowColor,
              border: `1px solid ${pillar.color}`,
              color: pillar.color,
              padding: "8px 20px",
              borderRadius: 999,
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: "1px",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            <span>{pillar.icon}</span>
            <span>PILLAR {pillar.pillarNumber}</span>
          </div>

          {/* Title */}
          <h2
            style={{
              fontFamily: outfit,
              fontSize: isPortrait ? 52 : 42,
              fontWeight: 800,
              lineHeight: 1.12,
              letterSpacing: "-1px",
              color: "#ffffff",
              margin: "0 0 12px",
              maxWidth: 900,
            }}
          >
            {pillar.title}
          </h2>

          {/* Subtitle */}
          <p
            style={{
              fontSize: isPortrait ? 22 : 18,
              color: "#cbd5e1",
              lineHeight: 1.4,
              margin: "0 0 28px",
              maxWidth: 820,
            }}
          >
            {pillar.subtitle}
          </p>

          {/* Central Device Mockup */}
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: isPortrait ? 960 : 760,
              borderRadius: 20,
              overflow: "hidden",
              border: `2px solid ${pillar.color}`,
              boxShadow: `0 24px 60px rgba(0, 0, 0, 0.7), 0 0 40px ${pillar.glowColor}`,
              backgroundColor: "#0f172a",
              marginBottom: 32,
            }}
          >
            {/* Top Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 18px",
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div style={{ display: "flex", gap: 7 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: "#ef4444",
                  }}
                />
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: "#eab308",
                  }}
                />
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: "#22c55e",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#94a3b8",
                  fontWeight: 600,
                }}
              >
                {pillar.label}
              </div>
              <div style={{ width: 40 }} />
            </div>

            {/* Real App Screenshot Image */}
            <div style={{ overflow: "hidden", height: isPortrait ? 580 : 360 }}>
              <Img
                src={staticFile(pillar.image)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "top center",
                  transform: `scale(${imageZoom})`,
                }}
              />
            </div>

            {/* Floating Tag */}
            <div
              style={{
                position: "absolute",
                bottom: 18,
                right: 20,
                backgroundColor: "rgba(15, 23, 42, 0.92)",
                border: `1.5px solid ${pillar.color}`,
                color: "#ffffff",
                padding: "8px 18px",
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 800,
                boxShadow: `0 8px 24px rgba(0, 0, 0, 0.5), 0 0 16px ${pillar.glowColor}`,
              }}
            >
              ★ {pillar.floatingTag}
            </div>
          </div>

          {/* Badges Grid for Portrait */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              width: "100%",
              maxWidth: isPortrait ? 960 : 760,
            }}
          >
            {pillar.badges.map((badge, idx) => {
              const badgeSpring = spring({
                fps,
                frame: localFrame - 8 - idx * 3,
                config: { damping: 15, stiffness: 120 },
              });

              return (
                <div
                  key={badge}
                  style={{
                    transform: `scale(${badgeSpring})`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    backgroundColor: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    padding: "12px 18px",
                    borderRadius: 14,
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: pillar.color,
                      boxShadow: `0 0 8px ${pillar.color}`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: isPortrait ? 16 : 14,
                      fontWeight: 700,
                      color: "#f1f5f9",
                      textAlign: "left",
                    }}
                  >
                    {badge}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Scene 5: Outro & Call to Action
// ---------------------------------------------------------------------------
const OutroScene: React.FC<{
  frame: number;
  fps: number;
  isPortrait: boolean;
  isSquare: boolean;
}> = ({ frame, fps, isPortrait, isSquare }) => {
  const enterSpring = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 110 },
  });

  const buttonSpring = spring({
    fps,
    frame: frame - 16,
    config: { damping: 14, stiffness: 130 },
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: isPortrait ? "0 40px" : "0 80px",
        textAlign: "center",
        zIndex: 30,
      }}
    >
      <div style={{ transform: `scale(${enterSpring})` }}>
        {/* Glow emblem */}
        <div
          style={{
            width: isPortrait ? 90 : 76,
            height: isPortrait ? 90 : 76,
            borderRadius: 24,
            background: "linear-gradient(135deg, #38bdf8, #818cf8, #a855f7)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isPortrait ? 44 : 36,
            fontWeight: 800,
            marginBottom: 24,
            boxShadow: "0 0 40px rgba(129, 140, 248, 0.5)",
          }}
        >
          ▲
        </div>

        {/* Closing Headline */}
        <h2
          style={{
            fontFamily: outfit,
            fontSize: isPortrait ? 64 : isSquare ? 50 : 68,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-1.5px",
            color: "#ffffff",
            margin: "0 0 16px",
            maxWidth: isPortrait ? 940 : 1000,
          }}
        >
          Start with One Pillar.
          <br />
          <span
            style={{
              background:
                "linear-gradient(135deg, #38bdf8 0%, #4ade80 50%, #facc15 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Expand When You're Ready.
          </span>
        </h2>

        {/* Subtitle */}
        <p
          style={{
            fontSize: isPortrait ? 26 : 22,
            color: "#cbd5e1",
            lineHeight: 1.45,
            margin: "0 0 36px",
            maxWidth: 780,
          }}
        >
          Everything stays connected in one unified school culture system.
        </p>

        {/* Primary Call to Action Button */}
        <div style={{ transform: `scale(${buttonSpring})` }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)",
              color: "#ffffff",
              padding: isPortrait ? "20px 48px" : "18px 42px",
              borderRadius: 999,
              fontSize: isPortrait ? 26 : 22,
              fontFamily: outfit,
              fontWeight: 800,
              letterSpacing: "0.2px",
              boxShadow:
                "0 16px 36px rgba(37, 99, 235, 0.45), 0 0 30px rgba(56, 189, 248, 0.35)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
            }}
          >
            <span>Start your free trial</span>
            <span style={{ fontSize: isPortrait ? 28 : 24 }}>→</span>
          </div>

          <div
            style={{
              marginTop: 18,
              fontSize: isPortrait ? 18 : 16,
              color: "#94a3b8",
              fontWeight: 600,
              letterSpacing: "0.5px",
            }}
          >
            leveluprewards.app · contact@leveluprewards.app
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
