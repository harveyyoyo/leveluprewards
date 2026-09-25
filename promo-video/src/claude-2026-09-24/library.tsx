/** Library pillar: "Storybook" (widescreen) and "Text Messages" (vertical). */
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
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
  buildTimeline,
  caveat,
  clamp,
  fraunces,
  frauncesItalic,
  jakarta,
  outfit,
  shot,
  usePop,
} from "./common";

/* ════════════════════════════════════════════════════════════════════
 * Storybook (1920x1080)
 * ════════════════════════════════════════════════════════════════════ */

export const libraryStorybookTimeline = buildTimeline("library-storybook");

const INK = "#3b2414";
const RUST = "#9a4a1c";

const Parchment: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #fbf3e2 0%, #f1e2c4 65%, #d9bf91 100%)" }}>
    {children}
    <AbsoluteFill style={{ boxShadow: "inset 0 0 220px rgba(92,52,18,0.45)", pointerEvents: "none" }} />
  </AbsoluteFill>
);

const Title: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  const title = "The Mystery of the Missing Book";
  const chars = Math.floor(interpolate(frame, [30, s.dur - 30], [0, title.length], clamp));
  const chapter = interpolate(frame, [0, 14], [0, 1], clamp);
  const rule = interpolate(frame, [s.dur - 30, s.dur - 10], [0, 520], clamp);
  return (
    <Parchment>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div style={{ fontFamily: caveat, fontSize: 80, color: RUST, opacity: chapter }}>Chapter One</div>
        <div style={{ fontFamily: frauncesItalic, fontWeight: 600, fontSize: 120, color: INK, maxWidth: 1500, lineHeight: 1.1, minHeight: 270 }}>
          {title.slice(0, chars)}
          <span style={{ opacity: frame % 16 < 8 ? 1 : 0 }}>|</span>
        </div>
        <div style={{ height: 4, width: rule, background: RUST, borderRadius: 2, marginTop: 20 }} />
      </AbsoluteFill>
    </Parchment>
  );
};

