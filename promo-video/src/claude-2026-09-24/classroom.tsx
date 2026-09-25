/** Classroom pillar: "Retro Arcade" (vertical) and "Before / After" (square). */
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, useCurrentFrame } from "remotion";
import {
  BrandBug,
  LogoLockup,
  Music,
  Narration,
  PillarStrip,
  SceneFade,
  SceneTiming,
  Scenes,
  Sfx,
  buildTimeline,
  caveat,
  clamp,
  jakarta,
  outfit,
  pixel,
  shot,
  usePop,
} from "./common";

/* ════════════════════════════════════════════════════════════════════
 * Retro Arcade (1080x1920)
 * ════════════════════════════════════════════════════════════════════ */

export const classroomArcadeTimeline = buildTimeline("classroom-arcade");

const NEON = { cyan: "#22d3ee", pink: "#f472b6", yellow: "#facc15", lime: "#a3e635" };

const ArcadeBg: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #0b0620, #1e0b3d 70%, #0b0620)" }}>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 700, perspective: 500, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: -1000,
            right: -1000,
            top: 0,
            height: 1600,
            backgroundImage: `linear-gradient(${NEON.pink}88 3px, transparent 3px), linear-gradient(90deg, ${NEON.pink}88 3px, transparent 3px)`,
            backgroundSize: "100px 100px",
            backgroundPosition: `0 ${(frame * 4) % 100}px`,
            transform: "rotateX(70deg)",
            transformOrigin: "50% 0%",
          }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #1e0b3d, transparent 60%)" }} />
      </div>
      {children}
      <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 2px, transparent 2px 5px)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

const PixelText: React.FC<{ children: React.ReactNode; size: number; color: string; style?: React.CSSProperties }> = ({ children, size, color, style }) => (
  <div
    style={{
      fontFamily: pixel,
      fontSize: size,
      color,
      textShadow: `${size / 12}px ${size / 12}px 0 #000, 0 0 ${size / 2}px ${color}`,
      lineHeight: 1.3,
      textAlign: "center",
      ...style,
    }}
  >
    {children}
  </div>
);

const ArcadeTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const p1 = usePop(0, 10, 220);
  const t = usePop(14, 8, 240);
  return (
    <ArcadeBg>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 50, paddingBottom: 300 }}>
        <PixelText size={64} color={NEON.cyan} style={{ transform: `scale(${p1})` }}>
          PLAYER 1
        </PixelText>
        <PixelText size={120} color={NEON.yellow} style={{ transform: `scale(${t})` }}>
          TEACHER
        </PixelText>
        <PixelText size={44} color="white" style={{ opacity: frame > 30 && frame % 14 < 9 ? 1 : 0, marginTop: 120 }}>
          READY?
        </PixelText>
      </AbsoluteFill>
    </ArcadeBg>
  );
};

// Seat centers in classroom-seating.png (1280x720 source pixels) + points.
const SEATS: Array<[number, number, number]> = [
  [555, 212, 5],
  [773, 212, 10],
  [446, 321, 5],
  [882, 321, 15],
  [664, 430, 10],
  [555, 539, 5],
  [882, 539, 20],
  [446, 648, 10],
  [773, 430, 25],
];
const CROP = { x: 380, y: 150, w: 570, h: 560 };
const CRT_W = 960;
const K = CRT_W / CROP.w;
const POP_START = 30;

const popEvery = (dur: number) => Math.floor((dur - POP_START - 30) / SEATS.length);

