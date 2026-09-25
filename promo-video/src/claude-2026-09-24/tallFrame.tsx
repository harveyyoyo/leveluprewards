/**
 * Two alternate phone (1080x1920) layouts for a wide cartoon story:
 *
 *  - asTallFrame:   letterboxed — the whole 16:9 scene scaled into the
 *                   middle, with a title bar on top and a live "notification"
 *                   ticker on the bottom (short chips like "⭐ +10 pts",
 *                   "🏅 Badge unlocked", "✓ Checked in" — not the full
 *                   narration sentence) instead of captions.
 *  - fullScreenTall: each story's own built-in `tall` camera path, filling
 *                   the whole 1080x1920 frame with no bars. This is the
 *                   default used across the project; asTallFrame is the
 *                   alternate the owner asked to also see.
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ForceWide } from "./cartoon";
import { LogoLockup, PILLAR_COLOR, Pillar, Timeline, clamp, outfit } from "./common";

const W = 1080;
const SCALE = W / 1920;
const MID_H = 1080 * SCALE;
const TOP = (1920 - MID_H) / 2;

/** Picks a small icon for a notification chip from the narration line's words. */
function iconFor(text: string): string {
  const t = text.toLowerCase();
  if (/badge|unlock|achievement/.test(t)) return "🏅";
  if (/point|pts|bonus/.test(t)) return "⭐";
  if (/late|overdue/.test(t)) return "⏰";
  if (/pay|paid|balance|\$/.test(t)) return "💳";
  if (/bus/.test(t)) return "🚌";
  if (/book|read|library|scan.*book/.test(t)) return "📖";
  if (/check|scan|on time|tap/.test(t)) return "✓";
  return "🔔";
}

/** Short chip label: first clause of the line, trimmed to fit one line. */
function shortLabel(text: string): string {
  const clause = text.split(/[,.;—]| — /)[0].trim();
  return clause.length > 34 ? clause.slice(0, 32).trimEnd() + "…" : clause;
}

const NotifyChip: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const line = tl.voices.find((v) => frame >= v.start - 2 && frame < v.start + v.dur + 14);
  if (!line || !line.text) return null;
  const t = frame - line.start;
  const pop = interpolate(t, [-2, 6], [0, 1], clamp);
  const rise = interpolate(t, [-2, 6], [30, 0], clamp);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "22px 40px",
        borderRadius: 999,
        background: "rgba(15,23,42,0.85)",
        border: "2px solid rgba(255,255,255,0.15)",
        opacity: pop,
        transform: `translateY(${rise}px) scale(${0.9 + pop * 0.1})`,
        fontFamily: outfit,
        fontWeight: 800,
        fontSize: 42,
        color: "white",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 50 }}>{iconFor(line.text)}</span>
      {shortLabel(line.text)}
    </div>
  );
};

/** Running tally that bumps +10 each time a points/bonus line plays — a stylized counter, not a literal readout. */
const PointsTicker: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const passed = tl.voices.filter((v) => /point|pts|bonus/i.test(v.text) && frame >= v.start + Math.round(v.dur * 0.4));
  if (!passed.length) return null;
  const total = passed.length * 10;
  const justBumped = frame - (passed[passed.length - 1].start + Math.round(passed[passed.length - 1].dur * 0.4)) < 14;
  return (
    <div
      style={{
        position: "absolute",
        top: 34,
        right: 34,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 24px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.16)",
        fontFamily: outfit,
        fontWeight: 800,
        fontSize: 32,
        color: "white",
        transform: `scale(${justBumped ? 1.12 : 1})`,
      }}
    >
      ⭐ {total}
    </div>
  );
};

export const asTallFrame = (Comp: React.FC, tl: Timeline, title: string, pillar: Pillar): React.FC => {
  const color = PILLAR_COLOR[pillar];
  const Framed: React.FC = () => (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${color} 0%, #0f172a 38%, #0f172a 62%, ${color} 100%)` }}>
      <div style={{ position: "absolute", top: 0, height: TOP, width: W, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 22 }}>
        <LogoLockup size={72} />
        <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 68, color: "white", textAlign: "center", lineHeight: 1.05, padding: "0 40px" }}>{title}</div>
        <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 30, color: "white", background: "rgba(255,255,255,0.18)", padding: "8px 24px", borderRadius: 999 }}>{pillar}</div>
        <PointsTicker tl={tl} />
      </div>
      <div
        style={{
          position: "absolute",
          top: TOP,
          left: 0,
          width: 1920,
          height: 1080,
          transform: `scale(${SCALE})`,
          transformOrigin: "0 0",
          overflow: "hidden",
          boxShadow: "0 0 60px rgba(0,0,0,0.5)",
        }}
      >
        <ForceWide.Provider value>
          <Comp />
        </ForceWide.Provider>
      </div>
      <div style={{ position: "absolute", top: TOP + MID_H, height: TOP, width: W, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <NotifyChip tl={tl} />
      </div>
    </AbsoluteFill>
  );
  return Framed;
};