const StickyNote: React.FC<{ text: string; delay: number; style: React.CSSProperties; tilt: number }> = ({ text, delay, style, tilt }) => {
  const p = usePop(delay, 11, 200);
  return (
    <div
      style={{
        position: "absolute",
        width: 420,
        padding: "30px 34px",
        background: "#fde68a",
        boxShadow: "0 18px 40px rgba(92,52,18,0.35)",
        fontFamily: caveat,
        fontSize: 58,
        lineHeight: 1.05,
        color: INK,
        transform: `rotate(${tilt}deg) scale(${p})`,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

const Reveal: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  const enter = usePop(0, 18, 90);
  const zoom = interpolate(frame, [s.dur * 0.35, s.dur * 0.8], [1, 1.7], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return (
    <Parchment>
      <div
        style={{
          position: "absolute",
          left: 230,
          top: 120,
          padding: 20,
          background: "#fffaf0",
          boxShadow: "0 30px 80px rgba(92,52,18,0.4)",
          transform: `rotate(-1.5deg) translateY(${(1 - enter) * 120}px)`,
          opacity: enter,
        }}
      >
        <div style={{ width: 1420, height: 799, overflow: "hidden" }}>
          <Img src={shot("library-full.png")} style={{ width: 1420, transform: `scale(${zoom})`, transformOrigin: "80% 60%" }} />
        </div>
      </div>
      <StickyNote text="📚 Scan any barcode — it's in!" delay={Math.round(s.dur * 0.35)} tilt={-6} style={{ left: 70, top: 640 }} />
      <StickyNote text="🙋 Kids borrow & return on their own" delay={Math.round(s.dur * 0.6)} tilt={5} style={{ right: 70, top: 90 }} />
    </Parchment>
  );
};

const PAGES = [
  { emoji: "🔍", text: "Scan it." },
  { emoji: "📖", text: "Borrow it." },
  { emoji: "⭐", text: "Read it — earn points!" },
];

const Steps: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const each = Math.round((s.dur - 40) / 3);
  return (
    <Parchment>
      <AbsoluteFill style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 60, perspective: 1400 }}>
        {PAGES.map((p, i) => {
          const sp = spring({ frame: frame - 4 - i * each, fps, config: { damping: 14, stiffness: 120 } });
          return (
            <div
              key={p.text}
              style={{
                width: 470,
                height: 560,
                background: "#fffaf0",
                borderRadius: 10,
                boxShadow: "0 24px 60px rgba(92,52,18,0.35)",
                borderLeft: `14px solid ${RUST}`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
                padding: 40,
                transformOrigin: "left center",
                transform: `rotateY(${(1 - sp) * -100}deg)`,
                opacity: sp > 0.02 ? 1 : 0,
              }}
            >
              <div style={{ fontFamily: caveat, fontSize: 60, color: RUST }}>{i + 1}.</div>
              <div style={{ fontSize: 150, margin: "10px 0 20px" }}>{p.emoji}</div>
              <div style={{ fontFamily: fraunces, fontWeight: 800, fontSize: 60, color: INK, lineHeight: 1.1 }}>{p.text}</div>
            </div>
          );
        })}
      </AbsoluteFill>
    </Parchment>
  );
};

const StoryEnd: React.FC = () => {
  const frame = useCurrentFrame();
  const a = interpolate(frame, [0, 18], [0, 1], clamp);
  const b = usePop(40, 12, 160);
  const c = interpolate(frame, [70, 85], [0, 1], clamp);
  return (
    <Parchment>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div style={{ fontFamily: frauncesItalic, fontWeight: 600, fontSize: 170, color: INK, opacity: a }}>The End</div>
        <div style={{ fontFamily: caveat, fontSize: 90, color: RUST, transform: `scale(${b}) rotate(-2deg)` }}>…of lost library books.</div>
        <div style={{ marginTop: 50, opacity: c }}>
          <LogoLockup size={90} dark={false} />
        </div>
        <div style={{ marginTop: 30, opacity: c }}>
          <PillarStrip featured={["Library"]} dark={false} delay={72} size={30} fontFamily={fraunces} />
        </div>
      </AbsoluteFill>
    </Parchment>
  );
};

export const LibraryStorybook: React.FC = () => {
  const tl = libraryStorybookTimeline;
  const reveal = tl.at("reveal");
  const steps = tl.at("steps");
  const each = Math.round((steps.dur - 40) / 3);
  return (
    <AbsoluteFill>
      <Scenes
        timeline={tl}
        render={{
          title: (s) => (
            <SceneFade dur={s.dur} inFrames={1} outFrames={10}>
              <Title s={s} />
            </SceneFade>
          ),
          reveal: (s) => (
            <SceneFade dur={s.dur} inFrames={10} outFrames={10}>
              <Reveal s={s} />
            </SceneFade>
          ),
          steps: (s) => (
            <SceneFade dur={s.dur} inFrames={8} outFrames={10}>
              <Steps s={s} />
            </SceneFade>
          ),
          end: (s) => (
            <SceneFade dur={s.dur} inFrames={10} outFrames={1}>
              <StoryEnd />
            </SceneFade>
          ),
        }}
      />
      <BrandBug pillar="Library" dark={false} />
      <Sfx at={reveal.start} name="whoosh" volume={0.35} />
      <Sfx at={reveal.start + Math.round(reveal.dur * 0.35)} name="pop" volume={0.4} />
      <Sfx at={reveal.start + Math.round(reveal.dur * 0.6)} name="pop" volume={0.4} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} at={steps.start + 4 + i * each} name="whoosh" volume={0.3} />
      ))}
      <Sfx at={tl.at("end").start + 40} name="chime" volume={0.45} />
      <Music timeline={tl} track="lofi-book" volume={0.55} duckTo={0.45} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};

/* ════════════════════════════════════════════════════════════════════
 * Text Messages (1080x1920)
 * ════════════════════════════════════════════════════════════════════ */

export const libraryTextsTimeline = buildTimeline("library-texts");

type Msg = { from: "kid" | "mom"; text?: string; image?: string };

// One chat message per narration line; the photo rides along with line 3.
const MESSAGES: Array<Msg[]> = [
  [{ from: "kid", text: "MOM!! I checked out a book all by myself today 📚" }],
  [{ from: "mom", text: "Wait… how?? 😮" }],
  [
    { from: "kid", text: "I just scanned it at the library kiosk. AND I got points for reading ⭐" },
    { from: "kid", image: shot("library-full.png") },
  ],
  [{ from: "mom", text: "Ok that's actually really cool 😂❤️" }],
];

