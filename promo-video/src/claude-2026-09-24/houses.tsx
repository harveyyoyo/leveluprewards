/** Houses: "Sorting Ceremony" (widescreen movie trailer) and "House Cup Race" (vertical sports broadcast). */
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import {
  BrandBug,
  Confetti,
  LogoLockup,
  Music,
  Narration,
  PillarStrip,
  SceneFade,
  SceneTiming,
  Scenes,
  Sfx,
  anton,
  buildTimeline,
  clamp,
  fraunces,
  frauncesItalic,
  jakarta,
  outfit,
  rnd,
  usePop,
} from "./common";

/** The app's "Quick demo" house pack (src/lib/houses/housePresets.ts). */
export const HOUSES = [
  { name: "Phoenix", color: "#DC2626", emoji: "🔥", motto: "Rise and shine." },
  { name: "Tide", color: "#2563EB", emoji: "🌊", motto: "Stronger together." },
  { name: "Summit", color: "#16A34A", emoji: "⛰️", motto: "Climb every mountain." },
  { name: "Nova", color: "#7C3AED", emoji: "💫", motto: "Bright ideas win." },
];
type House = (typeof HOUSES)[number];

const GOLD = "#fbbf24";

export const Crest: React.FC<{ house: House; size?: number; glow?: number; style?: React.CSSProperties }> = ({
  house,
  size = 220,
  glow = 0,
  style,
}) => (
  <div style={{ width: size, height: size * 1.25, position: "relative", ...style }}>
    <svg viewBox="0 0 200 250" width={size} height={size * 1.25} style={{ overflow: "visible", filter: glow ? `drop-shadow(0 0 ${30 * glow}px ${house.color})` : undefined }}>
      <defs>
        <linearGradient id={`crest-${house.name}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={house.color} />
          <stop offset="1" stopColor="#111827" />
        </linearGradient>
      </defs>
      <path d="M100 4 L196 34 L186 150 Q166 214 100 246 Q34 214 14 150 L4 34 Z" fill={`url(#crest-${house.name})`} stroke={GOLD} strokeWidth={7} />
      <path d="M100 22 L178 46 L170 146 Q154 196 100 224 Q46 196 30 146 L22 46 Z" fill="none" stroke="rgba(251,191,36,0.45)" strokeWidth={3} />
    </svg>
    <div style={{ position: "absolute", top: size * 0.28, left: 0, right: 0, textAlign: "center", fontSize: size * 0.4 }}>{house.emoji}</div>
    <div
      style={{
        position: "absolute",
        bottom: -size * 0.05,
        left: -size * 0.1,
        right: -size * 0.1,
        textAlign: "center",
        fontFamily: fraunces,
        fontWeight: 800,
        fontSize: size * 0.16,
        color: "#111827",
        background: GOLD,
        borderRadius: 8,
        padding: "2px 0",
        boxShadow: "0 6px 16px rgba(0,0,0,0.4)",
      }}
    >
      {house.name}
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════════════════
 * Sorting Ceremony (1920x1080)
 * ════════════════════════════════════════════════════════════════════ */

export const housesSortingTimeline = buildTimeline("houses-sorting");

const Stage: React.FC<{ tint?: string; children: React.ReactNode }> = ({ tint = "#312e81", children }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, ${tint}, #0a0a1a 70%)` }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: -100,
          width: 900,
          height: 1300,
          transform: "translateX(-50%)",
          background: "linear-gradient(180deg, rgba(255,240,200,0.22), rgba(255,240,200,0))",
          clipPath: "polygon(42% 0, 58% 0, 100% 100%, 0 100%)",
        }}
      />
      {Array.from({ length: 40 }).map((_, i) => {
        const y = (rnd(i) * 1100 - frame * (0.4 + rnd(i + 9) * 0.8)) % 1100;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: rnd(i + 50) * 1920,
              top: y < 0 ? y + 1100 : y,
              width: 4 + rnd(i + 7) * 5,
              height: 4 + rnd(i + 7) * 5,
              borderRadius: "50%",
              background: GOLD,
              opacity: 0.25 + 0.5 * Math.abs(Math.sin(frame * 0.05 + i)),
              boxShadow: `0 0 10px ${GOLD}`,
            }}
          />
        );
      })}
      {children}
    </AbsoluteFill>
  );
};

