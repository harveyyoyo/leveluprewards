/**
 * Shared pieces for the Claude 2026-09-24 pillar spotlight videos:
 * voice-driven timelines, music with ducking, sound effects, and the
 * LevelUp EDU brand bug / pillar strip used on every video.
 */
import React from "react";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadPressStart } from "@remotion/google-fonts/PressStart2P";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { jakarta, outfit } from "../promo/shared";
// @ts-expect-error: JSON import (tsconfig has no resolveJsonModule); shared with the music script
import sceneSpecsJson from "./sceneSpecs.json";
// @ts-expect-error: JSON import written by scripts/claude-2026-09-24/make-pillar-voices.mjs
import voiceDurationsJson from "./voiceDurations.json";
// @ts-expect-error: JSON import written by scripts/claude-2026-09-24/make-pillar-voices.mjs
import voiceLinesJson from "./voiceLines.json";

export { jakarta, outfit };

export const anton = loadAnton("normal", { weights: ["400"], subsets: ["latin"] })
  .fontFamily;
export const caveat = loadCaveat("normal", { weights: ["700"], subsets: ["latin"] })
  .fontFamily;
export const fraunces = loadFraunces("normal", {
  weights: ["600", "800"],
  subsets: ["latin"],
}).fontFamily;
export const frauncesItalic = loadFraunces("italic", {
  weights: ["600"],
  subsets: ["latin"],
}).fontFamily;
export const pixel = loadPressStart("normal", { weights: ["400"], subsets: ["latin"] })
  .fontFamily;

export const FPS = 30;
export const DATE_TAG = "claude-2026-09-24";

export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

export const shot = (name: string) => staticFile(`marketing/screenshots/${name}`);
export const LOGO = staticFile("brand/levelup-logo.png");

export const usePop = (delay: number, damping = 12, stiffness = 180) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness } });
};

/* ── Pillars ─────────────────────────────────────────────────────────── */

export type Pillar = "Rewards" | "Attendance" | "Library" | "Classroom" | "Houses" | "Raffle" | "Family" | "Office" | "Displays" | "Badges";
/** The four core pillars; add-ons (Houses, Raffle) are appended to the strip when featured. */
export const PILLARS: Pillar[] = ["Rewards", "Attendance", "Library", "Classroom"];
export const PILLAR_COLOR: Record<Pillar, string> = {
  Rewards: "#ec4899",
  Attendance: "#16a34a",
  Library: "#d97706",
  Classroom: "#7c3aed",
  Houses: "#dc2626",
  Raffle: "#0891b2",
  Family: "#0ea5e9",
  Office: "#0f766e",
  Displays: "#4f46e5",
  Badges: "#eab308",
};

/* ── Voice-driven timeline ───────────────────────────────────────────── */

export type VideoId =
  | "rewards-neon"
  | "attendance-clean"
  | "library-storybook"
  | "classroom-arcade"
  | "rewards-countdown"
  | "attendance-news"
  | "library-texts"
  | "classroom-before-after"
  | "attendance-scan-in"
  | "houses-sorting"
  | "houses-race"
  | "raffle-gameshow"
  | "story-classroom-onetap"
  | "story-library-checkout"
  | "story-rewards-prizeday"
  | "story-houses-assembly"
  | "story-family-portal"
  | "story-classroom-hallpass"
  | "story-office-ask"
  | "office-rapid"
  | "story-office-bus"
  | "story-office-pickup"
  | "story-rewards-vending"
  | "story-maya-firstweek"
  | "story-badge-unlocked"
  | "story-lobby-tv"
  | "story-principal-morning"
  | "story-office-billing"
  | "story-library-tworeturns";

type SceneSpec = {
  name: string;
  voices: number[];
  min: number;
  gap?: number;
  tail?: number;
};

export type SceneTiming = {
  name: string;
  start: number;
  dur: number;
  /** Voice line start frames, relative to the scene start. */
  cues: number[];
  /** Voice line lengths in frames (same order as cues). */
  lens: number[];
};

export type Timeline = {
  id: VideoId;
  scenes: SceneTiming[];
  voices: Array<{ src: string; start: number; dur: number; text: string }>;
  total: number;
  at: (name: string) => SceneTiming;
};

const VOICE_LEAD = 6;
const VOICE_PAD = 12;

