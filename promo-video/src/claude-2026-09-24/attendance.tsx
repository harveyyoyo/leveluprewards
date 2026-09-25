/** Attendance pillar: "Clean Problem→Solution" (square) and "Breaking News" (widescreen). */
import React from "react";
import { AbsoluteFill, Easing, Img, Video, interpolate, staticFile, useCurrentFrame } from "remotion";
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
  anton,
  buildTimeline,
  caveat,
  clamp,
  jakarta,
  outfit,
  shot,
  usePop,
} from "./common";

const NAVY = "#0f1f3a";
const GREEN = "#16a34a";

/* ════════════════════════════════════════════════════════════════════
 * Clean Problem → Solution (1080x1080)
 * ════════════════════════════════════════════════════════════════════ */

export const attendanceCleanTimeline = buildTimeline("attendance-clean");

const Clock: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  const ring = Math.round(s.dur * 0.62);
  const rang = frame >= ring;
  const second = interpolate(frame, [0, ring], [0, 360], clamp);
  const minute = interpolate(frame, [0, ring], [354, 360], clamp);
  const shake = rang ? Math.sin(frame * 2.2) * interpolate(frame, [ring, ring + 25], [7, 0], clamp) : 0;
  const intro = usePop(0, 14, 120);
  return (
    <AbsoluteFill style={{ background: "#f8fafc", justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 96, color: rang ? "#dc2626" : NAVY, marginBottom: 40 }}>
        {rang ? "8:00 🔔" : "7:59 AM"}
      </div>
      <svg width={440} height={440} viewBox="-110 -110 220 220" style={{ transform: `scale(${intro}) rotate(${shake}deg)` }}>
        <circle r={100} fill="white" stroke={NAVY} strokeWidth={8} />
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={i} x1={0} y1={-86} x2={0} y2={-76} stroke={NAVY} strokeWidth={4} strokeLinecap="round" transform={`rotate(${i * 30})`} />
        ))}
        <line x1={0} y1={0} x2={0} y2={-48} stroke={NAVY} strokeWidth={8} strokeLinecap="round" transform="rotate(240)" />
        <line x1={0} y1={0} x2={0} y2={-72} stroke={NAVY} strokeWidth={6} strokeLinecap="round" transform={`rotate(${minute})`} />
        <line x1={0} y1={10} x2={0} y2={-80} stroke="#dc2626" strokeWidth={2.5} transform={`rotate(${second})`} />
        <circle r={6} fill="#dc2626" />
      </svg>
      <div
        style={{
          fontFamily: jakarta,
          fontWeight: 600,
          fontSize: 44,
          color: "#475569",
          marginTop: 40,
          opacity: interpolate(frame, [20, 30], [0, 1], clamp),
        }}
      >
        Will they make it?
      </div>
    </AbsoluteFill>
  );
};

const Twist: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  // Strike "hard" as the narrator reaches "Unless it's fun" (~55% into the line).
  const at = Math.round(s.dur * 0.5);
  const line = usePop(0);
  const strike = interpolate(frame, [at, at + 10], [0, 100], clamp);
  const fun = usePop(at + 10, 8, 220);
  return (
    <AbsoluteFill style={{ background: "#f8fafc", justifyContent: "center", alignItems: "center", textAlign: "center", padding: 80 }}>
      <div style={{ fontFamily: outfit, fontWeight: 700, fontSize: 72, color: NAVY, lineHeight: 1.15, opacity: line }}>
        Getting kids to class
        <br />
        on time is
      </div>
      <div style={{ position: "relative", marginTop: 16, height: 200 }}>
        <span style={{ fontFamily: outfit, fontWeight: 800, fontSize: 150, color: "#94a3b8", opacity: line }}>hard.</span>
        <div
          style={{
            position: "absolute",
            left: -10,
            top: "52%",
            height: 14,
            width: `calc(${strike}% + 20px)`,
            background: "#dc2626",
            borderRadius: 8,
            transform: "rotate(-4deg)",
            opacity: strike > 0 ? 1 : 0,
          }}
        />
      </div>
      <div style={{ fontFamily: caveat, fontSize: 190, color: GREEN, lineHeight: 0.8, transform: `scale(${fun}) rotate(-6deg)` }}>
        fun!
      </div>
    </AbsoluteFill>
  );
};

const PILLS = ["✅  One-tap check-in", "🔥  On-time streaks earn points", "📊  Reports build themselves"];

