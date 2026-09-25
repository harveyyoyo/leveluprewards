/**
 * Library cartoon stories:
 *  - Self Checkout: borrow → actually read → return and rate (★★★★★ = +5 reading points).
 *  - Two Returns: Ava returns on time (bonus), Leo is 4 days late (−2 points/day). "Be more like Ava."
 * Matches the app: students rate a book after returning it for +5 reading points
 * (LibraryBookReviewDialog), and library policy supports on-time bonuses and late points per day.
 */
import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
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
  usePop,
} from "./common";
import { Bubble, CamKey, Character, Coins, LOOKS, Placed, Stage, reachAngle, walkTo } from "./cartoon";
import { GROUND, Kiosk, READER_CENTER, SCREEN, STOP_X } from "./scanIn";
import { LibraryRoom } from "./storiesMore";

const SCREEN_MID = { x: SCREEN.x + SCREEN.w / 2, y: SCREEN.y + SCREEN.h / 2 };
const READER_ARM = reachAngle({ x: READER_CENTER.x - 18 - STOP_X, y: READER_CENTER.y - GROUND });
const BROWN = "#92400e";

type LibView =
  | { kind: "idle" }
  | { kind: "checkedout" }
  | { kind: "review"; stars: number; points: boolean }
  | { kind: "ontime" }
  | { kind: "late"; days: number };

/** Student Station screen (240x370), drawn in the app's library colours. */
const LibScreen: React.FC<{ view: LibView }> = ({ view }) => {
  const W = SCREEN.w;
  const header = (
    <g>
      <rect width={W} height={SCREEN.h} fill="#fffbeb" />
      <rect width={W} height={46} fill={BROWN} />
      <text x={W / 2} y={31} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={20} fill="white">
        📚 Student Station
      </text>
    </g>
  );
  const book = (
    <g>
      <rect x={85} y={60} width={70} height={92} rx={6} fill="#dc2626" stroke="#7f1d1d" strokeWidth={3} />
      <text x={120} y={110} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={12} fill="#fde68a">
        THE LOST MAP
      </text>
    </g>
  );
  const pill = (y: number, fill: string, text: string, color = "white") => (
    <g>
      <rect x={16} y={y} width={W - 32} height={40} rx={20} fill={fill} />
      <text x={W / 2} y={y + 27} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={18} fill={color}>
        {text}
      </text>
    </g>
  );
  switch (view.kind) {
    case "idle":
      return (
        <g>
          {header}
          <text x={W / 2} y={170} textAnchor="middle" fontSize={80}>
            📖
          </text>
          <text x={W / 2} y={232} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={21} fill="#78350f">
            Scan a book to
          </text>
          <text x={W / 2} y={258} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={21} fill="#78350f">
            borrow or return
          </text>
        </g>
      );
    case "checkedout":
      return (
        <g>
          {header}
          {book}
          {pill(172, "#16a34a", "✓ Checked out")}
          <text x={W / 2} y={246} textAnchor="middle" fontFamily={jakarta} fontWeight={700} fontSize={18} fill="#78350f">
            Jordan · due Oct 9
          </text>
          <text x={W / 2} y={300} textAnchor="middle" fontFamily={jakarta} fontWeight={600} fontSize={15} fill="#92400e">
            Happy reading! 📖
          </text>
        </g>
      );
    case "review":
      return (
        <g>
          {header}
          <text x={W / 2} y={84} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={19} fill="#0f172a">
            How was
          </text>
          <text x={W / 2} y={110} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={19} fill="#0f172a">
            “The Lost Map”?
          </text>
          {[0, 1, 2, 3, 4].map((i) => (
            <text key={i} x={30 + i * 45} y={176} textAnchor="middle" fontSize={38} fill={i < view.stars ? "#f59e0b" : "#d6d3d1"}>
              ★
            </text>
          ))}
          {view.points ? pill(214, "#facc15", "+5 reading points ⭐", "#713f12") : null}
          {view.points ? (
            <text x={W / 2} y={300} textAnchor="middle" fontFamily={jakarta} fontWeight={700} fontSize={16} fill="#16a34a">
              Thanks for the stars!
            </text>
          ) : null}
        </g>
      );
    case "ontime":
      return (
        <g>
          {header}
          {book}
          {pill(172, "#16a34a", "✓ Returned on time")}
          {pill(226, "#facc15", "+5 on-time bonus ⭐", "#713f12")}
          <text x={W / 2} y={310} textAnchor="middle" fontFamily={jakarta} fontWeight={700} fontSize={16} fill="#16a34a">
            Ava · Oct 9
          </text>
        </g>
      );
    case "late":
      return (
        <g>
          {header}
          {book}
          {pill(172, "#dc2626", `${view.days} days late`)}
          {pill(226, "#fee2e2", `−${view.days * 2} points`, "#b91c1c")}
          <text x={W / 2} y={310} textAnchor="middle" fontFamily={jakarta} fontWeight={700} fontSize={16} fill="#b91c1c">
            Leo · Oct 13
          </text>
        </g>
      );
  }
};