/** Scene lengths stretch to fit their narration (see sceneSpecs.json). */
export function buildTimeline(id: VideoId): Timeline {
  const specs = (sceneSpecsJson as Record<string, SceneSpec[]>)[id];
  const secs = (voiceDurationsJson as Record<string, number[]>)[id];
  const texts = (voiceLinesJson as Record<string, string[]>)[id] ?? [];
  const scenes: SceneTiming[] = [];
  const voices: Timeline["voices"] = [];
  let cursor = 0;
  for (const spec of specs) {
    const gap = spec.gap ?? 8;
    let t = VOICE_LEAD;
    const cues: number[] = [];
    const lens: number[] = [];
    for (const v of spec.voices) {
      const dur = Math.ceil(secs[v] * FPS);
      cues.push(t);
      lens.push(dur);
      voices.push({
        src: staticFile(`voiceover/${DATE_TAG}/${id}/${v + 1}.mp3`),
        start: cursor + t,
        dur,
        text: texts[v] ?? "",
      });
      t += dur + gap;
    }
    const needed = t - gap + VOICE_PAD;
    const dur = Math.max(spec.min, needed) + (spec.tail ?? 0);
    scenes.push({ name: spec.name, start: cursor, dur, cues, lens });
    cursor += dur;
  }
  return {
    id,
    scenes,
    voices,
    total: cursor,
    at: (name) => {
      const s = scenes.find((x) => x.name === name);
      if (!s) throw new Error(`No scene ${name} in ${id}`);
      return s;
    },
  };
}

/** Renders one Sequence per scene. */
export const Scenes: React.FC<{
  timeline: Timeline;
  render: Record<string, (s: SceneTiming) => React.ReactNode>;
}> = ({ timeline, render }) => (
  <>
    {timeline.scenes.map((s) =>
      render[s.name] ? (
        <Sequence key={s.name} from={s.start} durationInFrames={s.dur}>
          {render[s.name](s)}
        </Sequence>
      ) : null,
    )}
  </>
);

/* ── Audio ───────────────────────────────────────────────────────────── */

export const Narration: React.FC<{ timeline: Timeline; volume?: number }> = ({
  timeline,
  volume = 1,
}) => (
  <>
    {timeline.voices.map((v) => (
      <Sequence key={v.src} from={v.start} durationInFrames={v.dur + 15}>
        <Audio src={v.src} volume={volume} />
      </Sequence>
    ))}
  </>
);

/** Music bed that dips under the narration and fades at both ends. */
export const Music: React.FC<{
  timeline: Timeline;
  track: string;
  volume?: number;
  duckTo?: number;
}> = ({ timeline, track, volume = 0.55, duckTo = 0.4 }) => {
  const { total, voices } = timeline;
  return (
    <Audio
      src={staticFile(`music/${DATE_TAG}/${track}.mp3`)}
      volume={(f) => {
        const edges = interpolate(f, [0, 8, total - 36, total], [0, 1, 1, 0], clamp);
        let duck = 1;
        for (const v of voices) {
          const d = interpolate(
            f,
            [v.start - 8, v.start, v.start + v.dur, v.start + v.dur + 14],
            [1, duckTo, duckTo, 1],
            clamp,
          );
          duck = Math.min(duck, d);
        }
        return volume * edges * duck;
      }}
    />
  );
};

export type SfxName =
  | "pop"
  | "coin"
  | "whoosh"
  | "impact"
  | "ding"
  | "beep"
  | "tick"
  | "levelup"
  | "type"
  | "chime"
  | "buzzer"
  | "crowd"
  | "wahwah";

export const Sfx: React.FC<{ at: number; name: SfxName; volume?: number }> = ({
  at,
  name,
  volume = 0.6,
}) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={60}>
    <Audio src={staticFile(`music/${DATE_TAG}/sfx-${name}.wav`)} volume={volume} />
  </Sequence>
);

/* ── Visual helpers ──────────────────────────────────────────────────── */