const Product: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  const enter = usePop(0, 16, 110);
  const zoom = interpolate(frame, [20, s.dur - 20], [1, 1.55], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const step = Math.floor((s.dur - 60) / 3);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #ecfdf5, #f8fafc)", alignItems: "center" }}>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 60, color: NAVY, marginTop: 150, opacity: enter }}>
        LevelUp <span style={{ color: GREEN }}>Attendance</span>
      </div>
      <div
        style={{
          marginTop: 30,
          width: 980,
          borderRadius: 22,
          overflow: "hidden",
          background: "white",
          boxShadow: "0 30px 80px rgba(15,31,58,0.22)",
          transform: `translateY(${(1 - enter) * 300}px)`,
        }}
      >
        <div style={{ height: 38, background: "#e2e8f0", display: "flex", alignItems: "center", gap: 10, paddingLeft: 18 }}>
          {["#f87171", "#fbbf24", "#4ade80"].map((c) => (
            <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />
          ))}
        </div>
        <div style={{ width: 980, height: 551, overflow: "hidden" }}>
          <Img src={shot("attendance-full.png")} style={{ width: 980, transformOrigin: "62% 76%", transform: `scale(${zoom})` }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 60, bottom: 50, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16 }}>
        {PILLS.map((p, i) => (
          <Pill key={p} text={p} delay={30 + i * step} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Pill: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const p = usePop(delay, 14, 200);
  return (
    <div
      style={{
        fontFamily: jakarta,
        fontWeight: 700,
        fontSize: 40,
        color: NAVY,
        background: "white",
        border: `3px solid ${GREEN}`,
        padding: "14px 30px",
        borderRadius: 999,
        boxShadow: "0 12px 30px rgba(22,163,74,0.25)",
        transform: `translateX(${(1 - p) * -700}px)`,
      }}
    >
      {text}
    </div>
  );
};

const CleanEnd: React.FC = () => {
  const a = usePop(0, 12, 180);
  const b = usePop(8, 9, 220);
  const c = usePop(22);
  return (
    <AbsoluteFill style={{ background: "#f8fafc", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 160, color: NAVY, lineHeight: 1, transform: `scale(${a})` }}>Show up.</div>
      <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 160, color: GREEN, lineHeight: 1.1, transform: `scale(${b})` }}>Level up.</div>
      <div style={{ marginTop: 50, opacity: c }}>
        <LogoLockup size={80} dark={false} />
      </div>
      <div style={{ marginTop: 36, opacity: c }}>
        <PillarStrip featured={["Attendance"]} dark={false} delay={24} size={28} />
      </div>
    </AbsoluteFill>
  );
};

export const AttendanceCleanSquare: React.FC = () => {
  const tl = attendanceCleanTimeline;
  const clock = tl.at("clock");
  const twist = tl.at("twist");
  const product = tl.at("product");
  const step = Math.floor((product.dur - 60) / 3);
  const ring = clock.start + Math.round(clock.dur * 0.62);
  return (
    <AbsoluteFill style={{ background: "#f8fafc" }}>
      <Scenes
        timeline={tl}
        render={{
          clock: (s) => (
            <SceneFade dur={s.dur} inFrames={1}>
              <Clock s={s} />
            </SceneFade>
          ),
          twist: (s) => (
            <SceneFade dur={s.dur}>
              <Twist s={s} />
            </SceneFade>
          ),
          product: (s) => (
            <SceneFade dur={s.dur}>
              <Product s={s} />
            </SceneFade>
          ),
          end: (s) => (
            <SceneFade dur={s.dur} outFrames={1}>
              <CleanEnd />
            </SceneFade>
          ),
        }}
      />
      <BrandBug pillar="Attendance" dark={false} scale={0.85} style={{ top: 30, left: 30 }} />
      {Array.from({ length: Math.floor((ring - clock.start) / 15) }).map((_, i) => (
        <Sfx key={i} at={clock.start + i * 15} name="tick" volume={0.35} />
      ))}
      <Sfx at={ring} name="chime" volume={0.6} />
      <Sfx at={twist.start + Math.round(twist.dur * 0.5)} name="whoosh" volume={0.4} />
      <Sfx at={twist.start + Math.round(twist.dur * 0.5) + 10} name="pop" />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} at={product.start + 30 + i * step} name="pop" volume={0.5} />
      ))}
      <Sfx at={tl.at("end").start} name="ding" volume={0.5} />
      <Music timeline={tl} track="sunny-pop" volume={0.5} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * Breaking News (1920x1080)
 * ════════════════════════════════════════════════════════════════════ */

export const attendanceNewsTimeline = buildTimeline("attendance-news");

const NEWS_RED = "#c8102e";
const TICKER =
  "ON-TIME ARRIVALS UP AT SCHOOL ABC  •  STUDENTS EARNING STREAK POINTS  •  TEACHERS DITCH PAPER ROLL CALL  •  LEVELUP ATTENDANCE — PART OF LEVELUP EDU  •  ";

