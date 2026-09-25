import React from "react";
import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { jakarta, outfit } from "../promo/shared";
import {
  PILLAR_QUICK_PROMO_IDS,
  PILLAR_QUICK_PROMOS,
  PILLAR_QUICK_TOTAL_FRAMES,
  type PillarQuickPromoData,
  type PillarQuickPromoId,
} from "./pillarStyleData";
import {
  BrandPill,
  FlashFX,
  QuickMedia,
  UrlFooter,
} from "./PillarStyleShared";

export type PillarQuickLandscapeProps = {
  pillarId: PillarQuickPromoId;
};

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};
const ease = Easing.bezier(0.16, 1, 0.3, 1);

const LandscapeClosing: React.FC<{
  data: PillarQuickPromoData;
  progress: number;
}> = ({ data, progress }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      zIndex: 40,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      padding: "0 180px",
      textAlign: "center",
      color: data.foreground,
      background: data.closingBackground,
      opacity: progress,
      transform: `translateY(${(1 - progress) * 80}px)`,
    }}
  >
    <div
      style={{
        fontFamily: outfit,
        fontSize: 26,
        fontWeight: 800,
        letterSpacing: 6,
        color: data.closingAccent,
      }}
    >
      LEVELUP · {data.pillarLabel}
    </div>
    <div
      style={{
        marginTop: 34,
        fontFamily: outfit,
        fontSize: 112,
        fontWeight: 800,
        lineHeight: 0.94,
        letterSpacing: -4,
      }}
    >
      {data.promise}
    </div>
    <div
      style={{
        marginTop: 44,
        padding: "20px 34px",
        borderRadius: 999,
        background: data.closingAccent,
        color: data.buttonTextColor,
        fontFamily: outfit,
        fontSize: 27,
        fontWeight: 800,
        letterSpacing: 2,
      }}
    >
      {data.cta}
    </div>
    <div
      style={{
        marginTop: 34,
        color: data.foreground,
        opacity: 0.72,
        fontFamily: outfit,
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: 1.4,
      }}
    >
      {data.styleLabel.toUpperCase()} · leveluprewards.app
    </div>
  </div>
);

