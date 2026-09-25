/**
 * Batch 3 cartoon stories: Maya's First Week, Badge Unlocked, Lobby TV,
 * A Principal's Morning, Office Billing — plus 6-second teasers.
 */
import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  BrandBug,
  Confetti,
  LogoLockup,
  Music,
  Narration,
  Pillar,
  PillarStrip,
  SceneFade,
  SceneTiming,
  Scenes,
  Sfx,
  Timeline,
  anton,
  buildTimeline,
  clamp,
  jakarta,
  outfit,
  rnd,
  shot,
  usePop,
} from "./common";
import { Bubble, CamKey, Character, Coins, Floor, LOOKS, Look, Placed, Screen, Stage, Window, reachAngle, walkTo } from "./cartoon";
import { GROUND, Hallway, Kiosk, READER_CENTER, SCREEN, STOP_X } from "./scanIn";
import { ClassroomWall, KIDS, LEO_SEAT, SeatedKid, TEACHER_X, TV } from "./storiesClassroom";
import { LibraryRoom, LibraryScreen, Standings } from "./storiesMore";
import { Counter, MOM, MON, MS_PARK, OfficeRoom, OfficeUI, AbsentAnswer, PARK_X, TEAL, typed } from "./storiesOffice";

const SCREEN_MID = { x: SCREEN.x + SCREEN.w / 2, y: SCREEN.y + SCREEN.h / 2 };
const READER_ARM = reachAngle({ x: READER_CENTER.x - 18 - STOP_X, y: READER_CENTER.y - GROUND });

const PRINCIPAL: Look = { skin: "#8d5524", hair: "#9ca3af", hairStyle: "bun", top: "#1e3a8a", pants: "#1f2937", shoes: "#111827", glasses: true, adult: true, accent: "#f8fafc", lanyard: true };

/** Generic end card used by this batch. */
const EndCard: React.FC<{ title: string; tagline: string; color: string; featured: Pillar[]; bg: string; children?: React.ReactNode }> = ({
  title,
  tagline,
  color,
  featured,
  bg,
  children,
}) => {
  const a = usePop(0, 12, 170);
  const b = usePop(12);
  const { width } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: bg, justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 50px" }}>
      {children}
      <div style={{ transform: `scale(${a})` }}>
        <LogoLockup size={110} dark={false} />
      </div>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: Math.min(140, width / 7.5), color, lineHeight: 1.05, marginTop: 20, transform: `scale(${a})` }}>{title}</div>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: Math.min(60, width / 17), color: "#0f1f3a", marginTop: 10, opacity: b }}>{tagline}</div>
      <div style={{ marginTop: 40, opacity: b }}>
        <PillarStrip featured={featured} dark={false} delay={14} size={30} />
      </div>
      <div style={{ marginTop: 28, fontFamily: jakarta, fontWeight: 700, fontSize: 38, color: "#475569", opacity: b }}>leveluprewards.app</div>
    </AbsoluteFill>
  );
};

