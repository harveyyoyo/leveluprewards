/**
 * Batch 4 cartoon stories: Bulletin Board (Displays), ID Card Themes
 * (Rewards), Staff Notifications (Office), Seating Shuffle (Classroom).
 * Reuses the existing hallway/classroom/office sets to move fast.
 */
import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  BrandBug,
  LogoLockup,
  Music,
  Narration,
  Pillar,
  PillarStrip,
  SceneFade,
  Sfx,
  Timeline,
  buildTimeline,
  clamp,
  jakarta,
  outfit,
  usePop,
} from "./common";
import { Bubble, CamKey, Character, Floor, LOOKS, Placed, Poster, Stage, Window, walkTo } from "./cartoon";
import { GROUND, Kiosk, SCREEN } from "./scanIn";
import { ClassroomWall, KIDS, SeatedKid, TEACHER_X, TV } from "./storiesClassroom";
import { MS_PARK } from "./storiesOffice";

const EndCard: React.FC<{ title: string; tagline: string; color: string; featured: Pillar[]; bg: string }> = ({
  title,
  tagline,
  color,
  featured,
  bg,
}) => {
  const a = usePop(0, 12, 170);
  const b = usePop(12);
  const { width } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: bg, justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 50px" }}>
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

/* ════════════════════════════════════════════════════════════════════
 * Bulletin Board (Displays)
 * ════════════════════════════════════════════════════════════════════ */

export const bulletinTimeline = buildTimeline("story-bulletin-board");

const NOTES = [
  { emoji: "🎉", title: "Spirit Day", sub: "This Friday!" },
  { emoji: "📚", title: "Book Fair", sub: "Next week" },
  { emoji: "📸", title: "Picture Day", sub: "Oct 14" },
];

const BulletinBoardScreen: React.FC<{ appear: number }> = ({ appear }) => (
  <g>
    <rect width={TV.w} height={TV.h} fill="#fde68a" />
    <rect width={TV.w} height={54} fill="#b45309" />
    <text x={TV.w / 2} y={36} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={26} fill="white">
      📌 School Bulletin
    </text>
    {NOTES.map((n, i) => {
      const p = interpolate(appear - i * 8, [0, 10], [0, 1], clamp);
      return (
        <g key={n.title} transform={`translate(${30 + i * 190} 80) scale(${p})`}>
          <rect width={170} height={150} rx={10} fill="white" stroke="#d97706" strokeWidth={3} transform="rotate(-2)" />
          <text x={85} y={55} textAnchor="middle" fontSize={44} transform="rotate(-2)">
            {n.emoji}
          </text>
          <text x={85} y={95} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={20} fill="#78350f" transform="rotate(-2)">
            {n.title}
          </text>
          <text x={85} y={118} textAnchor="middle" fontFamily={jakarta} fontWeight={600} fontSize={16} fill="#92400e" transform="rotate(-2)">
            {n.sub}
          </text>
        </g>
      );
    })}
  </g>
);

const PhoneBulletin: React.FC<{ appear: number }> = ({ appear }) => {
  const p = usePop(0, 13, 170);
  return (
    <div style={{ position: "absolute", right: 90, bottom: 60, width: 300, borderRadius: 44, background: "#111827", padding: 14, transform: `scale(${p})`, opacity: appear }}>
      <div style={{ borderRadius: 30, background: "white", overflow: "hidden" }}>
        <div style={{ background: "#4f46e5", color: "white", padding: "18px 20px", fontFamily: outfit, fontWeight: 800, fontSize: 20 }}>Family Portal</div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {NOTES.map((n) => (
            <div key={n.title} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 16, background: "#f1f5f9" }}>
              <span style={{ fontSize: 26 }}>{n.emoji}</span>
              <span style={{ fontFamily: jakarta, fontWeight: 700, fontSize: 16, color: "#0f172a" }}>{n.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const BulletinWorld: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const Po = tl.at("post");
  const It = tl.at("items");
  const Sc = tl.at("screens").start;
  const pinAt = Math.round(Po.dur * 0.55);
  const cam: CamKey[] = [
    { f: 0, s: 1, x: 500, y: 540 },
    { f: pinAt - 10, s: 1.6, x: 470, y: 380 },
    { f: Po.dur + 10, s: 1.6, x: 470, y: 380 },
    { f: It.start + It.dur - 10, s: 1, x: TV.x + TV.w / 2, y: TV.y + TV.h / 2 - 40 },
    { f: Sc + 8, s: 2.2, x: TV.x + TV.w / 2, y: TV.y + TV.h / 2 },
  ];
  return (
    <Stage frame={frame} cam={cam}>
      <ClassroomWall />
      <g transform={`translate(${TV.x} ${TV.y})`}>
        <clipPath id="bulltv">
          <rect width={TV.w} height={TV.h} rx={6} />
        </clipPath>
        <g clipPath="url(#bulltv)">
          {frame >= It.start ? <BulletinBoardScreen appear={frame - It.start} /> : null}
        </g>
      </g>
      <Placed x={280} y={GROUND}>
        <Character look={MS_PARK} arm={frame >= pinAt - 6 && frame < pinAt + 10 ? -20 : 40} frame={frame} happy={frame >= pinAt + 20 ? 1 : 0} blink={frame % 95 < 4} />
      </Placed>
      <Poster x={80} y={200} line1="Spirit Day" line2="This Friday!" rot={frame >= pinAt ? -3 : -60} />
    </Stage>
  );
};

export const StoryBulletinBoard: React.FC = () => {
  const tl = bulletinTimeline;
  const Sc = tl.at("screens");
  const end = tl.at("end");
  return (
    <AbsoluteFill style={{ background: "#e0f2fe" }}>
      <Sequence durationInFrames={end.start + 8}>
        <SceneFade dur={end.start + 8} inFrames={6} outFrames={8}>
          <BulletinWorld tl={tl} />
        </SceneFade>
      </Sequence>
      <Sequence from={Sc.start} durationInFrames={Sc.dur}>
        <PhoneBulletin appear={1} />
      </Sequence>
      <Sequence from={end.start}>
        <SceneFade dur={end.dur} inFrames={8} outFrames={1}>
          <EndCard title="Bulletin Board" tagline="One post. Every screen." color="#4f46e5" featured={["Displays"]} bg="linear-gradient(135deg, #e0e7ff, #fef9c3)" />
        </SceneFade>
      </Sequence>
      <BrandBug pillar="Displays" dark={false} />
      <Sfx at={tl.at("post").start + Math.round(tl.at("post").dur * 0.55)} name="pop" volume={0.45} />
      <Sfx at={tl.at("items").start} name="whoosh" volume={0.4} />
      <Sfx at={Sc.start} name="ding" volume={0.4} />
      <Sfx at={end.start} name="chime" volume={0.45} />
      <Music timeline={tl} track="lobby-lounge" volume={0.5} duckTo={0.38} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * ID Card Themes (Rewards)
 * ════════════════════════════════════════════════════════════════════ */

export const idcardTimeline = buildTimeline("story-idcard-themes");

const THEMES = [
  { name: "Galaxy", bg: "linear-gradient(160deg, #1e1b4b, #4338ca)", accent: "#facc15", icon: "🚀" },
  { name: "Ocean", bg: "linear-gradient(160deg, #0c4a6e, #0891b2)", accent: "#a5f3fc", icon: "🌊" },
  { name: "Arcade", bg: "linear-gradient(160deg, #4c1d95, #db2777)", accent: "#fde047", icon: "🕹️" },
];

const IdCardMock: React.FC<{ theme: (typeof THEMES)[number]; scale?: number }> = ({ theme, scale = 1 }) => (
  <div style={{ width: 420 * scale, height: 260 * scale, borderRadius: 26 * scale, background: theme.bg, boxShadow: "0 24px 60px rgba(0,0,0,0.4)", overflow: "hidden", position: "relative" }}>
    <div style={{ position: "absolute", top: 16 * scale, left: 20 * scale, fontFamily: outfit, fontWeight: 800, fontSize: 18 * scale, color: "white" }}>SCHOOL ABC</div>
    <div style={{ position: "absolute", top: 16 * scale, right: 18 * scale, fontSize: 30 * scale }}>{theme.icon}</div>
    <div style={{ position: "absolute", left: 20 * scale, top: 60 * scale, width: 90 * scale, height: 100 * scale, borderRadius: 14 * scale, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 54 * scale }}>
      👧🏽
    </div>
    <div style={{ position: "absolute", left: 128 * scale, top: 70 * scale, color: "white" }}>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 26 * scale }}>Maya J.</div>
      <div style={{ fontFamily: jakarta, fontWeight: 600, fontSize: 16 * scale, opacity: 0.8 }}>Grade 5 · #100128</div>
    </div>
    <div style={{ position: "absolute", bottom: 18 * scale, left: 20 * scale, right: 20 * scale, height: 24 * scale, background: theme.accent, borderRadius: 6 * scale, opacity: 0.9 }} />
  </div>
);

const PortalPicker: React.FC<{ idx: number }> = ({ idx }) => {
  const p = usePop(0, 13, 170);
  return (
    <div style={{ position: "absolute", left: 90, bottom: 60, width: 340, borderRadius: 32, background: "white", padding: 24, boxShadow: "0 24px 60px rgba(0,0,0,0.3)", transform: `scale(${p})` }}>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 24, color: "#0f172a", marginBottom: 14 }}>Choose a theme</div>
      <div style={{ display: "flex", gap: 14 }}>
        {THEMES.map((t, i) => (
          <div
            key={t.name}
            style={{
              flex: 1,
              height: 70,
              borderRadius: 16,
              background: t.bg,
              border: i === idx ? "4px solid #16a34a" : "4px solid transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              transform: i === idx ? "scale(1.08)" : "scale(1)",
            }}
          >
            {t.icon}
          </div>
        ))}
      </div>
    </div>
  );
};

const IdCardWorld: React.FC<{ tl: Timeline; themeIdx: number }> = ({ tl, themeIdx }) => {
  const frame = useCurrentFrame();
  const Mt = tl.at("match");
  const theme = THEMES[themeIdx];
  const cam: CamKey[] = [
    { f: 0, s: 1, x: 960, y: 540 },
    { f: Mt.start - 10, s: 1, x: 700, y: 700 },
    { f: Mt.start + 20, s: 1.6, x: 1400, y: 500 },
  ];
  return (
    <Stage frame={frame} cam={cam}>
      <rect width={1920} height={720} fill="#111827" />
      <Floor y={724} color="#1f2937" />
      <foreignObject x={640} y={560} width={640} height={340}>
        <div style={{ display: "flex", justifyContent: "center", transform: "scale(1.5)", transformOrigin: "top center" }}>
          <IdCardMock theme={theme} />
        </div>
      </foreignObject>
      {frame >= Mt.start ? (
        <>
          <Kiosk scanned led={1} ring={0} screen={<KioskThemeScreen theme={theme} />} />
        </>
      ) : null}
    </Stage>
  );
};

const KioskThemeScreen: React.FC<{ theme: (typeof THEMES)[number] }> = ({ theme }) => (
  <g>
    <rect width={SCREEN.w} height={SCREEN.h} fill="#0f172a" />
    <rect width={SCREEN.w} height={SCREEN.h} fill={theme.name === "Galaxy" ? "#1e1b4b" : theme.name === "Ocean" ? "#0c4a6e" : "#4c1d95"} opacity={0.9} />
    <text x={SCREEN.w / 2} y={140} textAnchor="middle" fontSize={70}>
      {theme.icon}
    </text>
    <text x={SCREEN.w / 2} y={210} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={24} fill="white">
      Welcome back!
    </text>
    <text x={SCREEN.w / 2} y={246} textAnchor="middle" fontFamily={jakarta} fontWeight={600} fontSize={18} fill={theme.accent}>
      {theme.name} theme
    </text>
  </g>
);

export const StoryIdCardThemes: React.FC = () => {
  const tl = idcardTimeline;
  const Pk = tl.at("pick");
  const Mt = tl.at("match");
  const end = tl.at("end");
  return (
    <AbsoluteFill style={{ background: "#111827" }}>
      <Sequence durationInFrames={end.start + 8}>
        <SceneFade dur={end.start + 8} inFrames={6} outFrames={8}>
          <IdCardCycle tl={tl} />
        </SceneFade>
      </Sequence>
      <Sequence from={Pk.start} durationInFrames={Pk.dur}>
        <PickerOverlay />
      </Sequence>
      <Sequence from={end.start}>
        <SceneFade dur={end.dur} inFrames={8} outFrames={1}>
          <EndCard title="ID Cards" tagline="Make it theirs." color="#db2777" featured={["Rewards"]} bg="linear-gradient(135deg, #fce7f3, #ede9fe)" />
        </SceneFade>
      </Sequence>
      <BrandBug pillar="Rewards" dark={false} />
      <Sfx at={0} name="whoosh" volume={0.3} />
      <Sfx at={Pk.start + 30} name="pop" volume={0.4} />
      <Sfx at={Pk.start + 60} name="pop" volume={0.4} />
      <Sfx at={Mt.start} name="ding" volume={0.4} />
      <Sfx at={end.start} name="chime" volume={0.45} />
      <Music timeline={tl} track="chiptune" volume={0.4} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

/** Cycles the ID card + kiosk through the three themes as the picker highlights each. */
const IdCardCycle: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const Pk = tl.at("pick");
  const step = Math.min(2, Math.floor(interpolate(frame, [Pk.start + 20, Pk.start + Pk.dur - 10], [0, 3], clamp)));
  return <IdCardWorld tl={tl} themeIdx={step} />;
};

const PickerOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const step = Math.min(2, Math.floor(interpolate(frame, [20, 130], [0, 3], clamp)));
  return <PortalPicker idx={step} />;
};

/* ════════════════════════════════════════════════════════════════════
 * Staff Notifications (Office)
 * ════════════════════════════════════════════════════════════════════ */

export const staffNotifTimeline = buildTimeline("story-staff-notifications");

const Cafeteria2: React.FC = () => (
  <g>
    <rect width={1920} height={720} fill="#fef3c7" />
    {Array.from({ length: 24 }).map((_, i) => (
      <rect key={i} x={(i % 12) * 160} y={480 + Math.floor(i / 12) * 130} width={150} height={120} fill={i % 2 ? "#fed7aa" : "#ffedd5"} />
    ))}
    <Window x={1600} y={110} w={240} h={260} />
    <Floor y={724} color="#fdba74" />
  </g>
);

const NotifBanner: React.FC<{ show: number }> = ({ show }) => {
  const p = interpolate(show, [0, 10], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        top: 90,
        left: "50%",
        transform: `translateX(-50%) translateY(${(1 - p) * -60}px)`,
        opacity: p,
        width: 640,
        padding: "22px 30px",
        borderRadius: 24,
        background: "white",
        boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        gap: 18,
      }}
    >
      <div style={{ width: 56, height: 56, borderRadius: 16, background: "#0f766e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🔔</div>
      <div>
        <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 22, color: "#0f172a" }}>LevelUp Staff Alert</div>
        <div style={{ fontFamily: jakarta, fontWeight: 600, fontSize: 18, color: "#475569" }}>Leo M. needs a nurse check · Room 12</div>
      </div>
    </div>
  );
};

