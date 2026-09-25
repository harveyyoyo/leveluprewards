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

const data = PILLAR_QUICK_PROMOS.attendance;

export const AttendanceStyle: React.FC = () => {
  const { frame, hookOpacity, hookY, mediaIn, closeIn } =
    usePillarSceneMotion();
  const checkIn = interpolate(frame, [92, 128], [0, 1], {
    ...clamp,
    easing: quickEase,
  });
  const sweep = interpolate(frame, [52, 260], [-120, 120], {
    ...clamp,
    extrapolateRight: "extend",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        color: "#12233f",
        background:
          "radial-gradient(circle at 18% 18%, rgba(36,180,126,0.18), transparent 28%), linear-gradient(160deg, #f8fbff 0%, #edf4ff 58%, #ffffff 100%)",
        fontFamily: jakarta,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.35,
          backgroundImage:
            "linear-gradient(rgba(44,87,140,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(44,87,140,0.08) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          right: -190,
          top: 165,
          borderRadius: "50%",
          border: `72px solid ${data.color}`,
          opacity: 0.12,
        }}
      />
      <BrandPill label={data.pillarLabel} color={data.color} dark={false} />
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
            display: "inline-flex",
            padding: "10px 16px",
            borderRadius: 999,
            background: "#dff8ee",
            color: "#127354",
            fontFamily: outfit,
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 3,
          }}
        >
          LESS ADMIN. MORE TEACHING.
        </div>
        <h1
          style={{
            margin: "30px 0 0",
            fontFamily: outfit,
            fontSize: 104,
            fontWeight: 800,
            lineHeight: 0.92,
            letterSpacing: -4,
            textTransform: "uppercase",
          }}
        >
          {data.hook.map((line, index) => (
            <div
              key={line}
              style={{
                color: index === data.hook.length - 1 ? data.color : "#12233f",
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
          left: 52,
          top: 645,
          width: 976,
          height: 628,
          zIndex: 8,
          overflow: "hidden",
          borderRadius: 30,
          border: "3px solid rgba(36,180,126,0.5)",
          background: "#ffffff",
          boxShadow: "0 34px 80px rgba(30,67,112,0.2)",
          opacity: mediaIn,
          transform: `translateY(${(1 - mediaIn) * 100}px) scale(${0.94 + mediaIn * 0.06})`,
        }}
      >
        <QuickMedia src={data.media} type={data.mediaType} />
        <div
          style={{
            position: "absolute",
            top: 32,
            right: 30,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 22px",
            borderRadius: 20,
            color: "#0d6a4c",
            background: "#e8fff5",
            border: `2px solid ${data.color}`,
            boxShadow: "0 14px 30px rgba(24,95,72,0.18)",
            fontFamily: outfit,
            fontSize: 24,
            fontWeight: 800,
            opacity: checkIn,
            transform: `translateX(${(1 - checkIn) * 90}px)`,
          }}
        >
          <span style={{ fontSize: 42, lineHeight: 1 }}>✓</span>
          CHECKED IN
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `linear-gradient(105deg, transparent ${48 + sweep}%, rgba(255,255,255,0.36) ${50 + sweep}%, transparent ${52 + sweep}%)`,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: 1288,
          left: 74,
          right: 74,
          zIndex: 10,
          textAlign: "center",
          color: "#41516b",
          fontFamily: outfit,
          fontSize: 24,
          fontWeight: 700,
          opacity: checkIn,
        }}
      >
        One simple flow for the whole school day.
      </div>
      <FeatureChips items={data.features} color={data.color} dark={false} />
      <UrlFooter dark={false} />
      <ClosingPanel
        data={data}
        progress={closeIn}
        background="linear-gradient(155deg, #ffffff 0%, #e8fff5 58%, #dff3ff 100%)"
        foreground="#12233f"
        muted="#52647d"
      />
    </div>
  );
};
