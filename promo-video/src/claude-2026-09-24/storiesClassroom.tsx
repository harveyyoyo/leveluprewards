/** Cartoon stories in Ms. Rivera's classroom: "One Tap" praise and "Hall Pass". */
import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame } from "remotion";
import {
  BrandBug,
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
  shot,
  usePop,
} from "./common";
import { Bubble, CamKey, Character, Coins, Desk, Floor, LOOKS, Placed, Poster, Screen, Window, camera } from "./cartoon";

export const GROUND = 900;
const SEAT_Y = GROUND + 40;

/* ── Shared classroom set ────────────────────────────────────────────── */

export const TV = { x: 560, y: 60, w: 600, h: 338 };
const K = TV.w / 1280;
/** Seat "EW" in classroom-seating.png — Leo's desk on the class screen. */
export const LEO_SEAT = { x: TV.x + 555 * K, y: TV.y + 200 * K };
/** "Hall: All Clear" chip in the screenshot's header. */
const HALL_CHIP = { x: TV.x + 474 * K, y: TV.y + 18 * K, w: 114 * K, h: 32 * K };

export const TEACHER_X = 330;
export const KIDS = [
  { look: LOOKS.leo, x: 1180 },
  { look: LOOKS.ava, x: 1480 },
  { look: LOOKS.jordan, x: 1780 },
];
/** Where Ms. Rivera's tablet sits in the world. */
export const TABLET = { x: TEACHER_X + 190, y: GROUND - 365 };

export const ClassroomWall: React.FC = () => (
  <g>
    <defs>
      <linearGradient id="cwall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#e0f2fe" />
        <stop offset="1" stopColor="#bae6fd" />
      </linearGradient>
    </defs>
    <rect width={1920} height={720} fill="url(#cwall)" />
    <Poster x={60} y={150} line1="Be kind" line2="earn points!" rot={-3} />
    <Window x={1560} y={120} w={240} h={260} />
    <Screen id="classtv" x={TV.x} y={TV.y} w={TV.w} h={TV.h}>
      <image href={shot("classroom-seating.png")} width={TV.w} height={TV.h} preserveAspectRatio="xMidYMid slice" />
    </Screen>
    <Floor y={724} color="#cbd5e1" lines="rgba(15,23,42,0.06)" />
  </g>
);

/** Seated kid behind a desk, facing left toward the teacher. */
export const SeatedKid: React.FC<{
  look: (typeof LOOKS)[keyof typeof LOOKS];
  x: number;
  arm?: number;
  happy?: number;
  frame: number;
  mouth?: "smile" | "open" | "talk" | "o";
  jump?: number;
}> = ({ look, x, arm = 70, happy = 0, frame, mouth, jump = 0 }) => (
  <g>
    <rect x={x + 30} y={GROUND - 230} width={22} height={230} rx={8} fill="#475569" />
    <Placed x={x} y={SEAT_Y} face={-1} shadow={false}>
      <Character look={look} seated arm={arm} happy={happy} frame={frame} mouth={mouth} blink={(frame + x) % 90 < 4} jump={jump} />
    </Placed>
    <Desk x={x - 260} y={GROUND - 146} w={230} />
  </g>
);

const TapRipple: React.FC<{ t: number }> = ({ t }) =>
  t <= 0 || t >= 1 ? null : (
    <circle cx={TABLET.x + 40} cy={TABLET.y} r={10 + t * 60} fill="none" stroke="#f97316" strokeWidth={8 * (1 - t)} opacity={1 - t} />
  );

const StoryEnd: React.FC<{ title: string; tagline: string; color: string; pillar: "Classroom" }> = ({ title, tagline, color, pillar }) => {
  const a = usePop(0, 12, 170);
  const b = usePop(12);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(135deg, #e0f2fe, #ede9fe)", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div style={{ transform: `scale(${a})` }}>
        <LogoLockup size={120} dark={false} />
      </div>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 150, color, lineHeight: 1.05, marginTop: 20, transform: `scale(${a})` }}>{title}</div>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 64, color: "#0f1f3a", marginTop: 10, opacity: b }}>{tagline}</div>
      <div style={{ marginTop: 44, opacity: b }}>
        <PillarStrip featured={[pillar]} dark={false} delay={14} size={32} />
      </div>
      <div style={{ marginTop: 30, fontFamily: jakarta, fontWeight: 700, fontSize: 40, color: "#475569", opacity: b }}>leveluprewards.app</div>
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * One Tap (1920x1080)
 * ════════════════════════════════════════════════════════════════════ */

export const onetapTimeline = buildTimeline("story-classroom-onetap");

