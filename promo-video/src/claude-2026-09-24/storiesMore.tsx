/** Cartoon stories: Library checkout, Rewards prize day, Houses assembly, Family portal. */
import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame } from "remotion";
import {
  BrandBug,
  Confetti,
  LOGO,
  LogoLockup,
  Music,
  Narration,
  Pillar,
  PillarStrip,
  SceneFade,
  Sfx,
  Timeline,
  anton,
  buildTimeline,
  caveat,
  clamp,
  jakarta,
  outfit,
  rnd,
  shot,
  usePop,
} from "./common";
import { Bookshelf, Bubble, CamKey, Character, Coins, Desk, Floor, LOOKS, Placed, Plant, Poster, Screen, Window, camera, reachAngle, walkTo } from "./cartoon";
import { HOUSES } from "./houses";
import { GROUND, Hallway, Kiosk, READER_CENTER, SCREEN, STOP_X } from "./scanIn";

const SCREEN_MID = { x: SCREEN.x + SCREEN.w / 2, y: SCREEN.y + SCREEN.h / 2 };

const StoryEnd: React.FC<{ title: string; tagline: string; color: string; featured: Pillar[]; bg: string }> = ({ title, tagline, color, featured, bg }) => {
  const a = usePop(0, 12, 170);
  const b = usePop(12);
  return (
    <AbsoluteFill style={{ background: bg, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div style={{ transform: `scale(${a})` }}>
        <LogoLockup size={120} dark={false} />
      </div>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 150, color, lineHeight: 1.05, marginTop: 20, transform: `scale(${a})` }}>{title}</div>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 60, color: "#0f1f3a", marginTop: 10, opacity: b }}>{tagline}</div>
      <div style={{ marginTop: 44, opacity: b }}>
        <PillarStrip featured={featured} dark={false} delay={14} size={32} />
      </div>
      <div style={{ marginTop: 30, fontFamily: jakarta, fontWeight: 700, fontSize: 40, color: "#475569", opacity: b }}>leveluprewards.app</div>
    </AbsoluteFill>
  );
};

/** Front-arm angle that puts the hand on the kiosk reader for a kid standing at STOP_X. */
const READER_ARM = reachAngle({ x: READER_CENTER.x - 18 - STOP_X, y: READER_CENTER.y - GROUND });

/* ════════════════════════════════════════════════════════════════════
 * Library: Self Checkout (1920x1080)
 * ════════════════════════════════════════════════════════════════════ */

export const libraryCheckoutTimeline = buildTimeline("story-library-checkout");

const LibraryRoom: React.FC = () => (
  <g>
    <defs>
      <linearGradient id="libwall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fef3c7" />
        <stop offset="1" stopColor="#fde68a" />
      </linearGradient>
    </defs>
    <rect width={1920} height={720} fill="url(#libwall)" />
    <Bookshelf x={60} y={240} w={420} rows={4} />
    <Bookshelf x={500} y={240} w={380} rows={4} />
    <Window x={960} y={120} w={260} h={300} sky={["#fcd34d", "#fef9c3"]} />
    <Poster x={1720} y={170} line1="Scan it," line2="borrow it!" />
    <Floor y={724} color="#b45309" lines="rgba(0,0,0,0.12)" />
    <ellipse cx={560} cy={960} rx={330} ry={60} fill="#dc2626" opacity={0.55} />
  </g>
);

const LibraryScreen: React.FC<{ done: boolean; t: number }> = ({ done, t }) => (
  <g>
    <rect width={SCREEN.w} height={SCREEN.h} fill="#fffbeb" />
    <rect width={SCREEN.w} height={46} fill="#92400e" />
    <text x={SCREEN.w / 2} y={31} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={20} fill="white">
      📚 Student Station
    </text>
    {!done ? (
      <g>
        <text x={SCREEN.w / 2} y={170} textAnchor="middle" fontSize={80}>
          📖
        </text>
        <text x={SCREEN.w / 2} y={230} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={22} fill="#78350f">
          Scan a book
        </text>
        <text x={SCREEN.w / 2} y={258} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={22} fill="#78350f">
          to borrow it
        </text>
      </g>
    ) : (
      <g opacity={Math.min(1, t * 3)}>
        <rect x={80} y={62} width={80} height={104} rx={6} fill="#dc2626" stroke="#7f1d1d" strokeWidth={3} />
        <text x={120} y={122} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={14} fill="#fde68a">
          THE LOST
        </text>
        <text x={120} y={140} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={14} fill="#fde68a">
          MAP
        </text>
        <rect x={20} y={182} width={200} height={40} rx={20} fill="#16a34a" />
        <text x={120} y={209} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={20} fill="white">
          ✓ Checked out
        </text>
        <text x={120} y={254} textAnchor="middle" fontFamily={jakarta} fontWeight={700} fontSize={18} fill="#78350f">
          Jordan · due Oct 9
        </text>
        <rect x={30} y={278} width={180} height={40} rx={20} fill="#facc15" />
        <text x={120} y={305} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={18} fill="#78350f">
          ⭐ +5 reading pts
        </text>
      </g>
    )}
  </g>
);

