import React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";
import { jakarta, outfit } from "../promo/shared";
import { PILLAR_QUICK_PROMOS } from "./pillarStyleData";
import {
  BrandPill,
  clamp,
  ClosingPanel,
  FeatureChips,
  quickEase,
  QuickMedia,
  UrlFooter,
  usePillarSceneMotion,
} from "./PillarStyleShared";

const data = PILLAR_QUICK_PROMOS.classroom;

export const ClassroomStyle: React.FC = () => {
  const { fps } = useVideoConfig();
  const { frame, hookOpacity, hookY, mediaIn, closeIn } =
    usePillarSceneMotion();
  const awardPop = spring({
    fps,
    frame: Math.max(0, frame - 98),
    config: { damping: 11, stiffness: 190, mass: 0.6 },
  });
  const targetPulse = interpolate(frame % 18, [0, 9, 18], [0.94, 1.08, 0.94]);
  const captionIn = interpolate(frame, [118, 145], [0, 1], {
    ...clamp,
    easing: quickEase,
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        color: "#ffffff",
        background:
          "radial-gradient(circle at 18% 20%, rgba(34,211,238,0.25), transparent 32%), linear-gradient(150deg, #030712 0%, #0b1230 58%, #111827 100%)",
        fontFamily: jakarta,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.25,
          backgroundImage:
            "linear-gradient(rgba(125,211,252,0.2) 2px, transparent 2px), linear-gradient(90deg, rgba(125,211,252,0.2) 2px, transparent 2px)",
          backgroundSize: "64px 64px",
          transform: `translateY(${(frame * 1.4) % 64}px)`,
        }}
      />
      <BrandPill label={data.pillarLabel} color={data.color} />
      <div
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: 260,
          zIndex: 5,
          opacity: hookOpacity,
          transform: `translateY(${hookY}px)`,
        }}
      >
        <div
          style={{
            color: "#22d3ee",
            fontFamily: outfit,
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: 4.5,
          }}
        >
          CLASSROOM MOMENTS, UNLOCKED
        </div>
        <h1
          style={{
            margin: "28px 0 0",
            fontFamily: outfit,
            fontSize: 108,
            fontWeight: 800,
            lineHeight: 0.9,
            letterSpacing: -4,
            textTransform: "uppercase",
          }}
        >
          {data.hook.map((line, index) => (
            <div
              key={line}
              style={{
                color: index === 1 ? "#facc15" : "#ffffff",
                textShadow: index === 1 ? "0 0 30px rgba(250,204,21,0.55)" : "none",
              }}
            >
              {line}
            </div>
          ))}
        </h1>
      </div>
      <div
        style={{
          position: "absolute",
          left: 55,
          top: 675,
          width: 970,
          height: 546,
          zIndex: 8,
          overflow: "hidden",
          borderRadius: 26,
          border: "4px solid #22d3ee",
          background: "#101827",
          boxShadow: "0 0 0 8px rgba(34,211,238,0.09), 0 34px 90px rgba(0,0,0,0.68)",
          opacity: mediaIn,
          transform: `translateX(${(1 - mediaIn) * (frame % 2 === 0 ? 120 : -120)}px) scale(${0.9 + mediaIn * 0.1})`,
        }}
      >
        <QuickMedia src={data.media} type={data.mediaType} />
        <div
          style={{
            position: "absolute",
            left: "40.5%",
            top: "21%",
            width: "8%",
            height: "16%",
            border: `6px solid ${data.color}`,
            borderRadius: 18,
            boxShadow: `0 0 30px ${data.color}, inset 0 0 24px rgba(250,204,21,0.24)`,
            transform: `scale(${targetPulse})`,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 28,
            right: 26,
            padding: "13px 20px",
            borderRadius: 16,
            background: data.color,
            color: "#111827",
            fontFamily: outfit,
            fontSize: 32,
            fontWeight: 800,
            boxShadow: "0 0 28px rgba(250,204,21,0.55)",
            transform: `scale(${0.4 + awardPop * 0.6}) rotate(${(1 - awardPop) * 8}deg)`,
            opacity: awardPop,
          }}
        >
          +10 AWARD
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 78,
          right: 78,
          top: 1248,
          zIndex: 10,
          textAlign: "center",
          color: "#bae6fd",
          fontFamily: outfit,
          fontSize: 25,
          fontWeight: 700,
          opacity: captionIn,
          transform: `translateY(${(1 - captionIn) * 18}px)`,
        }}
      >
        One tap. One award. Class momentum.
      </div>
      <FeatureChips items={data.features} color="#22d3ee" />
      <UrlFooter />
      <ClosingPanel
        data={data}
        progress={closeIn}
        background="linear-gradient(150deg, #07152d 0%, #123b66 52%, #0b1327 100%)"
        foreground="#ffffff"
        muted="rgba(219,234,254,0.76)"
      />
    </div>
  );
};
