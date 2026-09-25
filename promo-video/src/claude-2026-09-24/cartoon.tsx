/**
 * Cartoon kit for the illustrated LevelUp videos: side-view characters
 * (kids + adults), props, and reusable backdrops. Everything is SVG in a
 * 1920x1080 world; characters stand with their feet at (0, 0) facing right.
 */
import React from "react";
import { interpolate, useVideoConfig } from "remotion";
import { LOGO, outfit } from "./common";

/* ── Characters ──────────────────────────────────────────────────────── */

export type Look = {
  skin: string;
  hair: string;
  hairStyle?: "ponytail" | "short" | "bun" | "curly" | "long";
  top: string;
  pants: string;
  shoes: string;
  /** Backpack colour; omit for no backpack. */
  bag?: string;
  glasses?: boolean;
  lanyard?: boolean;
  /** Adults are drawn taller. */
  adult?: boolean;
  /** Collar/cardigan accent. */
  accent?: string;
};

export const LOOKS = {
  maya: { skin: "#a8683f", hair: "#24160f", hairStyle: "ponytail", top: "#0ea5e9", pants: "#1e3a8a", shoes: "#f8fafc", bag: "#f97316", lanyard: true },
  jordan: { skin: "#6b4226", hair: "#111827", hairStyle: "curly", top: "#f97316", pants: "#334155", shoes: "#facc15", bag: "#16a34a", lanyard: true },
  leo: { skin: "#f1c7a5", hair: "#b45309", hairStyle: "short", top: "#22c55e", pants: "#1e293b", shoes: "#ef4444", lanyard: true },
  ava: { skin: "#e0ac85", hair: "#7c2d12", hairStyle: "long", top: "#ec4899", pants: "#312e81", shoes: "#f8fafc", bag: "#8b5cf6", lanyard: true },
  friend: { skin: "#f1c7a5", hair: "#c08a2d", hairStyle: "ponytail", top: "#8b5cf6", pants: "#334155", shoes: "#ef4444", bag: "#22c55e" },
  msRivera: { skin: "#c68642", hair: "#1c1917", hairStyle: "bun", top: "#7c3aed", pants: "#1f2937", shoes: "#111827", glasses: true, adult: true, accent: "#fde68a", lanyard: true },
  mrChen: { skin: "#e8b98a", hair: "#1f2937", hairStyle: "short", top: "#0f766e", pants: "#374151", shoes: "#111827", glasses: true, adult: true, accent: "#f8fafc", lanyard: true },
  dad: { skin: "#f1c7a5", hair: "#b45309", hairStyle: "short", top: "#1d4ed8", pants: "#1f2937", shoes: "#111827", adult: true, accent: "#f8fafc" },
} satisfies Record<string, Look>;

export type Hold = "card" | "book" | "tablet" | "phone" | "pizza" | "none";

const SHOULDER = { x: 10, y: -385 };
const ARM_LEN = 172;

export const armEnd = (deg: number) => ({
  x: SHOULDER.x + Math.cos((deg * Math.PI) / 180) * ARM_LEN,
  y: SHOULDER.y + Math.sin((deg * Math.PI) / 180) * ARM_LEN,
});

/** Angle (deg) for the front arm so the hand reaches `target`, both in character-local coordinates. */
export const reachAngle = (target: { x: number; y: number }) =>
  (Math.atan2(target.y - SHOULDER.y, target.x - SHOULDER.x) * 180) / Math.PI;

