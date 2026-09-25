/** Rewards pillar: "Neon Slam" (kinetic type) and "Top 3 Countdown" (social list). */
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
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
  clamp,
  jakarta,
  outfit,
  shot,
  usePop,
} from "./common";

/* ════════════════════════════════════════════════════════════════════
 * Neon Slam (1080x1920)
 * ════════════════════════════════════════════════════════════════════ */

export const rewardsNeonTimeline = buildTimeline("rewards-neon");

const SLAM_WORDS = [
  { text: "BE KIND.", color: "#f472b6" },
  { text: "WORK HARD.", color: "#38bdf8" },
  { text: "SHOW UP.", color: "#facc15" },
];

const Slam: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const each = Math.floor(s.dur / 3);
  const idx = Math.min(2, Math.floor(frame / each));
  const local = frame - idx * each;
  const word = SLAM_WORDS[idx];
  const sp = spring({ frame: local, fps, config: { damping: 11, stiffness: 260 } });
  const scale = interpolate(sp, [0, 1], [2.4, 1]);
  const flash = interpolate(local, [0, 5], [0.55, 0], clamp);
  const shake = local < 6 ? Math.sin(local * 3) * (6 - local) * 2 : 0;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%, ${word.color}40, #050308 70%)`,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {SLAM_WORDS.slice(0, idx).map((w, i) => (
        <div
          key={w.text}
          style={{
            position: "absolute",
            top: 380 + i * 120,
            fontFamily: anton,
            fontSize: 96,
            color: "rgba(255,255,255,0.16)",
            letterSpacing: 4,
          }}
        >
          {w.text}
        </div>
      ))}
      <div
        style={{
          fontFamily: anton,
          fontSize: 210,
          color: word.color,
          transform: `translateX(${shake}px) scale(${scale}) rotate(-4deg)`,
          textShadow: `0 0 60px ${word.color}, 0 12px 0 rgba(0,0,0,0.5)`,
          whiteSpace: "nowrap",
        }}
      >
        {word.text}
      </div>
      <AbsoluteFill style={{ background: "white", opacity: flash }} />
    </AbsoluteFill>
  );
};

const Earn: React.FC = () => {
  const frame = useCurrentFrame();
  const top = usePop(0);
  const main = usePop(6, 9, 200);
  const chips = [
    { t: "+10", x: 140, d: 4, c: "#38bdf8" },
    { t: "+25", x: 820, d: 10, c: "#f472b6" },
    { t: "+50", x: 220, d: 18, c: "#a3e635" },
    { t: "+5", x: 760, d: 24, c: "#facc15" },
    { t: "+15", x: 480, d: 28, c: "#c084fc" },
  ];
  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 50% 45%, #3b2a05, #050308 70%)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {chips.map((c) => {
        // Numbers keep streaming up past the top, like a slot machine payout.
        const y = 1900 - (((frame - c.d) * 42) % 2300);
        return (
          <div
            key={c.t}
            style={{
              position: "absolute",
              left: c.x,
              top: y,
              fontFamily: anton,
              fontSize: 110,
              color: c.c,
              opacity: frame > c.d ? 0.85 : 0,
              textShadow: `0 0 30px ${c.c}`,
            }}
          >
            {c.t}
          </div>
        );
      })}
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{ fontFamily: jakarta, fontWeight: 700, fontSize: 64, color: "white", letterSpacing: 10, opacity: top }}>
          …AND EARN
        </div>
        <div
          style={{
            fontFamily: anton,
            fontSize: 330,
            lineHeight: 1,
            transform: `scale(${main})`,
            background: "linear-gradient(180deg, #fde68a, #f59e0b)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 40px rgba(245,158,11,0.6))",
          }}
        >
          POINTS
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Counter: React.FC = () => {
  const frame = useCurrentFrame();
  const count = Math.round(
    interpolate(frame, [10, 70], [0, 289], { ...clamp, easing: Easing.out(Easing.cubic) }),
  );
  const card = usePop(4, 14, 120);
  const label = usePop(0);
  const bump = interpolate(frame - 70, [0, 4, 12], [0, 1, 0], clamp);
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #1a0512, #3d0a2a 60%, #050308)",
        alignItems: "center",
        paddingTop: 300,
      }}
    >
      <div style={{ fontFamily: jakarta, fontWeight: 700, fontSize: 58, color: "white", opacity: label }}>
        Scan in at the kiosk…
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: 20, transform: `scale(${1 + bump * 0.12})` }}>
        <span
          style={{
            fontFamily: anton,
            fontSize: 300,
            color: "#fbcfe8",
            textShadow: "0 0 50px #ec4899",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {count}
        </span>
        <span style={{ fontFamily: anton, fontSize: 110, color: "#f472b6" }}>PTS</span>
      </div>
      <Img
        src={shot("kiosk-welcome.png")}
        style={{
          width: 980,
          marginTop: 60,
          borderRadius: 36,
          boxShadow: "0 40px 120px rgba(236,72,153,0.55)",
          transform: `translateY(${(1 - card) * 500}px) rotate(${(1 - card) * 8}deg)`,
          opacity: card,
        }}
      />
    </AbsoluteFill>
  );
};