const GoldText: React.FC<{ children: React.ReactNode; size: number; style?: React.CSSProperties; italic?: boolean }> = ({
  children,
  size,
  style,
  italic,
}) => (
  <div
    style={{
      fontFamily: italic ? frauncesItalic : fraunces,
      fontWeight: italic ? 600 : 800,
      fontSize: size,
      lineHeight: 1.1,
      background: "linear-gradient(180deg, #fff7d6, #fbbf24 55%, #b45309)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.6))",
      textAlign: "center",
      ...style,
    }}
  >
    {children}
  </div>
);

const Question: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  const q = interpolate(frame, [s.cues[0] + s.lens[0] * 0.45, s.cues[0] + s.lens[0] * 0.6], [0, 1], clamp);
  return (
    <Stage>
      <AbsoluteFill style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 90, paddingBottom: 120 }}>
        {HOUSES.map((h, i) => {
          const p = interpolate(frame - 6 - i * 8, [0, 20], [0, 1], clamp);
          return (
            <Crest
              key={h.name}
              house={h}
              size={230}
              style={{
                opacity: p * 0.6,
                transform: `translateY(${Math.sin(frame * 0.05 + i) * 12 + (1 - p) * 80}px)`,
                filter: "saturate(0.6)",
              }}
            />
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 170 }}>
        <GoldText size={120} italic style={{ opacity: q, transform: `scale(${0.9 + q * 0.1})` }}>
          Which house will I be in?
        </GoldText>
      </AbsoluteFill>
    </Stage>
  );
};

const DECOY = "If you could talk to any animal, which one would you choose?";