const Studio: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 30% 20%, #1e3a8a, #0b1026 70%)" }}>
      {/* sweeping studio light beams */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: -200,
            left: 300 + i * 600,
            width: 260,
            height: 1600,
            background: "linear-gradient(180deg, rgba(147,197,253,0.18), transparent)",
            transform: `rotate(${Math.sin(frame * 0.02 + i) * 12 + 20}deg)`,
            transformOrigin: "50% 0%",
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

const LowerThird: React.FC<{ kicker: string; headline: string; delay?: number }> = ({ kicker, headline, delay = 0 }) => {
  const frame = useCurrentFrame();
  const slide = interpolate(frame - delay, [0, 12], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ position: "absolute", left: 80, bottom: 150, width: 1500 * slide, overflow: "hidden" }}>
      <div style={{ display: "flex" }}>
        <div style={{ background: NEWS_RED, color: "white", fontFamily: anton, fontSize: 46, padding: "10px 28px", letterSpacing: 2, whiteSpace: "nowrap" }}>
          {kicker}
        </div>
      </div>
      <div
        style={{
          background: "white",
          color: "#0b1026",
          fontFamily: outfit,
          fontWeight: 800,
          fontSize: 62,
          padding: "16px 28px",
          whiteSpace: "nowrap",
          borderLeft: `14px solid ${NEWS_RED}`,
        }}
      >
        {headline}
      </div>
    </div>
  );
};

const Ticker: React.FC = () => {
  const frame = useCurrentFrame();
  const x = -((frame * 6) % 2600);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 80, background: "#0b1026", borderTop: `6px solid ${NEWS_RED}`, overflow: "hidden", zIndex: 40 }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 220, background: NEWS_RED, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: anton, fontSize: 40, color: "white" }}>
        LEVELUP NEWS
      </div>
      <div style={{ position: "absolute", left: 240 + x, top: 14, whiteSpace: "nowrap", fontFamily: outfit, fontWeight: 700, fontSize: 40, color: "white" }}>
        {TICKER.repeat(4)}
      </div>
    </div>
  );
};

const LiveBug: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: 50, right: 70, display: "flex", alignItems: "center", gap: 14, zIndex: 40 }}>
      <div style={{ width: 22, height: 22, borderRadius: 11, background: NEWS_RED, opacity: frame % 30 < 18 ? 1 : 0.2 }} />
      <span style={{ fontFamily: anton, fontSize: 44, color: "white", letterSpacing: 3 }}>LIVE</span>
      <span style={{ fontFamily: outfit, fontWeight: 700, fontSize: 36, color: "rgba(255,255,255,0.75)", marginLeft: 12 }}>7:58 AM</span>
    </div>
  );
};

const Monitor: React.FC<{ children: React.ReactNode; enterDelay?: number; style?: React.CSSProperties }> = ({ children, enterDelay = 0, style }) => {
  const p = usePop(enterDelay, 15, 120);
  return (
    <div
      style={{
        position: "absolute",
        right: 110,
        top: 170,
        width: 1060,
        height: 640,
        borderRadius: 18,
        overflow: "hidden",
        border: "10px solid #111827",
        boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 0 2px rgba(147,197,253,0.4)",
        transform: `perspective(1600px) rotateY(${(1 - p) * -30 - 6}deg) scale(${0.8 + p * 0.2})`,
        opacity: p,
        background: "white",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const NewsOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const wipe = interpolate(frame, [0, 14], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const title = usePop(8, 10, 200);
  const exit = interpolate(frame, [40, 52], [1, 0], clamp);
  return (
    <Studio>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: exit }}>
        <div style={{ background: NEWS_RED, width: 1920 * wipe, height: 260, position: "absolute" }} />
        <div style={{ fontFamily: anton, fontSize: 200, color: "white", letterSpacing: 8, transform: `scale(${title})`, zIndex: 1 }}>BREAKING NEWS</div>
      </AbsoluteFill>
      {frame > 40 && (
        <>
          <Monitor enterDelay={42}>
            <Img src={shot("attendance-full.png")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 80%" }} />
          </Monitor>
          <LowerThird kicker="BREAKING" headline="Students showing up ON TIME at School ABC" delay={46} />
        </>
      )}
    </Studio>
  );
};

const NewsReason: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  const streak = Math.min(12, Math.floor(interpolate(frame, [s.dur * 0.45, s.dur * 0.85], [0, 12], clamp)));
  const statIn = usePop(Math.round(s.dur * 0.4), 12, 180);
  return (
    <Studio>
      <Monitor>
        <Img
          src={shot("attendance-full.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "50% 78%",
            transform: `scale(${interpolate(frame, [0, s.dur], [1.05, 1.35], clamp)})`,
            transformOrigin: "55% 78%",
          }}
        />
      </Monitor>
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 200,
          width: 620,
          padding: 36,
          borderRadius: 24,
          background: "rgba(255,255,255,0.08)",
          border: "2px solid rgba(255,255,255,0.2)",
          transform: `translateX(${(1 - statIn) * -800}px)`,
        }}
      >
        <div style={{ fontFamily: outfit, fontWeight: 700, fontSize: 36, color: "#93c5fd" }}>ON-TIME STREAK</div>
        <div style={{ fontFamily: anton, fontSize: 170, color: "white", lineHeight: 1 }}>🔥 {streak} days</div>
        <div style={{ fontFamily: outfit, fontWeight: 700, fontSize: 40, color: "#86efac", marginTop: 12 }}>+ bonus points every morning</div>
      </div>
      <LowerThird kicker="THE REASON" headline="LevelUp Attendance: on time = points" />
    </Studio>
  );
};