const LibraryWorld: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const F = tl.at("find");
  const Sc = tl.at("scan").start;
  const Dn = tl.at("done").start;
  const Hp = tl.at("happy").start;
  const shelfX = 640;
  const reachAt = Math.round(F.dur * 0.6);
  const grabAt = Math.round(F.dur * 0.78);
  const scanAt = Sc + 84;

  const w1 = walkTo(frame, 12, Math.round(F.dur * 0.55), -160, shelfX);
  const w2 = walkTo(frame, Sc + 4, Sc + 60, shelfX, STOP_X);
  const x = frame < Sc ? w1.x : w2.x;
  const walking = w1.walking || w2.walking;

  let arm: number | undefined;
  if (frame >= reachAt && frame < grabAt + 10) arm = interpolate(frame, [reachAt, reachAt + 10, grabAt, grabAt + 10], [90, -55, -55, 60], clamp);
  else if (frame >= grabAt + 10 && frame < Sc + 62) arm = walking ? undefined : 60;
  if (frame >= Sc + 62 && frame < Hp) arm = interpolate(frame, [Sc + 62, Sc + 76, Hp - 10, Hp], [60, READER_ARM - 8, READER_ARM - 8, 60], clamp);
  if (frame >= Hp) arm = -80 + Math.sin(frame * 0.4) * 6;
  const hasBook = frame >= grabAt;
  const jump = frame >= Hp + 4 ? Math.abs(Math.sin((frame - Hp) * 0.25)) * 40 : 0;
  const laser = frame >= Sc + 76 && frame < scanAt;
  const scanned = frame >= scanAt;

  const cam: CamKey[] = [
    { f: 0, s: 1, x: 960, y: 540 },
    { f: reachAt - 6, s: 1.5, x: shelfX + 60, y: 470 },
    { f: grabAt + 16, s: 1.5, x: shelfX + 60, y: 470 },
    { f: Sc + 20, s: 1, x: 960, y: 540 },
    { f: Sc + 60, s: 1, x: 960, y: 540 },
    { f: Sc + 78, s: 1.9, x: 1440, y: 540 },
    { f: Dn, s: 1.9, x: 1440, y: 540 },
    { f: Dn + 14, s: 2.4, x: SCREEN_MID.x, y: SCREEN_MID.y },
    { f: Hp - 6, s: 2.4, x: SCREEN_MID.x, y: SCREEN_MID.y },
    { f: Hp + 10, s: 1.25, x: 1260, y: 560 },
  ];

  return (
    <svg viewBox="0 0 1920 1080" width={1920} height={1080}>
      <g transform={camera(frame, cam)}>
        <LibraryRoom />
        <Kiosk scanned={scanned} led={scanned ? 1 : 0} ring={interpolate(frame, [scanAt, scanAt + 22], [0, 1], clamp)} screen={<LibraryScreen done={scanned} t={(frame - scanAt) / 30} />} />
        {laser ? (
          <g opacity={frame % 4 < 2 ? 1 : 0.5}>
            <path d={`M ${READER_CENTER.x} ${READER_CENTER.y} L ${READER_CENTER.x - 70} ${READER_CENTER.y - 40} L ${READER_CENTER.x - 70} ${READER_CENTER.y + 40} Z`} fill="rgba(239,68,68,0.35)" />
            <line x1={READER_CENTER.x - 70} y1={READER_CENTER.y - 30} x2={READER_CENTER.x - 70} y2={READER_CENTER.y + 30} stroke="#ef4444" strokeWidth={4} />
          </g>
        ) : null}
        <Placed x={x} y={GROUND}>
          <Character
            look={LOOKS.jordan}
            walking={walking}
            phase={frame * 0.32}
            arm={arm}
            hold={hasBook ? "book" : "none"}
            frame={frame}
            jump={jump}
            happy={frame >= Hp ? 1 : 0}
            blink={frame % 88 < 4}
          />
        </Placed>
        {scanned && frame < Hp ? <Coins x={SCREEN_MID.x} y={SCREEN.y + 290} t={interpolate(frame - Dn, [0, 30], [0, 1], clamp)} n={6} spread={160} /> : null}
        <Bubble x={x + 40} y={260} text="Best. Library. Ever!" pop={interpolate(frame, [Hp + 4, Hp + 12], [0, 1], clamp)} w={440} />
      </g>
    </svg>
  );
};

