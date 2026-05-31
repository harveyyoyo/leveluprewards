import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CINEMATIC, CT } from "./promo/cinematicTheme";
import {
  AchievementBadge,
  BrowserMockup,
  CinematicBg,
  FloatingPrizeCard,
  GoldSparkles,
  LetterReveal,
  LevelUpLogoAnimated,
  StatCounter,
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
    // White flash-burn exposure burst peaking exactly at progress=0.5 (scene cut)
    const opacity = interpolate(progress, [0, 0.5, 1], [0, 1, 0]);
    const blur = interpolate(progress, [0, 0.5, 1], [0, 40, 0]);
    return (
      <AbsoluteFill style={{
        zIndex: 9999,
        backgroundColor: "#ffffff",
        opacity,
        filter: `blur(${blur}px)`,
        pointerEvents: "none"
      }} />
    );
  }

  return null;
};

// ─── Cold Open ────────────────────────────────────────────────────────────────
const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const flash = interpolate(frame, [0, 3, 12], [1, 0.7, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [30, 45], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#000", justifyContent: "center", alignItems: "center", opacity: fadeOut }}>
      <div style={{ position: "absolute", inset: 0, background: `rgba(245,200,66,${flash})`, pointerEvents: "none" }} />
      {/* Animated landing-page logo */}
      <LevelUpLogoAnimated startFrame={0} size={300} cream="#f0e8c8" />
    </AbsoluteFill>
  );
};

