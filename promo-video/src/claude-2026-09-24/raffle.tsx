/** Raffle (part of Rewards): "Game Show" (square). */
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import {
  BrandBug,
  Confetti,
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
  clamp,
  jakarta,
  outfit,
  usePop,
} from "./common";

export const raffleGameshowTimeline = buildTimeline("raffle-gameshow");

const YELLOW = "#facc15";

/** Blinking marquee bulbs around the frame. */
const Bulbs: React.FC<{ fast?: boolean }> = ({ fast }) => {
  const frame = useCurrentFrame();
  const bulbs: Array<{ x: number; y: number }> = [];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    bulbs.push({ x: t * 1080, y: 22 }, { x: t * 1080, y: 1058 }, { x: 22, y: t * 1080 }, { x: 1058, y: t * 1080 });
  }
  const phase = Math.floor(frame / (fast ? 3 : 7));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {bulbs.map((b, i) => {
        const on = (i + phase) % 2 === 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: b.x - 10,
              top: b.y - 10,
              width: 20,
              height: 20,
              borderRadius: 10,
              background: on ? "#fff7cc" : "#a16207",
              boxShadow: on ? `0 0 18px ${YELLOW}` : undefined,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Studio: React.FC<{ children: React.ReactNode; fast?: boolean }> = ({ children, fast }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 40%, #a21caf, #3b0764 60%, #1e0533)" }}>
      <AbsoluteFill
        style={{
          background: `repeating-conic-gradient(from ${frame * 0.6}deg at 50% 50%, rgba(255,255,255,0.07) 0deg 10deg, transparent 10deg 20deg)`,
        }}
      />
      {children}
      <Bulbs fast={fast} />
    </AbsoluteFill>
  );
};

const MarqueeSign: React.FC<{ top: string; bottom: string; scale?: number }> = ({ top, bottom, scale = 1 }) => (
  <div
    style={{
      padding: "30px 60px",
      borderRadius: 40,
      background: "linear-gradient(180deg, #7c2d12, #431407)",
      border: `10px solid ${YELLOW}`,
      boxShadow: `0 0 60px ${YELLOW}88, inset 0 0 40px rgba(0,0,0,0.5)`,
      textAlign: "center",
      transform: `scale(${scale})`,
    }}
  >
    <div style={{ fontFamily: anton, fontSize: 150, lineHeight: 1, color: YELLOW, textShadow: `0 0 30px ${YELLOW}, 0 8px 0 #7c2d12` }}>{top}</div>
    <div style={{ fontFamily: anton, fontSize: 150, lineHeight: 1, color: "white", textShadow: "0 0 30px #fff, 0 8px 0 #7c2d12" }}>{bottom}</div>
  </div>
);

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const tag = usePop(0, 12, 200);
  const sign = usePop(10, 9, 160);
  return (
    <Studio>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 40 }}>
        <div
          style={{
            fontFamily: outfit,
            fontWeight: 800,
            fontSize: 56,
            color: "#1e0533",
            background: "white",
            padding: "10px 36px",
            borderRadius: 999,
            transform: `scale(${tag}) rotate(-4deg)`,
          }}
        >
          🗓️ IT'S FRIDAY
        </div>
        <div style={{ transform: `rotate(${Math.sin(frame * 0.15) * 2}deg)` }}>
          <MarqueeSign top="RAFFLE" bottom="TIME!" scale={sign} />
        </div>
      </AbsoluteFill>
    </Studio>
  );
};

const Tickets: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  const card = usePop(0, 14, 160);
  const pts = Math.round(interpolate(frame, [10, s.dur * 0.6], [250, 0], clamp));
  const tickets = Math.floor((250 - pts) / 50);
  return (
    <Studio>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 110 }}>
        <div style={{ fontFamily: anton, fontSize: 90, color: "white", letterSpacing: 2 }}>
          POINTS <span style={{ color: YELLOW }}>→</span> TICKETS
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 60, marginTop: 70 }}>
          <div
            style={{
              width: 380,
              padding: 30,
              borderRadius: 30,
              background: "white",
              boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
              transform: `scale(${card})`,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: 55,
                background: "#ec4899",
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: outfit,
                fontWeight: 800,
                fontSize: 48,
                color: "white",
              }}
            >
              JM
            </div>
            <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 44, marginTop: 14, color: "#1e0533" }}>Jordan</div>
            <div style={{ fontFamily: anton, fontSize: 96, color: "#ec4899", fontVariantNumeric: "tabular-nums" }}>{pts}</div>
            <div style={{ fontFamily: jakarta, fontWeight: 700, fontSize: 30, color: "#64748b" }}>points this week</div>
          </div>
          {/* raffle drum */}
          <div style={{ position: "relative", width: 360, height: 400 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50% 50% 44% 44%",
                border: "10px solid rgba(255,255,255,0.8)",
                background: "rgba(255,255,255,0.12)",
                overflow: "hidden",
              }}
            >
              {Array.from({ length: tickets }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: 50 + (i % 3) * 80,
                    bottom: 30 + Math.floor(i / 3) * 60,
                    fontSize: 80,
                    transform: `rotate(${(i * 37) % 60 - 30}deg)`,
                  }}
                >
                  🎟️
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* ticket in flight */}
        {Array.from({ length: 5 }).map((_, i) => {
          const at = 10 + ((i + 1) * (s.dur * 0.6 - 10)) / 5 - 14;
          const t = interpolate(frame, [at, at + 14], [0, 1], clamp);
          if (t <= 0 || t >= 1) return null;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 330 + t * 380,
                top: 470 - Math.sin(t * Math.PI) * 180,
                fontSize: 90,
                transform: `rotate(${t * 360}deg)`,
              }}
            >
              🎟️
            </div>
          );
        })}
        <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 52, color: "white", marginTop: 70 }}>
          🎟️ × {tickets} <span style={{ color: YELLOW }}>raffle tickets</span>
        </div>
      </AbsoluteFill>
    </Studio>
  );
};