export const StoryLibraryCheckout: React.FC = () => {
  const tl = libraryCheckoutTimeline;
  const Sc = tl.at("scan").start;
  const end = tl.at("end");
  return (
    <AbsoluteFill style={{ background: "#fef3c7" }}>
      <Sequence durationInFrames={end.start + 8}>
        <SceneFade dur={end.start + 8} inFrames={6} outFrames={8}>
          <LibraryWorld tl={tl} />
        </SceneFade>
      </Sequence>
      <Sequence from={end.start}>
        <SceneFade dur={end.dur} inFrames={8} outFrames={1}>
          <StoryEnd title="Library" tagline="Made for readers." color="#b45309" featured={["Library"]} bg="linear-gradient(135deg, #fef3c7, #fed7aa)" />
        </SceneFade>
      </Sequence>
      <BrandBug pillar="Library" dark={false} />
      <Sfx at={Math.round(tl.at("find").dur * 0.78)} name="pop" volume={0.4} />
      <Sfx at={Sc + 84} name="beep" volume={0.4} />
      <Sfx at={tl.at("done").start} name="coin" volume={0.5} />
      <Sfx at={tl.at("happy").start + 4} name="levelup" volume={0.35} />
      <Sfx at={end.start} name="chime" volume={0.45} />
      <Music timeline={tl} track="cozy-jazz" volume={0.5} duckTo={0.4} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * Rewards: Prize Day (1920x1080)
 * ════════════════════════════════════════════════════════════════════ */

export const prizedayTimeline = buildTimeline("story-rewards-prizeday");

/** kiosk-rewards-shop.png: Pizza Slice card sits in the left column; its Redeem button center. */
const REDEEM_BTN = { x: 110, y: 409 - 180 };

const ShopScreen: React.FC<{ balance: number; redeemed: boolean; tap: number }> = ({ balance, redeemed, tap }) => (
  <g>
    <image href={shot("kiosk-rewards-shop.png")} x={0} y={-180} width={1276} height={660} />
    <rect width={SCREEN.w} height={40} fill="#be185d" />
    <text x={SCREEN.w / 2} y={27} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={19} fill="white">
      Hi Maya! · {balance} pts
    </text>
    {tap > 0 && tap < 1 ? <circle cx={REDEEM_BTN.x} cy={REDEEM_BTN.y} r={10 + tap * 40} fill="none" stroke="#f97316" strokeWidth={6 * (1 - tap)} /> : null}
    {redeemed ? (
      <g>
        <rect x={20} y={130} width={200} height={110} rx={20} fill="#16a34a" stroke="white" strokeWidth={4} />
        <text x={120} y={180} textAnchor="middle" fontSize={40}>
          🍕
        </text>
        <text x={120} y={222} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={24} fill="white">
          Redeemed!
        </text>
      </g>
    ) : null}
  </g>
);

const Cafeteria: React.FC = () => (
  <g>
    <rect width={1920} height={720} fill="#fff7ed" />
    {Array.from({ length: 30 }).map((_, i) => (
      <rect key={i} x={(i % 15) * 130} y={440 + Math.floor(i / 15) * 130} width={126} height={126} fill={i % 2 ? "#fed7aa" : "#ffedd5"} />
    ))}
    <rect x={620} y={30} width={680} height={220} rx={20} fill="#1f2937" stroke="#92400e" strokeWidth={14} />
    <text x={960} y={125} textAnchor="middle" fontFamily={anton} fontSize={88} fill="#facc15">
      PIZZA FRIDAY 🍕
    </text>
    <text x={960} y={205} textAnchor="middle" fontFamily={caveat} fontSize={56} fill="white">
      paid with LevelUp points!
    </text>
    <Floor y={724} color="#d6d3d1" />
  </g>
);

const PrizeWorld: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const Sv = tl.at("saving");
  const Ci = tl.at("cashin").start;
  const Rd = tl.at("redeem").start;
  const Pz = tl.at("pizza").start;
  const tapCard = Ci + 18;
  const tapBtn = Rd + 26;
  const balance = frame < tapBtn + 6 ? 289 : Math.round(interpolate(frame, [tapBtn + 6, tapBtn + 30], [289, 89], clamp));

  if (frame >= Pz) {
    const t = frame - Pz;
    return (
      <svg viewBox="0 0 1920 1080" width={1920} height={1080}>
        <g transform={camera(t, [{ f: 0, s: 1.25, x: 960, y: 600 }, { f: 60, s: 1.1, x: 960, y: 580 }])}>
          <Cafeteria />
          <Placed x={820} y={GROUND}>
            <Character look={LOOKS.maya} arm={20 + Math.sin(frame * 0.2) * 4} hold="pizza" happy={1} frame={frame} jump={Math.abs(Math.sin(t * 0.2)) * 18} />
          </Placed>
          <Placed x={1260} y={GROUND} face={-1}>
            <Character look={LOOKS.jordan} arm={-60} mouth="o" frame={frame} blink={frame % 70 < 4} />
          </Placed>
          <Bubble x={1300} y={330} text="Whoa!" pop={interpolate(t, [4, 12], [0, 1], clamp)} w={220} tail="right" />
          <Bubble x={700} y={330} text="Totally worth it!" pop={interpolate(t, [14, 22], [0, 1], clamp)} w={420} />
        </g>
      </svg>
    );
  }

  const w = walkTo(frame, 12, Math.round(Sv.dur * 0.8), -160, STOP_X);
  let arm: number | undefined;
  if (frame >= Ci) arm = interpolate(frame, [Ci + 2, Ci + 14, Ci + 30, Ci + 40], [90, READER_ARM, READER_ARM, 90], clamp);
  const cam: CamKey[] = [
    { f: 0, s: 1, x: 960, y: 540 },
    { f: Ci - 4, s: 1, x: 960, y: 540 },
    { f: Ci + 12, s: 1.9, x: 1440, y: 540 },
    { f: Rd, s: 1.9, x: 1440, y: 540 },
    { f: Rd + 14, s: 2.5, x: SCREEN_MID.x, y: SCREEN_MID.y },
  ];
  return (
    <svg viewBox="0 0 1920 1080" width={1920} height={1080}>
      <g transform={camera(frame, cam)}>
        <Hallway />
        <Kiosk
          scanned={frame >= tapCard}
          led={frame >= tapCard ? 1 : 0}
          ring={interpolate(frame, [tapCard, tapCard + 22], [0, 1], clamp)}
          screen={frame >= tapCard ? <ShopScreen balance={balance} redeemed={frame >= tapBtn + 6} tap={interpolate(frame - tapBtn, [0, 14], [0, 1], clamp)} /> : undefined}
        />
        <Placed x={w.x} y={GROUND}>
          <Character look={LOOKS.maya} walking={w.walking} phase={frame * 0.32} arm={arm} holdCard={frame >= Ci + 4 && frame < Ci + 34} frame={frame} blink={frame % 84 < 4} happy={frame >= tapBtn + 6 ? 1 : 0} />
        </Placed>
        {frame >= tapBtn + 6 ? <Coins x={SCREEN_MID.x} y={SCREEN.y + 60} t={interpolate(frame - tapBtn - 6, [0, 30], [0, 1], clamp)} n={8} spread={150} /> : null}
      </g>
    </svg>
  );
};

const SavingCounter: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const p = usePop(6);
  const pts = Math.round(interpolate(frame, [10, dur - 20], [0, 289], { ...clamp, easing: Easing.inOut(Easing.quad) }));
  const week = Math.min(4, 1 + Math.floor(interpolate(frame, [10, dur - 20], [0, 4], clamp)));
  return (
    <div
      style={{
        position: "absolute",
        top: 50,
        right: 60,
        padding: "20px 34px",
        borderRadius: 28,
        background: "white",
        boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
        textAlign: "center",
        transform: `scale(${p})`,
      }}
    >
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 30, color: "#be185d" }}>Saving up · Week {week}</div>
      <div style={{ fontFamily: anton, fontSize: 110, color: "#0f1f3a", lineHeight: 1 }}>
        {pts} <span style={{ fontSize: 50, color: "#be185d" }}>PTS</span>
      </div>
    </div>
  );
};

