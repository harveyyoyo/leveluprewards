/** Rewards: the LevelUp vending machine (tall cartoon, 1080x1920). */
import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  BrandBug,
  LOGO,
  LogoLockup,
  Music,
  Narration,
  PillarStrip,
  SceneFade,
  Sfx,
  Timeline,
  anton,
  buildTimeline,
  clamp,
  jakarta,
  outfit,
  usePop,
} from "./common";
import { Bubble, Character, LOOKS, Placed, armEnd, reachAngle, walkTo } from "./cartoon";

export const vendingTimeline = buildTimeline("story-rewards-vending");

const FLOOR = 1500;
const KID_X = 300;
const KID_S = 1.1;
const TAP = { x: 470, y: 1170, r: 80 };
const PANEL = { x: 580, y: 1080, w: 380, h: 180 };
const WIN = { x: 400, y: 420, w: 560, h: 560 };
const BIN = { x: 430, y: 1320, w: 500, h: 120 };
const PRIZE = { x: 700, y: 850 };

const ITEMS = [
  ["🎁", "🎁", "🎁", "🎁"],
  ["🎧", "🎧", "🔌", "🔋"],
  ["⭐", "⭐", "🍿", "🍫"],
];

const Machine: React.FC<{ frame: number; tapped: boolean; ring: number; pick: number; dropT: number; screen: "idle" | "hello" | "menu" | "picked" }> = ({
  frame,
  tapped,
  ring,
  pick,
  dropT,
  screen,
}) => {
  const glow = 0.5 + 0.5 * Math.sin(frame * 0.15);
  return (
    <g>
      <rect x={350} y={320} width={660} height={1190} rx={60} fill="#d6d3c4" stroke="#a8a29e" strokeWidth={8} />
      <image href={LOGO} x={380} y={340} width={70} height={70} />
      {/* window + shelves */}
      <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} rx={16} fill="#f8fafc" stroke="#a8a29e" strokeWidth={6} />
      {Array.from({ length: 10 }).map((_, i) => (
        <circle key={i} cx={WIN.x + 20 + i * 58} cy={WIN.y + 12} r={4} fill="#fef08a" opacity={glow} />
      ))}
      {ITEMS.map((row, r) => (
        <g key={r}>
          <rect x={WIN.x + 10} y={WIN.y + 150 + r * 180} width={WIN.w - 20} height={14} fill="#e2e8f0" />
          {row.map((it, c) => {
            const isPrize = r === 2 && c === 1;
            if (isPrize && dropT > 0) return null;
            const cx = WIN.x + 80 + c * 135;
            const cy = WIN.y + 90 + r * 180;
            const spin = isPrize ? pick * 360 : 0;
            return (
              <g key={c}>
                <g transform={`translate(${cx} ${cy + 30}) rotate(${spin})`}>
                  <ellipse rx={46} ry={14} fill="none" stroke="#475569" strokeWidth={5} />
                </g>
                <text x={cx} y={cy + 20} textAnchor="middle" fontSize={78} transform={isPrize ? `translate(0 ${pick * 10})` : undefined}>
                  {it}
                </text>
              </g>
            );
          })}
        </g>
      ))}
      {/* falling prize */}
      {dropT > 0 && dropT < 1 ? (
        <text x={PRIZE.x - 30} y={interpolate(dropT, [0, 1], [PRIZE.y + 20, WIN.y + WIN.h - 10])} textAnchor="middle" fontSize={78}>
          ⭐
        </text>
      ) : null}
      <text x={680} y={1040} textAnchor="middle" fontFamily="Georgia, serif" fontSize={34} fill="#57534e" letterSpacing={2}>
        SCHOOL REWARDS SYSTEM
      </text>
      {/* tap circle */}
      <circle cx={TAP.x} cy={TAP.y} r={TAP.r} fill="white" stroke={tapped ? "#16a34a" : "#cbd5e1"} strokeWidth={8} />
      <image href={LOGO} x={TAP.x - 32} y={TAP.y - 60} width={64} height={64} />
      <text x={TAP.x} y={TAP.y + 30} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={20} fill="#0f172a">
        TAP YOUR
      </text>
      <text x={TAP.x} y={TAP.y + 54} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={20} fill="#0f172a">
        CARD HERE
      </text>
      {ring > 0 && ring < 1 ? <circle cx={TAP.x} cy={TAP.y} r={TAP.r + ring * 80} fill="none" stroke="#4ade80" strokeWidth={10 * (1 - ring)} opacity={1 - ring} /> : null}
      {/* touchscreen */}
      <rect x={PANEL.x - 10} y={PANEL.y - 10} width={PANEL.w + 20} height={PANEL.h + 20} rx={16} fill="#111827" />
      <rect x={PANEL.x} y={PANEL.y} width={PANEL.w} height={PANEL.h} rx={8} fill="#e0f2fe" />
      <VendScreen screen={screen} />
      {/* bin */}
      <rect x={BIN.x} y={BIN.y} width={BIN.w} height={BIN.h} rx={16} fill="#292524" />
      <rect x={BIN.x + 20} y={BIN.y + 10} width={BIN.w - 40} height={30} rx={8} fill="#44403c" />
      {dropT >= 1 ? (
        <text x={680} y={BIN.y + 95 - Math.abs(Math.sin(frame * 0.5)) * 6} textAnchor="middle" fontSize={70}>
          ⭐
        </text>
      ) : null}
    </g>
  );
};