// ─── Intro ────────────────────────────────────────────────────────────────────
const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subIn = interpolate(frame, [50, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: fadeIn }}>
      <CinematicBg totalFrames={CT.introEnd - CT.coldOpenEnd} />
      <GoldSparkles count={18} seed="intro" />
      <div style={{ display: "flex", alignItems: "center", gap: 80, zIndex: 2, position: "relative" }}>
        {/* Left: Logo animation continues from cold open */}
        <LevelUpLogoAnimated startFrame={-CT.coldOpenEnd} size={320} cream="#f0e8c8" />
        {/* Right: Tagline copy */}
        <div style={{ opacity: subIn, transform: `translateX(${interpolate(subIn, [0, 1], [40, 0])}px)` }}>
          <p style={{ fontFamily: outfit, fontSize: 17, fontWeight: 700, letterSpacing: 7, textTransform: "uppercase", color: CINEMATIC.gold, margin: "0 0 16px" }}>
            School Rewards System
          </p>
          <h2 style={{ fontFamily: outfit, fontSize: 72, fontWeight: 800, lineHeight: 1.0, letterSpacing: -2, margin: 0,
            background: `linear-gradient(135deg, ${CINEMATIC.offWhite} 0%, ${CINEMATIC.gold} 100%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Motivate.<br />Reward.<br />Elevate.
          </h2>
          <div style={{ height: 4, width: 280, marginTop: 28, borderRadius: 4, background: `linear-gradient(90deg,${CINEMATIC.gold},${CINEMATIC.cyan})` }} />
          <p style={{ fontFamily: jakarta, fontSize: 22, color: CINEMATIC.textMuted, marginTop: 20 }}>
            The PBIS rewards platform built for every school.
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Feature 1: Teachers ──────────────────────────────────────────────────────
const Feature1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const leftE = spring({ fps, frame, config: { damping: 14, stiffness: 100 } });
  const rightE = spring({ fps, frame: frame - 10, config: { damping: 14, stiffness: 100 } });

  return (
    <AbsoluteFill>
      <CinematicBg totalFrames={CT.feature1End - CT.introEnd} />
      <GoldSparkles count={10} seed="f1" />

      {/* Left: Browser */}
      <div style={{ position: "absolute", left: 72, top: 72, bottom: 72, width: 860, transform: `translateX(${interpolate(leftE, [0, 1], [-140, 0])}px)`, opacity: leftE }}>
        <p style={{ fontFamily: outfit, fontSize: 14, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", color: CINEMATIC.gold, margin: "0 0 18px" }}>
          ⚡ For Teachers
        </p>
        <div style={{ transform: `perspective(1200px) rotateX(${interpolate(leftE, [0, 1], [15, 0])}deg) rotateY(${interpolate(leftE, [0, 1], [18, 0])}deg) translateZ(${interpolate(leftE, [0, 1], [-200, 0])}px)` }}>
          <BrowserMockup style={{ height: 520 }}>
            <OffthreadVideo src={staticFile("capture-library/action/action-print-coupons.mp4")} loop playbackRate={1.0} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </BrowserMockup>
        </div>
        
        {/* Floating Sample Coupon Close-up */}
        <div style={{ position: "absolute", bottom: -20, right: -50, width: 280, height: 350, borderRadius: 16, overflow: "hidden", boxShadow: "0 30px 60px rgba(0,0,0,0.6)", border: `2px solid ${CINEMATIC.gold}66`, opacity: interpolate(frame, [35, 50], [0, 1], {extrapolateLeft: "clamp"}), transform: `translateY(${interpolate(frame, [35, 50], [40, 0], {extrapolateLeft: "clamp"})}px) rotate(-6deg)` }}>
          <OffthreadVideo src={staticFile("capture-library/action/action-print-preview-hold.mp4")} loop muted style={{ width: "240%", height: "240%", transform: "translate(-10%, -25%)", objectFit: "cover" }} />
        </div>
      </div>

      {/* Right: Copy + Stats */}
      <div style={{ position: "absolute", right: 72, top: 72, bottom: 72, width: 700, display: "flex", flexDirection: "column", justifyContent: "center", transform: `translateX(${interpolate(rightE, [0, 1], [120, 0])}px)`, opacity: rightE }}>
        <h2 style={{ fontFamily: outfit, fontSize: 62, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, margin: 0 }}>
          <LetterReveal text="Reward students" startFrame={12} charStyle={{ color: CINEMATIC.offWhite }} />
          <br />
          <LetterReveal text="in one tap." startFrame={24} charStyle={{ background: `linear-gradient(90deg,${CINEMATIC.gold},${CINEMATIC.cyan})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }} />
        </h2>
        <p style={{ fontFamily: jakarta, fontSize: 21, color: CINEMATIC.textMuted, marginTop: 18, lineHeight: 1.6 }}>
          Award points for homework, behavior, or any win. Students see their balance update in real time — no app download needed.
        </p>
        {/* Stat box */}
        <div style={{ marginTop: 40, padding: "26px 34px", borderRadius: 20, background: `linear-gradient(135deg,${CINEMATIC.navyMid},${CINEMATIC.navyLight})`, border: `1px solid ${CINEMATIC.gold}44`, boxShadow: `0 0 40px rgba(245,200,66,0.08)` }}>
          <div style={{ fontFamily: outfit, fontSize: 68, fontWeight: 800, color: CINEMATIC.gold, lineHeight: 1 }}>
            <StatCounter to={2400} suffix="+" startFrame={35} duration={80} />
          </div>
          <div style={{ fontFamily: jakarta, fontSize: 17, color: CINEMATIC.textMuted, marginTop: 6 }}>points awarded per day, per school</div>
        </div>
        <div style={{ marginTop: 20, padding: "18px 26px", borderRadius: 14, background: `${CINEMATIC.gold}11`, border: `1px solid ${CINEMATIC.gold}33` }}>
          <span style={{ fontFamily: outfit, fontSize: 17, color: CINEMATIC.gold, fontWeight: 700 }}>✓&nbsp; Works on any device · No login hassles</span>
        </div>
      </div>

      <AchievementBadge emoji="⚡" title="Instant Rewards" xp={50} startFrame={105} endFrame={178} />
      <XPBar progress={interpolate(frame, [0, CT.feature1End - CT.introEnd], [0.14, 0.33])} />
    </AbsoluteFill>
  );
};