export const StoryRewardsPrizeDay: React.FC = () => {
  const tl = prizedayTimeline;
  const Sv = tl.at("saving");
  const Rd = tl.at("redeem").start;
  const end = tl.at("end");
  return (
    <AbsoluteFill style={{ background: "#fdf0d8" }}>
      <Sequence durationInFrames={end.start + 8}>
        <SceneFade dur={end.start + 8} inFrames={6} outFrames={8}>
          <PrizeWorld tl={tl} />
        </SceneFade>
      </Sequence>
      <Sequence durationInFrames={Sv.dur + 10}>
        <SavingCounter dur={Sv.dur} />
      </Sequence>
      <Sequence from={end.start}>
        <SceneFade dur={end.dur} inFrames={8} outFrames={1}>
          <StoryEnd title="Rewards" tagline="Good choices. Real prizes." color="#db2777" featured={["Rewards"]} bg="linear-gradient(135deg, #fce7f3, #fef3c7)" />
        </SceneFade>
      </Sequence>
      <BrandBug pillar="Rewards" dark={false} />
      {Array.from({ length: 8 }).map((_, i) => (
        <Sfx key={i} at={12 + i * Math.round((Sv.dur - 30) / 8)} name="coin" volume={0.2} />
      ))}
      <Sfx at={tl.at("cashin").start + 18} name="beep" volume={0.4} />
      <Sfx at={Rd + 26} name="pop" volume={0.6} />
      <Sfx at={Rd + 32} name="levelup" volume={0.45} />
      <Sfx at={tl.at("pizza").start} name="whoosh" volume={0.4} />
      <Sfx at={end.start} name="chime" volume={0.45} />
      <Music timeline={tl} track="pizza-funk" volume={0.5} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * Houses: Friday Assembly (1920x1080)
 * ════════════════════════════════════════════════════════════════════ */

export const assemblyTimeline = buildTimeline("story-houses-assembly");

const BIG = { x: 610, y: 50, w: 700, h: 380 };

const Standings: React.FC<{ scores: number[]; banner?: string }> = ({ scores, banner }) => {
  const max = 1400;
  return (
    <g>
      <rect width={BIG.w} height={BIG.h} fill="#0f172a" />
      <text x={BIG.w / 2} y={52} textAnchor="middle" fontFamily={anton} fontSize={44} fill="#fbbf24">
        🏆 HOUSE CUP STANDINGS
      </text>
      {HOUSES.map((h, i) => (
        <g key={h.name} transform={`translate(30 ${84 + i * 66})`}>
          <text x={0} y={36} fontSize={34}>
            {h.emoji}
          </text>
          <text x={50} y={36} fontFamily={outfit} fontWeight={800} fontSize={28} fill="white">
            {h.name}
          </text>
          <rect x={180} y={10} width={380} height={34} rx={17} fill="rgba(255,255,255,0.12)" />
          <rect x={180} y={10} width={(380 * scores[i]) / max} height={34} rx={17} fill={h.color} />
          <text x={640} y={38} textAnchor="end" fontFamily={anton} fontSize={32} fill="white">
            {Math.round(scores[i])}
          </text>
        </g>
      ))}
      {banner ? (
        <g>
          <rect y={BIG.h - 50} width={BIG.w} height={50} fill={HOUSES[1].color} />
          <text x={BIG.w / 2} y={BIG.h - 15} textAnchor="middle" fontFamily={anton} fontSize={36} fill="white">
            {banner}
          </text>
        </g>
      ) : null}
    </g>
  );
};

const Crowd: React.FC<{ frame: number; wild: number }> = ({ frame, wild }) => (
  <g>
    {[0, 1, 2].map((tier) => (
      <g key={tier}>
        <rect x={0} y={600 + tier * 90} width={1920} height={24} fill="#a16207" />
        {Array.from({ length: 24 }).map((_, i) => {
          const house = Math.floor(i / 6);
          const hx = 40 + i * 80 + (tier % 2) * 20;
          const isTide = house === 1;
          const bounce = Math.abs(Math.sin(frame * 0.12 + i * 0.7 + tier)) * 4 + (isTide ? wild * Math.abs(Math.sin(frame * 0.5 + i)) * 40 : 0);
          const skin = ["#a8683f", "#f1c7a5", "#6b4226", "#e0ac85", "#c68642"][(i + tier) % 5];
          return (
            <g key={i} transform={`translate(${hx} ${590 + tier * 90 - bounce})`}>
              <rect x={-24} y={-40} width={48} height={48} rx={16} fill={HOUSES[house].color} />
              <circle cy={-62} r={22} fill={skin} />
              {isTide && wild > 0.5 ? (
                <g stroke={HOUSES[house].color} strokeWidth={10} strokeLinecap="round">
                  <line x1={-20} y1={-34} x2={-34} y2={-86} />
                  <line x1={20} y1={-34} x2={34} y2={-86} />
                </g>
              ) : null}
            </g>
          );
        })}
      </g>
    ))}
  </g>
);

const AssemblyWorld: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const T = tl.at("tied");
  const W = tl.at("win").start;
  const chipAt = T.start + Math.round(T.dur * 0.62);
  const base = [1180, 1100, 980, 940];
  const scores = base.map((b, i) => {
    let s = interpolate(frame, [0, 60], [b * 0.6, b], { ...clamp, easing: Easing.out(Easing.cubic) });
    if (i === 1) s += interpolate(frame, [T.start + 10, T.start + 40], [0, 80], clamp) + interpolate(frame, [chipAt + 14, chipAt + 30], [0, 70], clamp);
    return s;
  });
  const wild = interpolate(frame, [W, W + 8], [0, 1], clamp);
  const chipT = interpolate(frame, [chipAt, chipAt + 16], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const cam: CamKey[] = [
    { f: 0, s: 1.3, x: 700, y: 520 },
    { f: 90, s: 1.05, x: 1000, y: 540 },
    { f: T.start, s: 1, x: 960, y: 540 },
    { f: T.start + 20, s: 1.6, x: BIG.x + BIG.w / 2, y: BIG.y + BIG.h / 2 },
    { f: W - 4, s: 1.6, x: BIG.x + BIG.w / 2, y: BIG.y + BIG.h / 2 },
    { f: W + 12, s: 1, x: 960, y: 560 },
  ];
  return (
    <svg viewBox="0 0 1920 1080" width={1920} height={1080}>
      <g transform={camera(frame, cam)}>
        <rect width={1920} height={1080} fill="#e7e5e4" />
        {HOUSES.map((h, i) => (
          <g key={h.name} transform={`translate(${[90, 350, 1370, 1630][i]} 20)`}>
            <path d="M 0 0 L 200 0 L 200 120 L 100 160 L 0 120 Z" fill={h.color} />
            <text x={100} y={80} textAnchor="middle" fontSize={60}>
              {h.emoji}
            </text>
          </g>
        ))}
        <Screen id="gymscreen" x={BIG.x} y={BIG.y} w={BIG.w} h={BIG.h}>
          <Standings scores={scores} banner={frame >= W ? "🌊 TIDE LEADS!" : undefined} />
        </Screen>
        <Crowd frame={frame} wild={wild} />
        <rect y={870} width={1920} height={210} fill="#e8c48a" />
        <ellipse cx={960} cy={980} rx={400} ry={60} fill="none" stroke="#b45309" strokeWidth={6} />
        <Placed x={220} y={1000} scale={0.9}>
          <Character look={LOOKS.mrChen} arm={-10} hold="none" mouth={frame < W ? "talk" : "open"} frame={frame} happy={frame >= W ? 1 : 0} />
        </Placed>
        <rect x={250} y={820} width={150} height={190} rx={10} fill="#1e3a8a" />
        <image href={LOGO} x={285} y={860} width={80} height={80} />
        {chipT > 0 && chipT < 1 ? (
          <g transform={`translate(${interpolate(chipT, [0, 1], [1700, BIG.x + 400])} ${interpolate(chipT, [0, 1], [700, BIG.y + 84 + 66 + 26])})`}>
            <rect x={-120} y={-30} width={240} height={60} rx={30} fill="white" stroke={HOUSES[1].color} strokeWidth={5} />
            <text textAnchor="middle" y={12} fontFamily={outfit} fontWeight={800} fontSize={30} fill={HOUSES[1].color}>
              +70 Reading 📚
            </text>
          </g>
        ) : null}
      </g>
    </svg>
  );
};

export const StoryHousesAssembly: React.FC = () => {
  const tl = assemblyTimeline;
  const T = tl.at("tied");
  const W = tl.at("win").start;
  const end = tl.at("end");
  return (
    <AbsoluteFill style={{ background: "#e7e5e4" }}>
      <Sequence durationInFrames={end.start + 8}>
        <SceneFade dur={end.start + 8} inFrames={6} outFrames={8}>
          <AssemblyWorld tl={tl} />
        </SceneFade>
      </Sequence>
      <Sequence from={W} durationInFrames={end.start - W}>
        <Confetti colors={[HOUSES[1].color, "#93c5fd", "white", "#fbbf24"]} width={1920} height={1080} count={120} />
      </Sequence>
      <Sequence from={end.start}>
        <SceneFade dur={end.dur} inFrames={8} outFrames={1}>
          <StoryEnd title="Houses" tagline="Every point brings your school together." color="#dc2626" featured={["Houses"]} bg="linear-gradient(135deg, #fee2e2, #dbeafe)" />
        </SceneFade>
      </Sequence>
      <BrandBug pillar="Houses" dark={false} />
      <Sfx at={0} name="crowd" volume={0.3} />
      <Sfx at={T.start + Math.round(T.dur * 0.62)} name="whoosh" volume={0.45} />
      <Sfx at={T.start + Math.round(T.dur * 0.62) + 16} name="coin" volume={0.5} />
      <Sfx at={W} name="impact" volume={0.5} />
      <Sfx at={W + 2} name="crowd" volume={0.65} />
      <Sfx at={end.start} name="chime" volume={0.45} />
      <Music timeline={tl} track="assembly-anthem" volume={0.5} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * Family: Proud Parent (1920x1080)
 * ════════════════════════════════════════════════════════════════════ */

export const familyTimeline = buildTimeline("story-family-portal");

const Office: React.FC = () => (
  <g>
    <rect width={1920} height={720} fill="#e2e8f0" />
    <g transform="translate(1180 110)">
      <rect width={560} height={380} rx={10} fill="#bfdbfe" stroke="#475569" strokeWidth={14} />
      {Array.from({ length: 9 }).map((_, i) => (
        <rect key={i} x={20 + i * 60} y={380 - (120 + rnd(i) * 170)} width={50} height={120 + rnd(i) * 170} fill={i % 2 ? "#64748b" : "#94a3b8"} />
      ))}
      <line x1={280} y1={0} x2={280} y2={380} stroke="#475569" strokeWidth={10} />
    </g>
    <Floor y={724} color="#cbd5e1" />
    <Desk x={180} y={GROUND - 146} w={560} />
    <rect x={330} y={GROUND - 250} width={220} height={130} rx={8} fill="#1f2937" />
    <rect x={342} y={GROUND - 240} width={196} height={108} rx={4} fill="#60a5fa" />
    <rect x={300} y={GROUND - 124} width={280} height={12} rx={6} fill="#374151" />
    <rect x={620} y={GROUND - 190} width={46} height={46} rx={8} fill="#f97316" />
    <Plant x={120} y={GROUND - 60} />
  </g>
);

const DAD_X = 960;

const FamilyWorld: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const O = tl.at("office");
  const Pr = tl.at("proud").start;
  const phoneUp = interpolate(frame, [O.start + 16, O.start + 30], [90, -28], clamp);
  const cam: CamKey[] = [
    { f: 0, s: 1, x: 960, y: 540 },
    { f: O.dur - 20, s: 1.2, x: 1000, y: 520 },
    { f: O.dur, s: 2.4, x: DAD_X + 150, y: 420 },
    { f: Pr - 4, s: 2.4, x: DAD_X + 150, y: 420 },
    { f: Pr + 12, s: 1.35, x: 1000, y: 520 },
  ];
  return (
    <svg viewBox="0 0 1920 1080" width={1920} height={1080}>
      <g transform={camera(frame, cam)}>
        <Office />
        <Placed x={DAD_X} y={GROUND}>
          <Character look={LOOKS.dad} arm={phoneUp} hold={frame >= O.start + 16 ? "phone" : "none"} happy={frame >= Pr ? 1 : 0} mouth={frame >= Pr ? "open" : "smile"} frame={frame} blink={frame % 90 < 4} />
        </Placed>
        {frame >= Pr
          ? [0, 1, 2].map((i) => {
              const t = ((frame - Pr + i * 12) % 40) / 40;
              return (
                <text key={i} x={DAD_X + 60 + i * 40} y={330 - t * 120} fontSize={40} opacity={1 - t}>
                  ❤️
                </text>
              );
            })
          : null}
        <Bubble x={DAD_X + 250} y={240} text="That's my kid! 😊" pop={interpolate(frame, [Pr + 2, Pr + 10], [0, 1], clamp)} w={400} />
      </g>
    </svg>
  );
};

const PhoneUI: React.FC<{ dur: number; noteAt: number }> = ({ dur, noteAt }) => {
  const frame = useCurrentFrame();
  const inP = usePop(0, 14, 160);
  const note = usePop(noteAt, 12, 200);
  const pts = Math.round(interpolate(frame, [noteAt, noteAt + 20], [1230, 1240], clamp));
  const out = interpolate(frame, [dur - 8, dur], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", background: `rgba(15,23,42,${0.45 * inP * out})` }}>
      <div
        style={{
          width: 520,
          height: 980,
          borderRadius: 70,
          background: "#f8fafc",
          border: "16px solid #111827",
          boxShadow: "0 40px 100px rgba(0,0,0,0.5)",
          transform: `scale(${inP * out}) translateY(${(1 - inP) * 200}px)`,
          overflow: "hidden",
          fontFamily: jakarta,
        }}
      >
        <div style={{ background: "#0ea5e9", color: "white", padding: "60px 30px 24px", fontFamily: outfit, fontWeight: 800, fontSize: 30 }}>LevelUp EDU · Family</div>
        <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 84, height: 84, borderRadius: 42, background: "#22c55e", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: outfit, fontWeight: 800, fontSize: 36 }}>
              LM
            </div>
            <div>
              <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 36, color: "#0f172a" }}>Leo M.</div>
              <div style={{ fontWeight: 700, fontSize: 22, color: "#64748b" }}>Grade 5 · Ms. Rivera</div>
            </div>
          </div>
          <div style={{ padding: "18px 22px", borderRadius: 20, background: "#dcfce7", color: "#14532d", fontWeight: 700, fontSize: 26 }}>✓ In class today · 7:52 AM</div>
          <div style={{ padding: "18px 22px", borderRadius: 20, background: "#fef9c3", color: "#713f12", fontWeight: 700, fontSize: 26 }}>
            ⭐ <span style={{ fontFamily: anton, fontSize: 40 }}>{pts.toLocaleString()}</span> points
          </div>
          <div
            style={{
              padding: "20px 22px",
              borderRadius: 20,
              background: "white",
              border: "3px solid #0ea5e9",
              transform: `scale(${note})`,
              transformOrigin: "50% 0%",
              opacity: note,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 22, color: "#0369a1" }}>📝 Note from Ms. Rivera</div>
            <div style={{ fontWeight: 600, fontSize: 26, color: "#0f172a", marginTop: 8 }}>Helped a classmate with fractions today!</div>
            <div style={{ marginTop: 10, display: "inline-block", padding: "6px 16px", borderRadius: 999, background: "#facc15", fontFamily: outfit, fontWeight: 800, fontSize: 24, color: "#713f12" }}>+10 ⭐</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const FamilyCards: React.FC<{ dur: number }> = ({ dur }) => {
  const items = ["✓  Attendance", "⭐  Points", "📝  Teacher notes"];
  const out = interpolate(useCurrentFrame(), [dur - 8, dur], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 30, flexDirection: "row", background: `rgba(15,23,42,${0.4 * out})`, opacity: out }}>
      {items.map((t, i) => (
        <FamilyCard key={t} text={t} delay={6 + i * 12} />
      ))}
    </AbsoluteFill>
  );
};