export const PillarQuickLandscape: React.FC<PillarQuickLandscapeProps> = ({
  pillarId,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const data = PILLAR_QUICK_PROMOS[pillarId];
  const isLight = ["attendance", "library", "office"].includes(pillarId);
  const hookOpacity = interpolate(frame, [0, 10, 58, 92], [0, 1, 1, 0], {
    ...clamp,
    easing: ease,
  });
  const hookY = interpolate(frame, [0, 28], [60, 0], {
    ...clamp,
    easing: ease,
  });
  const mediaIn = spring({
    fps,
    frame: Math.max(0, frame - 48),
    config: { damping: 17, stiffness: 105, mass: 0.8 },
  });
  const detailIn = interpolate(frame, [70, 112], [0, 1], {
    ...clamp,
    easing: ease,
  });
  const closeIn = spring({
    fps,
    frame: Math.max(0, frame - 252),
    config: { damping: 20, stiffness: 100, mass: 0.9 },
  });
  const headingSize = data.hook.length >= 3 ? 88 : 104;
  const pillarNumber = String(PILLAR_QUICK_PROMO_IDS.indexOf(pillarId) + 1).padStart(2, "0");

  return (
    <AbsoluteFill style={{ background: data.background, fontFamily: jakarta }}>
      <Audio
        src={staticFile("background-music.mp3")}
        trimBefore={data.musicTrimFrames}
        playbackRate={data.musicRate}
        volume={(audioFrame) =>
          interpolate(
            audioFrame,
            [0, 12, PILLAR_QUICK_TOTAL_FRAMES - 30, PILLAR_QUICK_TOTAL_FRAMES],
            [0, 0.24, 0.24, 0],
            clamp,
          )
        }
      />
      <div
        style={{
          position: "absolute",
          left: 88,
          top: 178,
          width: 10,
          height: 610,
          borderRadius: 999,
          background: `linear-gradient(${data.color}, transparent)`,
          boxShadow: `0 0 32px ${data.color}`,
        }}
      />
      <BrandPill label={data.pillarLabel} color={data.color} dark={!isLight} />
      <div
        style={{
          position: "absolute",
          left: 140,
          top: 190,
          width: 650,
          zIndex: 5,
          color: data.foreground,
          opacity: hookOpacity,
          transform: `translateY(${hookY}px)`,
        }}
      >
        <div
          style={{
            color: data.color,
            fontFamily: outfit,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: 4,
          }}
        >
          {data.eyebrow}
        </div>
        <h1
          style={{
            margin: "28px 0 0",
            fontFamily: outfit,
            fontSize: headingSize,
            fontWeight: 800,
            lineHeight: 0.9,
            letterSpacing: -3.8,
            textTransform: "uppercase",
          }}
        >
          {data.hook.map((line, index) => (
            <div
              key={line}
              style={{
                color:
                  index === data.hook.length - 1 ? data.color : data.foreground,
                textShadow:
                  index === data.hook.length - 1
                    ? `0 0 28px ${data.color}`
                    : "none",
              }}
            >
              {line}
            </div>
          ))}
        </h1>
        <div
          style={{
            marginTop: 42,
            display: "inline-block",
            padding: "18px 24px",
            borderRadius: 20,
            color: data.foreground,
            background: isLight
              ? "rgba(255,255,255,0.74)"
              : "rgba(255,255,255,0.08)",
            border: `1.5px solid ${data.color}`,
            fontFamily: outfit,
            fontSize: 23,
            fontWeight: 700,
            lineHeight: 1.25,
          }}
        >
          {data.promise}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 105,
          top: 165,
          width: 520,
          height: 520,
          zIndex: 4,
          borderRadius: "50%",
          border: `2px solid ${data.color}`,
          background: `radial-gradient(circle, ${data.color}22 0%, transparent 66%)`,
          opacity: hookOpacity * 0.72,
          transform: `scale(${0.88 + hookOpacity * 0.12}) rotate(${frame * 0.08}deg)`,
          boxShadow: `inset 0 0 80px ${data.color}18, 0 0 70px ${data.color}18`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 72,
            borderRadius: "50%",
            border: `2px dashed ${data.color}`,
            opacity: 0.45,
          }}
        />
        {[0, 120, 240].map((angle) => (
          <div
            key={angle}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: data.color,
              boxShadow: `0 0 24px ${data.color}`,
              transform: `rotate(${angle}deg) translateX(220px) translate(-50%, -50%)`,
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            color: data.foreground,
            fontFamily: outfit,
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: 4,
            lineHeight: 1.15,
            textTransform: "uppercase",
          }}
        >
          {data.styleLabel}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 140,
          top: 270,
          width: 620,
          height: 520,
          zIndex: 6,
          color: data.foreground,
          opacity: detailIn,
          transform: `translateY(${(1 - detailIn) * 34}px)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -10,
            top: -42,
            fontFamily: outfit,
            fontSize: 250,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: -14,
            color: data.color,
            opacity: 0.12,
          }}
        >
          {pillarNumber}
        </div>
        <div
          style={{
            position: "absolute",
            left: 34,
            top: 150,
            width: 520,
            padding: "28px 30px",
            borderRadius: 26,
            background: isLight
              ? "rgba(255,255,255,0.78)"
              : "rgba(255,255,255,0.08)",
            border: `1.5px solid ${data.color}`,
            boxShadow: `0 24px 60px rgba(0,0,0,0.16), 0 0 34px ${data.color}22`,
          }}
        >
          <div
            style={{
              color: data.color,
              fontFamily: outfit,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 3,
            }}
          >
            WHY IT MATTERS
          </div>
          <div
            style={{
              marginTop: 12,
              fontFamily: outfit,
              fontSize: 34,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: -1,
            }}
          >
            {data.promise}
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 850,
          top: 168,
          width: 980,
          height: 551,
          zIndex: 8,
          overflow: "hidden",
          borderRadius: 32,
          border: `4px solid ${data.color}`,
          background: isLight ? "#ffffff" : "#0b1020",
          boxShadow: `0 34px 90px rgba(0,0,0,0.42), 0 0 54px ${data.color}55`,
          opacity: mediaIn,
          transform: `translateX(${(1 - mediaIn) * 150}px) scale(${0.9 + mediaIn * 0.1}) rotate(${(1 - mediaIn) * 1.5}deg)`,
        }}
      >
        <QuickMedia src={data.media} type={data.mediaType} />
        <div
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 17px",
            borderRadius: 999,
            background: data.color,
            color: data.buttonTextColor,
            fontFamily: outfit,
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: 1.3,
            boxShadow: `0 0 24px ${data.color}`,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: data.buttonTextColor,
            }}
          />
          LIVE SCHOOL VIEW
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 850,
          right: 90,
          top: 746,
          zIndex: 10,
          textAlign: "center",
          color: data.foreground,
          fontFamily: outfit,
          fontSize: 24,
          fontWeight: 700,
          opacity: detailIn,
          transform: `translateY(${(1 - detailIn) * 20}px)`,
        }}
      >
        {data.screenCaption}
      </div>
      <div
        style={{
          position: "absolute",
          left: 850,
          right: 90,
          top: 804,
          zIndex: 10,
          display: "flex",
          gap: 14,
          opacity: detailIn,
        }}
      >
        {data.features.map((feature) => (
          <div
            key={feature}
            style={{
              flex: 1,
              padding: "17px 14px",
              borderRadius: 16,
              textAlign: "center",
              color: data.foreground,
              background: isLight
                ? "rgba(255,255,255,0.78)"
                : "rgba(255,255,255,0.08)",
              border: `1.5px solid ${data.color}`,
              fontFamily: outfit,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 1.1,
            }}
          >
            {feature}
          </div>
        ))}
      </div>
      <UrlFooter dark={!isLight} />
      <FlashFX color={data.color} />
      <LandscapeClosing data={data} progress={closeIn} />
    </AbsoluteFill>
  );
};