const Limb: React.FC<{ x: number; y: number; len: number; w: number; deg: number; color: string; end?: React.ReactNode }> = ({
  x,
  y,
  len,
  w,
  deg,
  color,
  end,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${deg})`}>
    <rect x={-w / 2} y={-w / 2} width={len + w / 2} height={w} rx={w / 2} fill={color} />
    {end ? <g transform={`translate(${len} 0) rotate(${-deg})`}>{end}</g> : null}
  </g>
);

const HeldItem: React.FC<{ hold: Hold; tilt?: number }> = ({ hold, tilt = -8 }) => {
  switch (hold) {
    case "card":
      return (
        <g transform={`rotate(${tilt})`}>
          <rect x={-26} y={-17} width={52} height={36} rx={5} fill="white" stroke="#1e3a8a" strokeWidth={3} />
          <rect x={-26} y={-17} width={52} height={10} rx={4} fill="#1e3a8a" />
          <circle cx={-12} cy={6} r={6} fill="#94a3b8" />
          <rect x={0} y={2} width={18} height={4} fill="#94a3b8" />
          <rect x={0} y={10} width={12} height={4} fill="#94a3b8" />
        </g>
      );
    case "book":
      return (
        <g transform={`rotate(${tilt})`}>
          <rect x={-10} y={-40} width={62} height={80} rx={4} fill="#dc2626" stroke="#7f1d1d" strokeWidth={3} />
          <rect x={-10} y={-40} width={10} height={80} fill="#7f1d1d" />
          <rect x={8} y={-24} width={34} height={6} fill="#fde68a" />
          <rect x={8} y={14} width={34} height={10} fill="white" />
          {[10, 14, 17, 21, 24, 28, 32, 35, 38].map((x) => (
            <rect key={x} x={x} y={15} width={x % 2 ? 1.5 : 2.5} height={8} fill="#111" />
          ))}
        </g>
      );
    case "tablet":
      return (
        <g transform={`rotate(${tilt})`}>
          <rect x={-10} y={-50} width={100} height={72} rx={10} fill="#111827" />
          <rect x={-3} y={-43} width={86} height={58} rx={5} fill="#e0e7ff" />
          {[0, 1, 2].map((r) =>
            [0, 1, 2, 3].map((c) => <rect key={`${r}${c}`} x={3 + c * 20} y={-38 + r * 18} width={15} height={13} rx={3} fill={r === 1 && c === 2 ? "#f97316" : "#94a3b8"} />),
          )}
        </g>
      );
    case "phone":
      return (
        <g transform={`rotate(${tilt})`}>
          <rect x={-4} y={-46} width={40} height={74} rx={8} fill="#111827" />
          <rect x={0} y={-40} width={32} height={60} rx={4} fill="#38bdf8" />
        </g>
      );
    case "pizza":
      return (
        <g transform={`rotate(${tilt + 20})`}>
          <path d="M 0 0 L 70 -24 L 62 12 Z" fill="#fbbf24" stroke="#b45309" strokeWidth={4} strokeLinejoin="round" />
          <path d="M 70 -24 L 62 12" stroke="#92400e" strokeWidth={10} strokeLinecap="round" />
          {[
            [30, -6],
            [48, -8],
            [44, 4],
          ].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r={5} fill="#dc2626" />
          ))}
        </g>
      );
    default:
      return null;
  }
};

const Hair: React.FC<{ look: Look; sway: number; back: boolean }> = ({ look, sway, back }) => {
  const s = look.hairStyle ?? "short";
  if (back) {
    if (s === "ponytail")
      return (
        <g transform={`rotate(${sway * 10} -58 -14)`}>
          <ellipse cx={-86} cy={4} rx={26} ry={46} fill={look.hair} />
        </g>
      );
    if (s === "bun") return <circle cx={-52} cy={-50} r={30} fill={look.hair} />;
    if (s === "long") return <path d={`M -62 -20 Q -80 60 ${-50 + sway * 6} 110 L 10 70 Q -10 20 -20 -10 Z`} fill={look.hair} />;
    return null;
  }
  if (s === "curly")
    return (
      <g fill={look.hair}>
        {[
          [-50, -20],
          [-40, -50],
          [-10, -66],
          [22, -62],
          [46, -46],
          [-60, 10],
          [-30, -30],
        ].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r={28} />
        ))}
      </g>
    );
  if (s === "short") return <path d="M -66 10 C -72 -60 -8 -84 44 -62 C 62 -52 70 -36 68 -24 C 34 -36 4 -30 -16 -8 C -30 8 -44 16 -66 10 Z" fill={look.hair} />;
  return <path d="M -66 6 C -70 -60 -10 -86 40 -60 C 60 -50 70 -34 70 -22 C 30 -30 0 -20 -10 10 C -20 30 -40 40 -60 40 Z" fill={look.hair} />;
};

export type Mouth = "smile" | "open" | "talk" | "flat" | "o";

export const Character: React.FC<{
  look: Look;
  phase?: number;
  walking?: boolean;
  /** Front arm angle in degrees; 90 = hanging down, 0 = straight forward, -90 = straight up. */
  arm?: number;
  /** Back arm angle override. */
  backArm?: number;
  jump?: number;
  happy?: number;
  blink?: boolean;
  hold?: Hold;
  /** @deprecated use hold="card" */
  holdCard?: boolean;
  mouth?: Mouth;
  /** Frame counter used for talking mouth flaps. */
  frame?: number;
  /** Hide legs (e.g. seated behind a desk). */
  seated?: boolean;
}> = ({ look, phase = 0, walking = false, arm, backArm, jump = 0, happy = 0, blink = false, hold, holdCard, mouth, frame = 0, seated = false }) => {
  const held: Hold = hold ?? (holdCard ? "card" : "none");
  const swing = walking ? Math.sin(phase) : 0;
  const bob = walking ? -Math.abs(Math.sin(phase)) * 9 : 0;
  const frontArm = arm ?? 90 - swing * 26;
  const back = backArm ?? 90 + swing * 26;
  const hand = armEnd(frontArm);
  const cardAt = held === "card" ? { x: hand.x + 18, y: hand.y } : { x: 14, y: -300 };
  const darker = "rgba(0,0,0,0.18)";
  const scale = look.adult ? 1.2 : 1;
  const m: Mouth = mouth ?? (happy > 0.5 ? "open" : "smile");
  const talkOpen = m === "talk" ? Math.abs(Math.sin(frame * 0.9)) : 0;

  return (
    <g transform={`scale(${scale}) translate(0 ${bob - jump})`}>
      <Limb x={SHOULDER.x - 6} y={SHOULDER.y} len={ARM_LEN} w={30} deg={back} color={look.top} end={<circle r={17} fill={look.skin} />} />
      <Limb x={SHOULDER.x - 6} y={SHOULDER.y} len={ARM_LEN} w={30} deg={back} color={darker} />
      {!seated &&
        [-1, 1].map((side) => (
          <g key={side} transform={`translate(0 -190) rotate(${side * swing * 28})`}>
            <rect x={-19} y={-6} width={38} height={180} rx={18} fill={look.pants} />
            {side < 0 ? <rect x={-19} y={-6} width={38} height={180} rx={18} fill={darker} /> : null}
            <rect x={-22} y={160} width={66} height={28} rx={13} fill={look.shoes} stroke="#0f172a" strokeWidth={3} />
          </g>
        ))}
      {look.bag ? (
        <>
          <rect x={-100} y={-392} width={62} height={170} rx={24} fill={look.bag} />
          <rect x={-92} y={-320} width={44} height={46} rx={12} fill="rgba(0,0,0,0.15)" />
        </>
      ) : null}
      <rect x={-54} y={-410} width={112} height={236} rx={42} fill={look.top} />
      {look.accent ? (
        <path d="M -20 -408 L 8 -350 L 36 -408" stroke={look.accent} strokeWidth={10} fill="none" strokeLinejoin="round" />
      ) : (
        <path d="M -30 -405 Q 8 -372 46 -405" stroke="rgba(255,255,255,0.5)" strokeWidth={6} fill="none" />
      )}
      {look.bag ? <path d="M -40 -395 L 18 -300" stroke={look.bag} strokeWidth={12} strokeLinecap="round" /> : null}
      <rect x={-6} y={-432} width={30} height={34} rx={10} fill={look.skin} />
      <g transform="translate(10 -490)">
        <Hair look={look} sway={walking ? Math.sin(phase * 2) : Math.sin(frame * 0.05) * 0.3} back />
        <circle r={64} fill={look.skin} />
        <Hair look={look} sway={0} back={false} />
        <ellipse cx={-12} cy={10} rx={11} ry={15} fill={look.skin} stroke="rgba(0,0,0,0.12)" strokeWidth={3} />
        <path d="M 22 -20 Q 34 -28 46 -22" stroke={look.hair} strokeWidth={5} fill="none" strokeLinecap="round" />
        {happy > 0.5 ? (
          <path d="M 26 -6 Q 36 -16 46 -6" stroke="#0f172a" strokeWidth={5} fill="none" strokeLinecap="round" />
        ) : (
          <ellipse cx={36} cy={-6} rx={6.5} ry={blink ? 1.2 : 8.5} fill="#0f172a" />
        )}
        {look.glasses ? (
          <g stroke="#0f172a" strokeWidth={4} fill="rgba(255,255,255,0.25)">
            <circle cx={38} cy={-6} r={15} />
            <line x1={23} y1={-8} x2={-4} y2={-4} />
          </g>
        ) : null}
        <circle cx={40} cy={16} r={10} fill="#fb7185" opacity={0.35} />
        <path d="M 62 2 Q 70 10 62 14" stroke="rgba(0,0,0,0.25)" strokeWidth={4} fill="none" strokeLinecap="round" />
        {m === "open" ? (
          <path d="M 30 26 Q 46 50 62 26 Z" fill="#7f1d1d" stroke="#0f172a" strokeWidth={3} strokeLinejoin="round" />
        ) : m === "talk" ? (
          <ellipse cx={46} cy={30} rx={11} ry={2 + talkOpen * 9} fill="#7f1d1d" stroke="#0f172a" strokeWidth={3} />
        ) : m === "o" ? (
          <ellipse cx={46} cy={32} rx={8} ry={10} fill="#7f1d1d" stroke="#0f172a" strokeWidth={3} />
        ) : m === "flat" ? (
          <path d="M 34 32 L 58 30" stroke="#0f172a" strokeWidth={4.5} strokeLinecap="round" />
        ) : (
          <path d="M 32 30 Q 46 40 58 28" stroke="#0f172a" strokeWidth={4.5} fill="none" strokeLinecap="round" />
        )}
      </g>
      {look.lanyard ? (
        <>
          <path d={`M -4 -405 Q ${(cardAt.x - 4) / 2} ${(cardAt.y - 405) / 2 + 20} ${cardAt.x} ${cardAt.y - 16}`} stroke="#ef4444" strokeWidth={4} fill="none" />
          {held !== "card" ? (
            <g transform={`translate(${cardAt.x} ${cardAt.y})`}>
              <HeldItem hold="card" tilt={4} />
            </g>
          ) : null}
        </>
      ) : null}
      <Limb x={SHOULDER.x} y={SHOULDER.y} len={ARM_LEN} w={30} deg={frontArm} color={look.top} end={<circle r={17} fill={look.skin} />} />
      {held !== "none" ? (
        <g transform={`translate(${held === "card" ? cardAt.x : hand.x + 6} ${held === "card" ? cardAt.y : hand.y})`}>
          <HeldItem hold={held} />
        </g>
      ) : null}
    </g>
  );
};

/** Places a character in the world. `face` -1 mirrors them to face left. */
export const Placed: React.FC<{ x: number; y: number; face?: 1 | -1; scale?: number; shadow?: boolean; children: React.ReactNode }> = ({
  x,
  y,
  face = 1,
  scale = 1,
  shadow = true,
  children,
}) => (
  <g transform={`translate(${x} ${y}) scale(${face * scale} ${scale})`}>
    {shadow ? <ellipse cx={0} cy={2} rx={90} ry={14} fill="rgba(0,0,0,0.18)" /> : null}
    {children}
  </g>
);

/* ── Camera + helpers ────────────────────────────────────────────────── */

export type CamKey = { f: number; s: number; x: number; y: number };

/** Smooth camera through keyframes; returns an SVG transform for the world group. */
export const camera = (frame: number, keys: CamKey[]) => {
  const fs = keys.map((k) => k.f);
  const opt = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const s = interpolate(frame, fs, keys.map((k) => k.s), opt);
  const x = interpolate(frame, fs, keys.map((k) => k.x), opt);
  const y = interpolate(frame, fs, keys.map((k) => k.y), opt);
  return `translate(960 540) scale(${s}) translate(${-x} ${-y})`;
};

export type CamFn = (frame: number) => { s: number; x: number; y: number };

export const camAt = (frame: number, cam: CamKey[] | CamFn) => {
  if (typeof cam === "function") return cam(frame);
  const fs = cam.map((k) => k.f);
  const opt = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  return {
    s: interpolate(frame, fs, cam.map((k) => k.s), opt),
    x: interpolate(frame, fs, cam.map((k) => k.x), opt),
    y: interpolate(frame, fs, cam.map((k) => k.y), opt),
  };
};

/** When true, cartoon scenes render in wide 1920x1080 layout even inside a tall video (see tallFrame.tsx). */
export const ForceWide = React.createContext(false);

/**
 * Renders the 1920x1080 cartoon world into the composition, wide or tall.
 * Tall videos use `tall` camera moves when given; the view is kept inside the world.
 */
export const Stage: React.FC<{ frame: number; cam: CamKey[] | CamFn; tall?: CamKey[] | CamFn; children: React.ReactNode }> = ({
  frame,
  cam,
  tall,
  children,
}) => {
  const cfg = useVideoConfig();
  const wide = React.useContext(ForceWide);
  const width = wide ? 1920 : cfg.width;
  const height = wide ? 1080 : cfg.height;
  const portrait = height > width;
  const c = camAt(frame, portrait && tall ? tall : cam);
  const base = portrait ? height / 1080 : width / 1920;
  const k = c.s * base;
  const halfW = width / 2 / k;
  const halfH = height / 2 / k;
  const x = Math.min(Math.max(c.x, halfW), 1920 - halfW);
  const y = Math.min(Math.max(c.y, halfH), 1080 - halfH);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      <g transform={`translate(${width / 2} ${height / 2}) scale(${k}) translate(${-x} ${-y})`}>{children}</g>
    </svg>
  );
};

/** True when the composition is taller than it is wide. */
export const useTall = () => {
  const { width, height } = useVideoConfig();
  const wide = React.useContext(ForceWide);
  return !wide && height > width;
};

/** Walk from x0 to x1 between frames f0..f1; returns x and whether walking. */
export const walkTo = (frame: number, f0: number, f1: number, x0: number, x1: number) => {
  const x = interpolate(frame, [f0, f1], [x0, x1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return { x, walking: frame > f0 && frame < f1 - 2, phase: frame * 0.32 };
};

export const Bubble: React.FC<{ x: number; y: number; text: string; pop: number; w?: number; tail?: "left" | "right" }> = ({
  x,
  y,
  text,
  pop,
  w = 300,
  tail = "left",
}) =>
  pop <= 0 ? null : (
    <g transform={`translate(${x} ${y}) scale(${pop})`}>
      <rect x={-w / 2} y={-60} width={w} height={96} rx={40} fill="white" stroke="#0f172a" strokeWidth={5} />
      <path d={tail === "left" ? `M ${-w / 4} 34 L ${-w / 4 - 30} 80 L ${-w / 4 + 20} 34` : `M ${w / 4} 34 L ${w / 4 + 30} 80 L ${w / 4 - 20} 34`} fill="white" stroke="#0f172a" strokeWidth={5} strokeLinejoin="round" />
      <rect x={-w / 2 + 6} y={24} width={w - 12} height={14} fill="white" />
      <text x={0} y={-2} textAnchor="middle" dominantBaseline="middle" fontFamily={outfit} fontWeight={800} fontSize={44} fill="#0f172a">
        {text}
      </text>
    </g>
  );

/** Screen with bezel; children are drawn clipped inside (0,0)-(w,h). */
export const Screen: React.FC<{ id: string; x: number; y: number; w: number; h: number; children: React.ReactNode; stand?: boolean }> = ({
  id,
  x,
  y,
  w,
  h,
  children,
  stand,
}) => (
  <g transform={`translate(${x} ${y})`}>
    {stand ? <rect x={w / 2 - 14} y={h + 10} width={28} height={60} fill="#334155" /> : null}
    <rect x={-14} y={-14} width={w + 28} height={h + 28} rx={18} fill="#0f172a" />
    <clipPath id={id}>
      <rect width={w} height={h} rx={6} />
    </clipPath>
    <g clipPath={`url(#${id})`}>
      <rect width={w} height={h} fill="white" />
      {children}
    </g>
  </g>
);

export const Coins: React.FC<{ x: number; y: number; t: number; n?: number; spread?: number }> = ({ x, y, t, n = 8, spread = 260 }) =>
  t <= 0 ? null : (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const tt = Math.min(1, Math.max(0, t - i * 0.03));
        const ang = -Math.PI / 2 + (i - (n - 1) / 2) * 0.3;
        const cx = x + Math.cos(ang) * spread * tt;
        const cy = y + Math.sin(ang) * spread * 0.85 * tt + 260 * tt * tt;
        return (
          <g key={i} transform={`translate(${cx} ${cy})`} opacity={tt < 0.7 ? 1 : 1 - (tt - 0.7) / 0.3}>
            <circle r={16} fill="#facc15" stroke="#b45309" strokeWidth={4} />
            <text y={6} textAnchor="middle" fontSize={18} fill="#b45309">
              ★
            </text>
          </g>
        );
      })}
    </g>
  );