const ArcadePlay: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  const every = popEvery(s.dur);
  const enter = usePop(0, 14, 140);
  const popsDone = Math.max(0, Math.min(SEATS.length, Math.floor((frame - POP_START) / every) + 1));
  const score = SEATS.slice(0, popsDone).reduce((sum, x) => sum + x[2], 0) * 10;
  const xp = interpolate(frame, [POP_START, POP_START + every * SEATS.length], [0, 100], clamp);

  return (
    <ArcadeBg>
      <div style={{ position: "absolute", top: 170, left: 60, right: 60, display: "flex", justifyContent: "space-between" }}>
        <PixelText size={34} color={NEON.cyan} style={{ textAlign: "left" }}>
          SCORE
          <br />
          <span style={{ color: "white" }}>{String(score).padStart(6, "0")}</span>
        </PixelText>
        <PixelText size={34} color={NEON.pink} style={{ textAlign: "right" }}>
          STAGE 1
          <br />
          <span style={{ color: "white" }}>GRADE 5</span>
        </PixelText>
      </div>
      <div
        style={{
          position: "absolute",
          top: 360,
          left: 60,
          width: CRT_W,
          height: CROP.h * K,
          borderRadius: 30,
          overflow: "hidden",
          border: `8px solid ${NEON.cyan}`,
          boxShadow: `0 0 60px ${NEON.cyan}, inset 0 0 80px rgba(0,0,0,0.35)`,
          transform: `scale(${enter})`,
        }}
      >
        <Img
          src={shot("classroom-seating.png")}
          style={{ position: "absolute", width: 1280 * K, left: -CROP.x * K, top: -CROP.y * K, maxWidth: "none" }}
        />
        {SEATS.map(([sx, sy, pts], i) => {
          const local = frame - (POP_START + i * every);
          if (local < 0) return null;
          const x = (sx - CROP.x) * K;
          const y = (sy - CROP.y) * K;
          const ring = interpolate(local, [0, 10, 40], [0, 1, 0.35], clamp);
          const rise = interpolate(local, [0, 30], [0, -110], { ...clamp, easing: Easing.out(Easing.quad) });
          const fade = interpolate(local, [20, 36], [1, 0], clamp);
          const color = [NEON.yellow, NEON.pink, NEON.lime][i % 3];
          return (
            <React.Fragment key={i}>
              <div
                style={{
                  position: "absolute",
                  left: x - 95,
                  top: y - 95,
                  width: 190,
                  height: 190,
                  borderRadius: 34,
                  border: `8px solid ${color}`,
                  boxShadow: `0 0 40px ${color}`,
                  opacity: ring,
                }}
              />
              <div style={{ position: "absolute", left: x - 150, width: 300, top: y - 110 + rise, opacity: fade }}>
                <PixelText size={56} color={color}>
                  +{pts}
                </PixelText>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 1360, left: 60, right: 60 }}>
        <PixelText size={32} color={NEON.lime} style={{ textAlign: "left", marginBottom: 20 }}>
          CLASS XP
        </PixelText>
        <div style={{ height: 64, border: "6px solid white", padding: 6, background: "#000" }}>
          <div style={{ height: "100%", width: `${xp}%`, backgroundImage: `repeating-linear-gradient(90deg, ${NEON.lime} 0 36px, #65a30d 36px 42px)` }} />
        </div>
        <PixelText size={36} color="white" style={{ marginTop: 70 }}>
          ONE TAP = POINTS
        </PixelText>
      </div>
    </ArcadeBg>
  );
};

const ArcadeLevelUp: React.FC = () => {
  const frame = useCurrentFrame();
  const flash = interpolate(frame, [0, 6], [0.8, 0], clamp);
  const word = "LEVEL UP!";
  const sparks = Array.from({ length: 24 });
  return (
    <ArcadeBg>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {sparks.map((_, i) => {
          const angle = (i / sparks.length) * Math.PI * 2;
          const dist = interpolate(frame, [0, 30], [0, 700 + (i % 3) * 120], { ...clamp, easing: Easing.out(Easing.cubic) });
          const color = Object.values(NEON)[i % 4];
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 28,
                height: 28,
                background: color,
                boxShadow: `0 0 20px ${color}`,
                transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`,
                opacity: interpolate(frame, [20, 45], [1, 0], clamp),
              }}
            />
          );
        })}
        <div style={{ display: "flex" }}>
          {word.split("").map((ch, i) => (
            <PixelText key={i} size={104} color={NEON.yellow} style={{ transform: `translateY(${Math.sin(frame * 0.35 + i * 0.7) * 22}px)` }}>
              {ch === " " ? " " : ch}
            </PixelText>
          ))}
        </div>
        <PixelText size={44} color={NEON.pink} style={{ marginTop: 60, opacity: frame > 12 ? 1 : 0 }}>
          COMBO x9!
        </PixelText>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "white", opacity: flash }} />
    </ArcadeBg>
  );
};

const ArcadeEnd: React.FC = () => {
  const frame = useCurrentFrame();
  const title = usePop(0, 10, 200);
  const lines = ["> SEATING CHARTS", "> ONE-TAP POINTS", "> LIVE CLASS SCREEN"];
  return (
    <ArcadeBg>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 200 }}>
        <div style={{ transform: `scale(${title})` }}>
          <LogoLockup size={100} />
          <PixelText size={96} color={NEON.yellow} style={{ marginTop: 50 }}>
            CLASSROOM
          </PixelText>
        </div>
        <div style={{ marginTop: 70, display: "flex", flexDirection: "column", gap: 34, alignItems: "flex-start" }}>
          {lines.map((l, i) => {
            const start = 16 + i * 26;
            const n = Math.floor(interpolate(frame, [start, start + 16], [0, l.length], clamp));
            return (
              <PixelText key={l} size={40} color="white" style={{ textAlign: "left" }}>
                {l.slice(0, n)}
              </PixelText>
            );
          })}
        </div>
        <div style={{ marginTop: 80 }}>
          <PillarStrip featured={["Classroom"]} delay={80} size={30} />
        </div>
        <PixelText size={34} color={NEON.pink} style={{ marginTop: 60, opacity: frame > 90 && frame % 14 < 9 ? 1 : 0 }}>
          leveluprewards.app
        </PixelText>
      </AbsoluteFill>
    </ArcadeBg>
  );
};

export const ClassroomRetroArcade: React.FC = () => {
  const tl = classroomArcadeTimeline;
  const play = tl.at("play");
  const every = popEvery(play.dur);
  return (
    <AbsoluteFill style={{ background: "#0b0620" }}>
      <Scenes
        timeline={tl}
        render={{
          title: () => <ArcadeTitle />,
          play: (s) => <ArcadePlay s={s} />,
          levelup: () => <ArcadeLevelUp />,
          end: (s) => (
            <SceneFade dur={s.dur} inFrames={1} outFrames={1}>
              <ArcadeEnd />
            </SceneFade>
          ),
        }}
      />
      <BrandBug pillar="Classroom" style={{ top: 50, left: 50 }} />
      <Sfx at={14} name="impact" volume={0.4} />
      {SEATS.map((_, i) => (
        <Sfx key={i} at={play.start + POP_START + i * every} name="coin" volume={0.45} />
      ))}
      <Sfx at={tl.at("levelup").start} name="levelup" volume={0.6} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} at={tl.at("end").start + 16 + i * 26} name="type" volume={0.4} />
      ))}
      <Music timeline={tl} track="chiptune" volume={0.45} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * Before / After (1080x1080)
 * ════════════════════════════════════════════════════════════════════ */

export const classroomBeforeAfterTimeline = buildTimeline("classroom-before-after");

const MESS = [
  { t: "📝", x: 120, y: 260, r: -14 },
  { t: "📋", x: 760, y: 220, r: 10 },
  { t: "🗒️", x: 220, y: 640, r: 8 },
  { t: "📢", x: 780, y: 620, r: -8 },
  { t: "😵‍💫", x: 470, y: 420, r: 0 },
  { t: "✏️", x: 560, y: 760, r: 20 },
];

const Before: React.FC = () => {
  const frame = useCurrentFrame();
  const label = usePop(0, 12, 200);
  return (
    <AbsoluteFill style={{ background: "#9ca3af", filter: "grayscale(1)" }}>
      {MESS.map((m, i) => {
        const p = interpolate(frame - 8 - i * 7, [0, 8], [0, 1], clamp);
        const jitter = Math.sin(frame * 1.3 + i) * 6;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: m.x,
              top: m.y,
              fontSize: 170,
              transform: `rotate(${m.r + jitter}deg) scale(${p})`,
            }}
          >
            {m.t}
          </div>
        );
      })}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 90 + i * 190,
            top: 900 + Math.sin(frame * 0.8 + i) * 10,
            fontFamily: caveat,
            fontSize: 60,
            color: "#374151",
            opacity: interpolate(frame, [30 + i * 6, 40 + i * 6], [0, 1], clamp),
          }}
        >
          {["shh!", "who?", "wait—", "SIT!", "ugh"][i]}
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: outfit,
          fontWeight: 800,
          fontSize: 110,
          color: "#1f2937",
          transform: `scale(${label})`,
          letterSpacing: 6,
        }}
      >
        BEFORE
      </div>
    </AbsoluteFill>
  );
};

const Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const wipe = interpolate(frame, [0, 14], [0, 100], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const title = usePop(10, 10, 200);
  const glow = 1 + Math.sin(frame * 0.3) * 0.03;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "#9ca3af" }} />
      <AbsoluteFill
        style={{
          background: "linear-gradient(135deg, #7c3aed, #ec4899)",
          clipPath: `circle(${wipe * 1.5}% at 50% 50%)`,
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 110, color: "white", letterSpacing: 6, transform: `scale(${title})` }}>AFTER</div>
        <div style={{ marginTop: 30, transform: `scale(${title * glow})` }}>
          <LogoLockup size={100} />
        </div>
        <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 96, color: "#fde68a", marginTop: 20, transform: `scale(${title})` }}>Classroom</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const FEATURES = ["🪑  Your seating chart", "👆  Points in one tap", "📺  A live class screen"];

const Features: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  const enter = usePop(0, 15, 120);
  const step = Math.floor((s.dur - 50) / 3);
  const zoom = interpolate(frame, [0, s.dur], [1.02, 1.15], clamp);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)", alignItems: "center" }}>
      <div
        style={{
          marginTop: 150,
          width: 960,
          height: 540,
          borderRadius: 28,
          overflow: "hidden",
          border: "10px solid white",
          boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
          transform: `translateY(${(1 - enter) * 600}px)`,
        }}
      >
        <Img src={shot("classroom-seating.png")} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 40, alignItems: "center" }}>
        {FEATURES.map((f, i) => (
          <FeaturePill key={f} text={f} delay={20 + i * step} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const FeaturePill: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const p = usePop(delay, 11, 220);
  return (
    <div
      style={{
        fontFamily: jakarta,
        fontWeight: 700,
        fontSize: 44,
        color: "#4c1d95",
        background: "white",
        padding: "12px 36px",
        borderRadius: 999,
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        transform: `scale(${p})`,
      }}
    >
      {text}
    </div>
  );
};

const BeforeAfterEnd: React.FC = () => {
  const a = usePop(0, 12, 180);
  const b = usePop(10, 9, 220);
  const c = usePop(22);
  return (
    <AbsoluteFill style={{ background: "#faf5ff", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 130, color: "#9ca3af", lineHeight: 1, transform: `scale(${a})` }}>
        Less chaos.
      </div>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 130, color: "#7c3aed", lineHeight: 1.15, transform: `scale(${b})` }}>More learning.</div>
      <div style={{ marginTop: 50, opacity: c }}>
        <LogoLockup size={84} dark={false} />
      </div>
      <div style={{ marginTop: 34, opacity: c }}>
        <PillarStrip featured={["Classroom"]} dark={false} delay={24} size={28} />
      </div>
    </AbsoluteFill>
  );
};

export const ClassroomBeforeAfter: React.FC = () => {
  const tl = classroomBeforeAfterTimeline;
  const features = tl.at("features");
  const step = Math.floor((features.dur - 50) / 3);
  return (
    <AbsoluteFill>
      <Scenes
        timeline={tl}
        render={{
          before: () => <Before />,
          reveal: () => <Reveal />,
          features: (s) => (
            <SceneFade dur={s.dur} inFrames={1}>
              <Features s={s} />
            </SceneFade>
          ),
          end: (s) => (
            <SceneFade dur={s.dur} outFrames={1}>
              <BeforeAfterEnd />
            </SceneFade>
          ),
        }}
      />
      <BrandBug pillar="Classroom" dark={false} scale={0.85} style={{ top: 30, left: 30 }} />
      {MESS.map((_, i) => (
        <Sfx key={i} at={8 + i * 7} name="pop" volume={0.35} />
      ))}
      <Sfx at={tl.at("reveal").start} name="whoosh" volume={0.6} />
      <Sfx at={tl.at("reveal").start + 10} name="levelup" volume={0.45} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} at={features.start + 20 + i * step} name="pop" volume={0.5} />
      ))}
      <Sfx at={tl.at("end").start} name="ding" volume={0.45} />
      <Music timeline={tl} track="before-after-funk" volume={0.5} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};
