/**
 * Non-cartoon promo styles:
 *  - HowItWorks: a real "software demo" / short tutorial — a browser
 *    window mockup with a cursor clicking through the actual app
 *    screenshots, numbered step badges, tutorial narration.
 *  - ByTheNumbers: a pure kinetic-infographic promo, no characters or
 *    screenshots — big animated stats and icons.
 */
import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  BrandBug,
  LogoLockup,
  Music,
  Narration,
  Pillar,
  PillarStrip,
  SceneFade,
  SceneTiming,
  Scenes,
  Sfx,
  anton,
  buildTimeline,
  clamp,
  jakarta,
  outfit,
  shot,
  usePop,
} from "./common";

const EndCard: React.FC<{ title: string; tagline: string; color: string; featured: Pillar[]; bg: string }> = ({
  title,
  tagline,
  color,
  featured,
  bg,
}) => {
  const a = usePop(0, 12, 170);
  const b = usePop(12);
  const { width } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: bg, justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 50px" }}>
      <div style={{ transform: `scale(${a})` }}>
        <LogoLockup size={110} dark={false} />
      </div>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: Math.min(120, width / 8), color, lineHeight: 1.05, marginTop: 20, transform: `scale(${a})` }}>{title}</div>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: Math.min(56, width / 18), color: "#0f1f3a", marginTop: 10, opacity: b }}>{tagline}</div>
      <div style={{ marginTop: 40, opacity: b }}>
        <PillarStrip featured={featured} dark={false} delay={14} size={30} />
      </div>
      <div style={{ marginTop: 28, fontFamily: jakarta, fontWeight: 700, fontSize: 38, color: "#475569", opacity: b }}>leveluprewards.app</div>
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * How It Works — browser demo / short tutorial (1920x1080)
 * ════════════════════════════════════════════════════════════════════ */

export const howItWorksTimeline = buildTimeline("demo-howitworks");

const STEPS: Array<{ n: number; title: string; image: string; focus: string }> = [
  { n: 1, title: "Scan in at the kiosk", image: "kiosk-welcome.png", focus: "50% 30%" },
  { n: 2, title: "Award points, one tap", image: "classroom-seating.png", focus: "50% 25%" },
  { n: 3, title: "Spend in the rewards shop", image: "kiosk-rewards-shop.png", focus: "50% 25%" },
  { n: 4, title: "Attendance runs on it too", image: "attendance-full.png", focus: "50% 20%" },
  { n: 5, title: "Wins hit the Hall of Fame", image: "hall-of-fame.png", focus: "50% 15%" },
];

const BROWSER = { x: 260, y: 130, w: 1400, h: 800 };

const BrowserChrome: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: "absolute",
      left: BROWSER.x,
      top: BROWSER.y,
      width: BROWSER.w,
      height: BROWSER.h,
      borderRadius: 20,
      overflow: "hidden",
      background: "white",
      boxShadow: "0 40px 100px rgba(0,0,0,0.45)",
    }}
  >
    <div style={{ height: 56, background: "#e2e8f0", display: "flex", alignItems: "center", gap: 12, padding: "0 20px" }}>
      {["#f87171", "#fbbf24", "#4ade80"].map((c) => (
        <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />
      ))}
      <div style={{ marginLeft: 24, flex: 1, background: "white", borderRadius: 10, padding: "8px 18px", fontFamily: jakarta, fontWeight: 600, fontSize: 20, color: "#475569" }}>
        🔒 portal.leveluprewards.app
      </div>
    </div>
    <div style={{ position: "relative", width: BROWSER.w, height: BROWSER.h - 56, overflow: "hidden" }}>{children}</div>
  </div>
);

const Cursor: React.FC<{ x: number; y: number; clicking: boolean }> = ({ x, y, clicking }) => (
  <div style={{ position: "absolute", left: x, top: y, pointerEvents: "none" }}>
    <svg width="44" height="44" viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))" }}>
      <path d="M4 2 L4 20 L9 16 L12 22 L15 20.5 L12 14.5 L18 14.5 Z" fill="white" stroke="#0f172a" strokeWidth="1.4" />
    </svg>
    {clicking ? (
      <div
        style={{
          position: "absolute",
          left: -18,
          top: -18,
          width: 60,
          height: 60,
          borderRadius: "50%",
          border: "4px solid #16a34a",
          opacity: 0,
          animation: "none",
        }}
      />
    ) : null}
  </div>
);