const Ceremony: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  const screen = usePop(0, 16, 110);
  const typed = Math.floor(interpolate(frame, [30, 30 + DECOY.length * 1.2], [0, DECOY.length], clamp));
  const lit = Math.floor(frame / 8) % 4;
  return (
    <Stage tint="#4c1d24">
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            width: 1360,
            height: 780,
            borderRadius: 26,
            border: "18px solid #0b0b10",
            boxShadow: "0 50px 120px rgba(0,0,0,0.7), 0 0 0 2px rgba(251,191,36,0.3)",
            background: "radial-gradient(ellipse at 50% 20%, #5b1a1a, #1a0a0a 75%)",
            transform: `perspective(1800px) rotateX(${(1 - screen) * 25}deg) scale(${0.85 + screen * 0.15})`,
            opacity: screen,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 50,
          }}
        >
          <GoldText size={78}>Sorting Ceremony</GoldText>
          <div style={{ display: "flex", alignItems: "center", gap: 26, marginTop: 36 }}>
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: 55,
                background: GOLD,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: outfit,
                fontWeight: 800,
                fontSize: 46,
                color: "#1a0a0a",
              }}
            >
              JM
            </div>
            <div style={{ fontFamily: fraunces, fontWeight: 800, fontSize: 64, color: "white" }}>Jordan M.</div>
          </div>
          <div style={{ fontFamily: jakarta, fontWeight: 600, fontSize: 38, color: "#fde68a", marginTop: 30, height: 50, maxWidth: 1150, textAlign: "center" }}>
            {DECOY.slice(0, typed)}
          </div>
          <div style={{ display: "flex", gap: 70, marginTop: 50 }}>
            {HOUSES.map((h, i) => (
              <Crest key={h.name} house={h} size={120} glow={i === lit ? 1 : 0} style={{ opacity: i === lit ? 1 : 0.45, transform: `scale(${i === lit ? 1.1 : 1})` }} />
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

/** Frame (within the reveal scene) where the wheel of crests lands on Phoenix. */
const landFrame = (s: SceneTiming) => Math.round(s.cues[0] + s.lens[0] * 0.8);
const REVEAL_STEPS = 20; // multiple of 4 so it lands on HOUSES[0] (Phoenix)

const Reveal: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  const land = landFrame(s);
  const p = interpolate(frame, [4, land], [0, REVEAL_STEPS], { ...clamp, easing: Easing.out(Easing.cubic) });
  const lit = Math.floor(p) % 4;
  const after = frame - land;
  const burst = interpolate(after, [0, 16], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.4)) });
  const flash = interpolate(after, [0, 8], [0.9, 0], clamp);
  const phoenix = HOUSES[0];
  return (
    <Stage tint={after >= 0 ? "#7f1d1d" : "#312e81"}>
      {after < 0 ? (
        <AbsoluteFill style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 80 }}>
          {HOUSES.map((h, i) => (
            <Crest
              key={h.name}
              house={h}
              size={260}
              glow={i === lit ? 1.2 : 0}
              style={{ opacity: i === lit ? 1 : 0.35, transform: `scale(${i === lit ? 1.15 : 0.95})` }}
            />
          ))}
        </AbsoluteFill>
      ) : (
        <>
          <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, ${phoenix.color}aa, transparent 60%)` }} />
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 60 }}>
            <Crest house={phoenix} size={330} glow={1.5} style={{ transform: `scale(${burst})` }} />
            <GoldText size={150} style={{ marginTop: 20, letterSpacing: 10, opacity: burst }}>
              PHOENIX
            </GoldText>
            <div style={{ fontFamily: frauncesItalic, fontWeight: 600, fontSize: 56, color: "#fde68a", opacity: burst }}>“{phoenix.motto}”</div>
          </AbsoluteFill>
          <Confetti from={land - (frame - after)} colors={[phoenix.color, GOLD, "#fff7d6", "#f97316"]} width={1920} height={1080} count={120} />
        </>
      )}
      <AbsoluteFill style={{ background: "white", opacity: after >= 0 ? flash : 0 }} />
    </Stage>
  );
};

const SOURCES = [
  { label: "+5 Class award", house: 0 },
  { label: "+10 On time", house: 1 },
  { label: "+20 Reading", house: 2 },
  { label: "+15 Coupon", house: 0 },
  { label: "+10 Kindness", house: 3 },
  { label: "+5 Class award", house: 1 },
];

const Rollup: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  const title = usePop(0);
  const every = Math.floor((s.dur - 50) / SOURCES.length);
  const base = [1180, 1105, 1020, 990];
  const gained = [0, 0, 0, 0];
  SOURCES.forEach((src, i) => {
    const arrive = 20 + i * every + 18;
    gained[src.house] += interpolate(frame, [arrive, arrive + 8], [0, parseInt(src.label.slice(1), 10) * 6], clamp);
  });
  const scores = base.map((b, i) => Math.round(b + gained[i]));
  const max = 1400;
  return (
    <Stage tint="#1e1b4b">
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 110 }}>
        <GoldText size={84} style={{ transform: `scale(${title})` }}>
          Every point counts for your house
        </GoldText>
        <div style={{ marginTop: 60, width: 1500, display: "flex", flexDirection: "column", gap: 34 }}>
          {HOUSES.map((h, i) => (
            <div key={h.name} style={{ display: "flex", alignItems: "center", gap: 28 }}>
              <Crest house={h} size={90} />
              <div style={{ flex: 1, height: 70, background: "rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden", border: "2px solid rgba(251,191,36,0.3)" }}>
                <div
                  style={{
                    width: `${(scores[i] / max) * 100}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${h.color}, ${h.color}cc)`,
                    boxShadow: `0 0 30px ${h.color}`,
                  }}
                />
              </div>
              <div style={{ width: 170, fontFamily: anton, fontSize: 60, color: "white", textAlign: "right" }}>{scores[i]}</div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
      {SOURCES.map((src, i) => {
        const t = frame - (20 + i * every);
        if (t < 0 || t > 30) return null;
        const x = interpolate(t, [0, 18], [-300, 700], { ...clamp, easing: Easing.out(Easing.cubic) });
        const y = 330 + src.house * 138;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              padding: "10px 26px",
              borderRadius: 999,
              background: "white",
              color: HOUSES[src.house].color,
              fontFamily: outfit,
              fontWeight: 800,
              fontSize: 40,
              opacity: interpolate(t, [18, 28], [1, 0], clamp),
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            {src.label}
          </div>
        );
      })}
    </Stage>
  );
};

const SortingEnd: React.FC = () => {
  const a = usePop(0, 12, 160);
  const b = usePop(14);
  return (
    <Stage>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div style={{ transform: `scale(${a})` }}>
          <LogoLockup size={110} />
        </div>
        <GoldText size={170} style={{ marginTop: 20, transform: `scale(${a})` }}>
          Houses
        </GoldText>
        <div style={{ fontFamily: jakarta, fontWeight: 700, fontSize: 44, color: "#fde68a", opacity: b, marginTop: 10 }}>
          Sorting ceremonies · House points · Hall of Fame
        </div>
        <div style={{ marginTop: 44, opacity: b }}>
          <PillarStrip featured={["Houses"]} delay={16} size={32} />
        </div>
        <div style={{ marginTop: 34, fontFamily: outfit, fontWeight: 800, fontSize: 44, color: "white", opacity: b }}>leveluprewards.app</div>
      </AbsoluteFill>
    </Stage>
  );
};

export const HousesSortingCeremony: React.FC = () => {
  const tl = housesSortingTimeline;
  const reveal = tl.at("reveal");
  const land = reveal.start + landFrame(reveal);
  // A tick each time the highlight moves to the next crest.
  const ticks: number[] = [];
  let last = -1;
  for (let f = 4; f < landFrame(reveal); f++) {
    const step = Math.floor(interpolate(f, [4, landFrame(reveal)], [0, REVEAL_STEPS], { ...clamp, easing: Easing.out(Easing.cubic) }));
    if (step !== last) ticks.push(reveal.start + f);
    last = step;
  }
  const rollup = tl.at("rollup");
  const every = Math.floor((rollup.dur - 50) / SOURCES.length);
  return (
    <AbsoluteFill style={{ background: "#0a0a1a" }}>
      <Scenes
        timeline={tl}
        render={{
          question: (s) => (
            <SceneFade dur={s.dur} inFrames={12} outFrames={8}>
              <Question s={s} />
            </SceneFade>
          ),
          ceremony: (s) => (
            <SceneFade dur={s.dur} inFrames={8} outFrames={6}>
              <Ceremony s={s} />
            </SceneFade>
          ),
          reveal: (s) => (
            <SceneFade dur={s.dur} inFrames={6} outFrames={8}>
              <Reveal s={s} />
            </SceneFade>
          ),
          rollup: (s) => (
            <SceneFade dur={s.dur} inFrames={8} outFrames={8}>
              <Rollup s={s} />
            </SceneFade>
          ),
          end: (s) => (
            <SceneFade dur={s.dur} inFrames={8} outFrames={1}>
              <SortingEnd />
            </SceneFade>
          ),
        }}
      />
      <BrandBug pillar="Houses" />
      {ticks.map((t) => (
        <Sfx key={t} at={t} name="tick" volume={0.35} />
      ))}
      <Sfx at={land} name="impact" volume={0.7} />
      <Sfx at={land + 2} name="crowd" volume={0.5} />
      {SOURCES.map((_, i) => (
        <Sfx key={i} at={rollup.start + 20 + i * every + 18} name="coin" volume={0.3} />
      ))}
      <Sfx at={tl.at("end").start} name="chime" volume={0.5} />
      <Music timeline={tl} track="ceremony-epic" volume={0.6} duckTo={0.4} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * House Cup Race (1080x1920) — sports broadcast
 * ════════════════════════════════════════════════════════════════════ */

export const housesRaceTimeline = buildTimeline("houses-race");

const Trophy: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <svg viewBox="0 0 200 220" width={size} height={size * 1.1} style={style}>
    <defs>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff7d6" />
        <stop offset="0.5" stopColor="#fbbf24" />
        <stop offset="1" stopColor="#b45309" />
      </linearGradient>
    </defs>
    <path d="M40 20 H160 V70 Q160 130 100 140 Q40 130 40 70 Z" fill="url(#gold)" />
    <path d="M40 35 Q5 35 10 70 Q15 100 48 105" fill="none" stroke="url(#gold)" strokeWidth={12} />
    <path d="M160 35 Q195 35 190 70 Q185 100 152 105" fill="none" stroke="url(#gold)" strokeWidth={12} />
    <rect x={88} y={138} width={24} height={34} fill="url(#gold)" />
    <rect x={55} y={170} width={90} height={24} rx={6} fill="url(#gold)" />
    <rect x={45} y={192} width={110} height={22} rx={6} fill="#78350f" />
    <text x={100} y={85} textAnchor="middle" fontFamily={anton} fontSize={30} fill="#78350f">
      CUP
    </text>
  </svg>
);

const Arena: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #020617, #0b1e3f 45%, #052e16 100%)" }}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: -100,
            left: 100 + i * 280,
            width: 180,
            height: 1400,
            background: "linear-gradient(180deg, rgba(255,255,255,0.22), transparent 70%)",
            transform: `rotate(${Math.sin(frame * 0.03 + i * 1.7) * 18}deg)`,
            transformOrigin: "50% 0%",
          }}
        />
      ))}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: 40 + rnd(i) * 200,
            left: rnd(i + 30) * 1080,
            width: 8,
            height: 8,
            borderRadius: 4,
            background: "white",
            opacity: (Math.sin(frame * 0.5 + i * 3) + 1) / 2 > 0.8 ? 1 : 0.15,
          }}
        />
      ))}
      {children}
    </AbsoluteFill>
  );
};

const ScoreBug: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        top: 150,
        left: 60,
        right: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(2,6,23,0.8)",
        border: "3px solid #fbbf24",
        borderRadius: 16,
        padding: "12px 28px",
        zIndex: 5,
      }}
    >
      <span style={{ fontFamily: anton, fontSize: 52, color: "#fbbf24", letterSpacing: 3 }}>🏆 HOUSE CUP</span>
      <span style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: anton, fontSize: 44, color: "white" }}>
        <span style={{ width: 20, height: 20, borderRadius: 10, background: "#ef4444", opacity: frame % 30 < 18 ? 1 : 0.2 }} />
        LIVE
      </span>
    </div>
  );
};

const RaceIntro: React.FC = () => {
  const trophy = usePop(0, 10, 140);
  const frame = useCurrentFrame();
  return (
    <Arena>
      <ScoreBug />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 120 }}>
        <Trophy size={420} style={{ transform: `scale(${trophy}) rotate(${Math.sin(frame * 0.1) * 3}deg)`, filter: "drop-shadow(0 0 40px rgba(251,191,36,0.7))" }} />
        <div style={{ fontFamily: anton, fontSize: 130, color: "white", marginTop: 30, letterSpacing: 4 }}>4 HOUSES</div>
        <div style={{ fontFamily: anton, fontSize: 130, color: "#fbbf24", lineHeight: 0.9, letterSpacing: 4 }}>1 TROPHY</div>
        <div style={{ display: "flex", gap: 30, marginTop: 60 }}>
          {HOUSES.map((h, i) => {
            const p = interpolate(frame - 20 - i * 6, [0, 10], [0, 1], clamp);
            return <Crest key={h.name} house={h} size={170} style={{ transform: `translateY(${(1 - p) * 300}px)`, opacity: p }} />;
          })}
        </div>
      </AbsoluteFill>
    </Arena>
  );
};

/** Score keyframes (Phoenix, Tide, Summit, Nova) at story beats of the commentary. */
const RACE_KEYS = [
  [100, 100, 100, 100],
  [300, 420, 280, 260], // Tide pulls ahead
  [480, 470, 330, 320], // Phoenix charges
  [560, 560, 520, 500], // neck and neck
  [600, 590, 650, 580], // Summit surges
  [660, 640, 700, 725], // Nova at the buzzer
];
const CALLS = ["🌊 TIDE PULLS AHEAD", "🔥 PHOENIX CHARGES", "NECK AND NECK!", "⛰️ SUMMIT SURGES", "💫 NOVA WINS IT!"];

const raceBeats = (s: SceneTiming) => [
  0,
  s.cues[0] + s.lens[0] * 0.4,
  s.cues[0] + s.lens[0] * 0.95,
  s.cues[1] + s.lens[1] * 0.3,
  s.cues[1] + s.lens[1] * 0.55,
  s.cues[1] + s.lens[1] * 0.95,
];

const Race: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  const beats = raceBeats(s);
  const scores = HOUSES.map((_, h) =>
    interpolate(frame, beats, RACE_KEYS.map((k) => k[h]), { ...clamp, easing: Easing.inOut(Easing.quad) }),
  );
  const leader = scores.indexOf(Math.max(...scores));
  const callIdx = Math.max(0, beats.filter((b) => frame >= b).length - 2);
  const callStart = callIdx === 0 ? 0 : beats[Math.min(5, callIdx + 1)];
  const callPop = interpolate(frame - callStart, [0, 6], [0.6, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
  const finished = frame >= beats[5];
  return (
    <Arena>
      <ScoreBug />
      <div style={{ position: "absolute", top: 330, left: 50, right: 50 }}>
        {HOUSES.map((h, i) => {
          const x = interpolate(scores[i], [100, 760], [0, 720], clamp);
          const lead = i === leader;
          return (
            <div
              key={h.name}
              style={{
                position: "relative",
                height: 250,
                marginBottom: 18,
                borderRadius: 20,
                background: lead ? `linear-gradient(90deg, ${h.color}55, rgba(255,255,255,0.05))` : "rgba(255,255,255,0.05)",
                border: lead ? `4px solid ${h.color}` : "4px solid rgba(255,255,255,0.12)",
                boxShadow: lead ? `0 0 40px ${h.color}` : undefined,
              }}
            >
              <div style={{ position: "absolute", top: 18, left: 26, fontFamily: anton, fontSize: 46, color: "white", letterSpacing: 2 }}>
                {h.name.toUpperCase()}
              </div>
              <div style={{ position: "absolute", top: 12, right: 26, fontFamily: anton, fontSize: 64, color: lead ? "#fbbf24" : "white", fontVariantNumeric: "tabular-nums" }}>
                {Math.round(scores[i])}
              </div>
              <div style={{ position: "absolute", left: 30, right: 30, bottom: 50, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.15)" }} />
              <div style={{ position: "absolute", left: 30, bottom: 50, width: x + 60, height: 8, borderRadius: 4, background: h.color }} />
              <div
                style={{
                  position: "absolute",
                  left: 30 + x,
                  bottom: 18,
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  background: h.color,
                  border: "6px solid white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 64,
                  transform: `translateY(${Math.abs(Math.sin(frame * 0.4 + i)) * -10}px)`,
                }}
              >
                {h.emoji}
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 190,
          display: "flex",
          justifyContent: "center",
          transform: `scale(${callPop})`,
        }}
      >
        <div
          key={callIdx}
          style={{
            fontFamily: anton,
            fontSize: 92,
            color: finished ? "#111" : "white",
            background: finished ? "#fbbf24" : "#dc2626",
            padding: "10px 40px",
            transform: "skewX(-8deg)",
            boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
            letterSpacing: 2,
          }}
        >
          {CALLS[Math.min(4, callIdx)]}
        </div>
      </div>
      {finished ? <Confetti from={beats[5]} colors={[HOUSES[3].color, "#fbbf24", "white"]} width={1080} height={1920} count={100} /> : null}
    </Arena>
  );
};

const RaceEnd: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const a = usePop(0, 12, 160);
  const chips = ["⭐ Every class award", "🎟️ Every coupon", "⏰ Every on-time check-in"];
  const each = (s.lens[0] * 0.7) / 3;
  const brand = usePop(Math.round(s.cues[0] + s.lens[0] * 0.75));
  return (
    <Arena>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 200 }}>
        <div style={{ position: "relative", transform: `scale(${a})` }}>
          <Trophy size={300} style={{ filter: "drop-shadow(0 0 40px rgba(251,191,36,0.7))" }} />
          <Crest house={HOUSES[3]} size={150} style={{ position: "absolute", right: -130, bottom: -20 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 70, alignItems: "center" }}>
          {chips.map((c, i) => (
            <RaceChip key={c} text={c} delay={Math.round(s.cues[0] + i * each)} />
          ))}
        </div>
        <div style={{ fontFamily: anton, fontSize: 84, color: "#fbbf24", marginTop: 40, opacity: brand }}>MOVES THE BOARD.</div>
        <div style={{ marginTop: 50, opacity: brand, transform: `scale(${brand})` }}>
          <LogoLockup size={100} />
        </div>
        <div style={{ fontFamily: anton, fontSize: 120, color: "white", letterSpacing: 6, opacity: brand }}>HOUSES</div>
        <div style={{ marginTop: 30, opacity: brand }}>
          <PillarStrip featured={["Houses"]} delay={Math.round(s.cues[0] + s.lens[0] * 0.8)} size={30} />
        </div>
      </AbsoluteFill>
    </Arena>
  );
};

const RaceChip: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const p = usePop(delay, 11, 220);
  return (
    <div
      style={{
        fontFamily: outfit,
        fontWeight: 800,
        fontSize: 54,
        color: "white",
        background: "rgba(255,255,255,0.12)",
        border: "3px solid rgba(255,255,255,0.35)",
        padding: "12px 40px",
        borderRadius: 999,
        transform: `scale(${p})`,
      }}
    >
      {text}
    </div>
  );
};

export const HousesCupRace: React.FC = () => {
  const tl = housesRaceTimeline;
  const race = tl.at("race");
  const beats = raceBeats(race).map((b) => race.start + Math.round(b));
  return (
    <AbsoluteFill style={{ background: "#020617" }}>
      <Scenes
        timeline={tl}
        render={{
          intro: () => <RaceIntro />,
          race: (s) => <Race s={s} />,
          end: (s) => (
            <SceneFade dur={s.dur} inFrames={8} outFrames={1}>
              <RaceEnd s={s} />
            </SceneFade>
          ),
        }}
      />
      <BrandBug pillar="Houses" style={{ top: 50, left: 50 }} />
      <Sfx at={0} name="crowd" volume={0.35} />
      <Sfx at={4} name="impact" volume={0.5} />
      {beats.slice(1, 5).map((b) => (
        <Sfx key={b} at={b} name="whoosh" volume={0.4} />
      ))}
      <Sfx at={beats[5]} name="buzzer" volume={0.55} />
      <Sfx at={beats[5] + 4} name="crowd" volume={0.6} />
      <Music timeline={tl} track="stadium-stomp" volume={0.55} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};