/** Cozy reading nook: kid on a beanbag with the book open. */
const ReadingNook: React.FC<{ frame: number; look: (typeof LOOKS)[keyof typeof LOOKS] }> = ({ frame, look }) => (
  <g>
    <rect width={1920} height={1080} fill="#312e81" />
    <rect x={1260} y={120} width={360} height={320} rx={10} fill="#1e1b4b" stroke="#78350f" strokeWidth={14} />
    <circle cx={1380} cy={230} r={46} fill="#fef9c3" />
    {Array.from({ length: 12 }).map((_, i) => (
      <circle key={i} cx={1290 + ((i * 97) % 300)} cy={150 + ((i * 53) % 260)} r={3} fill="white" opacity={0.3 + 0.7 * Math.abs(Math.sin(frame * 0.05 + i))} />
    ))}
    <rect y={760} width={1920} height={320} fill="#7c2d12" />
    <ellipse cx={900} cy={960} rx={520} ry={70} fill="#b45309" opacity={0.6} />
    {/* lamp */}
    <rect x={560} y={400} width={14} height={500} fill="#44403c" />
    <path d="M 500 400 L 634 400 L 600 320 L 534 320 Z" fill="#fde047" />
    <polygon points="500,400 634,400 760,900 380,900" fill="#fef08a" opacity={0.18} />
    {/* beanbag + reader */}
    <Placed x={900} y={GROUND + 40} shadow={false}>
      <Character look={look} seated arm={20} hold="book" frame={frame} happy={Math.sin(frame * 0.05) > 0.6 ? 1 : 0} blink={frame % 80 < 4} />
    </Placed>
    <ellipse cx={880} cy={GROUND - 40} rx={200} ry={110} fill="#f97316" />
    <ellipse cx={860} cy={GROUND - 70} rx={140} ry={60} fill="#fb923c" />
    {/* floating hearts while reading */}
    {[0, 1, 2].map((i) => {
      const t = ((frame + i * 20) % 60) / 60;
      return (
        <text key={i} x={1040 + i * 30} y={440 - t * 140} fontSize={40} opacity={1 - t}>
          {["⭐", "📖", "💛"][i]}
        </text>
      );
    })}
  </g>
);

const LibEnd: React.FC<{ title: string; tagline: string; children?: React.ReactNode }> = ({ title, tagline, children }) => {
  const a = usePop(0, 12, 170);
  const b = usePop(12);
  const { width } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(135deg, #fef3c7, #fed7aa)", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 50px" }}>
      {children}
      <div style={{ transform: `scale(${a})` }}>
        <LogoLockup size={110} dark={false} />
      </div>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: Math.min(140, width / 7.5), color: "#b45309", lineHeight: 1.05, marginTop: 20, transform: `scale(${a})` }}>{title}</div>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: Math.min(60, width / 17), color: "#0f1f3a", marginTop: 10, opacity: b }}>{tagline}</div>
      <div style={{ marginTop: 40, opacity: b }}>
        <PillarStrip featured={["Library"]} dark={false} delay={14} size={30} />
      </div>
      <div style={{ marginTop: 28, fontFamily: jakarta, fontWeight: 700, fontSize: 38, color: "#475569", opacity: b }}>leveluprewards.app</div>
    </AbsoluteFill>
  );
};