const OneTapWorld: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const A = tl.at("ask");
  const B = tl.at("answer").start;
  const C = tl.at("tap").start;
  const D = tl.at("cheer").start;
  const tapAt = C + 22;
  const plusAt = C + 58;

  const cam: CamKey[] = [
    { f: 0, s: 1, x: 960, y: 540 },
    { f: C - 4, s: 1, x: 960, y: 540 },
    { f: C + 14, s: 2.4, x: TABLET.x, y: TABLET.y },
    { f: C + 36, s: 2.4, x: TABLET.x, y: TABLET.y },
    { f: C + 54, s: 2.2, x: TV.x + TV.w / 2, y: TV.y + TV.h / 2 },
    { f: D - 4, s: 2.2, x: TV.x + TV.w / 2, y: TV.y + TV.h / 2 },
    { f: D + 14, s: 1, x: 960, y: 540 },
  ];

  const teacherTalk = frame >= A.start + A.cues[0] && frame < A.start + A.cues[0] + A.lens[0];
  const leoHand = interpolate(frame, [B - 16, B - 6], [70, -80], clamp);
  const leoDown = interpolate(frame, [C, C + 10], [0, 1], clamp);
  const cheer = frame >= D;
  const kidsUp = interpolate(frame, [D + 20, D + 30], [70, -85], clamp);
  const plus = interpolate(frame - plusAt, [0, 40], [0, 1], clamp);

  const tv = (
    <g>
      {frame >= plusAt ? (
        <g>
          <rect
            x={LEO_SEAT.x - TV.x - 30}
            y={LEO_SEAT.y - TV.y - 34}
            width={60}
            height={62}
            rx={10}
            fill="none"
            stroke="#facc15"
            strokeWidth={5}
            opacity={1 - plus * 0.5}
          />
          <text
            x={LEO_SEAT.x - TV.x}
            y={LEO_SEAT.y - TV.y - 40 - plus * 40}
            textAnchor="middle"
            fontFamily={anton}
            fontSize={40}
            fill="#f59e0b"
            stroke="#78350f"
            strokeWidth={2}
            opacity={1 - interpolate(plus, [0.7, 1], [0, 1], clamp)}
          >
            +5
          </text>
          <g transform={`translate(0 ${TV.h - 44 + (1 - Math.min(1, plus * 4)) * 44})`}>
            <rect width={TV.w} height={44} fill="#7c3aed" />
            <text x={TV.w / 2} y={30} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={24} fill="white">
              ⭐ Leo +5 · Great answer!
            </text>
          </g>
        </g>
      ) : null}
    </g>
  );

  return (
    <svg viewBox="0 0 1920 1080" width={1920} height={1080}>
      <g transform={camera(frame, cam)}>
        <ClassroomWall />
        {/* TV overlays are drawn in TV-local coords */}
        <g transform={`translate(${TV.x} ${TV.y})`}>
          <clipPath id="tvover">
            <rect width={TV.w} height={TV.h} rx={6} />
          </clipPath>
          <g clipPath="url(#tvover)">{tv}</g>
        </g>
        {frame >= plusAt ? <Coins x={LEO_SEAT.x} y={LEO_SEAT.y} t={interpolate(frame - plusAt, [0, 30], [0, 1], clamp)} n={6} spread={120} /> : null}
        <Placed x={TEACHER_X} y={GROUND}>
          <Character
            look={LOOKS.msRivera}
            arm={frame >= tapAt - 4 && frame < tapAt + 6 ? 20 : 32}
            hold="tablet"
            mouth={teacherTalk ? "talk" : frame >= B ? "open" : "smile"}
            happy={frame >= B && frame < C ? 1 : 0}
            frame={frame}
            blink={frame % 100 < 4}
          />
        </Placed>
        <TapRipple t={interpolate(frame - tapAt, [0, 16], [0, 1], clamp)} />
        {KIDS.map((k, i) => {
          const isLeo = i === 0;
          const arm = cheer ? kidsUp + Math.sin(frame * 0.4 + i) * 8 : isLeo ? interpolate(leoDown, [0, 1], [leoHand, 70]) : 70;
          return (
            <SeatedKid
              key={i}
              look={k.look}
              x={k.x}
              arm={arm}
              frame={frame}
              happy={(isLeo && frame >= B) || cheer ? 1 : 0}
              mouth={isLeo && frame >= B && frame < B + 30 ? "open" : undefined}
              jump={cheer ? Math.abs(Math.sin(frame * 0.35 + i)) * 10 : 0}
            />
          );
        })}
        <Bubble x={500} y={250} text="7 × 8 = ?" pop={interpolate(frame, [A.start + 10, A.start + 18], [0, 1], clamp) * (frame < B + 20 ? 1 : 0)} w={300} tail="left" />
        <Bubble x={1090} y={300} text="56!" pop={interpolate(frame, [B + 2, B + 10], [0, 1], clamp) * (frame < C ? 1 : 0)} w={180} tail="right" />
        <Bubble x={1480} y={300} text="Me next!" pop={interpolate(frame, [D + 34, D + 42], [0, 1], clamp)} w={260} tail="right" />
      </g>
    </svg>
  );
};