const StaffNotifWorld: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const Bz = tl.at("buzz");
  const Go = tl.at("go").start;
  const buzzAt = Bz.start + Math.round(Bz.dur * 0.3);
  const w = walkTo(frame, Go + 20, Go + 80, 900, 2100);
  const arm = frame >= buzzAt - 6 && frame < buzzAt + 30 ? -30 + Math.sin(frame * 0.6) * 5 : undefined;
  const cam: CamKey[] = [
    { f: 0, s: 1, x: 900, y: 540 },
    { f: Go, s: 1, x: 900, y: 540 },
    { f: Go + 40, s: 1.15, x: 1400, y: 540 },
  ];
  return (
    <Stage frame={frame} cam={cam}>
      <Cafeteria2 />
      <Placed x={900} y={GROUND}>
        <Character look={LOOKS.mrChen} arm={arm} hold={frame >= buzzAt - 6 && frame < Go ? "phone" : "none"} frame={frame} happy={frame >= Go ? 1 : 0} blink={frame % 95 < 4} />
      </Placed>
      {frame >= Go ? (
        <Placed x={w.x} y={GROUND}>
          <Character look={LOOKS.mrChen} walking={w.walking} phase={frame * 0.3} frame={frame} happy={1} />
        </Placed>
      ) : null}
    </Stage>
  );
};