const DayChip: React.FC<{ text: string; color: string }> = ({ text, color }) => {
  const p = usePop(2, 11, 220);
  return (
    <AbsoluteFill style={{ alignItems: "center", pointerEvents: "none" }}>
      <div style={{ marginTop: 130, padding: "12px 38px", borderRadius: 999, background: color, color: "white", fontFamily: anton, fontSize: 60, letterSpacing: 4, transform: `scale(${p}) rotate(-2deg)`, boxShadow: "0 12px 30px rgba(0,0,0,0.25)" }}>
        {text}
      </div>
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * Self Checkout (read, then review for points)
 * ════════════════════════════════════════════════════════════════════ */

export const libraryCheckoutTimeline = buildTimeline("story-library-checkout");

const CheckoutWorld: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const F = tl.at("find");
  const Sc = tl.at("scan").start;
  const Rd = tl.at("read");
  const Rt = tl.at("return");
  const Hp = tl.at("happy").start;
  const shelfX = 640;
  const reachAt = Math.round(F.dur * 0.6);
  const grabAt = Math.round(F.dur * 0.78);
  const scanAt = Sc + 84;

  if (frame >= Rd.start && frame < Rt.start) {
    const t = frame - Rd.start;
    return (
      <Stage frame={t} cam={[{ f: 0, s: 1.15, x: 900, y: 600 }, { f: Rd.dur, s: 1.35, x: 900, y: 620 }]}>
        <ReadingNook frame={frame} look={LOOKS.jordan} />
      </Stage>
    );
  }

  if (frame >= Rt.start) {
    // Return + rating at the station, then celebrate.
    const t = frame - Rt.start;
    const scan = 20;
    const starsStart = 44;
    const stars = Math.max(0, Math.min(5, Math.floor((t - starsStart) / 7) + 1));
    const pointsAt = Math.round(Rt.cues[0] + Rt.lens[0] * 0.78);
    const view: LibView = t < scan ? { kind: "idle" } : { kind: "review", stars: t < starsStart ? 0 : stars, points: t >= pointsAt };
    let arm = interpolate(t, [4, 16, 32, 40], [60, READER_ARM - 8, READER_ARM - 8, 60], clamp);
    if (t > starsStart - 4 && t < starsStart + 40) arm = -10 + Math.sin(t * 0.8) * 6; // tapping stars
    const happy = frame >= Hp;
    if (happy) arm = -80 + Math.sin(frame * 0.4) * 6;
    const cam: CamKey[] = [
      { f: 0, s: 1.4, x: 1380, y: 540 },
      { f: starsStart - 6, s: 1.4, x: 1380, y: 540 },
      { f: starsStart + 4, s: 2.3, x: SCREEN_MID.x, y: SCREEN_MID.y },
      { f: Hp - Rt.start - 4, s: 2.3, x: SCREEN_MID.x, y: SCREEN_MID.y },
      { f: Hp - Rt.start + 12, s: 1.25, x: 1260, y: 560 },
    ];
    return (
      <Stage frame={t} cam={cam}>
        <LibraryRoom />
        <Kiosk scanned={t >= scan} led={t >= scan ? 1 : 0} ring={interpolate(t, [scan, scan + 22], [0, 1], clamp)} screen={<LibScreen view={view} />} />
        <Placed x={STOP_X} y={GROUND}>
          <Character look={LOOKS.jordan} arm={arm} hold={t < 36 ? "book" : "none"} frame={frame} happy={t >= pointsAt ? 1 : 0} jump={happy ? Math.abs(Math.sin((frame - Hp) * 0.25)) * 40 : 0} blink={frame % 88 < 4} />
        </Placed>
        {t >= pointsAt && !happy ? <Coins x={SCREEN_MID.x} y={SCREEN.y + 230} t={interpolate(t - pointsAt, [0, 30], [0, 1], clamp)} n={6} spread={150} /> : null}
        <Bubble x={STOP_X + 40} y={260} text="Best. Library. Ever!" pop={interpolate(frame, [Hp + 4, Hp + 12], [0, 1], clamp)} w={440} />
      </Stage>
    );
  }

  // Find the book, then check it out (no points yet — those come for reading + rating).
  const w1 = walkTo(frame, 12, Math.round(F.dur * 0.55), -160, shelfX);
  const w2 = walkTo(frame, Sc + 4, Sc + 60, shelfX, STOP_X);
  const x = frame < Sc ? w1.x : w2.x;
  const walking = w1.walking || w2.walking;
  let arm: number | undefined;
  if (frame >= reachAt && frame < grabAt + 10) arm = interpolate(frame, [reachAt, reachAt + 10, grabAt, grabAt + 10], [90, -55, -55, 60], clamp);
  else if (frame >= grabAt + 10 && frame < Sc + 62) arm = walking ? undefined : 60;
  if (frame >= Sc + 62) arm = interpolate(frame, [Sc + 62, Sc + 76, Sc + 96, Sc + 106], [60, READER_ARM - 8, READER_ARM - 8, 60], clamp);
  const laser = frame >= Sc + 76 && frame < scanAt;
  const scanned = frame >= scanAt;
  const cam: CamKey[] = [
    { f: 0, s: 1, x: 960, y: 540 },
    { f: reachAt - 6, s: 1.5, x: shelfX + 60, y: 470 },
    { f: grabAt + 16, s: 1.5, x: shelfX + 60, y: 470 },
    { f: Sc + 20, s: 1, x: 960, y: 540 },
    { f: Sc + 60, s: 1, x: 960, y: 540 },
    { f: Sc + 78, s: 1.9, x: 1440, y: 540 },
    { f: scanAt + 10, s: 2.4, x: SCREEN_MID.x, y: SCREEN_MID.y },
  ];
  return (
    <Stage frame={frame} cam={cam}>
      <LibraryRoom />
      <Kiosk scanned={scanned} led={scanned ? 1 : 0} ring={interpolate(frame, [scanAt, scanAt + 22], [0, 1], clamp)} screen={<LibScreen view={scanned ? { kind: "checkedout" } : { kind: "idle" }} />} />
      {laser ? (
        <g opacity={frame % 4 < 2 ? 1 : 0.5}>
          <path d={`M ${READER_CENTER.x} ${READER_CENTER.y} L ${READER_CENTER.x - 70} ${READER_CENTER.y - 40} L ${READER_CENTER.x - 70} ${READER_CENTER.y + 40} Z`} fill="rgba(239,68,68,0.35)" />
        </g>
      ) : null}
      <Placed x={x} y={GROUND}>
        <Character look={LOOKS.jordan} walking={walking} phase={frame * 0.32} arm={arm} hold={frame >= grabAt ? "book" : "none"} frame={frame} blink={frame % 88 < 4} />
      </Placed>
    </Stage>
  );
};

export const StoryLibraryCheckout: React.FC = () => {
  const tl = libraryCheckoutTimeline;
  const Sc = tl.at("scan").start;
  const Rd = tl.at("read");
  const Rt = tl.at("return");
  const end = tl.at("end");
  return (
    <AbsoluteFill style={{ background: "#fef3c7" }}>
      <Sequence durationInFrames={end.start + 8}>
        <SceneFade dur={end.start + 8} inFrames={6} outFrames={8}>
          <CheckoutWorld tl={tl} />
        </SceneFade>
      </Sequence>
      <Sequence from={Rd.start} durationInFrames={Rd.dur}>
        <DayChip text="A FEW DAYS LATER…" color="#4338ca" />
      </Sequence>
      <Sequence from={end.start}>
        <SceneFade dur={end.dur} inFrames={8} outFrames={1}>
          <LibEnd title="Library" tagline="Read it. Rate it. Earn it." />
        </SceneFade>
      </Sequence>
      <BrandBug pillar="Library" dark={false} />
      <Sfx at={Math.round(tl.at("find").dur * 0.78)} name="pop" volume={0.4} />
      <Sfx at={Sc + 84} name="beep" volume={0.4} />
      <Sfx at={Rd.start} name="whoosh" volume={0.35} />
      <Sfx at={Rt.start + 20} name="beep" volume={0.4} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Sfx key={i} at={Rt.start + 44 + i * 7} name="tick" volume={0.3} />
      ))}
      <Sfx at={Rt.start + Math.round(Rt.cues[0] + Rt.lens[0] * 0.78)} name="coin" volume={0.55} />
      <Sfx at={tl.at("happy").start + 4} name="levelup" volume={0.35} />
      <Sfx at={end.start} name="chime" volume={0.45} />
      <Music timeline={tl} track="cozy-jazz" volume={0.5} duckTo={0.4} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * Two Returns: "Be more like Ava."
 * ════════════════════════════════════════════════════════════════════ */

