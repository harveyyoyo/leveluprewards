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

const data = PILLAR_QUICK_PROMOS.rewards;

export const RewardsStyle: React.FC = () => {
  const { fps } = useVideoConfig();
  const { frame, hookOpacity, hookY, mediaIn, closeIn } =
    usePillarSceneMotion();
  const pointPop = spring({
    fps,
    frame: Math.max(0, frame - 96),
    config: { damping: 12, stiffness: 180, mass: 0.65 },
  });
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
          "radial-gradient(circle at 78% 24%, rgba(255,47,146,0.34), transparent 34%), linear-gradient(145deg, #05030a 0%, #12031a 55%, #050713 100%)",
        fontFamily: jakarta,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.18,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)",
          backgroundSize: "58px 58px",
          transform: `translate(${(frame % 58) - 58}px, ${(frame % 58) - 58}px) scale(1.08)`,
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
            color: data.color,
            fontFamily: outfit,
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: 4.5,
          }}
        >
          REWARDS, REIMAGINED
        </div>
        <h1
          style={{
            margin: "28px 0 0",
            fontFamily: outfit,
            fontSize: 112,
            fontWeight: 800,
            lineHeight: 0.89,
            letterSpacing: -4.5,
            textTransform: "uppercase",
          }}
        >
          {data.hook.map((line, index) => (
            <div
              key={line}
              style={{
                color: index === data.hook.length - 1 ? data.color : "#ffffff",
                textShadow:
                  index === data.hook.length - 1
                    ? `0 0 40px ${data.color}`
                    : "none",
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
          top: 640,
          width: 970,
          height: 624,
          zIndex: 8,
          overflow: "hidden",
          borderRadius: 34,
          border: `4px solid ${data.color}`,
          background: "#160616",
          boxShadow: `0 34px 90px rgba(0,0,0,0.64), 0 0 55px rgba(255,47,146,0.38)`,
          opacity: mediaIn,
          transform: `translateY(${(1 - mediaIn) * 130}px) scale(${0.9 + mediaIn * 0.1}) rotate(${(1 - mediaIn) * -2.2}deg)`,
        }}
      >
        <QuickMedia src={data.media} type={data.mediaType} fit="contain" />
        <div
          style={{
            position: "absolute",
            top: 34,
            right: 28,
            padding: "16px 22px 14px",
            borderRadius: 20,
            background: "#ffffff",
            color: "#b80058",
            textAlign: "center",
            boxShadow: "0 14px 34px rgba(0,0,0,0.32)",
            transform: `scale(${0.55 + pointPop * 0.45}) rotate(${4 - pointPop * 4}deg)`,
            opacity: pointPop,
          }}
        >
          <div style={{ fontFamily: outfit, fontSize: 54, fontWeight: 800, lineHeight: 0.9 }}>
            +25
          </div>
          <div style={{ marginTop: 8, fontFamily: outfit, fontSize: 16, fontWeight: 800, letterSpacing: 1.4 }}>
            GREAT CHOICE
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 78,
          right: 78,
          top: 1272,
          zIndex: 10,
          textAlign: "center",
          color: "#ffffff",
          fontFamily: outfit,
          fontSize: 25,
          fontWeight: 700,
          letterSpacing: 0.4,
          opacity: captionIn,
          transform: `translateY(${(1 - captionIn) * 18}px)`,
        }}
      >
        Students see progress. Teachers see momentum.
      </div>
      <FeatureChips items={data.features} color={data.color} />
      <UrlFooter />
      <ClosingPanel
        data={data}
        progress={closeIn}
        background="linear-gradient(150deg, rgba(255,47,146,0.97), rgba(91,15,180,0.98) 56%, #09051c 100%)"
        foreground="#ffffff"
        muted="rgba(255,255,255,0.78)"
      />
    </div>
  );
};