export const StoryStaffNotifications: React.FC = () => {
  const tl = staffNotifTimeline;
  const Bz = tl.at("buzz");
  const end = tl.at("end");
  return (
    <AbsoluteFill style={{ background: "#fef3c7" }}>
      <Sequence durationInFrames={end.start + 8}>
        <SceneFade dur={end.start + 8} inFrames={6} outFrames={8}>
          <StaffNotifWorld tl={tl} />
        </SceneFade>
      </Sequence>
      <Sequence from={Bz.start} durationInFrames={Bz.dur}>
        <NotifBanner show={0} />
      </Sequence>
      <Sequence from={end.start}>
        <SceneFade dur={end.dur} inFrames={8} outFrames={1}>
          <EndCard title="Notifications" tagline="Right message. Right staff." color="#0f766e" featured={["Office"]} bg="linear-gradient(135deg, #ccfbf1, #fef9c3)" />
        </SceneFade>
      </Sequence>
      <BrandBug pillar="Office" dark={false} />
      <Sfx at={Bz.start + Math.round(Bz.dur * 0.3)} name="beep" volume={0.45} />
      <Sfx at={tl.at("go").start} name="pop" volume={0.4} />
      <Sfx at={end.start} name="chime" volume={0.45} />
      <Music timeline={tl} track="office-electro" volume={0.45} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * Seating Shuffle (Classroom)
 * ════════════════════════════════════════════════════════════════════ */

export const seatingShuffleTimeline = buildTimeline("story-seating-shuffle");

const SEATS_GRID: Array<[number, number]> = [
  [0, 0], [1, 0], [2, 0],
  [0, 1], [1, 1], [2, 1],
  [0, 2], [1, 2], [2, 2],
];
const SHUFFLE_KIDS = [LOOKS.leo, LOOKS.ava, LOOKS.jordan, LOOKS.maya, LOOKS.friend];
const SHUFFLE_BEFORE = [0, 1, 2, 3, 4, 0, 1, 2, 3];
const SHUFFLE_AFTER = [3, 4, 1, 0, 2, 4, 3, 0, 1];

const SeatingScreen: React.FC<{ t: number }> = ({ t }) => {
  const cellW = TV.w / 3;
  const cellH = (TV.h - 50) / 3;
  return (
    <g>
      <rect width={TV.w} height={TV.h} fill="#f8fafc" />
      <rect width={TV.w} height={50} fill="#7c3aed" />
      <text x={TV.w / 2} y={33} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={22} fill="white">
        Seating Chart
      </text>
      {SEATS_GRID.map(([cx, cy], i) => {
        const from = SHUFFLE_BEFORE[i];
        const to = SHUFFLE_AFTER[i];
        const kid = SHUFFLE_KIDS[interpolate(t, [0, 1], [from, to], clamp) > 0.5 ? to : from];
        const jitter = t > 0.05 && t < 0.95 ? Math.sin((t * 20 + i) * 3) * 4 : 0;
        return (
          <g key={i} transform={`translate(${cx * cellW + cellW / 2 + jitter} ${50 + cy * cellH + cellH / 2})`}>
            <circle r={cellH * 0.32} fill="#ede9fe" stroke="#a78bfa" strokeWidth={2} />
            <text y={8} textAnchor="middle" fontSize={cellH * 0.38}>
              {["🧑🏽", "👧🏼", "🧑🏾", "👧🏽", "👦🏻"][SHUFFLE_KIDS.indexOf(kid)]}
            </text>
          </g>
        );
      })}
    </g>
  );
};

const ShuffleWorld: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const Op = tl.at("open");
  const Sh = tl.at("shuffle");
  const tapAt = Math.round(Sh.dur * 0.3);
  const shuffleT = interpolate(frame - Sh.start - tapAt, [0, 40], [0, 1], clamp);
  const cam: CamKey[] = [
    { f: 0, s: 1, x: 960, y: 540 },
    { f: Op.dur, s: 1.4, x: TV.x + TV.w / 2, y: TV.y + TV.h / 2 },
  ];
  return (
    <Stage frame={frame} cam={cam}>
      <ClassroomWall />
      <g transform={`translate(${TV.x} ${TV.y})`}>
        <clipPath id="seattv">
          <rect width={TV.w} height={TV.h} rx={6} />
        </clipPath>
        <g clipPath="url(#seattv)">
          <SeatingScreen t={frame >= Sh.start ? shuffleT : 0} />
        </g>
      </g>
      <Placed x={TEACHER_X} y={GROUND}>
        <Character
          look={LOOKS.msRivera}
          arm={frame >= Sh.start + tapAt - 6 && frame < Sh.start + tapAt + 10 ? 20 : 32}
          hold="tablet"
          frame={frame}
          blink={frame % 100 < 4}
        />
      </Placed>
      {KIDS.map((k, i) => (
        <SeatedKid key={i} look={k.look} x={k.x} frame={frame} />
      ))}
    </Stage>
  );
};

export const StorySeatingShuffle: React.FC = () => {
  const tl = seatingShuffleTimeline;
  const Sh = tl.at("shuffle");
  const Ne = tl.at("nervous");
  const end = tl.at("end");
  return (
    <AbsoluteFill style={{ background: "#e0f2fe" }}>
      <Sequence durationInFrames={end.start + 8}>
        <SceneFade dur={end.start + 8} inFrames={6} outFrames={8}>
          <ShuffleWorld tl={tl} />
        </SceneFade>
      </Sequence>
      <Sequence from={Ne.start} durationInFrames={Ne.dur}>
        <NervousBubble />
      </Sequence>
      <Sequence from={end.start}>
        <SceneFade dur={end.dur} inFrames={8} outFrames={1}>
          <EndCard title="Seating, sorted" tagline="One tap. New chart." color="#7c3aed" featured={["Classroom"]} bg="linear-gradient(135deg, #ede9fe, #e0f2fe)" />
        </SceneFade>
      </Sequence>
      <BrandBug pillar="Classroom" dark={false} />
      <Sfx at={Sh.start + Math.round(Sh.dur * 0.3)} name="pop" volume={0.45} />
      {Array.from({ length: 9 }).map((_, i) => (
        <Sfx key={i} at={Sh.start + Math.round(Sh.dur * 0.3) + i * 3} name="tick" volume={0.15} />
      ))}
      <Sfx at={end.start} name="chime" volume={0.45} />
      <Music timeline={tl} track="playful-pizz" volume={0.5} duckTo={0.38} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

const NervousBubble: React.FC = () => {
  const p = usePop(4, 12, 200);
  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <div style={{ marginTop: 640, transform: `scale(${p})` }}>
        <Bubble x={0} y={0} text="Who am I next to?" pop={1} w={420} />
      </div>
    </AbsoluteFill>
  );
};