const NewsGlance: React.FC = () => {
  const paper = usePop(10, 12, 160);
  const stamp = usePop(40, 8, 260);
  return (
    <Studio>
      <Monitor>
        <Video
          src={staticFile("capture-library/features/admin-attendance.mp4")}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Monitor>
      {/* paper roll call getting stamped out */}
      <div
        style={{
          position: "absolute",
          left: 130,
          top: 190,
          width: 480,
          height: 560,
          background: "#fffbeb",
          borderRadius: 8,
          padding: 36,
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          transform: `rotate(${-6 + (1 - paper) * -20}deg) translateY(${(1 - paper) * 600}px)`,
        }}
      >
        <div style={{ fontFamily: caveat, fontSize: 60, color: "#334155" }}>Roll call ✎</div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ height: 2, background: "#cbd5e1", marginTop: 48 }} />
        ))}
        <div
          style={{
            position: "absolute",
            top: 190,
            left: 30,
            fontFamily: anton,
            fontSize: 110,
            color: NEWS_RED,
            border: `10px solid ${NEWS_RED}`,
            padding: "0 24px",
            transform: `rotate(-18deg) scale(${interpolate(stamp, [0, 1], [2.4, 1])})`,
            opacity: stamp,
            letterSpacing: 4,
            whiteSpace: "nowrap",
            background: "rgba(255,251,235,0.6)",
          }}
        >
          RETIRED
        </div>
      </div>
      <LowerThird kicker="AT A GLANCE" headline="Who's here? Teachers know instantly." />
    </Studio>
  );
};

const NewsSignoff: React.FC = () => {
  const a = usePop(0, 12, 170);
  const b = usePop(14);
  return (
    <Studio>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div style={{ transform: `scale(${a})` }}>
          <LogoLockup size={130} />
        </div>
        <div style={{ fontFamily: anton, fontSize: 150, color: "white", marginTop: 30, letterSpacing: 4, transform: `scale(${a})` }}>
          <span style={{ color: "#86efac" }}>ATTENDANCE</span> THAT PAYS OFF
        </div>
        <div style={{ marginTop: 40, opacity: b }}>
          <PillarStrip featured={["Attendance"]} delay={16} size={36} />
        </div>
        <div style={{ marginTop: 40, fontFamily: outfit, fontWeight: 800, fontSize: 48, color: "white", opacity: b }}>leveluprewards.app</div>
      </AbsoluteFill>
    </Studio>
  );
};

export const AttendanceBreakingNews: React.FC = () => {
  const tl = attendanceNewsTimeline;
  const glance = tl.at("glance");
  return (
    <AbsoluteFill style={{ background: "#0b1026" }}>
      <Scenes
        timeline={tl}
        render={{
          open: () => <NewsOpen />,
          reason: (s) => (
            <SceneFade dur={s.dur} inFrames={4}>
              <NewsReason s={s} />
            </SceneFade>
          ),
          glance: (s) => (
            <SceneFade dur={s.dur} inFrames={4}>
              <NewsGlance />
            </SceneFade>
          ),
          signoff: (s) => (
            <SceneFade dur={s.dur} inFrames={6} outFrames={1}>
              <NewsSignoff />
            </SceneFade>
          ),
        }}
      />
      <LiveBug />
      <Ticker />
      <BrandBug pillar="Attendance" style={{ top: 40, left: 60 }} />
      <Sfx at={0} name="impact" volume={0.6} />
      <Sfx at={tl.at("reason").start} name="whoosh" volume={0.45} />
      <Sfx at={glance.start} name="whoosh" volume={0.45} />
      <Sfx at={glance.start + 40} name="impact" volume={0.55} />
      <Sfx at={tl.at("signoff").start} name="chime" volume={0.55} />
      <Music timeline={tl} track="news-theme" volume={0.55} duckTo={0.3} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};