export const twoReturnsTimeline = buildTimeline("story-library-tworeturns");

const Calendar: React.FC<{ day: number; late: boolean }> = ({ day, late }) => (
  <div style={{ width: 230, borderRadius: 26, overflow: "hidden", background: "white", boxShadow: "0 16px 40px rgba(0,0,0,0.25)", textAlign: "center", fontFamily: outfit }}>
    <div style={{ background: late ? "#dc2626" : "#16a34a", color: "white", fontWeight: 800, fontSize: 36, padding: "8px 0" }}>OCT</div>
    <div style={{ fontFamily: anton, fontSize: 130, color: "#0f172a", lineHeight: 1.1 }}>{day}</div>
    <div style={{ fontWeight: 800, fontSize: 26, color: late ? "#dc2626" : "#16a34a", paddingBottom: 12 }}>{late ? `${day - 9} days late` : "Due today"}</div>
  </div>
);

const TwoWorld: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const Me = tl.at("meet");
  const Av = tl.at("ava");
  const Le = tl.at("leo");
  const Aw = tl.at("awman");

  if (frame < Av.start) {
    // Both kids holding the same book.
    return (
      <Stage frame={frame} cam={[{ f: 0, s: 1.2, x: 900, y: 560 }, { f: Me.dur, s: 1.3, x: 900, y: 560 }]}>
        <LibraryRoom />
        <Placed x={700} y={GROUND}>
          <Character look={LOOKS.ava} arm={40} hold="book" frame={frame} happy={1} blink={frame % 80 < 4} />
        </Placed>
        <Placed x={1100} y={GROUND} face={-1}>
          <Character look={LOOKS.leo} arm={40} hold="book" frame={frame} blink={(frame + 20) % 90 < 4} />
        </Placed>
      </Stage>
    );
  }

  const isAva = frame < Le.start;
  const sc = isAva ? Av : Le;
  const t = frame - sc.start;
  const look = isAva ? LOOKS.ava : LOOKS.leo;
  const walkIn = walkTo(t, isAva ? 0 : 20, isAva ? 40 : 90, -160, STOP_X);
  const scan = isAva ? 56 : 108;
  const arm = t < scan - 12 ? (walkIn.walking ? undefined : 60) : interpolate(t, [scan - 12, scan - 2, scan + 14, scan + 22], [60, READER_ARM - 8, READER_ARM - 8, 60], clamp);
  const view: LibView = t < scan ? { kind: "idle" } : isAva ? { kind: "ontime" } : { kind: "late", days: 4 };
  const sad = !isAva && t > scan + 6;
  const awT = frame - Aw.start;
  const cam: CamKey[] = isAva
    ? [
        { f: 0, s: 1, x: 960, y: 540 },
        { f: scan - 10, s: 1.3, x: 1300, y: 540 },
        { f: scan + 6, s: 2.2, x: SCREEN_MID.x, y: SCREEN_MID.y },
      ]
    : [
        { f: 0, s: 1, x: 960, y: 540 },
        { f: scan - 10, s: 1.3, x: 1300, y: 540 },
        { f: scan + 6, s: 2.2, x: SCREEN_MID.x, y: SCREEN_MID.y },
        { f: Aw.start - Le.start - 2, s: 2.2, x: SCREEN_MID.x, y: SCREEN_MID.y },
        { f: Aw.start - Le.start + 10, s: 2.1, x: STOP_X + 20, y: 430 },
      ];
  return (
    <Stage frame={t} cam={cam}>
      <LibraryRoom />
      <Kiosk scanned={t >= scan} led={t >= scan ? 1 : 0} ring={interpolate(t, [scan, scan + 22], [0, 1], clamp)} screen={<LibScreen view={view} />} />
      <Placed x={walkIn.x} y={GROUND}>
        <Character
          look={look}
          walking={walkIn.walking}
          phase={frame * (isAva ? 0.34 : 0.2)}
          arm={isAva && t > scan + 20 ? -80 + Math.sin(frame * 0.4) * 6 : arm}
          hold={t < scan + 14 ? "book" : "none"}
          frame={frame}
          happy={isAva && t > scan ? 1 : 0}
          mouth={sad ? (awT >= 0 && awT < 30 ? "talk" : "flat") : undefined}
          jump={isAva && t > scan + 20 ? Math.abs(Math.sin(t * 0.3)) * 26 : 0}
          blink={frame % 84 < 4}
        />
      </Placed>
      {isAva && t > scan ? <Coins x={SCREEN_MID.x} y={SCREEN.y + 240} t={interpolate(t - scan - 4, [0, 30], [0, 1], clamp)} n={6} spread={140} /> : null}
      {sad ? <Bubble x={STOP_X + 20} y={250} text="Aw, man. 😩" pop={interpolate(awT, [0, 8], [0, 1], clamp)} w={300} /> : null}
    </Stage>
  );
};