const Chip: React.FC<{ delay: number; text: string }> = ({ delay, text }) => {
  const p = usePop(delay, 10, 240);
  return (
    <div
      style={{
        fontFamily: outfit,
        fontWeight: 800,
        fontSize: 58,
        color: "white",
        padding: "18px 48px",
        borderRadius: 999,
        background: "linear-gradient(90deg, #ec4899, #a855f7)",
        boxShadow: "0 12px 40px rgba(236,72,153,0.45)",
        transform: `scale(${p}) rotate(${(1 - p) * -12}deg)`,
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
};

const PRIZE_CHIPS = ["🍕  Pizza Slice", "📝  Homework Pass", "🎟️  Movie Ticket"];

const Spend: React.FC = () => {
  const head = usePop(0, 10, 220);
  const card = usePop(6, 14, 120);
  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 50% 30%, #3b0764, #050308 70%)",
        alignItems: "center",
        paddingTop: 260,
      }}
    >
      <div style={{ fontFamily: anton, fontSize: 150, lineHeight: 1, textAlign: "center", color: "white", transform: `scale(${head})` }}>
        THEN <span style={{ color: "#f472b6" }}>SPEND</span>
        <br />
        THEM.
      </div>
      <Img
        src={shot("kiosk-rewards-shop.png")}
        style={{
          width: 980,
          marginTop: 70,
          borderRadius: 32,
          boxShadow: "0 40px 120px rgba(168,85,247,0.5)",
          transform: `scale(${0.7 + card * 0.3})`,
          opacity: card,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 70 }}>
        {PRIZE_CHIPS.map((c, i) => (
          <Chip key={c} delay={24 + i * 12} text={c} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const NeonEnd: React.FC = () => {
  const frame = useCurrentFrame();
  const a = usePop(0, 12, 160);
  const b = usePop(10);
  const pulse = 1 + Math.sin(frame * 0.25) * 0.03;
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #ec4899, #7c3aed 60%, #1e1b4b)",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: 60,
      }}
    >
      <div style={{ transform: `scale(${a})` }}>
        <LogoLockup size={100} />
        <div style={{ fontFamily: anton, fontSize: 250, color: "white", lineHeight: 1, marginTop: 30, textShadow: "0 16px 0 rgba(0,0,0,0.25)" }}>
          REWARDS
        </div>
      </div>
      <div style={{ fontFamily: jakarta, fontWeight: 700, fontSize: 56, color: "#fdf2f8", marginTop: 30, opacity: b }}>
        Good behavior. Real rewards.
      </div>
      <div style={{ marginTop: 70, opacity: b }}>
        <PillarStrip featured={["Rewards"]} delay={14} size={34} />
      </div>
      <div
        style={{
          marginTop: 70,
          padding: "24px 60px",
          borderRadius: 999,
          background: "white",
          color: "#7c3aed",
          fontFamily: outfit,
          fontWeight: 800,
          fontSize: 50,
          opacity: b,
          transform: `scale(${pulse})`,
        }}
      >
        leveluprewards.app
      </div>
    </AbsoluteFill>
  );
};

export const RewardsNeonSlam: React.FC = () => {
  const tl = rewardsNeonTimeline;
  const slam = tl.at("slam");
  const earn = tl.at("earn");
  const counter = tl.at("counter");
  const spend = tl.at("spend");
  const end = tl.at("end");
  const each = Math.floor(slam.dur / 3);
  return (
    <AbsoluteFill style={{ background: "#050308" }}>
      <Scenes
        timeline={tl}
        render={{
          slam: (s) => <Slam s={s} />,
          earn: () => <Earn />,
          counter: (s) => (
            <SceneFade dur={s.dur} inFrames={3}>
              <Counter />
            </SceneFade>
          ),
          spend: (s) => (
            <SceneFade dur={s.dur} inFrames={3}>
              <Spend />
            </SceneFade>
          ),
          end: (s) => (
            <SceneFade dur={s.dur} inFrames={4} outFrames={1}>
              <NeonEnd />
            </SceneFade>
          ),
        }}
      />
      <BrandBug pillar="Rewards" style={{ top: 60, left: 60 }} scale={1.1} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} at={slam.start + i * each} name="impact" volume={0.55} />
      ))}
      <Sfx at={earn.start} name="whoosh" />
      {[4, 10, 18, 24, 28].map((d) => (
        <Sfx key={d} at={earn.start + d} name="coin" volume={0.35} />
      ))}
      <Sfx at={counter.start + 70} name="ding" />
      <Sfx at={spend.start} name="whoosh" />
      {[24, 36, 48].map((d) => (
        <Sfx key={d} at={spend.start + d} name="pop" />
      ))}
      <Sfx at={end.start} name="impact" volume={0.5} />
      <Music timeline={tl} track="neon-trap" volume={0.6} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * Top 3 Countdown (1080x1920) — creator-style list with big captions
 * ════════════════════════════════════════════════════════════════════ */