const Bubble: React.FC<{ msg: Msg; delay: number }> = ({ msg, delay }) => {
  const p = usePop(delay, 13, 220);
  const kid = msg.from === "kid";
  return (
    <div
      style={{
        alignSelf: kid ? "flex-end" : "flex-start",
        maxWidth: 720,
        transform: `scale(${p})`,
        transformOrigin: kid ? "100% 100%" : "0% 100%",
        opacity: p,
      }}
    >
      {msg.image ? (
        <Img src={msg.image} style={{ width: 640, borderRadius: 34, border: "6px solid #0a84ff", display: "block" }} />
      ) : (
        <div
          style={{
            fontFamily: jakarta,
            fontWeight: 600,
            fontSize: 50,
            lineHeight: 1.25,
            padding: "24px 34px",
            borderRadius: 42,
            borderBottomRightRadius: kid ? 10 : 42,
            borderBottomLeftRadius: kid ? 42 : 10,
            background: kid ? "#0a84ff" : "#e9e9eb",
            color: kid ? "white" : "#111",
          }}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
};

const Typing: React.FC<{ kid: boolean }> = ({ kid }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        alignSelf: kid ? "flex-end" : "flex-start",
        display: "flex",
        gap: 12,
        padding: "26px 34px",
        borderRadius: 42,
        background: kid ? "#0a84ff" : "#e9e9eb",
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            background: kid ? "white" : "#8e8e93",
            opacity: 0.4 + 0.6 * Math.max(0, Math.sin(frame * 0.4 - i * 0.8)),
          }}
        />
      ))}
    </div>
  );
};

const Chat: React.FC<{ s: SceneTiming }> = ({ s }) => {
  const frame = useCurrentFrame();
  const shown: Array<{ msg: Msg; delay: number }> = [];
  s.cues.forEach((cue, i) => {
    MESSAGES[i].forEach((msg, j) => shown.push({ msg, delay: cue + j * 34 }));
  });
  const visible = shown.filter((m) => frame >= m.delay);
  const nextCue = s.cues.find((c) => c > frame);
  const nextIdx = nextCue === undefined ? -1 : s.cues.indexOf(nextCue);
  const typing = nextIdx >= 0 && nextCue! - frame < 16;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg, #fde68a, #fb923c)", justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          width: 900,
          height: 1640,
          borderRadius: 90,
          background: "white",
          border: "18px solid #111",
          boxShadow: "0 40px 120px rgba(0,0,0,0.35)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            height: 220,
            background: "#f6f6f6",
            borderBottom: "2px solid #ddd",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingBottom: 20,
            position: "relative",
            zIndex: 2,
          }}
        >
          <div style={{ width: 90, height: 90, borderRadius: 45, background: "#fb923c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 54 }}>
            🧒
          </div>
          <div style={{ fontFamily: jakarta, fontWeight: 700, fontSize: 34, marginTop: 8 }}>Jordan</div>
        </div>
        <div style={{ position: "absolute", top: 250, left: 40, right: 40, display: "flex", flexDirection: "column", gap: 26, }}>
          {visible.map((m, i) => (
            <Bubble key={i} msg={m.msg} delay={m.delay} />
          ))}
          {typing ? <Typing kid={MESSAGES[nextIdx][0].from === "kid"} /> : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const TextsEnd: React.FC = () => {
  const a = usePop(0, 12, 170);
  const b = usePop(12);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg, #fde68a, #fb923c)", justifyContent: "center", alignItems: "center", textAlign: "center", padding: 60 }}>
      <div style={{ transform: `scale(${a})` }}>
        <LogoLockup size={110} dark={false} />
        <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 150, color: "#7c2d12", marginTop: 30, lineHeight: 1 }}>Library</div>
      </div>
      <div style={{ fontFamily: caveat, fontSize: 96, color: "#0f1f3a", marginTop: 30, opacity: b, transform: "rotate(-3deg)" }}>
        Reading kids get excited about.
      </div>
      <div style={{ marginTop: 60, opacity: b }}>
        <PillarStrip featured={["Library"]} dark={false} delay={14} size={34} />
      </div>
      <div style={{ marginTop: 50, fontFamily: outfit, fontWeight: 800, fontSize: 50, color: "#0f1f3a", opacity: b }}>leveluprewards.app</div>
    </AbsoluteFill>
  );
};

export const LibraryTextMessages: React.FC = () => {
  const tl = libraryTextsTimeline;
  const chat = tl.at("chat");
  return (
    <AbsoluteFill>
      <Scenes
        timeline={tl}
        render={{
          chat: (s) => (
            <SceneFade dur={s.dur} inFrames={1}>
              <Chat s={s} />
            </SceneFade>
          ),
          end: (s) => (
            <SceneFade dur={s.dur} outFrames={1}>
              <TextsEnd />
            </SceneFade>
          ),
        }}
      />
      <BrandBug pillar="Library" dark={false} style={{ top: 40, left: 40 }} />
      {chat.cues.map((c, i) => (
        <Sfx key={i} at={chat.start + c} name="pop" volume={0.55} />
      ))}
      <Sfx at={chat.start + chat.cues[2] + 34} name="pop" volume={0.55} />
      <Sfx at={tl.at("end").start} name="chime" volume={0.5} />
      <Music timeline={tl} track="marimba-morning" volume={0.5} duckTo={0.35} />
      <Narration timeline={tl} />
    </AbsoluteFill>
  );
};
