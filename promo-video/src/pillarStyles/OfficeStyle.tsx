import React from "react";
import { interpolate } from "remotion";
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

const data = PILLAR_QUICK_PROMOS.office;

export const OfficeStyle: React.FC = () => {
  const { frame, hookOpacity, hookY, mediaIn, closeIn } =
    usePillarSceneMotion();
  const flowIn = interpolate(frame, [98, 135], [0, 1], {
    ...clamp,
    easing: quickEase,
  });
  const cardShift = interpolate(frame, [58, 250], [-24, 0], {
    ...clamp,
    easing: quickEase,
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        color: "#102d3a",
        background:
          "radial-gradient(circle at 84% 18%, rgba(15,159,145,0.2), transparent 30%), linear-gradient(150deg, #eef9f7 0%, #f7fbff 52%, #e8f4f6 100%)",
        fontFamily: jakarta,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.34,
          backgroundImage:
            "radial-gradient(rgba(15,95,110,0.2) 1.5px, transparent 1.5px)",
          backgroundSize: "28px 28px",
        }}
      />
      <BrandPill label={data.pillarLabel} color={data.color} dark={false} />
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
            display: "inline-flex",
            padding: "10px 16px",
            borderRadius: 999,
            background: "#d8f5f0",
            color: "#087568",
            fontFamily: outfit,
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 3,
          }}
        >
          A CALMER FRONT DESK
        </div>
        <h1
          style={{
            margin: "30px 0 0",
            fontFamily: outfit,
            fontSize: 104,
            fontWeight: 800,
            lineHeight: 0.91,
            letterSpacing: -4,
            textTransform: "uppercase",
          }}
        >
          {data.hook.map((line, index) => (
            <div
              key={line}
              style={{
                color: index === data.hook.length - 1 ? data.color : "#102d3a",
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
          left: 74,
          top: 680,
          width: 932,
          height: 598,
          zIndex: 8,
          opacity: mediaIn,
          transform: `translateY(${(1 - mediaIn) * 90 + cardShift}px) rotate(${(1 - mediaIn) * -1.4}deg)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "26px -20px -22px 24px",
            borderRadius: 24,
            background: "#ccebea",
            transform: "rotate(2.2deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: "13px -10px -12px 12px",
            borderRadius: 24,
            background: "#dff2f0",
            transform: "rotate(-1.4deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            borderRadius: 24,
            border: `3px solid ${data.color}`,
            background: "#ffffff",
            boxShadow: "0 30px 76px rgba(31,78,88,0.24)",
          }}
        >
          <QuickMedia src={data.media} type={data.mediaType} />
          <div
            style={{
              position: "absolute",
              right: 24,
              top: 24,
              padding: "14px 18px",
              borderRadius: 14,
              color: "#ffffff",
              background: data.color,
              fontFamily: outfit,
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: 1.5,
              boxShadow: "0 12px 28px rgba(15,159,145,0.32)",
              opacity: flowIn,
              transform: `translateY(${(1 - flowIn) * 18}px)`,
            }}
          >
            ALL CAUGHT UP
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1300,
          zIndex: 10,
          textAlign: "center",
          color: "#4b6870",
          fontFamily: outfit,
          fontSize: 24,
          fontWeight: 700,
          opacity: flowIn,
        }}
      >
        One home for the work that keeps school moving.
      </div>
      <FeatureChips items={data.features} color={data.color} dark={false} />
      <UrlFooter dark={false} />
      <ClosingPanel
        data={data}
        progress={closeIn}
        background="linear-gradient(150deg, #073b4c 0%, #0b7b75 52%, #0f9f91 100%)"
        foreground="#ffffff"
        muted="rgba(255,255,255,0.78)"
      />
    </div>
  );
};
