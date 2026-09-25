/** School Office videos: Ask the Office (cartoon), Rapid Answers (tall UI), Bus Radar (tall), Early Pickup (cartoon). */
import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
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
  Timeline,
  anton,
  buildTimeline,
  clamp,
  jakarta,
  outfit,
  usePop,
} from "./common";
import { Bubble, Character, Floor, LOOKS, Look, Placed, Plant, Poster, Screen, Stage, Window, walkTo } from "./cartoon";

export const TEAL = "#0f766e";
const GROUND = 900;

export const MS_PARK: Look = { skin: "#e8b98a", hair: "#1c1917", hairStyle: "long", top: "#0f766e", pants: "#1f2937", shoes: "#111827", glasses: true, adult: true, accent: "#fde68a", lanyard: true };
export const MOM: Look = { skin: "#f1c7a5", hair: "#92400e", hairStyle: "ponytail", top: "#e11d48", pants: "#334155", shoes: "#111827", adult: true, accent: "#fecdd3" };

export const typed = (text: string, frame: number, start: number, cps = 1.2) => text.slice(0, Math.max(0, Math.floor((frame - start) * cps)));

const OfficeEnd: React.FC<{ tagline: string }> = ({ tagline }) => {
  const a = usePop(0, 12, 170);
  const b = usePop(12);
  const { width } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(135deg, #ccfbf1, #e0f2fe)", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 50px" }}>
      <div style={{ transform: `scale(${a})` }}>
        <LogoLockup size={120} dark={false} />
      </div>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: Math.min(150, width / 7), color: TEAL, lineHeight: 1.05, marginTop: 20, transform: `scale(${a})` }}>School Office</div>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: Math.min(60, width / 17), color: "#0f1f3a", marginTop: 10, opacity: b }}>{tagline}</div>
      <div style={{ marginTop: 44, opacity: b }}>
        <PillarStrip featured={["Office"]} dark={false} delay={14} size={30} />
      </div>
      <div style={{ marginTop: 30, fontFamily: jakarta, fontWeight: 700, fontSize: 40, color: "#475569", opacity: b }}>leveluprewards.app</div>
    </AbsoluteFill>
  );
};

/* ── Office set ──────────────────────────────────────────────────────── */

export const MON = { x: 700, y: 330, w: 420, h: 260 };

export const OfficeRoom: React.FC<{ monitor: React.ReactNode }> = ({ monitor }) => (
  <g>
    <rect width={1920} height={720} fill="#f0fdfa" />
    <rect y={0} width={1920} height={60} fill="#ccfbf1" />
    <Window x={1180} y={110} w={280} h={260} />
    <Poster x={80} y={140} line1="Front desk" line2="welcome!" rot={-2} />
    <g transform="translate(300 120)">
      <rect width={260} height={150} rx={10} fill="white" stroke="#99f6e4" strokeWidth={6} />
      <text x={130} y={62} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={40} fill={TEAL}>
        OFFICE
      </text>
      <text x={130} y={108} textAnchor="middle" fontFamily={outfit} fontWeight={700} fontSize={26} fill="#475569">
        School ABC
      </text>
    </g>
    <Floor y={724} color="#d6d3d1" />
    <Plant x={1840} y={GROUND - 60} />
    {/* monitor on the desk */}
    <rect x={MON.x + MON.w / 2 - 18} y={MON.y + MON.h + 14} width={36} height={60} fill="#334155" />
    <rect x={MON.x + MON.w / 2 - 80} y={MON.y + MON.h + 70} width={160} height={14} rx={7} fill="#334155" />
    <Screen id="officemon" x={MON.x} y={MON.y} w={MON.w} h={MON.h}>
      {monitor}
    </Screen>
  </g>
);

/** Front counter drawn over the lower bodies. */
export const Counter: React.FC = () => (
  <g>
    <rect x={380} y={GROUND - 250} width={1000} height={34} rx={8} fill="#115e59" />
    <rect x={400} y={GROUND - 216} width={960} height={216} fill="#14b8a6" />
    {[0, 1, 2, 3].map((i) => (
      <rect key={i} x={430 + i * 235} y={GROUND - 190} width={200} height={160} rx={10} fill="rgba(255,255,255,0.18)" />
    ))}
  </g>
);

/* ── Office UI drawn on screens ──────────────────────────────────────── */

