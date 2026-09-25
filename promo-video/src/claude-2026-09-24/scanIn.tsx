/**
 * Attendance + Rewards: "Morning Scan-In" (1920x1080).
 * An illustrated student walks up to the LevelUp kiosk, taps her ID card,
 * and gets checked in with bonus points — the real kiosk screens appear on
 * the tablet.
 */
import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame } from "remotion";
import {
  LOGO,
  LogoLockup,
  Music,
  Narration,
  PillarStrip,
  SceneFade,
  Sfx,
  anton,
  buildTimeline,
  clamp,
  jakarta,
  outfit,
  shot,
  usePop,
  BrandBug,
} from "./common";
import { CamFn, Character, LOOKS, Stage, useTall } from "./cartoon";

const MAYA = LOOKS.maya;
const FRIEND = LOOKS.friend;
const SHOULDER = { x: 10, y: -385 };

export const scanInTimeline = buildTimeline("attendance-scan-in");

export const GROUND = 900;
export const STOP_X = 1320;
export const SCREEN = { x: 1420, y: 250, w: 240, h: 370 };
const READER = { x: 1398, y: 640, w: 84, h: 52 };
export const READER_CENTER = { x: READER.x + READER.w / 2, y: READER.y + READER.h / 2 };

/* ── Hallway ─────────────────────────────────────────────────────────── */

export const Hallway: React.FC = () => (
  <g>
    <defs>
      <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fdf0d8" />
        <stop offset="1" stopColor="#f3d9ae" />
      </linearGradient>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fbbf24" />
        <stop offset="0.6" stopColor="#fdba74" />
        <stop offset="1" stopColor="#fde68a" />
      </linearGradient>
      <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c9b28f" />
        <stop offset="1" stopColor="#e2d2b6" />
      </linearGradient>
    </defs>
    <rect width={1920} height={720} fill="url(#wall)" />
    {/* window + sunrise */}
    <rect x={1060} y={110} width={250} height={320} rx={10} fill="url(#sky)" stroke="#8b5e34" strokeWidth={14} />
    <circle cx={1185} cy={360} r={60} fill="#fff7ed" opacity={0.85} />
    <line x1={1185} y1={110} x2={1185} y2={430} stroke="#8b5e34" strokeWidth={10} />
    <line x1={1060} y1={270} x2={1310} y2={270} stroke="#8b5e34" strokeWidth={10} />
    <polygon points="1060,430 1310,430 1480,900 860,900" fill="#fff7ed" opacity={0.25} />
    {/* lockers */}
    {Array.from({ length: 8 }).map((_, i) => (
      <g key={i} transform={`translate(${60 + i * 118} 250)`}>
        <rect width={112} height={450} rx={6} fill={i % 3 === 1 ? "#2563eb" : "#3b82f6"} />
        {[0, 1, 2, 3].map((v) => (
          <rect key={v} x={26} y={30 + v * 16} width={60} height={6} rx={3} fill="rgba(0,0,0,0.2)" />
        ))}
        <rect x={86} y={210} width={10} height={44} rx={5} fill="#cbd5e1" />
        <line x1={112} y1={0} x2={112} y2={450} stroke="rgba(0,0,0,0.25)" strokeWidth={4} />
      </g>
    ))}
    {/* wall clock showing 7:52 */}
    <g transform="translate(560 150)">
      <circle r={62} fill="white" stroke="#334155" strokeWidth={10} />
      <line x1={0} y1={0} x2={0} y2={-44} stroke="#0f172a" strokeWidth={6} strokeLinecap="round" transform="rotate(312)" />
      <line x1={0} y1={0} x2={0} y2={-30} stroke="#0f172a" strokeWidth={8} strokeLinecap="round" transform="rotate(236)" />
      <circle r={6} fill="#ef4444" />
    </g>
    {/* poster */}
    <g transform="translate(1720 190) rotate(3)">
      <rect width={170} height={230} rx={8} fill="white" stroke="#e2e8f0" strokeWidth={4} />
      <image href={LOGO} x={35} y={20} width={100} height={100} />
      <text x={85} y={160} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={26} fill="#0f1f3a">
        Scan in
      </text>
      <text x={85} y={194} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={26} fill="#16a34a">
        earn points!
      </text>
    </g>
    {/* baseboard + floor */}
    <rect y={700} width={1920} height={24} fill="#8b5e34" />
    <rect y={724} width={1920} height={356} fill="url(#floor)" />
    {Array.from({ length: 13 }).map((_, i) => (
      <line key={i} x1={960 + (i - 6) * 170} y1={724} x2={960 + (i - 6) * 520} y2={1080} stroke="rgba(0,0,0,0.07)" strokeWidth={3} />
    ))}
    {[800, 880, 990].map((y) => (
      <line key={y} x1={0} y1={y} x2={1920} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth={3} />
    ))}
  </g>
);