const LeoCalendar: React.FC = () => {
  const frame = useCurrentFrame();
  const day = Math.min(13, 9 + Math.floor(interpolate(frame, [4, 70], [0, 4.99], clamp)));
  const out = interpolate(frame, [80, 94], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: out, background: `rgba(15,23,42,${0.35 * out})` }}>
      <div style={{ transform: `rotate(${Math.sin(frame * 0.8) * (day > 9 ? 3 : 0)}deg)` }}>
        <Calendar day={day} late={day > 9} />
      </div>
    </AbsoluteFill>
  );
};

const MeetOverlay: React.FC = () => {
  const p = usePop(Math.round(20), 12, 200);
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 110 }}>
      <div style={{ transform: `scale(${p})` }}>
        <Calendar day={9} late={false} />
      </div>
    </AbsoluteFill>
  );
};

const AvaEnd: React.FC = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const big = usePop(0, 10, 200);
  return (
    <LibEnd title="Be more like Ava." tagline="Return on time. Earn the bonus.">
      <div style={{ position: "absolute", left: width > 1500 ? 140 : 40, bottom: 60, transform: `scale(${big})`, transformOrigin: "50% 100%" }}>
        <svg viewBox="-250 -640 500 680" width={width > 1500 ? 380 : 260} height={width > 1500 ? 520 : 356}>
          <ellipse cx={0} cy={2} rx={90} ry={14} fill="rgba(0,0,0,0.15)" />
          <Character look={LOOKS.ava} arm={-85 + Math.sin(frame * 0.35) * 20} happy={1} frame={frame} blink={frame % 70 < 4} />
        </svg>
      </div>
    </LibEnd>
  );
};