const ChapterTag: React.FC<{ text: string; color: string }> = ({ text, color }) => {
  const p = usePop(2, 11, 220);
  return (
    <AbsoluteFill style={{ alignItems: "center", pointerEvents: "none" }}>
      <div
        style={{
          marginTop: 130,
          padding: "12px 40px",
          borderRadius: 999,
          background: color,
          color: "white",
          fontFamily: anton,
          fontSize: 64,
          letterSpacing: 6,
          transform: `scale(${p}) rotate(-2deg)`,
          boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/* ── Badge art (shared) ──────────────────────────────────────────────── */

const BADGES = [
  { name: "Early Bird", pts: 50, color: "#b45309", icon: "☀️" },
  { name: "Century", pts: 100, color: "#64748b", icon: "🎯" },
  { name: "Rising Star", pts: 250, color: "#eab308", icon: "⭐" },
  { name: "Half Grand", pts: 500, color: "#ca8a04", icon: "📈" },
  { name: "Star Student", pts: 1000, color: "#06b6d4", icon: "🏆" },
];

const BadgeMedal: React.FC<{ color: string; icon: string; size: number; locked?: boolean; glow?: number }> = ({ color, icon, size, locked, glow = 0 }) => (
  <div style={{ position: "relative", width: size, height: size * 1.25, filter: locked ? "grayscale(1) opacity(0.4)" : glow ? `drop-shadow(0 0 ${30 * glow}px ${color})` : undefined }}>
    <svg viewBox="0 0 100 125" width={size} height={size * 1.25} style={{ position: "absolute" }}>
      <path d="M 30 70 L 18 122 L 36 112 L 46 124 L 50 75 Z" fill="#dc2626" />
      <path d="M 70 70 L 82 122 L 64 112 L 54 124 L 50 75 Z" fill="#2563eb" />
      <circle cx={50} cy={48} r={44} fill={color} stroke="#fff7d6" strokeWidth={5} />
      <circle cx={50} cy={48} r={34} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={3} />
    </svg>
    <div style={{ position: "absolute", top: size * 0.16, width: "100%", textAlign: "center", fontSize: size * 0.4 }}>{locked ? "🔒" : icon}</div>
  </div>
);

/* ════════════════════════════════════════════════════════════════════
 * Maya's First Week (wide + tall)
 * ════════════════════════════════════════════════════════════════════ */

export const firstWeekTimeline = buildTimeline("story-maya-firstweek");

const IdCardBig: React.FC = () => {
  const p = usePop(0, 12, 160);
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", background: `rgba(15,23,42,${0.4 * p})` }}>
      <div
        style={{
          width: 560,
          height: 360,
          borderRadius: 30,
          background: "white",
          boxShadow: "0 30px 80px rgba(0,0,0,0.4)",
          overflow: "hidden",
          transform: `scale(${p}) rotate(${-4 + Math.sin(frame * 0.05) * 2}deg)`,
          fontFamily: outfit,
        }}
      >
        <div style={{ background: "#1e3a8a", color: "white", padding: "18px 26px", fontWeight: 800, fontSize: 30, display: "flex", justifyContent: "space-between" }}>
          <span>SCHOOL ABC</span>
          <span style={{ opacity: 0.8 }}>Student ID</span>
        </div>
        <div style={{ display: "flex", gap: 26, padding: 26 }}>
          <div style={{ width: 150, height: 170, borderRadius: 20, background: "#bae6fd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 100 }}>👧🏽</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 48, color: "#0f172a" }}>Maya J.</div>
            <div style={{ fontFamily: jakarta, fontWeight: 700, fontSize: 28, color: "#64748b" }}>Grade 5 · #100128</div>
            <div style={{ display: "flex", gap: 3, marginTop: 30 }}>
              {Array.from({ length: 34 }).map((_, i) => (
                <div key={i} style={{ width: i % 3 ? 3 : 6, height: 70, background: "#0f172a" }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const BadgeUnlockOverlay: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0) return null;
  const p = interpolate(t, [0, 14], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.8)) });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", background: `rgba(15,23,42,${0.5 * Math.min(1, t / 8)})` }}>
      <div style={{ position: "absolute", width: 900, height: 900, background: "repeating-conic-gradient(from 0deg, rgba(250,204,21,0.35) 0deg 10deg, transparent 10deg 20deg)", borderRadius: "50%", transform: `rotate(${t * 1.5}deg) scale(${p})` }} />
      <div style={{ transform: `scale(${p})`, textAlign: "center" }}>
        <BadgeMedal color="#eab308" icon="⭐" size={260} glow={1} />
        <div style={{ fontFamily: anton, fontSize: 90, color: "#fde047", marginTop: 10, textShadow: "0 6px 0 #713f12" }}>RISING STAR</div>
        <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 48, color: "white" }}>Badge unlocked · +15 bonus ⭐</div>
      </div>
    </AbsoluteFill>
  );
};

const BadgeScreen: React.FC = () => (
  <g>
    <rect width={SCREEN.w} height={SCREEN.h} fill="#1e1b4b" />
    <circle cx={SCREEN.w / 2} cy={150} r={70} fill="#eab308" stroke="#fff7d6" strokeWidth={6} />
    <text x={SCREEN.w / 2} y={172} textAnchor="middle" fontSize={64}>
      ⭐
    </text>
    <text x={SCREEN.w / 2} y={262} textAnchor="middle" fontFamily={anton} fontSize={32} fill="#fde047">
      RISING STAR
    </text>
    <text x={SCREEN.w / 2} y={300} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={20} fill="white">
      250 pts · +15 bonus
    </text>
  </g>
);

const FirstWeekWorld: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const Mo = tl.at("mon");
  const We = tl.at("wed");
  const Cl = tl.at("class");
  const Fr = tl.at("fri");

  if (frame < We.start) {
    // Monday: the office hands Maya her ID card.
    const w = walkTo(frame, 10, Math.round(Mo.dur * 0.35), 2080, 1150);
    const handAt = Math.round(Mo.dur * 0.42);
    const passed = frame >= handAt + 10;
    return (
      <Stage frame={frame} cam={[{ f: 0, s: 1, x: 960, y: 540 }]} tall={[{ f: 0, s: 1, x: 1400, y: 540 }, { f: handAt - 20, s: 1, x: 860, y: 540 }]}>
        <OfficeRoom monitor={<OfficeUI w={MON.w} h={MON.h} question="" answerIn={0} answer={null} />} />
        <Placed x={PARK_X} y={GROUND}>
          <Character look={MS_PARK} arm={frame >= handAt - 10 && frame < handAt + 14 ? 5 : 60} hold={frame < handAt + 10 ? "card" : "none"} frame={frame} happy={passed ? 1 : 0} blink={frame % 95 < 4} />
        </Placed>
        <Placed x={w.x} y={GROUND} face={-1}>
          <Character look={{ ...LOOKS.maya, lanyard: passed }} walking={w.walking} phase={frame * 0.32} arm={frame >= handAt - 6 && frame < handAt + 14 ? 10 : undefined} frame={frame} happy={passed ? 1 : 0} blink={frame % 84 < 4} />
        </Placed>
        <Counter />
      </Stage>
    );
  }

  if (frame < Cl.start) {
    // Wednesday: first kiosk scan.
    const t = frame - We.start;
    const tap = 20;
    const arm = interpolate(t, [4, 14, 30, 40], [90, READER_ARM, READER_ARM, 90], clamp);
    return (
      <Stage frame={t} cam={[{ f: 0, s: 1.2, x: 1300, y: 560 }, { f: 30, s: 1.5, x: 1400, y: 540 }]} tall={[{ f: 0, s: 1.1, x: 1420, y: 540 }]}>
        <Hallway />
        <Kiosk scanned={t >= tap} led={t >= tap ? 1 : 0} ring={interpolate(t, [tap, tap + 22], [0, 1], clamp)} />
        <Placed x={STOP_X} y={GROUND}>
          <Character look={LOOKS.maya} arm={arm} holdCard={t >= 6 && t < 36} frame={frame} happy={t > tap + 10 ? 1 : 0} blink={frame % 84 < 4} />
        </Placed>
      </Stage>
    );
  }

  if (frame < Fr.start) {
    // In class: points add up.
    const t = frame - Cl.start;
    const pops = [20, 50, 80, 110].filter((p) => p < Cl.dur - 20);
    return (
      <Stage frame={t} cam={[{ f: 0, s: 1, x: 960, y: 540 }]} tall={[{ f: 0, s: 1, x: 900, y: 540 }]}>
        <ClassroomWall />
        <Placed x={TEACHER_X} y={GROUND}>
          <Character look={LOOKS.msRivera} arm={32} hold="tablet" frame={frame} mouth="smile" blink={frame % 100 < 4} />
        </Placed>
        <SeatedKid look={LOOKS.maya} x={KIDS[0].x} frame={frame} happy={1} arm={t % 60 < 30 ? 70 : -70} />
        <SeatedKid look={LOOKS.ava} x={KIDS[1].x} frame={frame} />
        <SeatedKid look={LOOKS.jordan} x={KIDS[2].x} frame={frame} />
        {pops.map((p, i) => {
          const tt = interpolate(t - p, [0, 30], [0, 1], clamp);
          if (t < p) return null;
          return (
            <text key={p} x={KIDS[0].x - 60 + i * 30} y={380 - tt * 120} fontFamily={anton} fontSize={70} fill="#f59e0b" stroke="#78350f" strokeWidth={3} opacity={1 - tt}>
              +{[5, 10, 5, 15][i]}
            </text>
          );
        })}
      </Stage>
    );
  }

  // Friday: the badge.
  const t = frame - Fr.start;
  const tap = 16;
  const arm = interpolate(t, [2, 12, 28, 36], [90, READER_ARM, READER_ARM, 90], clamp);
  const cheer = t > tap + 30 ? -100 + Math.sin(frame * 0.5) * 8 : arm;
  return (
    <Stage frame={t} cam={[{ f: 0, s: 1.3, x: 1350, y: 560 }, { f: tap + 10, s: 1.9, x: SCREEN_MID.x - 60, y: 520 }]} tall={[{ f: 0, s: 1.1, x: 1420, y: 540 }, { f: tap + 10, s: 1.4, x: 1460, y: 520 }]}>
      <Hallway />
      <Kiosk scanned={t >= tap} led={t >= tap ? 1 : 0} ring={interpolate(t, [tap, tap + 22], [0, 1], clamp)} screen={t >= tap ? <BadgeScreen /> : undefined} />
      <Placed x={STOP_X} y={GROUND}>
        <Character look={LOOKS.maya} arm={cheer} holdCard={t >= 4 && t < 32} frame={frame} happy={t > tap ? 1 : 0} jump={t > tap + 30 ? Math.abs(Math.sin(t * 0.25)) * 30 : 0} blink={frame % 84 < 4} />
      </Placed>
      <Coins x={SCREEN_MID.x} y={SCREEN.y + 120} t={interpolate(t - tap - 4, [0, 30], [0, 1], clamp)} />
    </Stage>
  );
};

const PointsTally: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const pts = Math.round(interpolate(frame, [10, dur - 20], [180, 248], clamp));
  const p = usePop(4);
  return (
    <div style={{ position: "absolute", top: 60, right: 60, padding: "16px 30px", borderRadius: 26, background: "white", boxShadow: "0 12px 30px rgba(0,0,0,0.15)", textAlign: "center", transform: `scale(${p})` }}>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 28, color: "#0ea5e9" }}>Maya's points</div>
      <div style={{ fontFamily: anton, fontSize: 90, color: "#0f1f3a", lineHeight: 1 }}>{pts}</div>
    </div>
  );
};

