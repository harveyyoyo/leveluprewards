/** Feature Spotlight — fast-cut square carousel, one icon/tagline per pillar (Instagram/Facebook style). */
import React from "react";
import { AbsoluteFill } from "remotion";
import {
  BrandBug,
  LogoLockup,
  Music,
  Narration,
  PillarStrip,
  SceneFade,
  Scenes,
  Sfx,
  buildTimeline,
  jakarta,
  outfit,
  usePop,
} from "./common";

export const carouselTimeline = buildTimeline("demo-featurecarousel");

const FEATURES: Array<{ icon: string; title: string; sub: string; color: string }> = [
  { icon: "⭐", title: "Rewards", sub: "Make good behavior visible", color: "#ec4899" },
  { icon: "✅", title: "Attendance", sub: "Show up. Level up.", color: "#16a34a" },
  { icon: "📚", title: "Library", sub: "Kids check out themselves", color: "#b45309" },
  { icon: "🏫", title: "Classroom", sub: "Points in one tap", color: "#7c3aed" },
  { icon: "🏆", title: "Houses", sub: "Bring the school together", color: "#dc2626" },
  { icon: "🏢", title: "Office", sub: "Answers its own questions", color: "#0f766e" },
];

const Hook: React.FC = () => {
  const p = usePop(0, 11, 200);
  return (
    <AbsoluteFill style={{ background: "#0f172a", justifyContent: "center", alignItems: "center", textAlign: "center", padding: 60 }}>
      <div style={{ transform: `scale(${p})` }}>
        <LogoLockup size={110} />
        <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 68, color: "white", marginTop: 30, lineHeight: 1.15 }}>
          6 things LevelUp EDU
          <br />
          does for your school
        </div>
      </div>
    </AbsoluteFill>
  );
};

const FeatureSlide: React.FC<{ f: (typeof FEATURES)[number]; n: number }> = ({ f, n }) => {
  const p = usePop(0, 13, 200);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${f.color}, #0f172a)`, justifyContent: "center", alignItems: "center", textAlign: "center", padding: 60 }}>
      <div style={{ position: "absolute", top: 60, left: 60, fontFamily: outfit, fontWeight: 800, fontSize: 34, color: "rgba(255,255,255,0.6)" }}>{n}/6</div>
      <div style={{ transform: `scale(${p})` }}>
        <div style={{ fontSize: 170, filter: "drop-shadow(0 10px 24px rgba(0,0,0,0.3))" }}>{f.icon}</div>
        <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 90, color: "white", marginTop: 10 }}>{f.title}</div>
        <div style={{ fontFamily: jakarta, fontWeight: 700, fontSize: 40, color: "rgba(255,255,255,0.9)", marginTop: 14 }}>{f.sub}</div>
      </div>
    </AbsoluteFill>
  );
};

const CarouselEnd: React.FC = () => {
  const a = usePop(0, 12, 170);
  const b = usePop(12);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg, #0f172a, #1e293b)", justifyContent: "center", alignItems: "center", textAlign: "center", padding: 60 }}>
      <div style={{ transform: `scale(${a})` }}>
        <LogoLockup size={120} />
      </div>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 76, color: "white", marginTop: 28, opacity: b }}>All of it, together.</div>
      <div style={{ marginTop: 46, opacity: b }}>
        <PillarStrip featured={["Rewards", "Attendance", "Library", "Classroom"]} delay={14} size={30} />
      </div>
      <div style={{ marginTop: 30, fontFamily: jakarta, fontWeight: 700, fontSize: 38, color: "#94a3b8", opacity: b }}>leveluprewards.app</div>
    </AbsoluteFill>
  );
};

const FEATURE_SLOTS = ["f1", "f2", "f3", "f4", "f5", "f6"] as const;

export const FeatureSpotlightCarousel: React.FC = () => {
  const tl = carouselTimeline;
  return (
    <AbsoluteFill style={{ background: "#0f172a" }}>
      <Scenes
        timeline={tl}
        render={{
          hook: (s) => (
            <SceneFade dur={s.dur} inFrames={4} outFrames={6}>
              <Hook />
            </SceneFade>
          ),
          ...Object.fromEntries(
            FEATURE_SLOTS.map((name, i) => [
              name,
              (s: ReturnType<typeof tl.at>) => (
                <SceneFade key={name} dur={s.dur} inFrames={4} outFrames={6}>
                  <FeatureSlide f={FEATURES[i]} n={i + 1} />
                </SceneFade>
              ),
            ]),
          ),
          end: (s) => (
            <SceneFade dur={s.dur} inFrames={6} outFrames={1}>
              <CarouselEnd />
            </SceneFade>
          ),
        }}
      />
      <BrandBug />
      {tl.scenes.slice(1, 7).map((s) => (
        <Sfx key={s.name} at={s.start} name="pop" volume={0.4} />
      ))}
      <Sfx at={tl.at("end").start} name="chime" volume={0.45} />
      <Music timeline={tl} track="bounce-house" volume={0.5} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};