// ─── Feature 2: Students ──────────────────────────────────────────────────────
const Feature2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const topE = spring({ fps, frame, config: { damping: 13, stiffness: 110 } });

  return (
    <AbsoluteFill>
      <CinematicBg totalFrames={CT.feature2End - CT.feature1End} />
      <GoldSparkles count={12} seed="f2" />

      {/* Header */}
      <div style={{ position: "absolute", top: 72, left: 0, right: 0, textAlign: "center", zIndex: 10, opacity: topE }}>
        <p style={{ fontFamily: outfit, fontSize: 14, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", color: CINEMATIC.cyan, margin: "0 0 10px" }}>
          🎮 For Students
        </p>
        <h2 style={{ fontFamily: outfit, fontSize: 68, fontWeight: 800, letterSpacing: -2, margin: 0, background: `linear-gradient(135deg,${CINEMATIC.offWhite},${CINEMATIC.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Students stay motivated
        </h2>
        <p style={{ fontFamily: jakarta, fontSize: 22, color: CINEMATIC.textMuted, marginTop: 10 }}>
          Kiosk login · Coupons · Prizes they actually want
        </p>
      </div>

      {/* Center browser with 3D entry */}
      <div style={{ position: "absolute", top: 240, left: "50%", transform: `translateX(-50%) scale(${topE}) perspective(1200px) rotateX(${interpolate(topE, [0, 1], [-18, 0])}deg) translateZ(${interpolate(topE, [0, 1], [-250, 0])}px)`, zIndex: 5 }}>
        <BrowserMockup style={{ width: 900, height: 460 }}>
          <OffthreadVideo src={staticFile("capture-library/student-kiosk/kiosk-signin-rewards.mp4")} loop playbackRate={1.0} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </BrowserMockup>
      </div>

      {/* Floating prize cards */}
      <FloatingPrizeCard emoji="🎮" label="Free Play Pass" points={150} startFrame={30} offsetX={-540} offsetY={120} seed="c1" color={CINEMATIC.cyan} />
      <FloatingPrizeCard emoji="🏆" label="Trophy Badge" points={300} startFrame={50} offsetX={540} offsetY={80} seed="c2" color={CINEMATIC.gold} />
      <FloatingPrizeCard emoji="🍕" label="Pizza Coupon" points={200} startFrame={70} offsetX={-580} offsetY={280} seed="c3" color={CINEMATIC.coral} />
      <FloatingPrizeCard emoji="⭐" label="Star Student" points={100} startFrame={90} offsetX={580} offsetY={260} seed="c4" color={CINEMATIC.green} />

      <AchievementBadge emoji="🎮" title="Student Engagement" xp={75} startFrame={110} endFrame={178} color={CINEMATIC.cyan} />
      <XPBar progress={interpolate(frame, [0, CT.feature2End - CT.feature1End], [0.33, 0.57])} />
    </AbsoluteFill>
  );
};

// ─── Feature 3: Admin ─────────────────────────────────────────────────────────
const BarChart: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const bars = [
    { label: "Mon", h: 0.62 }, { label: "Tue", h: 0.80 }, { label: "Wed", h: 0.74 },
    { label: "Thu", h: 0.95 }, { label: "Fri", h: 0.88 },
  ];
  return (
    <svg width="400" height="180" viewBox="0 0 400 180" style={{ overflow: "visible" }}>
      {bars.map((b, i) => {
        const h = interpolate(frame, [startFrame + i * 9, startFrame + i * 9 + 45], [0, b.h * 140], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
        const x = 16 + i * 74;
        return (
          <g key={b.label}>
            <rect x={x} y={160 - h} width={52} height={h} rx={8} fill={CINEMATIC.gold} opacity={0.88} />
            <rect x={x} y={160 - h} width={52} height={Math.min(h, 12)} rx={8} fill={CINEMATIC.goldBright} opacity={0.6} />
            <text x={x + 26} y={175} textAnchor="middle" fill={CINEMATIC.textMuted} fontSize={13} fontFamily={jakarta}>{b.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

const Feature3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const E = spring({ fps, frame, config: { damping: 13, stiffness: 110 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <CinematicBg totalFrames={CT.feature3End - CT.feature2End} />
      <GoldSparkles count={10} seed="f3" />

      <div style={{ display: "flex", gap: 80, alignItems: "center", zIndex: 2, position: "relative", transform: `scale(${E})`, opacity: E }}>
        {/* Left: dashboard video with 3D tilt */}
        <div style={{ transform: `perspective(1200px) rotateY(${interpolate(E, [0, 1], [-18, 0])}deg) translateZ(${interpolate(E, [0, 1], [-200, 0])}px)` }}>
          <p style={{ fontFamily: outfit, fontSize: 13, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", color: CINEMATIC.gold, margin: "0 0 16px" }}>
            📊 For Admins & Teachers
          </p>
          <BrowserMockup style={{ width: 880, height: 460 }}>
            <OffthreadVideo src={staticFile("capture-library/features/admin-stats.mp4")} loop playbackRate={1.0} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </BrowserMockup>
        </div>

        {/* Right: stats */}
        <div style={{ width: 560 }}>
          <h2 style={{ fontFamily: outfit, fontSize: 58, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, margin: "0 0 20px", background: `linear-gradient(135deg,${CINEMATIC.offWhite},${CINEMATIC.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Every classroom<br />in sync
          </h2>
          <p style={{ fontFamily: jakarta, fontSize: 20, color: CINEMATIC.textMuted, lineHeight: 1.6, margin: "0 0 36px" }}>
            Live point balances, class rosters, and prize redemptions — visible to every teacher and admin in one portal.
          </p>

          <div style={{ padding: "28px 32px", borderRadius: 20, background: `linear-gradient(135deg,${CINEMATIC.navyMid},${CINEMATIC.navyLight})`, border: `1px solid ${CINEMATIC.gold}33`, marginBottom: 24 }}>
            <div style={{ fontFamily: outfit, fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: CINEMATIC.gold, marginBottom: 16 }}>
              Weekly Points Activity
            </div>
            <BarChart startFrame={20} />
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            {[["340", "Students"], ["12", "Teachers"], ["1", "Portal"]].map(([n, l]) => (
              <div key={l} style={{ flex: 1, padding: "16px 20px", borderRadius: 14, background: `${CINEMATIC.gold}0d`, border: `1px solid ${CINEMATIC.gold}33`, textAlign: "center" }}>
                <div style={{ fontFamily: outfit, fontSize: 36, fontWeight: 800, color: CINEMATIC.gold }}>{n}</div>
                <div style={{ fontFamily: jakarta, fontSize: 14, color: CINEMATIC.textMuted }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AchievementBadge emoji="📊" title="Full Visibility" xp={100} startFrame={90} endFrame={148} />
      <XPBar progress={interpolate(frame, [0, CT.feature3End - CT.feature2End], [0.57, 0.72])} />
    </AbsoluteFill>
  );
};

// ─── How It Works ─────────────────────────────────────────────────────────────
const STEPS = [
  {
    n: "01",
    emoji: "🖨️",
    title: "School prints coupons.",
    color: CINEMATIC.gold,
  },
  {
    n: "02",
    emoji: "🧑‍🏫",
    title: "Teachers hand out coupons.",
    color: CINEMATIC.cyan,
  },
  {
    n: "03",
    emoji: "💳",
    title: "Students log in with ID card.",
    color: CINEMATIC.green,
  },
  {
    n: "04",
    emoji: "🎯",
    title: "Students redeem coupons.",
    color: CINEMATIC.coral,
  },
  {
    n: "05",
    emoji: "🎁",
    title: "Prizes are awarded.",
    color: CINEMATIC.gold,
  },
];

const HowItWorks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <CinematicBg totalFrames={CT.socialEnd - CT.feature3End} />
      <GoldSparkles count={8} seed="how" />

      <div style={{ zIndex: 2, position: "relative", width: "100%", padding: "0 80px" }}>
        <p style={{ fontFamily: outfit, fontSize: 14, fontWeight: 700, letterSpacing: 5,
          textTransform: "uppercase", color: CINEMATIC.gold, textAlign: "center", margin: "0 0 16px" }}>
          Simple by design
        </p>
        <h2 style={{ fontFamily: outfit, fontSize: 62, fontWeight: 800, letterSpacing: -2,
          textAlign: "center", margin: "0 0 52px",
          background: `linear-gradient(135deg,${CINEMATIC.offWhite},${CINEMATIC.gold})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          How It Works
        </h2>

        <div style={{ display: "flex", gap: 20 }}>
          {STEPS.map((s, i) => {
            const E = spring({ fps, frame: frame - i * 15, config: { damping: 13, stiffness: 110 } });
            return (
              <div key={i} style={{
                flex: 1,
                padding: "24px 20px",
                borderRadius: 24,
                background: `linear-gradient(145deg,${CINEMATIC.navyMid},${CINEMATIC.navyLight})`,
                border: `1px solid ${s.color}44`,
                boxShadow: `0 24px 60px rgba(0,0,0,0.4), 0 0 40px ${s.color}18`,
                transform: `translateY(${interpolate(E, [0, 1], [100, 0])}px) scale(${E})`,
                opacity: E,
              }}>
                {/* Step number */}
                <div style={{ fontFamily: outfit, fontSize: 13, fontWeight: 700, letterSpacing: 3,
                  textTransform: "uppercase", color: s.color, marginBottom: 16, opacity: 0.7 }}>
                  Step {s.n}
                </div>
                {/* Emoji */}
                <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 16 }}>{s.emoji}</div>
                {/* Title */}
                <h3 style={{ fontFamily: outfit, fontSize: 24, fontWeight: 800, margin: "0 0 10px",
                  color: CINEMATIC.offWhite, letterSpacing: -0.5 }}>
                  {s.title}
                </h3>
                {/* Color accent bar */}
                <div style={{ height: 3, width: "40%", marginTop: 28, borderRadius: 3,
                  background: `linear-gradient(90deg,${s.color},transparent)` }} />
              </div>
            );
          })}
        </div>
      </div>

      <XPBar progress={interpolate(frame, [0, CT.socialEnd - CT.feature3End], [0.72, 0.85])} />
    </AbsoluteFill>
  );
};

// ─── Outro / CTA ──────────────────────────────────────────────────────────────
const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headlineE = spring({ fps, frame: frame - 10, config: { damping: 12, stiffness: 110 } });
  const ctaE = spring({ fps, frame: frame - 45, config: { damping: 13, stiffness: 100 } });
  const pulse = 1 + Math.sin(frame * 0.14) * 0.028;
  const ringScale = (delay: number) => interpolate(frame, [delay, delay + 90], [0.4, 2.0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const ringOpacity = (delay: number) => interpolate(frame, [delay, delay + 90], [0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: fadeIn }}>
      <CinematicBg totalFrames={CT.total - CT.socialEnd} />
      <GoldSparkles count={22} seed="outro" />

      {/* Radiating rings */}
      {[0, 40, 80, 120].map((delay) => (
        <div key={delay} style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", border: `2px solid ${CINEMATIC.gold}`, transform: `scale(${ringScale(delay)})`, opacity: ringOpacity(delay), pointerEvents: "none" }} />
      ))}

      <div style={{ textAlign: "center", zIndex: 2, position: "relative" }}>
        <p style={{ fontFamily: outfit, fontSize: 15, fontWeight: 700, letterSpacing: 6, textTransform: "uppercase", color: CINEMATIC.gold, margin: "0 0 16px", transform: `scale(${headlineE})`, opacity: headlineE }}>
          Ready to level up?
        </p>
        <h2 style={{ fontFamily: outfit, fontSize: 110, fontWeight: 800, lineHeight: 0.9, letterSpacing: -4, margin: "0 0 12px", transform: `scale(${headlineE})`, background: `linear-gradient(135deg,${CINEMATIC.offWhite} 0%,${CINEMATIC.gold} 50%,${CINEMATIC.offWhite} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: `drop-shadow(0 0 80px rgba(245,200,66,0.5))` }}>
          Start free<br />today
        </h2>
        <p style={{ fontFamily: jakarta, fontSize: 24, color: CINEMATIC.textMuted, margin: "20px 0 48px", transform: `scale(${headlineE})`, opacity: headlineE }}>
          Built for teachers, students, and admins — one portal.
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
      <XPBar progress={interpolate(frame, [0, CT.total - CT.socialEnd], [0.85, 1.0])} />
    </AbsoluteFill>
  );
};

// ─── Root Composition ─────────────────────────────────────────────────────────
export const CinematicPromo: React.FC = () => {

  return (
    <AbsoluteFill style={{ backgroundColor: CINEMATIC.navy, color: "white", overflow: "hidden" }}>
      <Audio src={staticFile("background-music.mp3")} volume={0.15} loop />
      
      {/* Dynamic Cinematic Transitions overlaying boundary frame cuts (centered exactly at boundary cuts) */}
      <CinematicTransition atFrame={CT.coldOpenEnd - 9} type="fade" duration={18} />
      <CinematicTransition atFrame={CT.introEnd - 12} type="slide" duration={24} />
      <CinematicTransition atFrame={CT.feature1End - 14} type="wipe" duration={28} />
      <CinematicTransition atFrame={CT.feature2End - 12} type="slide" duration={24} />
      <CinematicTransition atFrame={CT.feature3End - 10} type="fade" duration={20} />
      <CinematicTransition atFrame={CT.socialEnd - 14} type="wipe" duration={28} />

      <Sequence durationInFrames={CT.coldOpenEnd}>
        <ColdOpen />
      </Sequence>
      <Sequence from={CT.coldOpenEnd} durationInFrames={CT.introEnd - CT.coldOpenEnd}>
        <IntroScene />
        <Audio src={staticFile("voiceover/feature/epic/intro.mp3")} volume={0.9} />
      </Sequence>
      <Sequence from={CT.introEnd} durationInFrames={CT.feature1End - CT.introEnd}>
        <Feature1 />
        <Audio src={staticFile("voiceover/feature/epic/coupons.mp3")} volume={0.9} />
      </Sequence>
      <Sequence from={CT.feature1End} durationInFrames={CT.feature2End - CT.feature1End}>
        <Feature2 />
        <Audio src={staticFile("voiceover/feature/epic/kiosk.mp3")} volume={0.9} />
      </Sequence>
      <Sequence from={CT.feature2End} durationInFrames={CT.feature3End - CT.feature2End}>
        <Feature3 />
        <Audio src={staticFile("voiceover/feature/epic/analytics.mp3")} volume={0.9} />
      </Sequence>
      <Sequence from={CT.feature3End} durationInFrames={CT.socialEnd - CT.feature3End}>
        <HowItWorks />
        <Audio src={staticFile("voiceover/feature/epic/portal.mp3")} volume={0.9} />
      </Sequence>
      <Sequence from={CT.socialEnd} durationInFrames={CT.total - CT.socialEnd}>
        <OutroScene />
        <Audio src={staticFile("voiceover/feature/epic/outro.mp3")} volume={0.9} />
      </Sequence>
    </AbsoluteFill>
  );
};