export const OfficeUI: React.FC<{ w: number; h: number; question: string; answer: React.ReactNode; answerIn: number }> = ({ w, h, question, answer, answerIn }) => (
  <g>
    <rect width={w} height={h} fill="#f8fafc" />
    <rect width={w} height={h * 0.12} fill={TEAL} />
    <text x={16} y={h * 0.085} fontFamily={outfit} fontWeight={800} fontSize={h * 0.06} fill="white">
      LevelUp · School Office
    </text>
    <text x={w / 2} y={h * 0.25} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={h * 0.075} fill="#0f172a">
      Hi Grace, how can I help?
    </text>
    <rect x={w * 0.08} y={h * 0.31} width={w * 0.84} height={h * 0.13} rx={h * 0.065} fill="white" stroke="#99f6e4" strokeWidth={3} />
    <text x={w * 0.13} y={h * 0.395} fontFamily={jakarta} fontWeight={600} fontSize={h * 0.055} fill={question ? "#0f172a" : "#94a3b8"}>
      {question || "Ask a question…"}
    </text>
    {answerIn > 0 ? <g opacity={Math.min(1, answerIn)} transform={`translate(0 ${(1 - Math.min(1, answerIn)) * 20})`}>{answer}</g> : null}
  </g>
);

export const AbsentAnswer: React.FC<{ w: number; h: number; highlight?: boolean }> = ({ w, h, highlight }) => {
  const rows = ["Ava R. · Grade 5", "Sam T. · Grade 3", "Eli K. · Grade 7"];
  const rh = h * 0.08;
  return (
    <g transform={`translate(${w * 0.08} ${h * 0.47})`}>
      <rect width={w * 0.84} height={rh * 4.6} rx={12} fill="white" stroke="#e2e8f0" strokeWidth={2} />
      <text x={14} y={rh * 0.75} fontFamily={outfit} fontWeight={800} fontSize={rh * 0.55} fill={TEAL}>
        3 absent today
      </text>
      {rows.map((r, i) => (
        <text key={r} x={14} y={rh * (1.75 + i)} fontFamily={jakarta} fontWeight={600} fontSize={rh * 0.5} fill="#334155">
          • {r}
        </text>
      ))}
      {highlight ? (
        <g transform={`translate(0 ${rh * 4.75})`}>
          <rect width={w * 0.84} height={rh * 1.1} rx={rh * 0.55} fill="#dcfce7" stroke="#16a34a" strokeWidth={2} />
          <text x={(w * 0.84) / 2} y={rh * 0.75} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={rh * 0.5} fill="#14532d">
            ✓ Leo M. — here since 7:52 AM
          </text>
        </g>
      ) : null}
    </g>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * Ask the Office (cartoon, wide + tall)
 * ════════════════════════════════════════════════════════════════════ */

export const officeAskTimeline = buildTimeline("story-office-ask");
export const PARK_X = 560;
const PARENT_X = 1560;

const AskWorld: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const O = tl.at("office");
  const Pa = tl.at("parent");
  const Ak = tl.at("ask");
  const An = tl.at("answer");
  const Rp = tl.at("reply");
  const q = "Who is absent today?";
  const qStart = Ak.start + Ak.cues[0] + Math.round(Ak.lens[0] * 0.45);
  const answerAt = An.start + 6;
  const w = walkTo(frame, 20, Math.round(O.dur * 0.8), 2080, PARENT_X);
  const ring = frame < Pa.start && Math.floor(frame / 10) % 3 !== 2;
  const monitor = (
    <OfficeUI
      w={MON.w}
      h={MON.h}
      question={frame >= qStart ? typed(q, frame, qStart) : ""}
      answerIn={(frame - answerAt) / 10}
      answer={<AbsentAnswer w={MON.w} h={MON.h} highlight={frame >= answerAt + Math.round(An.lens[0] * 0.45)} />}
    />
  );
  const cam = [
    { f: 0, s: 1, x: 960, y: 540 },
    { f: Ak.start, s: 1, x: 960, y: 540 },
    { f: Ak.start + 16, s: 2.6, x: MON.x + MON.w / 2, y: MON.y + MON.h / 2 },
    { f: Rp.start - 4, s: 2.6, x: MON.x + MON.w / 2, y: MON.y + MON.h / 2 },
    { f: Rp.start + 12, s: 1, x: 960, y: 540 },
  ];
  const tall = [
    { f: 0, s: 1, x: 1600, y: 540 },
    { f: O.dur, s: 1, x: 1600, y: 540 },
    { f: Pa.start + 20, s: 1, x: 1560, y: 540 },
    { f: Ak.start, s: 1, x: 700, y: 540 },
    { f: Ak.start + 16, s: 1.45, x: MON.x + MON.w / 2, y: MON.y + MON.h / 2 },
    { f: Rp.start - 4, s: 1.45, x: MON.x + MON.w / 2, y: MON.y + MON.h / 2 },
    { f: Rp.start + 12, s: 1, x: 640, y: 540 },
  ];
  return (
    <Stage frame={frame} cam={cam} tall={tall}>
      <OfficeRoom monitor={monitor} />
      <Placed x={PARK_X} y={GROUND}>
        <Character look={MS_PARK} arm={frame >= qStart - 10 && frame < answerAt ? 40 + Math.sin(frame * 2) * 6 : 60} frame={frame} mouth={frame >= Rp.start && frame < Rp.start + Rp.lens[0] + 6 ? "talk" : "smile"} happy={frame >= answerAt + 20 ? 1 : 0} blink={frame % 95 < 4} />
      </Placed>
      <Placed x={w.x} y={GROUND} face={-1}>
        <Character look={MOM} walking={w.walking} phase={frame * 0.3} frame={frame} mouth={frame >= Pa.start && frame < Pa.start + Pa.lens[0] + 6 ? "talk" : frame >= Rp.start ? "open" : "smile"} happy={frame >= Rp.start ? 1 : 0} blink={frame % 80 < 4} />
      </Placed>
      <Counter />
      {/* ringing desk phone */}
      <g transform={`translate(1250 ${GROUND - 290}) rotate(${ring ? Math.sin(frame * 3) * 8 : 0})`}>
        <rect x={-50} y={-20} width={100} height={46} rx={12} fill="#1f2937" />
        <rect x={-60} y={-44} width={120} height={28} rx={14} fill="#374151" />
        {ring ? (
          <text x={70} y={-40} fontFamily={anton} fontSize={34} fill="#ef4444">
            RING!
          </text>
        ) : null}
      </g>
      <Bubble x={PARENT_X - 60} y={280} text="Is Leo here today?" pop={interpolate(frame, [Pa.start + 2, Pa.start + 10], [0, 1], clamp) * (frame < Ak.start + 10 ? 1 : 0)} w={420} tail="right" />
      <Bubble x={PARK_X + 120} y={250} text="He's in class! 😊" pop={interpolate(frame, [Rp.start + 2, Rp.start + 10], [0, 1], clamp)} w={380} />
    </Stage>
  );
};

export const StoryOfficeAsk: React.FC = () => {
  const tl = officeAskTimeline;
  const end = tl.at("end");
  const An = tl.at("answer");
  const Ak = tl.at("ask");
  return (
    <AbsoluteFill style={{ background: "#f0fdfa" }}>
      <Sequence durationInFrames={end.start + 8}>
        <SceneFade dur={end.start + 8} inFrames={6} outFrames={8}>
          <AskWorld tl={tl} />
        </SceneFade>
      </Sequence>
      <Sequence from={end.start}>
        <SceneFade dur={end.dur} inFrames={8} outFrames={1}>
          <OfficeEnd tagline="Your whole school, one question away." />
        </SceneFade>
      </Sequence>
      <BrandBug pillar="Office" dark={false} />
      {[0, 20, 40, 60].map((d) => (
        <Sfx key={d} at={4 + d} name="beep" volume={0.18} />
      ))}
      {Array.from({ length: 10 }).map((_, i) => (
        <Sfx key={i} at={Ak.start + Ak.cues[0] + Math.round(Ak.lens[0] * 0.45) + i * 2} name="tick" volume={0.15} />
      ))}
      <Sfx at={An.start + 6} name="pop" volume={0.5} />
      <Sfx at={An.start + 6 + Math.round(An.lens[0] * 0.45)} name="ding" volume={0.45} />
      <Sfx at={end.start} name="chime" volume={0.45} />
      <Music timeline={tl} track="office-bossa" volume={0.5} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * Rapid Answers (tall UI, 1080x1920)
 * ════════════════════════════════════════════════════════════════════ */

export const officeRapidTimeline = buildTimeline("office-rapid");

/** Answers land as the question finishes typing. */
const answerAt = (s: SceneTiming) => Math.round(s.cues[0] + s.lens[0] * 0.6);

const AskCard: React.FC<{ s: SceneTiming; q: string; children: React.ReactNode }> = ({ s, q, children }) => {
  const frame = useCurrentFrame();
  const inP = usePop(0, 14, 160);
  const answer = usePop(answerAt(s), 12, 180);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #042f2e, #0f766e)", alignItems: "center", paddingTop: 260 }}>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 64, color: "#99f6e4" }}>Hi Grace, how can I help?</div>
      <div
        style={{
          marginTop: 40,
          width: 940,
          padding: "30px 40px",
          borderRadius: 60,
          background: "white",
          fontFamily: jakarta,
          fontWeight: 700,
          fontSize: 50,
          color: "#0f172a",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          transform: `scale(${inP})`,
        }}
      >
        🔎 {typed(q, frame, s.cues[0], q.length / Math.max(1, s.lens[0] * 0.55))}
        <span style={{ opacity: frame % 16 < 8 ? 1 : 0 }}>|</span>
      </div>
      <div style={{ marginTop: 50, width: 940, transform: `translateY(${(1 - answer) * 200}px)`, opacity: answer }}>{children}</div>
    </AbsoluteFill>
  );
};

const Row: React.FC<{ left: string; right?: string; tone?: string; delay: number }> = ({ left, right, tone = "#0f172a", delay }) => {
  const p = usePop(delay, 14, 200);
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "26px 34px",
        borderRadius: 28,
        background: "white",
        marginBottom: 18,
        fontFamily: jakarta,
        fontWeight: 700,
        fontSize: 44,
        color: tone,
        transform: `translateX(${(1 - p) * 600}px)`,
        opacity: p,
      }}
    >
      <span>{left}</span>
      {right ? <span style={{ fontFamily: anton, color: tone }}>{right}</span> : null}
    </div>
  );
};