/* ── Kiosk ───────────────────────────────────────────────────────────── */

/** LevelUp kiosk on a stand. Pass `screen` to draw custom content on the tablet. */
export const Kiosk: React.FC<{ scanned: boolean; led: number; ring: number; screen?: React.ReactNode }> = ({ scanned, led, ring, screen }) => (
  <g>
    <ellipse cx={1540} cy={GROUND + 4} rx={140} ry={20} fill="rgba(0,0,0,0.18)" />
    <rect x={1470} y={GROUND - 22} width={140} height={26} rx={12} fill="#334155" />
    <rect x={1526} y={600} width={28} height={GROUND - 600} rx={8} fill="#475569" />
    {/* reader arm + reader */}
    <rect x={1470} y={READER.y + 18} width={70} height={16} rx={8} fill="#475569" />
    <rect x={READER.x} y={READER.y} width={READER.w} height={READER.h} rx={12} fill="#1f2937" stroke="#0f172a" strokeWidth={3} />
    {[10, 17, 24].map((r) => (
      <path
        key={r}
        d={`M ${READER_CENTER.x - 6} ${READER_CENTER.y - r * 0.8} A ${r} ${r} 0 0 1 ${READER_CENTER.x - 6} ${READER_CENTER.y + r * 0.8}`}
        stroke={led > 0 ? "#4ade80" : "#94a3b8"}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
      />
    ))}
    <circle cx={READER.x + 12} cy={READER.y + 12} r={5} fill={led > 0 ? "#4ade80" : "#f59e0b"} />
    {ring > 0 && ring < 1 ? (
      <circle
        cx={READER_CENTER.x}
        cy={READER_CENTER.y}
        r={30 + ring * 90}
        fill="none"
        stroke="#4ade80"
        strokeWidth={8 * (1 - ring)}
        opacity={1 - ring}
      />
    ) : null}
    {/* tablet */}
    <rect x={SCREEN.x - 16} y={SCREEN.y - 16} width={SCREEN.w + 32} height={SCREEN.h + 32} rx={26} fill="#0f172a" />
    <clipPath id="screenClip">
      <rect x={SCREEN.x} y={SCREEN.y} width={SCREEN.w} height={SCREEN.h} rx={10} />
    </clipPath>
    <g clipPath="url(#screenClip)">
      <rect x={SCREEN.x} y={SCREEN.y} width={SCREEN.w} height={SCREEN.h} fill="white" />
      {screen ? (
        <g transform={`translate(${SCREEN.x} ${SCREEN.y})`}>{screen}</g>
      ) : scanned ? (
        <image
          href={shot("kiosk-welcome.png")}
          x={SCREEN.x - 205}
          y={SCREEN.y - 10}
          width={650}
          height={SCREEN.h + 20}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : (
        <image href={shot("kiosk-system-ready.png")} x={SCREEN.x} y={SCREEN.y} width={SCREEN.w} height={SCREEN.h} preserveAspectRatio="xMidYMid slice" />
      )}
      {scanned && !screen ? (
        <g>
          <rect x={SCREEN.x} y={SCREEN.y} width={SCREEN.w} height={44} fill="#16a34a" />
          <text x={SCREEN.x + SCREEN.w / 2} y={SCREEN.y + 30} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={20} fill="white">
            ✓ CHECKED IN · ON TIME
          </text>
        </g>
      ) : null}
    </g>
    <circle cx={SCREEN.x + SCREEN.w / 2} cy={SCREEN.y - 7} r={3} fill="#475569" />
  </g>
);

/* ── Scene ───────────────────────────────────────────────────────────── */

const World: React.FC = () => {
  const frame = useCurrentFrame();
  const tl = scanInTimeline;
  const walkEnd = tl.at("walk").dur;
  const T = tl.at("tap").start;
  const P = tl.at("points").start;

  // Maya walks in, then stands at the kiosk.
  const arriveAt = walkEnd - 24;
  const mayaX = interpolate(frame, [12, arriveAt], [-160, STOP_X], { ...clamp, easing: Easing.out(Easing.quad) });
  const walking = frame > 12 && frame < arriveAt - 4;
  const phase = frame * 0.32;

  // Tap: raise the card to the reader.
  const tapDeg = (Math.atan2(READER_CENTER.y - (GROUND - 385), READER_CENTER.x - 18 - (STOP_X + SHOULDER.x)) * 180) / Math.PI;
  const raise = interpolate(frame, [T + 2, T + 16], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const lower = interpolate(frame, [P - 6, P + 6], [0, 1], clamp);
  const scanAt = T + 18;
  const scanned = frame >= scanAt;
  const ring = interpolate(frame, [scanAt, scanAt + 22], [0, 1], clamp);

  // Points: jump + cheer.
  const cheer = interpolate(frame, [P + 4, P + 12], [0, 1], clamp);
  const jump = frame > P + 4 ? Math.max(0, Math.sin(((frame - P - 4) / 16) * Math.PI)) * 60 * (frame < P + 36 ? 1 : 0) : 0;
  let arm: number | undefined;
  if (frame >= T) arm = interpolate(raise - lower, [0, 1], [90, tapDeg]);
  if (cheer > 0) arm = interpolate(cheer, [0, 1], [90, -105]) + Math.sin(frame * 0.5) * 6;

  const blink = frame % 84 < 4;

  // Camera: wide → close on the tap → medium for the celebration.
  const ease = { ...clamp, easing: Easing.inOut(Easing.cubic) };
  const cam: CamFn = (f) => ({
    s: interpolate(f, [T - 12, T + 10, P + 2, P + 20], [1, 1.9, 1.9, 1.4], ease),
    x: interpolate(f, [T - 12, T + 10, P + 2, P + 20], [960, 1440, 1440, 1400], ease),
    y: interpolate(f, [T - 12, T + 10, P + 2, P + 20], [540, 540, 540, 560], ease),
  });
  // Tall: follow Maya down the hall, then close on the kiosk.
  const tall: CamFn = (f) => ({
    s: interpolate(f, [T - 12, T + 10, P + 2, P + 20], [1, 1.5, 1.5, 1.15], ease),
    x: interpolate(f, [T - 12, T + 10], [mayaX + 110, 1450], ease),
    y: 540,
  });

  // Background classmate walking the other way.
  const friendX = interpolate(frame, [0, walkEnd + 40], [1250, 80], clamp);

  const coins = Array.from({ length: 8 });

  return (
    <Stage frame={frame} cam={cam} tall={tall}>
        <Hallway />
        <g transform={`translate(${friendX} 770) scale(-0.62 0.62)`} opacity={0.9} style={{ filter: "blur(1.5px)" }}>
          <ellipse cx={0} cy={0} rx={70} ry={12} fill="rgba(0,0,0,0.15)" />
          <Character look={FRIEND} phase={frame * 0.3 + 1} walking blink={false} />
        </g>
        <Kiosk scanned={scanned} led={scanned ? 1 : 0} ring={ring} />
        <g transform={`translate(${mayaX} ${GROUND})`}>
          <ellipse cx={0} cy={2} rx={90 - jump * 0.4} ry={14} fill="rgba(0,0,0,0.2)" />
          <Character
            look={MAYA}
            phase={phase}
            walking={walking}
            arm={arm}
            jump={jump}
            happy={frame > P ? 1 : 0}
            blink={blink}
            holdCard={frame >= T + 4 && frame < P - 2}
          />
        </g>
        {/* coins burst from the screen */}
        {frame > P
          ? coins.map((_, i) => {
              const t = interpolate(frame - P - i * 2, [0, 28], [0, 1], clamp);
              const ang = -Math.PI / 2 + (i - 3.5) * 0.28;
              const x = SCREEN.x + SCREEN.w / 2 + Math.cos(ang) * 260 * t;
              const y = SCREEN.y + 120 + Math.sin(ang) * 220 * t + 260 * t * t;
              return (
                <g key={i} transform={`translate(${x} ${y})`} opacity={1 - interpolate(t, [0.7, 1], [0, 1], clamp)}>
                  <circle r={16} fill="#facc15" stroke="#b45309" strokeWidth={4} />
                  <text y={6} textAnchor="middle" fontFamily={anton} fontSize={18} fill="#b45309">
                    ★
                  </text>
                </g>
              );
            })
          : null}
    </Stage>
  );
};

const TimeChip: React.FC = () => {
  const p = usePop(8);
  return (
    <div
      style={{
        position: "absolute",
        top: 44,
        right: 60,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 26px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.9)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        fontFamily: outfit,
        fontWeight: 800,
        fontSize: 40,
        color: "#0f1f3a",
        transform: `scale(${p})`,
      }}
    >
      ⏰ 7:52 AM
    </div>
  );
};

const PointsCallout: React.FC = () => {
  const frame = useCurrentFrame();
  const p = usePop(0, 9, 220);
  const rise = interpolate(frame, [0, 40], [30, -20], clamp);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          right: 90,
          top: 420 + rise,
          textAlign: "center",
          transform: `scale(${p}) rotate(-4deg)`,
        }}
      >
        <div
          style={{
            fontFamily: anton,
            fontSize: 190,
            lineHeight: 1,
            color: "#facc15",
            WebkitTextStroke: "6px #92400e",
            paintOrder: "stroke",
            textShadow: "0 10px 0 #92400e",
          }}
        >
          +10
        </div>
        <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 44, color: "white", background: "#16a34a", padding: "8px 26px", borderRadius: 999, marginTop: 8 }}>
          On-time bonus!
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ScanEnd: React.FC = () => {
  const frame = useCurrentFrame();
  const a = usePop(0, 12, 170);
  const b = usePop(10);
  const c = usePop(22);
  const tall = useTall();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(135deg, #fff7ed, #fde68a)", justifyContent: "center", alignItems: "center" }}>
      <svg
        viewBox="-250 -620 500 660"
        width={420}
        height={560}
        style={tall ? { position: "absolute", left: 330, bottom: 80 } : { position: "absolute", left: 120, bottom: 60 }}
      >
        <ellipse cx={0} cy={2} rx={90} ry={14} fill="rgba(0,0,0,0.15)" />
        <Character look={MAYA} phase={frame * 0.2} walking={false} arm={-80 + Math.sin(frame * 0.35) * 22} happy={1} blink={frame % 70 < 4} />
      </svg>
      <div style={{ textAlign: "center", marginLeft: tall ? 0 : 380, marginBottom: tall ? 520 : 0, padding: "0 40px" }}>
        <div style={{ transform: `scale(${a})` }}>
          <LogoLockup size={120} dark={false} />
        </div>
        <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 86, color: "#0f1f3a", marginTop: 40, lineHeight: 1.1, opacity: b }}>
          Attendance <span style={{ color: "#16a34a" }}>done.</span>
          <br />
          Rewards <span style={{ color: "#ec4899" }}>earned.</span>
        </div>
        <div style={{ marginTop: 40, opacity: c }}>
          <PillarStrip featured={["Attendance", "Rewards"]} dark={false} delay={22} size={32} />
        </div>
        <div style={{ marginTop: 34, fontFamily: jakarta, fontWeight: 700, fontSize: 40, color: "#475569", opacity: c }}>leveluprewards.app</div>
      </div>
    </AbsoluteFill>
  );
};