/* ── Backdrops ───────────────────────────────────────────────────────── */

export const Floor: React.FC<{ y?: number; color?: string; lines?: string }> = ({ y = 724, color = "#d6c3a5", lines = "rgba(0,0,0,0.07)" }) => (
  <g>
    <rect y={y - 24} width={1920} height={24} fill="#8b5e34" />
    <rect y={y} width={1920} height={1080 - y} fill={color} />
    {Array.from({ length: 13 }).map((_, i) => (
      <line key={i} x1={960 + (i - 6) * 170} y1={y} x2={960 + (i - 6) * 520} y2={1080} stroke={lines} strokeWidth={3} />
    ))}
  </g>
);

export const Window: React.FC<{ x: number; y: number; w?: number; h?: number; sky?: [string, string] }> = ({ x, y, w = 250, h = 300, sky = ["#7dd3fc", "#e0f2fe"] }) => (
  <g transform={`translate(${x} ${y})`}>
    <defs>
      <linearGradient id={`sky-${x}-${y}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={sky[0]} />
        <stop offset="1" stopColor={sky[1]} />
      </linearGradient>
    </defs>
    <rect width={w} height={h} rx={8} fill={`url(#sky-${x}-${y})`} stroke="#8b5e34" strokeWidth={14} />
    <ellipse cx={w * 0.3} cy={h * 0.3} rx={50} ry={18} fill="white" opacity={0.9} />
    <line x1={w / 2} y1={0} x2={w / 2} y2={h} stroke="#8b5e34" strokeWidth={10} />
    <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke="#8b5e34" strokeWidth={10} />
  </g>
);

export const Poster: React.FC<{ x: number; y: number; line1: string; line2: string; rot?: number }> = ({ x, y, line1, line2, rot = 3 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <rect width={170} height={230} rx={8} fill="white" stroke="#e2e8f0" strokeWidth={4} />
    <image href={LOGO} x={35} y={20} width={100} height={100} />
    <text x={85} y={160} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={26} fill="#0f1f3a">
      {line1}
    </text>
    <text x={85} y={194} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={26} fill="#16a34a">
      {line2}
    </text>
  </g>
);

const SPINES = ["#dc2626", "#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#0891b2", "#db2777", "#65a30d", "#ea580c"];

export const Bookshelf: React.FC<{ x: number; y: number; w?: number; rows?: number }> = ({ x, y, w = 420, rows = 4 }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect width={w} height={rows * 110 + 20} rx={8} fill="#7c4a21" />
    {Array.from({ length: rows }).map((_, r) => (
      <g key={r} transform={`translate(12 ${14 + r * 110})`}>
        <rect width={w - 24} height={96} fill="#4a2c13" />
        {(() => {
          const books: React.ReactNode[] = [];
          let bx = 4;
          let i = r * 7;
          while (bx < w - 50) {
            const bw = 18 + ((i * 7) % 16);
            const bh = 64 + ((i * 13) % 28);
            books.push(<rect key={i} x={bx} y={96 - bh} width={bw} height={bh} rx={2} fill={SPINES[i % SPINES.length]} />);
            bx += bw + 3;
            i++;
          }
          return books;
        })()}
        <rect y={96} width={w - 24} height={10} fill="#5b3616" />
      </g>
    ))}
  </g>
);

export const Desk: React.FC<{ x: number; y: number; w?: number }> = ({ x, y, w = 260 }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={0} y={0} width={w} height={26} rx={6} fill="#b45309" />
    <rect x={14} y={26} width={w - 28} height={120} fill="#92400e" />
    <rect x={30} y={40} width={w - 60} height={8} rx={4} fill="#78350f" />
  </g>
);

export const Plant: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M -34 0 L 34 0 L 26 60 L -26 60 Z" fill="#ea580c" />
    {[-40, -15, 10, 35].map((a, i) => (
      <ellipse key={i} cx={Math.sin((a * Math.PI) / 180) * 40} cy={-40 - (i % 2) * 20} rx={18} ry={48} fill="#16a34a" transform={`rotate(${a} 0 0)`} />
    ))}
  </g>
);