const StepBadge: React.FC<{ n: number; title: string }> = ({ n, title }) => {
  const p = usePop(0, 13, 180);
  return (
    <div
      style={{
        position: "absolute",
        left: 100,
        bottom: 110,
        display: "flex",
        alignItems: "center",
        gap: 22,
        transform: `translateX(${(1 - p) * -300}px)`,
        opacity: p,
      }}
    >
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          background: "linear-gradient(135deg, #16a34a, #0f766e)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: anton,
          fontSize: 44,
          color: "white",
          boxShadow: "0 12px 30px rgba(15,118,110,0.5)",
        }}
      >
        {n}
      </div>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 46, color: "white", background: "rgba(15,23,42,0.7)", padding: "16px 30px", borderRadius: 18 }}>{title}</div>
    </div>
  );
};

const StepScene: React.FC<{ step: (typeof STEPS)[number]; s: SceneTiming }> = ({ step, s }) => {
  const frame = useCurrentFrame();
  const enter = usePop(0, 14, 130);
  const clickAt = Math.round(s.dur * 0.28);
  const zoom = interpolate(frame, [clickAt, s.dur - 20], [1, 1.55], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const cx = interpolate(frame, [0, clickAt], [BROWSER.w * 0.5, BROWSER.w * 0.42], clamp);
  const cy = interpolate(frame, [0, clickAt], [BROWSER.h * 0.5, BROWSER.h * 0.4], clamp);
  const clicking = frame >= clickAt && frame < clickAt + 14;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg, #0f172a, #1e293b)" }}>
      <div style={{ transform: `scale(${enter})`, transformOrigin: "50% 50%" }}>
        <BrowserChrome>
          <img
            src={step.image.startsWith("http") ? step.image : shot(step.image)}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: step.focus,
              transform: frame >= clickAt ? `scale(${zoom})` : "scale(1)",
              transformOrigin: step.focus,
            }}
          />
          <Cursor x={cx} y={cy} clicking={clicking} />
        </BrowserChrome>
      </div>
      <StepBadge n={step.n} title={step.title} />
    </AbsoluteFill>
  );
};

const IntroScene: React.FC = () => {
  const p = usePop(0, 11, 170);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg, #0f172a, #1e293b)", justifyContent: "center", alignItems: "center" }}>
      <div style={{ transform: `scale(${p})`, textAlign: "center" }}>
        <LogoLockup size={130} />
        <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 80, color: "white", marginTop: 30 }}>How LevelUp EDU works</div>
        <div style={{ fontFamily: jakarta, fontWeight: 600, fontSize: 40, color: "#94a3b8", marginTop: 16 }}>Five steps. One platform.</div>
      </div>
    </AbsoluteFill>
  );
};