export const StoryMayaFirstWeek: React.FC = () => {
  const tl = firstWeekTimeline;
  const Mo = tl.at("mon");
  const We = tl.at("wed");
  const Cl = tl.at("class");
  const Fr = tl.at("fri");
  const end = tl.at("end");
  return (
    <AbsoluteFill style={{ background: "#fdf0d8" }}>
      <Sequence durationInFrames={end.start + 8}>
        <SceneFade dur={end.start + 8} inFrames={6} outFrames={8}>
          <FirstWeekWorld tl={tl} />
        </SceneFade>
      </Sequence>
      <Sequence durationInFrames={Mo.dur}>
        <ChapterTag text="MONDAY" color="#0ea5e9" />
      </Sequence>
      <Sequence from={Math.round(Mo.dur * 0.55)} durationInFrames={Mo.dur - Math.round(Mo.dur * 0.55)}>
        <IdCardBig />
      </Sequence>
      <Sequence from={We.start} durationInFrames={We.dur}>
        <ChapterTag text="WEDNESDAY" color="#16a34a" />
      </Sequence>
      <Sequence from={Cl.start} durationInFrames={Cl.dur}>
        <PointsTally dur={Cl.dur} />
      </Sequence>
      <Sequence from={Fr.start} durationInFrames={Fr.dur}>
        <ChapterTag text="FRIDAY" color="#eab308" />
        <BadgeUnlockOverlay at={Math.round(Fr.cues[0] + Fr.lens[0] * 0.55)} />
      </Sequence>
      <Sequence from={end.start}>
        <SceneFade dur={end.dur} inFrames={8} outFrames={1}>
          <EndCard title="First week, first badge" tagline="That's LevelUp EDU." color="#0284c7" featured={["Attendance", "Rewards"]} bg="linear-gradient(135deg, #e0f2fe, #fef9c3)" />
        </SceneFade>
      </Sequence>
      <BrandBug pillar="Rewards" dark={false} />
      <Sfx at={Math.round(Mo.dur * 0.42)} name="pop" volume={0.5} />
      <Sfx at={We.start + 20} name="beep" volume={0.4} />
      {[20, 50, 80, 110].filter((p) => p < Cl.dur - 20).map((p) => (
        <Sfx key={p} at={Cl.start + p} name="coin" volume={0.35} />
      ))}
      <Sfx at={Fr.start + 16} name="beep" volume={0.4} />
      <Sfx at={Fr.start + Math.round(Fr.cues[0] + Fr.lens[0] * 0.55)} name="levelup" volume={0.55} />
      <Sfx at={Fr.start + Math.round(Fr.cues[0] + Fr.lens[0] * 0.55) + 4} name="crowd" volume={0.3} />
      <Sfx at={end.start} name="chime" volume={0.45} />
      <Music timeline={tl} track="firstweek-story" volume={0.5} duckTo={0.38} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * Badge Unlocked (tall UI, 1080x1920)
 * ════════════════════════════════════════════════════════════════════ */

export const badgeTimeline = buildTimeline("story-badge-unlocked");

const XpBar: React.FC<{ pts: number }> = ({ pts }) => (
  <div style={{ width: 880 }}>
    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: outfit, fontWeight: 800, fontSize: 40, color: "#e0e7ff" }}>
      <span>Leo · points</span>
      <span>{pts} / 250</span>
    </div>
    <div style={{ marginTop: 16, height: 56, borderRadius: 28, background: "rgba(255,255,255,0.12)", overflow: "hidden", border: "4px solid rgba(255,255,255,0.3)" }}>
      <div style={{ width: `${Math.min(100, (pts / 250) * 100)}%`, height: "100%", background: "linear-gradient(90deg, #facc15, #f97316)" }} />
    </div>
  </div>
);