export const rewardsCountdownTimeline = buildTimeline("rewards-countdown");

const CAPTIONS: Record<string, string> = {
  hook: "3 reasons students LOVE LevelUp Rewards",
  three: "Coupons kids scan for points",
  two: "Their balance, the second they sign in",
  one: "REAL prizes 🍕",
  end: "Bring it to your school",
};

const Caption: React.FC<{ text: string; color: string }> = ({ text, color }) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "8px 22px",
        padding: "0 70px",
      }}
    >
      {words.map((w, i) => {
        const p = interpolate(frame - 4 - i * 4, [0, 6], [0, 1], clamp);
        const active = frame - 4 - i * 4 >= 0 && frame - 4 - (i + 1) * 4 < 0;
        return (
          <span
            key={i}
            style={{
              fontFamily: outfit,
              fontWeight: 800,
              fontSize: 86,
              lineHeight: 1.1,
              color: active ? color : "white",
              WebkitTextStroke: "3px #111",
              paintOrder: "stroke",
              textShadow: "0 6px 0 #111",
              opacity: p,
              transform: `translateY(${(1 - p) * 30}px) scale(${active ? 1.08 : 1})`,
              display: "inline-block",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

const RankScene: React.FC<{
  n: number;
  color: string;
  bg: string;
  image: string;
  caption: string;
  crop?: React.CSSProperties;
  /** Point (in % of the image) the camera glides in on. */
  focus?: string;
}> = ({ n, color, bg, image, caption, crop, focus = "50% 50%" }) => {
  const frame = useCurrentFrame();
  const num = usePop(0, 9, 220);
  const card = usePop(8, 14, 130);
  const drift = interpolate(frame, [14, 90], [1, 1.9], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill style={{ background: bg, alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          top: 170,
          right: 60,
          fontFamily: anton,
          fontSize: 420,
          lineHeight: 1,
          color,
          WebkitTextStroke: "8px #111",
          paintOrder: "stroke",
          textShadow: "16px 16px 0 #111",
          transform: `scale(${num}) rotate(${(1 - num) * 30 + 6}deg)`,
        }}
      >
        #{n}
      </div>
      <div
        style={{
          position: "absolute",
          top: 640,
          width: 960,
          height: 620,
          borderRadius: 40,
          overflow: "hidden",
          border: "8px solid #111",
          boxShadow: "18px 18px 0 #111",
          transform: `translateY(${(1 - card) * 900}px) rotate(${(1 - card) * -10 - 2}deg)`,
          background: "white",
        }}
      >
        <Img src={image} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${drift})`, transformOrigin: focus, ...crop }} />
      </div>
      <div style={{ position: "absolute", bottom: 230, left: 0, right: 0 }}>
        <Caption text={caption} color={color} />
      </div>
    </AbsoluteFill>
  );
};

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const big = usePop(0, 8, 240);
  const wobble = Math.sin(frame * 0.3) * 3;
  return (
    <AbsoluteFill style={{ background: "#facc15", justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          fontFamily: anton,
          fontSize: 700,
          lineHeight: 0.9,
          color: "#ec4899",
          WebkitTextStroke: "12px #111",
          paintOrder: "stroke",
          textShadow: "22px 22px 0 #111",
          transform: `scale(${big}) rotate(${wobble}deg)`,
        }}
      >
        3
      </div>
      <div style={{ marginTop: 40 }}>
        <Caption text={CAPTIONS.hook} color="#ec4899" />
      </div>
    </AbsoluteFill>
  );
};

const CountdownEnd: React.FC = () => {
  const a = usePop(0, 11, 180);
  const b = usePop(12);
  return (
    <AbsoluteFill style={{ background: "#111", justifyContent: "center", alignItems: "center", textAlign: "center", padding: 60 }}>
      <div style={{ transform: `scale(${a})` }}>
        <LogoLockup size={110} />
      </div>
      <div
        style={{
          marginTop: 50,
          fontFamily: anton,
          fontSize: 200,
          color: "#facc15",
          lineHeight: 1,
          transform: `scale(${a}) rotate(-3deg)`,
        }}
      >
        REWARDS
      </div>
      <div style={{ marginTop: 40, opacity: b }}>
        <Caption text={CAPTIONS.end} color="#facc15" />
      </div>
      <div style={{ marginTop: 70, opacity: b }}>
        <PillarStrip featured={["Rewards"]} delay={16} size={34} />
      </div>
      <div style={{ marginTop: 60, fontFamily: outfit, fontWeight: 800, fontSize: 52, color: "white", opacity: b }}>
        leveluprewards.app
      </div>
    </AbsoluteFill>
  );
};

export const RewardsTop3Countdown: React.FC = () => {
  const tl = rewardsCountdownTimeline;
  return (
    <AbsoluteFill style={{ background: "#111" }}>
      <Scenes
        timeline={tl}
        render={{
          hook: () => <Hook />,
          three: () => (
            <RankScene
              n={3}
              color="#38bdf8"
              bg="#fce7f3"
              image={shot("kiosk-rewards-shop.png")}
              caption={CAPTIONS.three}
              crop={{ objectPosition: "50% 60%" }}
              focus="50% 62%"
            />
          ),
          two: () => (
            <RankScene
              n={2}
              color="#a3e635"
              bg="#e0f2fe"
              image={shot("kiosk-welcome.png")}
              caption={CAPTIONS.two}
              focus="50% 70%"
            />
          ),
          one: () => (
            <RankScene
              n={1}
              color="#facc15"
              bg="#ede9fe"
              image={shot("live-admin-rewards-full.png")}
              caption={CAPTIONS.one}
              crop={{ objectPosition: "60% 70%" }}
              focus="40% 62%"
            />
          ),
          end: (s) => (
            <SceneFade dur={s.dur} inFrames={3} outFrames={1}>
              <CountdownEnd />
            </SceneFade>
          ),
        }}
      />
      <BrandBug pillar="Rewards" style={{ top: 60, left: 60 }} scale={1.1} />
      {tl.scenes.map((s) => (
        <React.Fragment key={s.name}>
          <Sfx at={s.start} name="whoosh" volume={0.5} />
          <Sfx at={s.start + 2} name="pop" volume={0.6} />
        </React.Fragment>
      ))}
      <Music timeline={tl} track="bounce-house" volume={0.55} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};