export const StoryClassroomOneTap: React.FC = () => {
  const tl = onetapTimeline;
  const C = tl.at("tap").start;
  const end = tl.at("end");
  return (
    <AbsoluteFill style={{ background: "#e0f2fe" }}>
      <Sequence durationInFrames={end.start + 8}>
        <SceneFade dur={end.start + 8} inFrames={6} outFrames={8}>
          <OneTapWorld tl={tl} />
        </SceneFade>
      </Sequence>
      <Sequence from={end.start}>
        <SceneFade dur={end.dur} inFrames={8} outFrames={1}>
          <StoryEnd title="Classroom" tagline="Praise everyone can see." color="#7c3aed" pillar="Classroom" />
        </SceneFade>
      </Sequence>
      <BrandBug pillar="Classroom" dark={false} />
      <Sfx at={tl.at("answer").start} name="ding" volume={0.35} />
      <Sfx at={C + 22} name="pop" volume={0.6} />
      <Sfx at={C + 58} name="coin" volume={0.6} />
      <Sfx at={C + 60} name="levelup" volume={0.35} />
      <Sfx at={tl.at("cheer").start + 20} name="crowd" volume={0.35} />
      <Sfx at={end.start} name="chime" volume={0.45} />
      <Music timeline={tl} track="playful-pizz" volume={0.5} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * Hall Pass (1920x1080)
 * ════════════════════════════════════════════════════════════════════ */

export const hallpassTimeline = buildTimeline("story-classroom-hallpass");

/** Sped-up pass timer: reaches `endSecs` exactly when the pass ends at frame `total`. */
const passClock = (frames: number, total: number, endSecs = 124) => {
  const secs = Math.max(0, Math.floor((frames / total) * endSecs));
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
};

const HallPassWorld: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const A = tl.at("ask").start;
  const S = tl.at("start").start;
  const V = tl.at("screen").start;
  const Bk = tl.at("back");
  const tapStart = S + 20;
  const standAt = S + 34;
  const goneAt = S + 100;
  const returnAt = Bk.start;
  const sitAt = Bk.start + 64;
  const tapBack = Bk.start + 80;
  const out = frame >= tapStart && frame < tapBack;

  const cam: CamKey[] = [
    { f: 0, s: 1, x: 960, y: 540 },
    { f: S - 2, s: 1, x: 960, y: 540 },
    { f: S + 12, s: 2.2, x: TABLET.x, y: TABLET.y },
    { f: S + 28, s: 2.2, x: TABLET.x, y: TABLET.y },
    { f: S + 44, s: 1, x: 960, y: 540 },
    { f: V, s: 1, x: 960, y: 540 },
    { f: V + 16, s: 2.4, x: TV.x + TV.w / 2, y: TV.y + TV.h / 2 - 20 },
    { f: Bk.start - 2, s: 2.4, x: TV.x + TV.w / 2, y: TV.y + TV.h / 2 - 20 },
    { f: Bk.start + 14, s: 1, x: 960, y: 540 },
    { f: tapBack - 10, s: 1, x: 960, y: 540 },
    { f: tapBack + 6, s: 1.8, x: TV.x + TV.w / 2, y: TV.y + TV.h / 2 },
  ];

  const leoHand = interpolate(frame, [A + 10, A + 20], [70, -80], clamp);
  const leoLower = interpolate(frame, [S, S + 10], [0, 1], clamp);
  const seated = frame < standAt || frame >= sitAt;
  const leoWalkX =
    frame < returnAt
      ? interpolate(frame, [standAt, goneAt], [KIDS[0].x, 2100], { ...clamp, easing: Easing.in(Easing.quad) })
      : interpolate(frame, [returnAt, sitAt - 4], [2100, KIDS[0].x], { ...clamp, easing: Easing.out(Easing.quad) });
  const leaving = frame < returnAt;

  const tvOverlay = (
    <g>
      {/* header chip */}
      <g transform={`translate(${HALL_CHIP.x - TV.x - 6} ${HALL_CHIP.y - TV.y - 2})`}>
        <rect width={HALL_CHIP.w + 30} height={HALL_CHIP.h + 4} rx={(HALL_CHIP.h + 4) / 2} fill={out ? "#f97316" : "#bbf7d0"} stroke={out ? "#9a3412" : "#16a34a"} strokeWidth={1.5} />
        <text x={(HALL_CHIP.w + 30) / 2} y={HALL_CHIP.h / 2 + 7} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={13} fill={out ? "white" : "#14532d"}>
          {out ? "Hall: 1 out" : "Hall: All Clear"}
        </text>
      </g>
      {out ? (
        <g>
          <rect x={LEO_SEAT.x - TV.x - 30} y={LEO_SEAT.y - TV.y - 36} width={60} height={64} rx={10} fill="rgba(249,115,22,0.35)" stroke="#f97316" strokeWidth={4} />
          <rect x={LEO_SEAT.x - TV.x - 28} y={LEO_SEAT.y - TV.y + 8} width={56} height={16} rx={8} fill="#f97316" />
          <text x={LEO_SEAT.x - TV.x} y={LEO_SEAT.y - TV.y + 20} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={11} fill="white">
            PASS OUT
          </text>
          <g transform={`translate(0 ${TV.h - 46})`}>
            <rect width={TV.w} height={46} fill="#f97316" />
            <text x={TV.w / 2} y={31} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={24} fill="white">
              🚻 Leo · hall pass · {passClock(frame - tapStart, tapBack - tapStart)}
            </text>
          </g>
        </g>
      ) : frame >= tapBack ? (
        <g transform={`translate(0 ${TV.h - 46})`}>
          <rect width={TV.w} height={46} fill="#16a34a" />
          <text x={TV.w / 2} y={31} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={24} fill="white">
            ✓ Leo is back · {passClock(tapBack - tapStart, tapBack - tapStart)}
          </text>
        </g>
      ) : null}
    </g>
  );

  return (
    <svg viewBox="0 0 1920 1080" width={1920} height={1080}>
      <g transform={camera(frame, cam)}>
        <ClassroomWall />
        <g transform={`translate(${TV.x} ${TV.y})`}>
          <clipPath id="tvover2">
            <rect width={TV.w} height={TV.h} rx={6} />
          </clipPath>
          <g clipPath="url(#tvover2)">{tvOverlay}</g>
        </g>
        <Placed x={TEACHER_X} y={GROUND}>
          <Character
            look={LOOKS.msRivera}
            arm={(frame >= tapStart - 4 && frame < tapStart + 6) || (frame >= tapBack - 4 && frame < tapBack + 6) ? 20 : 32}
            hold="tablet"
            frame={frame}
            blink={frame % 100 < 4}
          />
        </Placed>
        <TapRipple t={interpolate(frame - tapStart, [0, 16], [0, 1], clamp)} />
        <TapRipple t={interpolate(frame - tapBack, [0, 16], [0, 1], clamp)} />
        {KIDS.map((k, i) =>
          i === 0 && !seated ? (
            <g key={i}>
              <rect x={k.x + 30} y={GROUND - 230} width={22} height={230} rx={8} fill="#475569" />
              <Desk x={k.x - 260} y={GROUND - 146} w={230} />
            </g>
          ) : (
            <SeatedKid
              key={i}
              look={k.look}
              x={k.x}
              frame={frame}
              arm={i === 0 ? interpolate(leoLower, [0, 1], [leoHand, 70]) : 70}
              mouth={i === 0 && frame >= A + 6 && frame < S ? "talk" : undefined}
            />
          ),
        )}
        {!seated ? (
          <Placed x={leoWalkX} y={GROUND} face={leaving ? 1 : -1}>
            <Character look={LOOKS.leo} walking phase={frame * 0.32} frame={frame} />
          </Placed>
        ) : null}
        <Bubble x={1080} y={300} text="Hall pass? 🚻" pop={interpolate(frame, [A + 8, A + 16], [0, 1], clamp) * (frame < S ? 1 : 0)} w={330} tail="right" />
      </g>
    </svg>
  );
};

export const StoryClassroomHallPass: React.FC = () => {
  const tl = hallpassTimeline;
  const S = tl.at("start").start;
  const Bk = tl.at("back").start;
  const end = tl.at("end");
  return (
    <AbsoluteFill style={{ background: "#e0f2fe" }}>
      <Sequence durationInFrames={end.start + 8}>
        <SceneFade dur={end.start + 8} inFrames={6} outFrames={8}>
          <HallPassWorld tl={tl} />
        </SceneFade>
      </Sequence>
      <Sequence from={end.start}>
        <SceneFade dur={end.dur} inFrames={8} outFrames={1}>
          <StoryEnd title="Hall passes" tagline="…without the paperwork." color="#f97316" pillar="Classroom" />
        </SceneFade>
      </Sequence>
      <BrandBug pillar="Classroom" dark={false} />
      <Sfx at={S + 20} name="pop" volume={0.6} />
      <Sfx at={S + 22} name="beep" volume={0.3} />
      {Array.from({ length: 10 }).map((_, i) => (
        <Sfx key={i} at={S + 36 + i * 7} name="tick" volume={0.12} />
      ))}
      <Sfx at={Bk + 80} name="pop" volume={0.6} />
      <Sfx at={Bk + 82} name="ding" volume={0.4} />
      <Sfx at={end.start} name="chime" volume={0.45} />
      <Music timeline={tl} track="sneaky-tiptoe" volume={0.5} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};