const BadgeClose: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  const pts = Math.round(interpolate(frame, [0, s.dur], [236, 248], clamp));
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 360, gap: 80 }}>
      <div style={{ fontFamily: anton, fontSize: 130, color: "white", textAlign: "center", lineHeight: 1 }}>
        SO
        <br />
        CLOSE…
      </div>
      <XpBar pts={pts} />
      <BadgeMedal color="#eab308" icon="⭐" size={260} locked />
    </AbsoluteFill>
  );
};

const BadgeTap: React.FC = () => {
  const frame = useCurrentFrame();
  const p = usePop(0, 10, 220);
  const pts = Math.round(interpolate(frame, [10, 24], [248, 252], clamp));
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 360, gap: 80 }}>
      <div style={{ fontSize: 220, transform: `scale(${p}) rotate(${(1 - p) * -30}deg)` }}>💳</div>
      <div style={{ fontFamily: anton, fontSize: 200, color: "#fde047", lineHeight: 1 }}>{pts}</div>
      <XpBar pts={pts} />
    </AbsoluteFill>
  );
};

const BadgeUnlock: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 16], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.8)) });
  const shelf = usePop(Math.round(s.dur * 0.55), 12, 170);
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 240 }}>
      <div style={{ position: "absolute", top: 120, width: 1100, height: 1100, background: "repeating-conic-gradient(from 0deg, rgba(250,204,21,0.3) 0deg 10deg, transparent 10deg 20deg)", borderRadius: "50%", transform: `rotate(${frame * 1.2}deg) scale(${p})` }} />
      <div style={{ fontFamily: anton, fontSize: 70, color: "white", letterSpacing: 6, transform: `scale(${p})` }}>ACHIEVEMENT UNLOCKED</div>
      <div style={{ marginTop: 40, transform: `scale(${p})` }}>
        <BadgeMedal color="#eab308" icon="⭐" size={360} glow={1} />
      </div>
      <div style={{ fontFamily: anton, fontSize: 120, color: "#fde047", transform: `scale(${p})`, textShadow: "0 8px 0 #713f12" }}>RISING STAR</div>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 56, color: "white", background: "#16a34a", padding: "10px 40px", borderRadius: 999, transform: `scale(${p})` }}>+15 bonus points</div>
      <div style={{ display: "flex", gap: 22, marginTop: 70, transform: `translateY(${(1 - shelf) * 300}px)`, opacity: shelf }}>
        {BADGES.map((b, i) => (
          <div key={b.name} style={{ textAlign: "center", width: 170 }}>
            <BadgeMedal color={b.color} icon={b.icon} size={140} locked={i > 2} glow={i === 2 ? 0.6 : 0} />
            <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 26, color: i > 2 ? "#94a3b8" : "white" }}>{b.name}</div>
            <div style={{ fontFamily: jakarta, fontWeight: 700, fontSize: 22, color: "#a5b4fc" }}>{b.pts} pts</div>
          </div>
        ))}
      </div>
      <Confetti colors={["#facc15", "#f97316", "white", "#a78bfa"]} width={1080} height={1920} count={110} />
    </AbsoluteFill>
  );
};