const MiniMap: React.FC<{ frame: number }> = ({ frame }) => {
  const t = (frame % 180) / 180;
  const route = (u: number) => ({ x: 80 + u * 780, y: 380 - Math.sin(u * Math.PI * 2) * 120 });
  const b1 = route(t);
  const b2 = route((t + 0.45) % 1);
  return (
    <svg viewBox="0 0 940 600" width={940} height={600} style={{ borderRadius: 40, background: "#e2e8f0" }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <g key={i}>
          <line x1={i * 100} y1={0} x2={i * 100} y2={600} stroke="white" strokeWidth={14} />
          <line x1={0} y1={i * 70} x2={940} y2={i * 70} stroke="white" strokeWidth={10} />
        </g>
      ))}
      <path d={Array.from({ length: 41 }, (_, i) => route(i / 40)).map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ")} stroke={TEAL} strokeWidth={12} fill="none" strokeLinecap="round" />
      {[0.1, 0.35, 0.6, 0.85].map((u) => {
        const p = route(u);
        return <circle key={u} cx={p.x} cy={p.y} r={16} fill="white" stroke={TEAL} strokeWidth={6} />;
      })}
      {[
        [b1, "#facc15", "2"],
        [b2, "#f97316", "4"],
      ].map(([p, c, n]) => {
        const pt = p as { x: number; y: number };
        return (
          <g key={n as string} transform={`translate(${pt.x} ${pt.y})`}>
            <circle r={36} fill={c as string} stroke="white" strokeWidth={6} />
            <text y={14} textAnchor="middle" fontFamily={anton} fontSize={40} fill="#111">
              {n as string}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export const OfficeRapidAnswers: React.FC = () => {
  const tl = officeRapidTimeline;
  return (
    <AbsoluteFill style={{ background: "#042f2e" }}>
      <Scenes
        timeline={tl}
        render={{
          hook: () => <RapidHook />,
          absent: (s) => (
            <SceneFade dur={s.dur} inFrames={4}>
              <AskCard s={s} q="Who is absent today?">
                <Row left="Ava R. · Grade 5" delay={answerAt(s) + 4} />
                <Row left="Sam T. · Grade 3" delay={answerAt(s) + 8} />
                <Row left="Eli K. · Grade 7" delay={answerAt(s) + 12} />
              </AskCard>
            </SceneFade>
          ),
          owe: (s) => (
            <SceneFade dur={s.dur} inFrames={4}>
              <AskCard s={s} q="Families who owe more than $100">
                <Row left="Rivera family" right="$240" tone="#b91c1c" delay={answerAt(s) + 4} />
                <Row left="Nguyen family" right="$180" tone="#b91c1c" delay={answerAt(s) + 8} />
                <Row left="Cohen family" right="$125" tone="#b91c1c" delay={answerAt(s) + 12} />
              </AskCard>
            </SceneFade>
          ),
          bus: (s) => (
            <SceneFade dur={s.dur} inFrames={4}>
              <RapidBus s={s} />
            </SceneFade>
          ),
          end: (s) => (
            <SceneFade dur={s.dur} inFrames={4} outFrames={1}>
              <OfficeEnd tagline="Just ask." />
            </SceneFade>
          ),
        }}
      />
      <BrandBug pillar="Office" style={{ top: 60, left: 60 }} />
      {tl.scenes.slice(1, 4).map((s) => (
        <React.Fragment key={s.name}>
          <Sfx at={s.start} name="whoosh" volume={0.35} />
          {Array.from({ length: 8 }).map((_, i) => (
            <Sfx key={i} at={s.start + s.cues[0] + i * 3} name="tick" volume={0.12} />
          ))}
          <Sfx at={s.start + answerAt(s)} name="pop" volume={0.5} />
        </React.Fragment>
      ))}
      <Sfx at={tl.at("end").start} name="chime" volume={0.45} />
      <Music timeline={tl} track="office-electro" volume={0.5} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

const RapidHook: React.FC = () => {
  const a = usePop(0, 10, 200);
  const b = usePop(20, 10, 200);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #042f2e, #0f766e)", justifyContent: "center", alignItems: "center", textAlign: "center", padding: 60 }}>
      <div style={{ fontFamily: anton, fontSize: 150, color: "white", lineHeight: 1, transform: `scale(${a})` }}>QUESTIONS?</div>
      <div style={{ fontFamily: anton, fontSize: 150, color: "#5eead4", lineHeight: 1.1, transform: `scale(${b})` }}>ANSWERS.</div>
      <div style={{ marginTop: 60, transform: `scale(${b})` }}>
        <LogoLockup size={100} />
      </div>
    </AbsoluteFill>
  );
};

const RapidBus: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  const p = usePop(4, 14, 150);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #042f2e, #0f766e)", alignItems: "center", paddingTop: 280 }}>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 70, color: "white" }}>🚌 Live buses</div>
      <div style={{ marginTop: 40, transform: `scale(${p})` }}>
        <MiniMap frame={frame} />
      </div>
      <div style={{ display: "flex", gap: 20, marginTop: 40 }}>
        {[
          ["On route", "6", "#0f172a"],
          ["Running late", "1", "#c2410c"],
        ].map(([l, v, c]) => (
          <div key={l} style={{ padding: "24px 40px", borderRadius: 30, background: "white", textAlign: "center", opacity: interpolate(frame, [s.cues[0] + 10, s.cues[0] + 20], [0, 1], clamp) }}>
            <div style={{ fontFamily: anton, fontSize: 90, color: c }}>{v}</div>
            <div style={{ fontFamily: jakarta, fontWeight: 700, fontSize: 34, color: "#475569" }}>{l}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * Bus Radar (tall, 1080x1920)
 * ════════════════════════════════════════════════════════════════════ */

export const officeBusTimeline = buildTimeline("story-office-bus");

const SchoolBus: React.FC<{ x: number; y: number; faces: number; wheel: number; num: string }> = ({ x, y, faces, wheel, num }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={0} y={-300} width={720} height={260} rx={40} fill="#facc15" stroke="#a16207" strokeWidth={8} />
    <rect x={620} y={-230} width={110} height={190} rx={20} fill="#facc15" stroke="#a16207" strokeWidth={8} />
    <rect x={20} y={-200} width={680} height={14} fill="#111" />
    {Array.from({ length: 5 }).map((_, i) => (
      <g key={i}>
        <rect x={40 + i * 116} y={-280} width={96} height={70} rx={10} fill="#bae6fd" stroke="#a16207" strokeWidth={5} />
        {i < faces ? (
          <g>
            <circle cx={88 + i * 116} cy={-238} r={22} fill={["#a8683f", "#f1c7a5", "#6b4226", "#e0ac85", "#c68642"][i]} />
            <circle cx={96 + i * 116} cy={-242} r={3} fill="#111" />
          </g>
        ) : null}
      </g>
    ))}
    <rect x={640} y={-210} width={70} height={60} rx={8} fill="#bae6fd" />
    <text x={330} y={-120} textAnchor="middle" fontFamily={anton} fontSize={54} fill="#111">
      SCHOOL BUS {num}
    </text>
    {[140, 580].map((wx) => (
      <g key={wx} transform={`translate(${wx} -40) rotate(${wheel})`}>
        <circle r={54} fill="#1f2937" />
        <circle r={22} fill="#9ca3af" />
        <rect x={-4} y={-50} width={8} height={100} fill="#6b7280" />
      </g>
    ))}
  </g>
);

const BusStreet: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  const busX = interpolate(frame, [0, s.dur * 0.45], [-800, 180], { ...clamp, easing: Easing.out(Easing.cubic) });
  const kid = walkTo(frame, s.dur * 0.45, s.dur * 0.85, 1100, 870);
  const boarded = frame > s.dur * 0.85;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #7dd3fc, #e0f2fe 55%)" }}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <rect y={1250} width={1080} height={670} fill="#64748b" />
        <rect y={1230} width={1080} height={30} fill="#cbd5e1" />
        {Array.from({ length: 6 }).map((_, i) => (
          <rect key={i} x={i * 200 + 20} y={1560} width={120} height={16} fill="white" />
        ))}
        <g transform="translate(60 520)">
          <rect width={420} height={700} fill="#fca5a5" />
          <text x={210} y={120} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={60} fill="#7f1d1d">
            SCHOOL ABC
          </text>
          {Array.from({ length: 6 }).map((_, i) => (
            <rect key={i} x={40 + (i % 3) * 125} y={200 + Math.floor(i / 3) * 190} width={90} height={130} fill="#bae6fd" />
          ))}
        </g>
        <SchoolBus x={busX} y={1400} faces={boarded ? 4 : 3} wheel={busX * 0.5} num="4" />
        {!boarded ? (
          <Placed x={kid.x} y={1420} face={-1} scale={0.85}>
            <Character look={LOOKS.leo} walking={kid.walking} phase={frame * 0.3} frame={frame} />
          </Placed>
        ) : null}
      </svg>
      <div style={{ position: "absolute", top: 260, width: "100%", textAlign: "center", fontFamily: anton, fontSize: 130, color: "#0f172a" }}>3:20 PM 🚌</div>
    </AbsoluteFill>
  );
};

const DriverTablet: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  const kids = ["Maya", "Leo", "Ava", "Jordan", "Sam"];
  const each = (s.dur - 40) / kids.length;
  const p = usePop(0, 14, 150);
  return (
    <AbsoluteFill style={{ background: "#fef9c3", justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: 880, borderRadius: 60, background: "#111827", padding: 30, transform: `scale(${p})` }}>
        <div style={{ borderRadius: 36, background: "#f8fafc", padding: 40 }}>
          <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 56, color: "#0f172a" }}>🚌 Bus 4 · Driver</div>
          <div style={{ fontFamily: jakarta, fontWeight: 700, fontSize: 34, color: "#64748b", marginBottom: 30 }}>Afternoon run · Stop 1</div>
          {kids.map((k, i) => {
            const on = frame > 20 + i * each;
            return (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "24px 30px",
                  borderRadius: 24,
                  marginBottom: 16,
                  background: on ? "#dcfce7" : "#f1f5f9",
                  fontFamily: jakarta,
                  fontWeight: 700,
                  fontSize: 44,
                  color: "#0f172a",
                }}
              >
                <span>{k}</span>
                <span style={{ fontFamily: outfit, fontWeight: 800, color: on ? "#16a34a" : "#94a3b8" }}>{on ? "✓ On bus" : "Waiting"}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const RouteMap: React.FC<{ s: SceneTiming; late: boolean }> = ({ s, late }) => {
  const frame = useCurrentFrame();
  const p = usePop(0, 14, 150);
  const alert = usePop(Math.round(s.cues[0] + s.lens[0] * 0.3), 10, 220);
  return (
    <AbsoluteFill style={{ background: "#f0fdfa", alignItems: "center", paddingTop: 230 }}>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 64, color: TEAL }}>School Office · Live buses</div>
      <div style={{ marginTop: 40, transform: `scale(${p})` }}>
        <MiniMap frame={frame + (late ? 400 : 0)} />
      </div>
      {late ? (
        <div
          style={{
            marginTop: 50,
            padding: "34px 44px",
            borderRadius: 36,
            background: "#fff7ed",
            border: "5px solid #f97316",
            fontFamily: outfit,
            fontWeight: 800,
            fontSize: 54,
            color: "#9a3412",
            transform: `scale(${alert})`,
            boxShadow: `0 0 ${20 + Math.sin(frame * 0.3) * 14}px rgba(249,115,22,0.6)`,
          }}
        >
          ⚠️ Bus 4 · running 6 min late
        </div>
      ) : (
        <div style={{ display: "flex", gap: 20, marginTop: 50 }}>
          {["6 buses on route", "112 kids on board"].map((t, i) => (
            <div key={t} style={{ padding: "26px 34px", borderRadius: 30, background: "white", fontFamily: outfit, fontWeight: 800, fontSize: 40, color: "#0f172a", opacity: interpolate(frame, [20 + i * 10, 30 + i * 10], [0, 1], clamp) }}>
              {t}
            </div>
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};

export const StoryOfficeBus: React.FC = () => {
  const tl = officeBusTimeline;
  const driver = tl.at("driver");
  const late = tl.at("late");
  return (
    <AbsoluteFill style={{ background: "#e0f2fe" }}>
      <Scenes
        timeline={tl}
        render={{
          street: (s) => <BusStreet s={s} />,
          driver: (s) => (
            <SceneFade dur={s.dur} inFrames={4}>
              <DriverTablet s={s} />
            </SceneFade>
          ),
          map: (s) => (
            <SceneFade dur={s.dur} inFrames={4}>
              <RouteMap s={s} late={false} />
            </SceneFade>
          ),
          late: (s) => <RouteMap s={s} late />,
          end: (s) => (
            <SceneFade dur={s.dur} inFrames={4} outFrames={1}>
              <OfficeEnd tagline="Every ride, on the radar." />
            </SceneFade>
          ),
        }}
      />
      <BrandBug pillar="Office" dark={false} style={{ top: 60, left: 60 }} />
      <Sfx at={10} name="whoosh" volume={0.4} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Sfx key={i} at={driver.start + 20 + Math.round(i * ((driver.dur - 40) / 5))} name="pop" volume={0.4} />
      ))}
      <Sfx at={late.start + late.cues[0] + Math.round(late.lens[0] * 0.3)} name="buzzer" volume={0.25} />
      <Sfx at={tl.at("end").start} name="chime" volume={0.45} />
      <Music timeline={tl} track="bus-groove" volume={0.5} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * Early Pickup (cartoon, wide + tall)
 * ════════════════════════════════════════════════════════════════════ */

export const officePickupTimeline = buildTimeline("story-office-pickup");

const PickupUI: React.FC<{ frame: number; logAt: number; updAt: number }> = ({ frame, logAt, updAt }) => {
  const w = MON.w;
  const h = MON.h;
  const logged = frame >= logAt;
  const upd = frame >= updAt;
  return (
    <g>
      <rect width={w} height={h} fill="#f8fafc" />
      <rect width={w} height={h * 0.12} fill={TEAL} />
      <text x={16} y={h * 0.085} fontFamily={outfit} fontWeight={800} fontSize={h * 0.06} fill="white">
        Front desk · Log arrival or pickup
      </text>
      <g transform={`translate(${w * 0.06} ${h * 0.18})`}>
        <rect width={w * 0.88} height={h * 0.34} rx={12} fill="white" stroke="#e2e8f0" strokeWidth={2} />
        <text x={14} y={h * 0.09} fontFamily={jakarta} fontWeight={700} fontSize={h * 0.05} fill="#64748b">
          Student
        </text>
        <text x={14} y={h * 0.16} fontFamily={outfit} fontWeight={800} fontSize={h * 0.065} fill="#0f172a">
          {typed("Leo M. · Grade 5", frame, logAt - 50, 1)}
        </text>
        <text x={14} y={h * 0.24} fontFamily={jakarta} fontWeight={700} fontSize={h * 0.05} fill="#64748b">
          Picked up by
        </text>
        <text x={14} y={h * 0.31} fontFamily={outfit} fontWeight={800} fontSize={h * 0.065} fill="#0f172a">
          {typed("Mom · 1:15 PM", frame, logAt - 26, 1)}
        </text>
      </g>
      {logged ? (
        <g transform={`translate(${w * 0.06} ${h * 0.57})`} opacity={Math.min(1, (frame - logAt) / 8)}>
          <rect width={w * 0.88} height={h * 0.14} rx={h * 0.07} fill="#dcfce7" stroke="#16a34a" strokeWidth={2} />
          <text x={(w * 0.88) / 2} y={h * 0.095} textAnchor="middle" fontFamily={outfit} fontWeight={800} fontSize={h * 0.055} fill="#14532d">
            ✓ Early pickup logged
          </text>
        </g>
      ) : null}
      {upd ? (
        <g transform={`translate(${w * 0.06} ${h * 0.75})`} opacity={Math.min(1, (frame - updAt) / 8)}>
          <rect width={w * 0.88} height={h * 0.16} rx={12} fill="#fff7ed" stroke="#f97316" strokeWidth={2} />
          <text x={14} y={h * 0.105} fontFamily={jakarta} fontWeight={700} fontSize={h * 0.052} fill="#9a3412">
            Attendance · Leo M. — Left early today
          </text>
        </g>
      ) : null}
    </g>
  );
};

const PickupWorld: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const A = tl.at("arrive");
  const L = tl.at("log");
  const U = tl.at("update");
  const Lv = tl.at("leave");
  const logAt = L.start + Math.round(L.dur * 0.75);
  const updAt = U.start + 10;
  const momW = walkTo(frame, 16, Math.round(A.dur * 0.75), 2080, 1500);
  const leoIn = walkTo(frame, Lv.start, Lv.start + 60, 2150, 1330);
  const leave = walkTo(frame, Lv.start + 70, Lv.start + Lv.dur - 10, 0, 1);
  const momX = frame < Lv.start + 70 ? momW.x : 1500 + leave.x * 700;
  const leoX = frame < Lv.start + 70 ? leoIn.x : 1330 + leave.x * 700;
  const cam = [
    { f: 0, s: 1, x: 960, y: 540 },
    { f: L.start, s: 1, x: 960, y: 540 },
    { f: L.start + 16, s: 2.4, x: MON.x + MON.w / 2, y: MON.y + MON.h / 2 },
    { f: Lv.start - 4, s: 2.4, x: MON.x + MON.w / 2, y: MON.y + MON.h / 2 },
    { f: Lv.start + 12, s: 1, x: 960, y: 540 },
  ];
  const tall = [
    { f: 0, s: 1, x: 1560, y: 540 },
    { f: L.start, s: 1, x: 1100, y: 540 },
    { f: L.start + 16, s: 1.45, x: MON.x + MON.w / 2, y: MON.y + MON.h / 2 },
    { f: Lv.start - 4, s: 1.45, x: MON.x + MON.w / 2, y: MON.y + MON.h / 2 },
    { f: Lv.start + 12, s: 1, x: 1450, y: 540 },
    { f: Lv.start + Lv.dur, s: 1, x: 1617, y: 540 },
  ];
  const leaving = frame >= Lv.start + 70;
  return (
    <Stage frame={frame} cam={cam} tall={tall}>
      <OfficeRoom monitor={<PickupUI frame={frame} logAt={logAt} updAt={updAt} />} />
      <Placed x={PARK_X} y={GROUND}>
        <Character look={MS_PARK} arm={frame >= L.start && frame < logAt ? 40 + Math.sin(frame * 2) * 6 : 60} frame={frame} happy={frame >= logAt ? 1 : 0} blink={frame % 95 < 4} />
      </Placed>
      <Placed x={momX} y={GROUND} face={leaving ? 1 : -1}>
        <Character look={MOM} walking={momW.walking || leave.walking} phase={frame * 0.3} frame={frame} happy={frame >= Lv.start + 40 ? 1 : 0} blink={frame % 80 < 4} />
      </Placed>
      {frame >= Lv.start ? (
        <Placed x={leoX} y={GROUND} face={leaving ? 1 : -1}>
          <Character look={LOOKS.leo} walking={leoIn.walking || leave.walking} phase={frame * 0.32} frame={frame} happy={1} />
        </Placed>
      ) : null}
      <Counter />
      <Bubble x={1440} y={280} text="Here for Leo!" pop={interpolate(frame, [A.start + A.cues[0] + 20, A.start + A.cues[0] + 28], [0, 1], clamp) * (frame < L.start + 10 ? 1 : 0)} w={340} tail="right" />
      <Bubble x={1300} y={320} text="Mom!" pop={interpolate(frame, [Lv.start + 50, Lv.start + 58], [0, 1], clamp) * (frame < Lv.start + 90 ? 1 : 0)} w={200} tail="right" />
    </Stage>
  );
};

export const StoryOfficePickup: React.FC = () => {
  const tl = officePickupTimeline;
  const L = tl.at("log");
  const end = tl.at("end");
  return (
    <AbsoluteFill style={{ background: "#f0fdfa" }}>
      <Sequence durationInFrames={end.start + 8}>
        <SceneFade dur={end.start + 8} inFrames={6} outFrames={8}>
          <PickupWorld tl={tl} />
        </SceneFade>
      </Sequence>
      <Sequence from={end.start}>
        <SceneFade dur={end.dur} inFrames={8} outFrames={1}>
          <OfficeEnd tagline="The front desk, sorted." />
        </SceneFade>
      </Sequence>
      <BrandBug pillar="Office" dark={false} />
      {Array.from({ length: 14 }).map((_, i) => (
        <Sfx key={i} at={L.start + Math.round(L.dur * 0.75) - 50 + i * 3} name="tick" volume={0.12} />
      ))}
      <Sfx at={L.start + Math.round(L.dur * 0.75)} name="pop" volume={0.5} />
      <Sfx at={tl.at("update").start + 10} name="ding" volume={0.4} />
      <Sfx at={end.start} name="chime" volume={0.45} />
      <Music timeline={tl} track="office-bossa" volume={0.45} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};
