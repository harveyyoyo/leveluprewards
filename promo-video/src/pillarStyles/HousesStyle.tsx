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

const data = PILLAR_QUICK_PROMOS.houses;

export const HousesStyle: React.FC = () => {
  const { fps } = useVideoConfig();
  const { frame, hookOpacity, hookY, mediaIn, closeIn } =
    usePillarSceneMotion();
  const trophyPop = spring({
    fps,
    frame: Math.max(0, frame - 88),
    config: { damping: 12, stiffness: 175, mass: 0.65 },
  });
  const crowdIn = interpolate(frame, [102, 138], [0, 1], {
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
          "radial-gradient(circle at 82% 14%, rgba(168,85,247,0.36), transparent 30%), linear-gradient(145deg, #070713 0%, #17102e 55%, #090b18 100%)",
        fontFamily: jakarta,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.18,
          background:
            "repeating-linear-gradient(118deg, transparent 0 90px, rgba(255,255,255,0.35) 91px 105px, transparent 106px 180px)",
          backgroundPosition: `${frame * 2}px ${frame * 0.35}px`,
        }}
      />
      <BrandPill label={data.pillarLabel} color="#e9b949" />
      <div
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: 258,
          zIndex: 5,
          opacity: hookOpacity,
          transform: `translateY(${hookY}px)`,
        }}
      >
        <div
          style={{
            color: "#e9b949",
            fontFamily: outfit,
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: 4.5,
          }}
        >
          {data.eyebrow}
        </div>
        <h1
          style={{
            margin: "28px 0 0",
            fontFamily: outfit,
            fontSize: 100,
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
                color: index === 1 ? "#e9b949" : "#ffffff",
                textShadow: index === 1 ? "0 0 34px rgba(233,185,73,0.52)" : "none",
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
          top: 660,
          width: 970,
          height: 624,
          zIndex: 8,
          overflow: "hidden",
          borderRadius: 28,
          border: "4px solid #e9b949",
          background: "#17172c",
          boxShadow: "0 34px 90px rgba(0,0,0,0.7), 0 0 48px rgba(168,85,247,0.3)",
          opacity: mediaIn,
          transform: `translateY(${(1 - mediaIn) * 120}px) scale(${0.9 + mediaIn * 0.1}) rotate(${(1 - mediaIn) * 1.5}deg)`,
        }}
      >
        <QuickMedia src={data.media} type={data.mediaType} />
        <div
          style={{
            position: "absolute",
            top: 28,
            right: 28,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 18px",
            borderRadius: 16,
            color: "#241a06",
            background: "#e9b949",
            fontFamily: outfit,
            fontSize: 21,
            fontWeight: 800,
            letterSpacing: 1.2,
            boxShadow: "0 0 30px rgba(233,185,73,0.55)",
            opacity: trophyPop,
            transform: `scale(${0.45 + trophyPop * 0.55}) rotate(${(1 - trophyPop) * 7}deg)`,
          }}
        >
          <span style={{ fontSize: 34 }}>🏆</span> LEADER
        </div>
        <div
          style={{
            position: "absolute",
            left: 24,
            right: 24,
            bottom: 22,
            display: "flex",
            gap: 8,
            opacity: crowdIn,
          }}
        >
          {["#2446b8", "#e9b949", "#c7352a"].map((color, index) => (
            <div
              key={color}
              style={{
                flex: 1,
                height: 18 + index * 4,
                borderRadius: 999,
                background: color,
                border: "2px solid rgba(255,255,255,0.7)",
                transform: `translateY(${(1 - crowdIn) * (40 - index * 8)}px)`,
              }}
            />
          ))}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 76,
          right: 76,
          top: 1300,
          zIndex: 10,
          textAlign: "center",
          color: "#ddd6fe",
          fontFamily: outfit,
          fontSize: 25,
          fontWeight: 700,
          opacity: crowdIn,
        }}
      >
        Team colors. Real scores. School-wide spirit.
      </div>
      <FeatureChips items={data.features} color="#a855f7" />
      <UrlFooter />
      <ClosingPanel
        data={data}
        progress={closeIn}
        background="linear-gradient(145deg, #2b0f57 0%, #6d28d9 52%, #a16207 100%)"
        foreground="#ffffff"
        muted="rgba(255,255,255,0.8)"
      />
    </div>
  );
};