export const StoryBadgeUnlocked: React.FC = () => {
  const tl = badgeTimeline;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 35%, #4338ca, #1e1b4b 70%)" }}>
      <Scenes
        timeline={tl}
        render={{
          close: (s) => <BadgeClose s={s} />,
          tap: () => <BadgeTap />,
          unlock: (s) => <BadgeUnlock s={s} />,
          end: (s) => (
            <SceneFade dur={s.dur} inFrames={4} outFrames={1}>
              <EndCard title="Badges" tagline="Every milestone, a moment." color="#ca8a04" featured={["Rewards", "Badges"]} bg="linear-gradient(160deg, #fef9c3, #e0e7ff)" />
            </SceneFade>
          ),
        }}
      />
      <BrandBug pillar="Rewards" style={{ top: 60, left: 60 }} />
      <Sfx at={tl.at("tap").start + 4} name="beep" volume={0.4} />
      <Sfx at={tl.at("tap").start + 16} name="coin" volume={0.5} />
      <Sfx at={tl.at("unlock").start} name="levelup" volume={0.6} />
      <Sfx at={tl.at("unlock").start + 2} name="impact" volume={0.4} />
      <Sfx at={tl.at("unlock").start + 4} name="crowd" volume={0.35} />
      <Sfx at={tl.at("end").start} name="chime" volume={0.45} />
      <Music timeline={tl} track="chiptune" volume={0.4} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * Lobby TV (wide + tall)
 * ════════════════════════════════════════════════════════════════════ */

export const lobbyTimeline = buildTimeline("story-lobby-tv");
const LOBBY_TV = { x: 560, y: 90, w: 800, h: 450 };

const NewsSlide: React.FC = () => (
  <g>
    <rect width={LOBBY_TV.w} height={LOBBY_TV.h} fill="#4f46e5" />
    <text x={LOBBY_TV.w / 2} y={90} textAnchor="middle" fontFamily={anton} fontSize={56} fill="#fde047">
      THIS WEEK AT SCHOOL ABC
    </text>
    {["🎉  Spirit Day — Friday!", "📚  Book fair next week", "🏆  Tide leads the House Cup"].map((t, i) => (
      <g key={t} transform={`translate(80 ${160 + i * 90})`}>
        <rect width={640} height={70} rx={35} fill="rgba(255,255,255,0.15)" />
        <text x={30} y={47} fontFamily={outfit} fontWeight={800} fontSize={36} fill="white">
          {t}
        </text>
      </g>
    ))}
  </g>
);

const StarOfWeek: React.FC<{ t: number }> = ({ t }) => (
  <g>
    <rect width={LOBBY_TV.w} height={LOBBY_TV.h} fill="#1e1b4b" />
    {Array.from({ length: 16 }).map((_, i) => (
      <text key={i} x={rnd(i) * LOBBY_TV.w} y={((rnd(i + 5) * LOBBY_TV.h + t * 2) % LOBBY_TV.h)} fontSize={24} opacity={0.6}>
        ✨
      </text>
    ))}
    <text x={LOBBY_TV.w / 2} y={80} textAnchor="middle" fontFamily={anton} fontSize={54} fill="#fde047">
      ⭐ STUDENT OF THE WEEK ⭐
    </text>
    <circle cx={LOBBY_TV.w / 2} cy={220} r={90} fill="#22c55e" stroke="#fde047" strokeWidth={8} />
    <text x={LOBBY_TV.w / 2} y={248} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={80} fill="white">
      LM
    </text>
    <text x={LOBBY_TV.w / 2} y={370} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={60} fill="white">
      Leo M. · Grade 5
    </text>
    <text x={LOBBY_TV.w / 2} y={420} textAnchor="middle" fontFamily={jakarta} fontWeight={700} fontSize={30} fill="#a5b4fc">
      Always helping classmates · 1,240 pts
    </text>
  </g>
);

const LobbyWorld: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const Sc = tl.at("screens");
  const Me = tl.at("thatsme");
  const third = Sc.dur / 3;
  const slide = frame < Sc.start ? 2 : frame < Me.start ? Math.min(2, Math.floor((frame - Sc.start) / third)) : 3;
  const scores = [1180, 1250, 980, 940];
  const kidsWalk = [
    { look: LOOKS.ava, x: interpolate(frame, [0, 220], [-200, 2100]), face: 1 as const },
    { look: LOOKS.jordan, x: interpolate(frame, [30, 300], [2100, -200]), face: -1 as const },
  ];
  const leo = walkTo(frame, Me.start - 60, Me.start + 6, 2100, 1250);
  const mom = walkTo(frame, Me.start - 60, Me.start + 6, 2250, 1450);
  const cam: CamKey[] = [
    { f: 0, s: 1.25, x: 960, y: 480 },
    { f: Sc.start, s: 1, x: 960, y: 540 },
    { f: Me.start - 10, s: 1, x: 960, y: 540 },
    { f: Me.start + 10, s: 1.15, x: 1100, y: 520 },
  ];
  const tall: CamKey[] = [
    { f: 0, s: 1, x: LOBBY_TV.x + LOBBY_TV.w / 2, y: 540 },
    { f: Me.start - 10, s: 1, x: LOBBY_TV.x + LOBBY_TV.w / 2, y: 540 },
    { f: Me.start + 10, s: 1, x: 1250, y: 540 },
  ];
  return (
    <Stage frame={frame} cam={cam} tall={tall}>
      <rect width={1920} height={720} fill="#e0e7ff" />
      <Window x={120} y={120} w={260} h={320} />
      <Window x={1560} y={120} w={260} h={320} />
      <Floor y={724} color="#cbd5e1" />
      <Screen id="lobbytv" x={LOBBY_TV.x} y={LOBBY_TV.y} w={LOBBY_TV.w} h={LOBBY_TV.h}>
        {slide === 0 ? (
          <image href={shot("hall-of-fame.png")} width={LOBBY_TV.w} height={LOBBY_TV.h} preserveAspectRatio="xMidYMid slice" />
        ) : slide === 1 ? (
          <g transform={`scale(${LOBBY_TV.w / 700} ${LOBBY_TV.h / 380})`}>
            <Standings scores={scores} banner="🌊 TIDE LEADS!" />
          </g>
        ) : slide === 2 ? (
          <NewsSlide />
        ) : (
          <StarOfWeek t={frame} />
        )}
      </Screen>
      {kidsWalk.map((k, i) => (
        <Placed key={i} x={k.x} y={GROUND - 10} face={k.face} scale={0.92}>
          <Character look={k.look} walking phase={frame * 0.3 + i} frame={frame} />
        </Placed>
      ))}
      {frame >= Me.start - 60 ? (
        <>
          <Placed x={mom.x} y={GROUND} face={-1}>
            <Character look={MOM} walking={mom.walking} phase={frame * 0.3} frame={frame} happy={frame >= Me.start + 20 ? 1 : 0} />
          </Placed>
          <Placed x={leo.x} y={GROUND} face={-1}>
            <Character look={LOOKS.leo} walking={leo.walking} phase={frame * 0.32} arm={frame >= Me.start + 4 ? -130 : undefined} frame={frame} happy={frame >= Me.start ? 1 : 0} jump={frame >= Me.start + 4 ? Math.abs(Math.sin(frame * 0.3)) * 20 : 0} />
          </Placed>
        </>
      ) : null}
      <Bubble x={1300} y={300} text="That's me!" pop={interpolate(frame, [Me.start + 4, Me.start + 12], [0, 1], clamp)} w={300} tail="right" />
    </Stage>
  );
};

export const StoryLobbyTV: React.FC = () => {
  const tl = lobbyTimeline;
  const Sc = tl.at("screens");
  const end = tl.at("end");
  return (
    <AbsoluteFill style={{ background: "#e0e7ff" }}>
      <Sequence durationInFrames={end.start + 8}>
        <SceneFade dur={end.start + 8} inFrames={6} outFrames={8}>
          <LobbyWorld tl={tl} />
        </SceneFade>
      </Sequence>
      <Sequence from={end.start}>
        <SceneFade dur={end.dur} inFrames={8} outFrames={1}>
          <EndCard title="Displays" tagline="Recognition everyone sees." color="#4f46e5" featured={["Displays"]} bg="linear-gradient(135deg, #e0e7ff, #fef9c3)" />
        </SceneFade>
      </Sequence>
      <BrandBug pillar="Displays" dark={false} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} at={Sc.start + Math.round((Sc.dur / 3) * i)} name="whoosh" volume={0.3} />
      ))}
      <Sfx at={tl.at("thatsme").start} name="ding" volume={0.45} />
      <Sfx at={end.start} name="chime" volume={0.45} />
      <Music timeline={tl} track="lobby-lounge" volume={0.5} duckTo={0.38} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * A Principal's Morning (wide + tall)
 * ════════════════════════════════════════════════════════════════════ */

