/**
 * Phone (1080x1920) version of a wide cartoon story: the whole 16:9 scene
 * plays across the middle, with a title up top and live captions below,
 * so nothing gets cropped off the sides.
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ForceWide } from "./cartoon";
import { LogoLockup, PILLAR_COLOR, Pillar, Timeline, clamp, outfit } from "./common";

const W = 1080;
const SCALE = W / 1920;
const MID_H = 1080 * SCALE;
const TOP = (1920 - MID_H) / 2;

const Caption: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const line = tl.voices.find((v) => frame >= v.start - 4 && frame < v.start + v.dur + 10);
  if (!line) return null;
  const t = frame - line.start;
  const words = line.text.split(" ");
  const perWord = line.dur / words.length;
  const inO = interpolate(t, [-4, 4], [0, 1], clamp);
  return (
    <div
      style={{
        margin: "0 50px",
        padding: "26px 34px",
        borderRadius: 32,
        background: "rgba(15,23,42,0.85)",
        textAlign: "center",
        opacity: inO,
        fontFamily: outfit,
        fontWeight: 800,
        fontSize: 50,
        lineHeight: 1.25,
      }}
    >
      {words.map((w, i) => (
        <span key={i} style={{ color: t >= i * perWord ? "white" : "rgba(255,255,255,0.35)" }}>
          {w}{" "}
        </span>
      ))}
    </div>
  );
};

export const asTallFrame = (Comp: React.FC, tl: Timeline, title: string, pillar: Pillar): React.FC => {
  const color = PILLAR_COLOR[pillar];
  const Framed: React.FC = () => (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${color} 0%, #0f172a 38%, #0f172a 62%, ${color} 100%)` }}>
      <div style={{ position: "absolute", top: 0, height: TOP, width: W, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 26 }}>
        <LogoLockup size={84} />
        <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 84, color: "white", textAlign: "center", lineHeight: 1.05, padding: "0 40px" }}>{title}</div>
        <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 34, color: "white", background: "rgba(255,255,255,0.18)", padding: "8px 26px", borderRadius: 999 }}>{pillar}</div>
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
        <Caption tl={tl} />
      </div>
    </AbsoluteFill>
  );
  return Framed;
};