export const HowItWorksDemo: React.FC = () => {
  const tl = howItWorksTimeline;
  const end = tl.at("end");
  return (
    <AbsoluteFill style={{ background: "#0f172a" }}>
      <Scenes
        timeline={tl}
        render={{
          intro: (s) => (
            <SceneFade dur={s.dur} inFrames={6} outFrames={8}>
              <IntroScene />
            </SceneFade>
          ),
          step1: (s) => (
            <SceneFade dur={s.dur} inFrames={6} outFrames={8}>
              <StepScene step={STEPS[0]} s={s} />
            </SceneFade>
          ),
          step2: (s) => (
            <SceneFade dur={s.dur} inFrames={6} outFrames={8}>
              <StepScene step={STEPS[1]} s={s} />
            </SceneFade>
          ),
          step3: (s) => (
            <SceneFade dur={s.dur} inFrames={6} outFrames={8}>
              <StepScene step={STEPS[2]} s={s} />
            </SceneFade>
          ),
          step4: (s) => (
            <SceneFade dur={s.dur} inFrames={6} outFrames={8}>
              <StepScene step={STEPS[3]} s={s} />
            </SceneFade>
          ),
          step5: (s) => (
            <SceneFade dur={s.dur} inFrames={6} outFrames={8}>
              <StepScene step={STEPS[4]} s={s} />
            </SceneFade>
          ),
          end: (s) => (
            <SceneFade dur={s.dur} inFrames={8} outFrames={1}>
              <EndCard title="Try it free" tagline="at your school." color="#16a34a" featured={["Rewards", "Attendance", "Library", "Classroom"]} bg="linear-gradient(135deg, #dcfce7, #e0f2fe)" />
            </SceneFade>
          ),
        }}
      />
      <BrandBug />
      {tl.scenes.slice(1, 6).map((s) => (
        <Sfx key={s.name} at={s.start + Math.round(s.dur * 0.28)} name="pop" volume={0.4} />
      ))}
      <Sfx at={end.start} name="chime" volume={0.45} />
      <Music timeline={tl} track="office-electro" volume={0.4} duckTo={0.3} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * By The Numbers — pure kinetic infographic, no screenshots (1920x1080)
 * ════════════════════════════════════════════════════════════════════ */

const STATS: Array<{ n: string; label: string; icon: string; color: string }> = [
  { n: "4", label: "Core pillars", icon: "🧩", color: "#16a34a" },
  { n: "9+", label: "Built-in features", icon: "⚙️", color: "#2563eb" },
  { n: "1", label: "Login for the whole school day", icon: "🔑", color: "#db2777" },
  { n: "0", label: "Paperwork", icon: "📄", color: "#ea580c" },
];

const StatCard: React.FC<{ stat: (typeof STATS)[number]; delay: number }> = ({ stat, delay }) => {
  const p = usePop(delay, 12, 170);
  return (
    <div
      style={{
        width: 380,
        height: 380,
        borderRadius: 40,
        background: "white",
        boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${p})`,
      }}
    >
      <div style={{ fontSize: 70, marginBottom: 10 }}>{stat.icon}</div>
      <div style={{ fontFamily: anton, fontSize: 130, color: stat.color, lineHeight: 1 }}>{stat.n}</div>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 30, color: "#0f172a", textAlign: "center", padding: "0 30px", marginTop: 10 }}>{stat.label}</div>
    </div>
  );
};

const StatsGrid: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(160deg, #f8fafc, #e0f2fe)", justifyContent: "center", alignItems: "center" }}>
    <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 80, color: "#0f172a", position: "absolute", top: 100 }}>LevelUp EDU, by the numbers</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
      {STATS.map((s, i) => (
        <StatCard key={s.label} stat={s} delay={10 + i * 10} />
      ))}
    </div>
  </AbsoluteFill>
);

export const NUMBERS_GRID_FRAMES = 150;
export const NUMBERS_END_FRAMES = 90;
export const NUMBERS_TOTAL_FRAMES = NUMBERS_GRID_FRAMES + NUMBERS_END_FRAMES;

export const ByTheNumbers: React.FC = () => (
  <AbsoluteFill style={{ background: "#f8fafc" }}>
    <Sequence durationInFrames={NUMBERS_GRID_FRAMES}>
      <SceneFade dur={NUMBERS_GRID_FRAMES} inFrames={1} outFrames={12}>
        <StatsGrid />
      </SceneFade>
    </Sequence>
    <Sequence from={NUMBERS_GRID_FRAMES}>
      <SceneFade dur={NUMBERS_END_FRAMES} inFrames={8} outFrames={1}>
        <EndCard title="One platform." tagline="Every part of school." color="#16a34a" featured={["Rewards", "Attendance", "Library", "Classroom"]} bg="linear-gradient(135deg, #dcfce7, #e0f2fe)" />
      </SceneFade>
    </Sequence>
    <BrandBug />
    <Sfx at={10} name="whoosh" volume={0.3} />
    <Sfx at={20} name="pop" volume={0.35} />
    <Sfx at={30} name="pop" volume={0.35} />
    <Sfx at={40} name="pop" volume={0.35} />
    <Sfx at={50} name="pop" volume={0.35} />
    <Sfx at={NUMBERS_GRID_FRAMES} name="chime" volume={0.4} />
  </AbsoluteFill>
);