export const principalTimeline = buildTimeline("story-principal-morning");

const PrincipalWorld: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const scene = tl.scenes.find((s) => frame >= s.start && frame < s.start + s.dur) ?? tl.scenes[0];
  const t = frame - scene.start;
  const walk = walkTo(t, 0, scene.dur, -150, 2050);
  const passX = walk.x;
  const principal = (
    <Placed x={passX} y={GROUND}>
      <Character look={PRINCIPAL} walking phase={frame * 0.28} frame={frame} happy={0} arm={t % 80 < 20 ? -40 : undefined} blink={frame % 90 < 4} />
    </Placed>
  );
  const follow = { f: 0, s: 1, x: 300, y: 540 };
  const tall = (f: number) => ({ s: 1, x: Math.max(300, walkTo(f - scene.start, 0, scene.dur, -150, 2050).x + 100), y: 540 });
  if (scene.name === "kiosk") {
    const tap = 26;
    const arm = interpolate(t, [10, 20, 36, 44], [90, READER_ARM, READER_ARM, 90], clamp);
    return (
      <Stage frame={frame} cam={[{ ...follow, x: 960 }]} tall={tall}>
        <Hallway />
        <Kiosk scanned={t >= tap} led={t >= tap ? 1 : 0} ring={interpolate(t, [tap, tap + 22], [0, 1], clamp)} />
        <Placed x={STOP_X} y={GROUND}>
          <Character look={LOOKS.maya} arm={arm} holdCard={t >= 12 && t < 40} frame={frame} happy={t > tap ? 1 : 0} />
        </Placed>
        {principal}
      </Stage>
    );
  }
  if (scene.name === "classroom") {
    const plus = interpolate(t - 30, [0, 30], [0, 1], clamp);
    return (
      <Stage frame={frame} cam={[{ ...follow, x: 960 }]} tall={tall}>
        <ClassroomWall />
        <g transform={`translate(${TV.x} ${TV.y})`}>
          {t >= 30 ? (
            <text x={LEO_SEAT.x - TV.x} y={LEO_SEAT.y - TV.y - 30 - plus * 40} textAnchor="middle" fontFamily={anton} fontSize={40} fill="#f59e0b" opacity={1 - plus}>
              +5
            </text>
          ) : null}
        </g>
        <Placed x={TEACHER_X} y={GROUND}>
          <Character look={LOOKS.msRivera} arm={t > 24 && t < 34 ? 20 : 32} hold="tablet" frame={frame} />
        </Placed>
        {KIDS.map((k, i) => (
          <SeatedKid key={i} look={k.look} x={k.x} frame={frame} happy={t > 32 ? 1 : 0} arm={i === 0 && t > 32 ? -80 : 70} />
        ))}
        {principal}
      </Stage>
    );
  }
  if (scene.name === "library") {
    const scanAt = 30;
    return (
      <Stage frame={frame} cam={[{ ...follow, x: 960 }]} tall={tall}>
        <LibraryRoom />
        <Kiosk scanned={t >= scanAt} led={t >= scanAt ? 1 : 0} ring={interpolate(t, [scanAt, scanAt + 22], [0, 1], clamp)} screen={<LibraryScreen done={t >= scanAt} t={(t - scanAt) / 30} />} />
        <Placed x={STOP_X} y={GROUND}>
          <Character look={LOOKS.jordan} arm={t < 40 ? READER_ARM - 8 : 60} hold="book" frame={frame} happy={t > scanAt ? 1 : 0} />
        </Placed>
        {principal}
      </Stage>
    );
  }
  if (scene.name === "office") {
    const q = "Who is absent today?";
    return (
      <Stage frame={frame} cam={[{ ...follow, x: 960 }]} tall={tall}>
        <OfficeRoom monitor={<OfficeUI w={MON.w} h={MON.h} question={typed(q, t, 10, 1.4)} answerIn={(t - 30) / 10} answer={<AbsentAnswer w={MON.w} h={MON.h} />} />} />
        <Placed x={PARK_X} y={GROUND}>
          <Character look={MS_PARK} arm={t > 8 && t < 30 ? 40 + Math.sin(t * 2) * 6 : 60} frame={frame} happy={t > 30 ? 1 : 0} />
        </Placed>
        {principal}
        <Counter />
      </Stage>
    );
  }
  return (
    <Stage frame={frame} cam={[{ f: 0, s: 1.1, x: 960, y: 560 }]} tall={tall}>
      <Hallway />
      {principal}
    </Stage>
  );
};

const PLACE: Record<string, [string, Pillar]> = {
  kiosk: ["Kiosk check-in", "Attendance"],
  classroom: ["Classroom points", "Classroom"],
  library: ["Library", "Library"],
  office: ["School Office", "Office"],
};