/** Fades a scene in and out at its edges. */
export const SceneFade: React.FC<{
  dur: number;
  inFrames?: number;
  outFrames?: number;
  children: React.ReactNode;
}> = ({ dur, inFrames = 6, outFrames = 6, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, inFrames, dur - outFrames, dur],
    [0, 1, 1, 0],
    clamp,
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

/** Small "LevelUp EDU · <Pillar>" badge kept in a corner of every video. */
export const BrandBug: React.FC<{
  /** Omit to show just the LevelUp EDU logo (e.g. whole-platform videos). */
  pillar?: Pillar;
  dark?: boolean;
  scale?: number;
  style?: React.CSSProperties;
}> = ({ pillar, dark = true, scale = 1, style }) => {
  const frame = useCurrentFrame();
  const inOp = interpolate(frame, [4, 16], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        top: 40,
        left: 40,
        display: "flex",
        alignItems: "center",
        gap: 14 * scale,
        padding: `${10 * scale}px ${20 * scale}px ${10 * scale}px ${10 * scale}px`,
        borderRadius: 999,
        background: dark ? "rgba(10,10,20,0.55)" : "rgba(255,255,255,0.85)",
        border: dark ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(15,31,58,0.1)",
        backdropFilter: "blur(8px)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        opacity: inOp,
        zIndex: 50,
        ...style,
      }}
    >
      <Img src={LOGO} style={{ width: 52 * scale, height: 52 * scale, borderRadius: 12 * scale }} />
      <span
        style={{
          fontFamily: outfit,
          fontWeight: 800,
          fontSize: 28 * scale,
          color: dark ? "white" : "#0f1f3a",
          letterSpacing: 0.5,
        }}
      >
        LevelUp EDU
      </span>
      {pillar ? <span
        style={{
          fontFamily: outfit,
          fontWeight: 800,
          fontSize: 24 * scale,
          color: "white",
          background: PILLAR_COLOR[pillar],
          padding: `${4 * scale}px ${14 * scale}px`,
          borderRadius: 999,
        }}
      >
        {pillar}
      </span> : null}
    </div>
  );
};

/** "Rewards • Attendance • Library • Classroom" with the featured pillar(s) lit up. */
export const PillarStrip: React.FC<{
  featured: Pillar[];
  dark?: boolean;
  delay?: number;
  size?: number;
  fontFamily?: string;
}> = ({ featured, dark = true, delay = 0, size = 30, fontFamily = outfit }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: size * 0.5 }}>
      {[...PILLARS, ...featured.filter((p) => !PILLARS.includes(p))].map((p, i) => {
        const on = featured.includes(p);
        const o = interpolate(frame - delay - i * 3, [0, 8], [0, 1], clamp);
        return (
          <span
            key={p}
            style={{
              fontFamily,
              fontWeight: 800,
              fontSize: size,
              padding: `${size * 0.3}px ${size * 0.8}px`,
              borderRadius: 999,
              opacity: o * (on ? 1 : 0.55),
              color: on ? "white" : dark ? "rgba(255,255,255,0.8)" : "#475569",
              background: on ? PILLAR_COLOR[p] : "transparent",
              border: on
                ? `2px solid ${PILLAR_COLOR[p]}`
                : `2px solid ${dark ? "rgba(255,255,255,0.35)" : "rgba(71,85,105,0.35)"}`,
              transform: on ? `scale(${1 + 0.06 * Math.sin(frame * 0.2)})` : undefined,
            }}
          >
            {p}
          </span>
        );
      })}
    </div>
  );
};

export const LogoLockup: React.FC<{ size?: number; dark?: boolean }> = ({
  size = 110,
  dark = true,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.22, justifyContent: "center" }}>
    <Img
      src={LOGO}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.2,
        boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
      }}
    />
    <span
      style={{
        fontFamily: outfit,
        fontWeight: 800,
        fontSize: size * 0.62,
        color: dark ? "white" : "#0f1f3a",
      }}
    >
      LevelUp EDU
    </span>
  </div>
);

/** Stable pseudo-random number in [0, 1) for index i. */
export const rnd = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Falling confetti that starts at the scene's frame `from`. */
export const Confetti: React.FC<{ from?: number; colors: string[]; count?: number; width: number; height: number }> = ({
  from = 0,
  colors,
  count = 90,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const t = frame - from;
  if (t < 0) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      {Array.from({ length: count }).map((_, i) => {
        const x0 = rnd(i) * width;
        const vx = (rnd(i + 100) - 0.5) * 14;
        const vy = -18 - rnd(i + 200) * 22;
        const y = height * 0.55 + vy * t + 0.9 * t * t * 0.5;
        const x = x0 + vx * t;
        const spin = t * (6 + rnd(i + 300) * 14) * (i % 2 ? 1 : -1);
        if (y > height + 40) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 14 + rnd(i + 400) * 12,
              height: 8 + rnd(i + 500) * 10,
              background: colors[i % colors.length],
              borderRadius: 2,
              transform: `rotate(${spin}deg) rotateX(${spin * 1.3}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