const NAMES = ["Jordan", "Maya", "Leo", "Priya", "Sam", "Ava", "Eli", "Zoe"];
const SLICE_COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];
const SLICE = 360 / NAMES.length;
const FINAL_ROT = 360 * 6 + SLICE / 2; // lands "Jordan" (slice 0) under the top pointer

/** Frames (within the spin scene) where the jackpot switches to the wheel, and where it lands. */
const spinBeats = (s: SceneTiming) => ({
  wheelAt: Math.round(s.cues[0] + s.lens[0] * 0.45),
  landAt: Math.round(s.cues[1] + s.lens[1] * 0.78),
});

const wheelRotation = (frame: number, s: SceneTiming) => {
  const { wheelAt, landAt } = spinBeats(s);
  return interpolate(frame, [wheelAt, landAt], [0, FINAL_ROT], { ...clamp, easing: Easing.out(Easing.cubic) });
};

const Jackpot: React.FC = () => {
  const frame = useCurrentFrame();
  const symbols = ["⭐", "🎟️", "🍕", "7️⃣", "🏆"];
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontFamily: anton, fontSize: 80, color: YELLOW, marginBottom: 30 }}>PULL THE JACKPOT…</div>
      <div
        style={{
          display: "flex",
          gap: 20,
          padding: 30,
          borderRadius: 36,
          background: "linear-gradient(180deg, #dc2626, #7f1d1d)",
          border: `10px solid ${YELLOW}`,
        }}
      >
        {[0, 1, 2].map((r) => {
          const stopAt = 20 + r * 8;
          const spinning = frame < stopAt;
          const y = spinning ? (frame * 55 + r * 90) % (symbols.length * 170) : 3 * 170;
          return (
            <div key={r} style={{ width: 200, height: 220, background: "white", borderRadius: 20, overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", top: -y + 25, left: 0, right: 0, filter: spinning ? "blur(3px)" : undefined }}>
                {[...symbols, ...symbols].map((sym, i) => (
                  <div key={i} style={{ height: 170, fontSize: 130, textAlign: "center", lineHeight: "170px" }}>
                    {sym}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Wheel: React.FC<{ rot: number }> = ({ rot }) => {
  const r = 400;
  const slices = NAMES.map((name, i) => {
    const a0 = ((i * SLICE - 90) * Math.PI) / 180;
    const a1 = (((i + 1) * SLICE - 90) * Math.PI) / 180;
    const mid = (((i + 0.5) * SLICE - 90) * Math.PI) / 180;
    return (
      <g key={name}>
        <path d={`M0 0 L${Math.cos(a0) * r} ${Math.sin(a0) * r} A${r} ${r} 0 0 1 ${Math.cos(a1) * r} ${Math.sin(a1) * r} Z`} fill={SLICE_COLORS[i]} stroke="white" strokeWidth={6} />
        <text
          x={Math.cos(mid) * r * 0.62}
          y={Math.sin(mid) * r * 0.62}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily={anton}
          fontSize={52}
          fill="white"
          transform={`rotate(${(i + 0.5) * SLICE} ${Math.cos(mid) * r * 0.62} ${Math.sin(mid) * r * 0.62})`}
        >
          {name}
        </text>
      </g>
    );
  });
  return (
    <svg viewBox="-440 -470 880 900" width={820} height={840}>
      <circle r={r + 24} fill="#431407" stroke={YELLOW} strokeWidth={14} />
      <g transform={`rotate(${-rot})`}>{slices}</g>
      <circle r={60} fill={YELLOW} stroke="#431407" strokeWidth={10} />
      <text textAnchor="middle" dominantBaseline="middle" fontSize={60}>
        🎟️
      </text>
      <path d="M-34 -456 L34 -456 L0 -380 Z" fill="white" stroke="#431407" strokeWidth={6} />
    </svg>
  );
};

const Spin: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  const { wheelAt, landAt } = spinBeats(s);
  const wheelIn = interpolate(frame, [wheelAt - 8, wheelAt + 4], [0, 1], clamp);
  const won = frame >= landAt;
  const banner = interpolate(frame - landAt, [0, 12], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
  return (
    <Studio fast={won}>
      {frame < wheelAt + 4 ? (
        <AbsoluteFill style={{ opacity: 1 - wheelIn }}>
          <Jackpot />
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: wheelIn, transform: `scale(${0.8 + wheelIn * 0.2})` }}>
        <Wheel rot={wheelRotation(frame, s)} />
      </AbsoluteFill>
      {won ? (
        <>
          <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 90 }}>
            <div
              style={{
                fontFamily: anton,
                fontSize: 120,
                color: "#1e0533",
                background: YELLOW,
                padding: "10px 50px",
                borderRadius: 24,
                border: "8px solid white",
                transform: `scale(${banner}) rotate(-3deg)`,
                boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              }}
            >
              🎉 JORDAN WINS!
            </div>
          </AbsoluteFill>
          <Confetti from={landAt} colors={SLICE_COLORS} width={1080} height={1080} count={110} />
        </>
      ) : null}
    </Studio>
  );
};

const RaffleEnd: React.FC = () => {
  const a = usePop(0, 11, 170);
  const b = usePop(12);
  return (
    <Studio>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div style={{ transform: `scale(${a})` }}>
          <LogoLockup size={96} />
        </div>
        <div style={{ marginTop: 30, transform: `scale(${a})` }}>
          <MarqueeSign top="RAFFLE" bottom="" scale={0.8} />
        </div>
        <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 48, color: "white", marginTop: 20, opacity: b }}>Part of LevelUp Rewards</div>
        <div style={{ marginTop: 34, opacity: b }}>
          <PillarStrip featured={["Rewards", "Raffle"]} delay={14} size={28} />
        </div>
        <div style={{ marginTop: 30, fontFamily: outfit, fontWeight: 800, fontSize: 44, color: YELLOW, opacity: b }}>leveluprewards.app</div>
      </AbsoluteFill>
    </Studio>
  );
};

export const RaffleGameShow: React.FC = () => {
  const tl = raffleGameshowTimeline;
  const spin = tl.at("spin");
  const tickets = tl.at("tickets");
  const { wheelAt, landAt } = spinBeats(spin);
  // A click each time a slice passes the pointer.
  const clicks: number[] = [];
  let last = 0;
  for (let f = wheelAt; f < landAt; f++) {
    const slot = Math.floor(wheelRotation(f, spin) / SLICE);
    if (slot !== last) clicks.push(spin.start + f);
    last = slot;
  }
  return (
    <AbsoluteFill style={{ background: "#1e0533" }}>
      <Scenes
        timeline={tl}
        render={{
          intro: () => <Intro />,
          tickets: (s) => (
            <SceneFade dur={s.dur} inFrames={4}>
              <Tickets s={s} />
            </SceneFade>
          ),
          spin: (s) => (
            <SceneFade dur={s.dur} inFrames={4}>
              <Spin s={s} />
            </SceneFade>
          ),
          end: (s) => (
            <SceneFade dur={s.dur} inFrames={6} outFrames={1}>
              <RaffleEnd />
            </SceneFade>
          ),
        }}
      />
      <BrandBug pillar="Raffle" scale={0.85} style={{ top: 50, left: 50 }} />
      <Sfx at={10} name="impact" volume={0.5} />
      <Sfx at={12} name="crowd" volume={0.3} />
      {Array.from({ length: 5 }).map((_, i) => (
        <Sfx key={i} at={tickets.start + 10 + ((i + 1) * (tickets.dur * 0.6 - 10)) / 5} name="pop" volume={0.45} />
      ))}
      {[0, 1, 2].map((r) => (
        <Sfx key={r} at={spin.start + 20 + r * 8} name="ding" volume={0.3} />
      ))}
      {clicks.map((c) => (
        <Sfx key={c} at={c} name="tick" volume={0.3} />
      ))}
      <Sfx at={spin.start + landAt} name="levelup" volume={0.5} />
      <Sfx at={spin.start + landAt + 2} name="crowd" volume={0.55} />
      <Music timeline={tl} track="gameshow-swing" volume={0.5} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};