export const AttendanceMorningScanIn: React.FC = () => {
  const tl = scanInTimeline;
  const walk = tl.at("walk");
  const T = tl.at("tap").start;
  const P = tl.at("points").start;
  const end = tl.at("end");
  const arriveAt = walk.dur - 24;
  const steps = Array.from({ length: Math.floor((arriveAt - 16) / 10) });
  return (
    <AbsoluteFill style={{ background: "#fdf0d8" }}>
      <Sequence durationInFrames={end.start + 8}>
        <SceneFade dur={end.start + 8} inFrames={8} outFrames={8}>
          <World />
        </SceneFade>
      </Sequence>
      <Sequence durationInFrames={T}>
        <TimeChip />
      </Sequence>
      <Sequence from={P + 6} durationInFrames={end.start - P - 6}>
        <PointsCallout />
      </Sequence>
      <Sequence from={end.start}>
        <SceneFade dur={end.dur} inFrames={8} outFrames={1}>
          <ScanEnd />
        </SceneFade>
      </Sequence>
      <BrandBug pillar="Attendance" dark={false} />
      {steps.map((_, i) => (
        <Sfx key={i} at={16 + i * 10} name="tick" volume={0.12} />
      ))}
      <Sfx at={T + 18} name="beep" volume={0.4} />
      <Sfx at={P} name="coin" volume={0.6} />
      <Sfx at={P + 5} name="coin" volume={0.45} />
      <Sfx at={P + 6} name="levelup" volume={0.45} />
      <Sfx at={end.start} name="chime" volume={0.5} />
      <Music timeline={tl} track="morning-ukulele" volume={0.5} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};