const PlaceLabel: React.FC<{ label: string; pillar: Pillar }> = ({ label }) => {
  const p = usePop(4, 12, 200);
  return (
    <AbsoluteFill style={{ alignItems: "center", pointerEvents: "none" }}>
      <div style={{ marginTop: 130, padding: "12px 34px", borderRadius: 999, background: "white", fontFamily: outfit, fontWeight: 800, fontSize: 48, color: "#1e3a8a", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", transform: `scale(${p})` }}>
        {label}
      </div>
    </AbsoluteFill>
  );
};

export const StoryPrincipalMorning: React.FC = () => {
  const tl = principalTimeline;
  const end = tl.at("end");
  return (
    <AbsoluteFill style={{ background: "#fdf0d8" }}>
      <Sequence durationInFrames={end.start + 8}>
        <SceneFade dur={end.start + 8} inFrames={6} outFrames={8}>
          <PrincipalWorld tl={tl} />
        </SceneFade>
      </Sequence>
      {tl.scenes
        .filter((s) => PLACE[s.name])
        .map((s) => (
          <Sequence key={s.name} from={s.start} durationInFrames={s.dur}>
            <PlaceLabel label={PLACE[s.name][0]} pillar={PLACE[s.name][1]} />
          </Sequence>
        ))}
      <Sequence durationInFrames={tl.at("start").dur}>
        <ChapterTag text="7:45 AM" color="#1e3a8a" />
      </Sequence>
      <Sequence from={end.start}>
        <SceneFade dur={end.dur} inFrames={8} outFrames={1}>
          <EndCard title="One platform" tagline="Every part of school." color="#1e3a8a" featured={["Rewards", "Attendance", "Library", "Classroom", "Office"]} bg="linear-gradient(135deg, #e0e7ff, #fdf0d8)" />
        </SceneFade>
      </Sequence>
      <BrandBug dark={false} />
      {tl.scenes.slice(1, 5).map((s) => (
        <Sfx key={s.name} at={s.start} name="whoosh" volume={0.35} />
      ))}
      <Sfx at={tl.at("kiosk").start + 26} name="beep" volume={0.35} />
      <Sfx at={tl.at("classroom").start + 30} name="coin" volume={0.4} />
      <Sfx at={tl.at("library").start + 30} name="beep" volume={0.35} />
      <Sfx at={tl.at("office").start + 30} name="pop" volume={0.4} />
      <Sfx at={end.start} name="chime" volume={0.45} />
      <Music timeline={tl} track="principal-march" volume={0.5} duckTo={0.38} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * Office Billing (wide + tall)
 * ════════════════════════════════════════════════════════════════════ */

export const billingTimeline = buildTimeline("story-office-billing");

const FAMILIES = [
  ["Rivera", 240],
  ["Nguyen", 180],
  ["Cohen", 0],
  ["Patel", 0],
  ["Okafor", 60],
] as const;

const BillingUI: React.FC<{ mode: "list" | "paid" | "report"; t: number }> = ({ mode, t }) => {
  const w = MON.w;
  const h = MON.h;
  return (
    <g>
      <rect width={w} height={h} fill="#f8fafc" />
      <rect width={w} height={h * 0.12} fill={TEAL} />
      <text x={16} y={h * 0.085} fontFamily={outfit} fontWeight={800} fontSize={h * 0.06} fill="white">
        School Office · Billing
      </text>
      {mode === "report" ? (
        <g transform={`translate(${w * 0.06} ${h * 0.18})`}>
          <text x={0} y={h * 0.08} fontFamily={outfit} fontWeight={800} fontSize={h * 0.07} fill="#0f172a">
            This month
          </text>
          {[
            ["Paid", 0.86, "#16a34a"],
            ["Owing", 0.14, "#f97316"],
          ].map(([l, v, c], i) => (
            <g key={l as string} transform={`translate(0 ${h * (0.16 + i * 0.2)})`}>
              <text x={0} y={h * 0.08} fontFamily={jakarta} fontWeight={700} fontSize={h * 0.055} fill="#475569">
                {l as string}
              </text>
              <rect x={w * 0.2} y={h * 0.02} width={w * 0.62} height={h * 0.09} rx={h * 0.045} fill="#e2e8f0" />
              <rect x={w * 0.2} y={h * 0.02} width={w * 0.62 * (v as number) * Math.min(1, t / 20)} height={h * 0.09} rx={h * 0.045} fill={c as string} />
            </g>
          ))}
          <text x={0} y={h * 0.66} fontFamily={anton} fontSize={h * 0.1} fill={TEAL}>
            $18,420 collected
          </text>
        </g>
      ) : (
        FAMILIES.map(([name, owed], i) => {
          const paid = mode === "paid" && name === "Rivera";
          const bal = paid ? 0 : owed;
          return (
            <g key={name} transform={`translate(${w * 0.05} ${h * (0.17 + i * 0.155)})`}>
              <rect width={w * 0.9} height={h * 0.13} rx={10} fill={paid ? "#dcfce7" : "white"} stroke={paid ? "#16a34a" : "#e2e8f0"} strokeWidth={2} />
              <text x={12} y={h * 0.088} fontFamily={jakarta} fontWeight={700} fontSize={h * 0.055} fill="#0f172a">
                {name} family
              </text>
              <text x={w * 0.62} y={h * 0.088} textAnchor="end" fontFamily={anton} fontSize={h * 0.06} fill={bal ? "#b91c1c" : "#16a34a"}>
                {bal ? `$${bal}` : paid ? "✓ Paid" : "$0"}
              </text>
              <rect x={w * 0.66} y={h * 0.02} width={w * 0.22} height={h * 0.09} rx={h * 0.045} fill={TEAL} />
              <text x={w * 0.77} y={h * 0.08} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={h * 0.04} fill="white">
                🖨 Print
              </text>
            </g>
          );
        })
      )}
    </g>
  );
};

const BillingWorld: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const Ba = tl.at("balances");
  const Pa = tl.at("pay");
  const Re = tl.at("report");
  const printAt = Ba.start + Math.round(Ba.dur * 0.6);
  const paidAt = Pa.start + Math.round(Pa.dur * 0.62);
  const mode = frame >= Re.start ? "report" : frame >= paidAt ? "paid" : "list";
  const paper = interpolate(frame, [printAt, printAt + 30], [0, 1], clamp);
  const parent = walkTo(frame, Pa.start - 20, Pa.start + 40, 2080, 1480);
  const cam: CamKey[] = [
    { f: 0, s: 1, x: 960, y: 540 },
    { f: Ba.start, s: 1, x: 960, y: 540 },
    { f: Ba.start + 14, s: 2.4, x: MON.x + MON.w / 2, y: MON.y + MON.h / 2 },
    { f: printAt, s: 2.4, x: MON.x + MON.w / 2, y: MON.y + MON.h / 2 },
    { f: printAt + 12, s: 1.6, x: 1250, y: 520 },
    { f: Pa.start, s: 1, x: 960, y: 540 },
    { f: paidAt - 12, s: 1, x: 960, y: 540 },
    { f: paidAt, s: 2.4, x: MON.x + MON.w / 2, y: MON.y + MON.h / 2 },
  ];
  const tall: CamKey[] = [
    { f: 0, s: 1, x: 700, y: 540 },
    { f: Ba.start + 14, s: 1.45, x: MON.x + MON.w / 2, y: MON.y + MON.h / 2 },
    { f: printAt, s: 1.45, x: MON.x + MON.w / 2, y: MON.y + MON.h / 2 },
    { f: printAt + 12, s: 1.3, x: 1260, y: 520 },
    { f: Pa.start, s: 1, x: 1400, y: 540 },
    { f: paidAt - 12, s: 1, x: 1100, y: 540 },
    { f: paidAt, s: 1.45, x: MON.x + MON.w / 2, y: MON.y + MON.h / 2 },
  ];
  return (
    <Stage frame={frame} cam={cam} tall={tall}>
      <OfficeRoom monitor={<BillingUI mode={mode} t={frame - Re.start} />} />
      <Placed x={PARK_X} y={GROUND}>
        <Character look={MS_PARK} arm={(frame > printAt - 12 && frame < printAt) || (frame > paidAt - 16 && frame < paidAt) ? 40 + Math.sin(frame * 2) * 6 : 60} frame={frame} happy={frame >= paidAt ? 1 : 0} blink={frame % 95 < 4} />
      </Placed>
      {frame >= Pa.start - 20 ? (
        <Placed x={parent.x} y={GROUND} face={-1}>
          <Character look={MOM} walking={parent.walking} phase={frame * 0.3} arm={frame > Pa.start + 44 && frame < paidAt ? 20 : undefined} hold={frame > Pa.start + 44 && frame < paidAt - 6 ? "card" : "none"} frame={frame} happy={frame >= paidAt ? 1 : 0} />
        </Placed>
      ) : null}
      <Counter />
      {/* printer */}
      <g transform={`translate(1180 ${GROUND - 330})`}>
        <rect width={170} height={80} rx={12} fill="#475569" />
        <rect x={20} y={-10} width={130} height={20} rx={4} fill="#334155" />
        {paper > 0 ? (
          <g transform={`translate(30 ${60 - paper * 20})`}>
            <rect width={110} height={80 * paper + 10} fill="white" stroke="#cbd5e1" strokeWidth={2} />
            <text x={55} y={30} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={14} fill={TEAL}>
              STATEMENT
            </text>
          </g>
        ) : null}
      </g>
    </Stage>
  );
};

export const StoryOfficeBilling: React.FC = () => {
  const tl = billingTimeline;
  const Ba = tl.at("balances");
  const Pa = tl.at("pay");
  const end = tl.at("end");
  return (
    <AbsoluteFill style={{ background: "#f0fdfa" }}>
      <Sequence durationInFrames={end.start + 8}>
        <SceneFade dur={end.start + 8} inFrames={6} outFrames={8}>
          <BillingWorld tl={tl} />
        </SceneFade>
      </Sequence>
      <Sequence durationInFrames={tl.at("month").dur}>
        <ChapterTag text="END OF THE MONTH" color={TEAL} />
      </Sequence>
      <Sequence from={end.start}>
        <SceneFade dur={end.dur} inFrames={8} outFrames={1}>
          <EndCard title="School Office" tagline="Billing, done." color={TEAL} featured={["Office"]} bg="linear-gradient(135deg, #ccfbf1, #e0f2fe)" />
        </SceneFade>
      </Sequence>
      <BrandBug pillar="Office" dark={false} />
      <Sfx at={Ba.start + Math.round(Ba.dur * 0.6)} name="pop" volume={0.4} />
      {Array.from({ length: 6 }).map((_, i) => (
        <Sfx key={i} at={Ba.start + Math.round(Ba.dur * 0.6) + 4 + i * 4} name="tick" volume={0.15} />
      ))}
      <Sfx at={Pa.start + Math.round(Pa.dur * 0.62)} name="ding" volume={0.45} />
      <Sfx at={end.start} name="chime" volume={0.45} />
      <Music timeline={tl} track="office-bossa" volume={0.45} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * 6-second teasers
 * ════════════════════════════════════════════════════════════════════ */

export const TEASER_FRAMES = 180;
const TEASER_CLIP = 138;

const Sting: React.FC<{ pillar: Pillar; line: string }> = ({ pillar, line }) => {
  const a = usePop(0, 10, 220);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg, #1e1b4b, #7c3aed)", justifyContent: "center", alignItems: "center", textAlign: "center", padding: 40 }}>
      <div style={{ transform: `scale(${a})` }}>
        <LogoLockup size={110} />
      </div>
      <div style={{ fontFamily: anton, fontSize: 90, color: "#fde047", marginTop: 24, transform: `scale(${a})` }}>{line}</div>
      <div style={{ marginTop: 26, opacity: a }}>
        <PillarStrip featured={[pillar]} size={28} />
      </div>
    </AbsoluteFill>
  );
};

/** A 6-second cut: the best ~4.6s of a story, then a logo sting. */
export const makeTeaser = (Comp: React.FC, from: number, pillar: Pillar, line: string): React.FC => {
  const Teaser: React.FC = () => (
    <AbsoluteFill style={{ background: "black" }}>
      <Sequence durationInFrames={TEASER_CLIP}>
        <Sequence from={-from}>
          <Comp />
        </Sequence>
      </Sequence>
      <Sequence from={TEASER_CLIP}>
        <Sting pillar={pillar} line={line} />
      </Sequence>
      <Sfx at={TEASER_CLIP} name="whoosh" volume={0.5} />
    </AbsoluteFill>
  );
  return Teaser;
};