const VendScreen: React.FC<{ screen: "idle" | "hello" | "menu" | "picked" }> = ({ screen }) => {
  const { x, y, w, h } = PANEL;
  if (screen === "idle")
    return (
      <text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={34} fill="#0f172a">
        Tap your card to start
      </text>
    );
  if (screen === "hello")
    return (
      <g>
        <text x={x + w / 2} y={y + 70} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={40} fill="#0f172a">
          Hi Jordan! 👋
        </text>
        <text x={x + w / 2} y={y + 130} textAnchor="middle" fontFamily={anton} fontSize={56} fill="#db2777">
          340 PTS
        </text>
      </g>
    );
  const tiles = [
    ["🎁", "300"],
    ["🎧", "250"],
    ["⭐", "150"],
    ["🍿", "100"],
  ];
  return (
    <g>
      {tiles.map(([e, p], i) => {
        const tx = x + 10 + i * 92;
        const sel = screen === "picked" && i === 2;
        return (
          <g key={e}>
            <rect x={tx} y={y + 12} width={84} height={156} rx={12} fill={sel ? "#dcfce7" : "white"} stroke={sel ? "#16a34a" : "#cbd5e1"} strokeWidth={sel ? 5 : 2} />
            <text x={tx + 42} y={y + 82} textAnchor="middle" fontSize={44}>
              {e}
            </text>
            <text x={tx + 42} y={y + 130} textAnchor="middle" fontFamily={anton} fontSize={26} fill="#0f172a">
              {p}
            </text>
            {sel ? (
              <text x={tx + 42} y={y + 158} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={18} fill="#16a34a">
                ✓ PICKED
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
};

const VendWorld: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const I = tl.at("intro");
  const T = tl.at("tap").start;
  const Pk = tl.at("pick").start;
  const D = tl.at("drop").start;
  const Wo = tl.at("wow").start;
  const w = walkTo(frame, Math.round(I.dur * 0.35), I.dur + 10, -250, KID_X);
  const tapAt = T + 16;
  const pickAt = Pk + Math.round(tl.at("pick").dur * 0.55);
  const dropT = interpolate(frame, [D + 4, D + 22], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const screen = frame < tapAt ? "idle" : frame < Pk ? "hello" : frame < pickAt ? "menu" : "picked";
  const reach = reachAngle({ x: (TAP.x - 18 - KID_X) / KID_S, y: (TAP.y - FLOOR) / KID_S });
  let arm: number | undefined;
  if (frame >= T) arm = interpolate(frame, [T + 2, T + 12, T + 28, T + 38], [90, reach, reach, 90], clamp);
  if (frame >= Wo) arm = -80 + Math.sin(frame * 0.4) * 6;
  // Prize flies from the bin into Jordan's raised hand.
  const hand = armEnd(-80);
  const handWorld = { x: KID_X + hand.x * KID_S, y: FLOOR + hand.y * KID_S };
  const fly = interpolate(frame, [Wo - 12, Wo], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });

  const keys = [
    { f: 0, s: 1.35, x: 680, y: 640 },
    { f: I.dur - 10, s: 1, x: 540, y: 960 },
    { f: T, s: 1, x: 540, y: 960 },
    { f: T + 10, s: 1.45, x: 540, y: 1150 },
    { f: Pk, s: 1.45, x: 540, y: 1150 },
    { f: Pk + 12, s: 2, x: PANEL.x + PANEL.w / 2, y: PANEL.y + PANEL.h / 2 },
    { f: D - 4, s: 2, x: PANEL.x + PANEL.w / 2, y: PANEL.y + PANEL.h / 2 },
    { f: D + 8, s: 1.2, x: 640, y: 1000 },
    { f: Wo, s: 1.2, x: 600, y: 1100 },
  ];
  const opt = { ...clamp, easing: Easing.inOut(Easing.cubic) };
  const s = interpolate(frame, keys.map((k) => k.f), keys.map((k) => k.s), opt);
  const cx = interpolate(frame, keys.map((k) => k.f), keys.map((k) => k.x), opt);
  const cy = interpolate(frame, keys.map((k) => k.f), keys.map((k) => k.y), opt);

  return (
    <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
      <g transform={`translate(540 960) scale(${s}) translate(${-cx} ${-cy})`}>
        <rect x={-600} y={-600} width={2280} height={2100} fill="#fde68a" />
        <rect x={-600} y={FLOOR} width={2280} height={1000} fill="#d6c3a5" />
        <rect x={-600} y={FLOOR - 24} width={2280} height={24} fill="#8b5e34" />
        <Machine frame={frame} tapped={frame >= tapAt} ring={interpolate(frame, [tapAt, tapAt + 22], [0, 1], clamp)} pick={interpolate(frame, [D, D + 8], [0, 1], clamp)} dropT={dropT} screen={screen} />
        <Placed x={w.x} y={FLOOR} scale={KID_S}>
          <Character look={LOOKS.jordan} walking={w.walking} phase={frame * 0.32} arm={arm} holdCard={frame >= T + 4 && frame < T + 32} happy={frame >= Wo ? 1 : 0} mouth={frame >= Wo ? "open" : undefined} frame={frame} blink={frame % 88 < 4} />
        </Placed>
        {frame >= Wo - 12 ? (
          <text
            x={interpolate(fly, [0, 1], [680, handWorld.x])}
            y={interpolate(fly, [0, 1], [BIN.y + 90, handWorld.y + 10]) - Math.sin(fly * Math.PI) * 140}
            textAnchor="middle"
            fontSize={90}
          >
            ⭐
          </text>
        ) : null}
        <Bubble x={420} y={780} text="No way!" pop={interpolate(frame, [Wo + 2, Wo + 10], [0, 1], clamp)} w={260} />
      </g>
    </svg>
  );
};

const VendEnd: React.FC = () => {
  const a = usePop(0, 12, 170);
  const b = usePop(12);
  const { width } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg, #fce7f3, #fde68a)", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 50px" }}>
      <div style={{ transform: `scale(${a})` }}>
        <LogoLockup size={110} dark={false} />
      </div>
      <div style={{ fontFamily: anton, fontSize: Math.min(170, width / 6), color: "#db2777", lineHeight: 1, marginTop: 30, transform: `scale(${a})` }}>VENDING</div>
      <div style={{ fontFamily: anton, fontSize: Math.min(170, width / 6), color: "#0f1f3a", lineHeight: 1, transform: `scale(${a})` }}>MACHINE</div>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 60, color: "#0f1f3a", marginTop: 30, opacity: b }}>Points you can hold. ⭐</div>
      <div style={{ marginTop: 44, opacity: b }}>
        <PillarStrip featured={["Rewards"]} dark={false} delay={14} size={32} />
      </div>
      <div style={{ marginTop: 30, fontFamily: jakarta, fontWeight: 700, fontSize: 40, color: "#475569", opacity: b }}>leveluprewards.app</div>
    </AbsoluteFill>
  );
};

export const StoryRewardsVending: React.FC = () => {
  const tl = vendingTimeline;
  const T = tl.at("tap").start;
  const Pk = tl.at("pick");
  const D = tl.at("drop").start;
  const end = tl.at("end");
  return (
    <AbsoluteFill style={{ background: "#fde68a" }}>
      <Sequence durationInFrames={end.start + 8}>
        <SceneFade dur={end.start + 8} inFrames={6} outFrames={8}>
          <VendWorld tl={tl} />
        </SceneFade>
      </Sequence>
      <Sequence from={end.start}>
        <SceneFade dur={end.dur} inFrames={8} outFrames={1}>
          <VendEnd />
        </SceneFade>
      </Sequence>
      <BrandBug pillar="Rewards" dark={false} style={{ top: 60, left: 60 }} />
      <Sfx at={T + 16} name="beep" volume={0.4} />
      <Sfx at={Pk.start + Math.round(Pk.dur * 0.55)} name="pop" volume={0.5} />
      <Sfx at={D} name="tick" volume={0.3} />
      <Sfx at={D + 22} name="impact" volume={0.45} />
      <Sfx at={tl.at("wow").start} name="levelup" volume={0.45} />
      <Sfx at={end.start} name="chime" volume={0.45} />
      <Music timeline={tl} track="vending-bounce" volume={0.5} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};