const FamilyCard: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const p = usePop(delay, 11, 200);
  return (
    <div style={{ padding: "40px 50px", borderRadius: 36, background: "white", fontFamily: outfit, fontWeight: 800, fontSize: 56, color: "#0f172a", boxShadow: "0 20px 50px rgba(0,0,0,0.3)", transform: `scale(${p}) translateY(${(1 - p) * 100}px)` }}>
      {text}
    </div>
  );
};

export const StoryFamilyPortal: React.FC = () => {
  const tl = familyTimeline;
  const Op = tl.at("open");
  const Ex = tl.at("explain");
  const end = tl.at("end");
  const noteAt = Math.round(Op.cues[0] + Op.lens[0] * 0.45);
  return (
    <AbsoluteFill style={{ background: "#e2e8f0" }}>
      <Sequence durationInFrames={end.start + 8}>
        <SceneFade dur={end.start + 8} inFrames={6} outFrames={8}>
          <FamilyWorld tl={tl} />
        </SceneFade>
      </Sequence>
      <Sequence from={Op.start} durationInFrames={Op.dur}>
        <PhoneUI dur={Op.dur} noteAt={noteAt} />
      </Sequence>
      <Sequence from={Ex.start} durationInFrames={Ex.dur}>
        <FamilyCards dur={Ex.dur} />
      </Sequence>
      <Sequence from={end.start}>
        <SceneFade dur={end.dur} inFrames={8} outFrames={1}>
          <StoryEnd title="Family Portal" tagline="Bring families into every win." color="#0284c7" featured={["Family"]} bg="linear-gradient(135deg, #e0f2fe, #fef9c3)" />
        </SceneFade>
      </Sequence>
      <BrandBug pillar="Family" dark={false} />
      <Sfx at={Op.start} name="whoosh" volume={0.35} />
      <Sfx at={Op.start + noteAt} name="ding" volume={0.5} />
      <Sfx at={Op.start + noteAt + 10} name="coin" volume={0.4} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} at={Ex.start + 6 + i * 12} name="pop" volume={0.45} />
      ))}
      <Sfx at={end.start} name="chime" volume={0.45} />
      <Music timeline={tl} track="warm-acoustic" volume={0.5} duckTo={0.4} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};