export const StoryLibraryTwoReturns: React.FC = () => {
  const tl = twoReturnsTimeline;
  const Av = tl.at("ava");
  const Le = tl.at("leo");
  const end = tl.at("end");
  return (
    <AbsoluteFill style={{ background: "#fef3c7" }}>
      <Sequence durationInFrames={end.start + 8}>
        <SceneFade dur={end.start + 8} inFrames={6} outFrames={8}>
          <TwoWorld tl={tl} />
        </SceneFade>
      </Sequence>
      <Sequence durationInFrames={tl.at("meet").dur}>
        <MeetOverlay />
      </Sequence>
      <Sequence from={Av.start} durationInFrames={Av.dur}>
        <DayChip text="AVA · OCT 9" color="#16a34a" />
      </Sequence>
      <Sequence from={Le.start} durationInFrames={100}>
        <LeoCalendar />
      </Sequence>
      <Sequence from={Le.start + 100} durationInFrames={Le.dur - 100}>
        <DayChip text="LEO · OCT 13" color="#dc2626" />
      </Sequence>
      <Sequence from={end.start}>
        <SceneFade dur={end.dur} inFrames={8} outFrames={1}>
          <AvaEnd />
        </SceneFade>
      </Sequence>
      <BrandBug pillar="Library" dark={false} />
      <Sfx at={Av.start + 56} name="beep" volume={0.4} />
      <Sfx at={Av.start + 60} name="coin" volume={0.55} />
      <Sfx at={Av.start + 62} name="levelup" volume={0.35} />
      {[0, 1, 2, 3].map((i) => (
        <Sfx key={i} at={Le.start + 4 + Math.round((i + 1) * 13)} name="tick" volume={0.4} />
      ))}
      <Sfx at={Le.start + 108} name="beep" volume={0.4} />
      <Sfx at={Le.start + 112} name="wahwah" volume={0.55} />
      <Sfx at={end.start} name="chime" volume={0.45} />
      <Music timeline={tl} track="sneaky-tiptoe" volume={0.45} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};
