import React from "react";
import { Video } from "@remotion/media";
import {
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { outfit } from "../promo/shared";
import type { PillarQuickPromoData } from "./pillarStyleData";

export const QUICK_CLOSING_START = 252;

export const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

export const quickEase = Easing.bezier(0.16, 1, 0.3, 1);

export const usePillarSceneMotion = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hookOpacity = interpolate(frame, [0, 10, 46, 80], [0, 1, 1, 0], {
    ...clamp,
    easing: quickEase,
  });
  const hookY = interpolate(frame, [0, 28], [72, 0], {
    ...clamp,
    easing: quickEase,
  });
  const mediaIn = spring({
    fps,
    frame: Math.max(0, frame - 52),
    config: { damping: 18, stiffness: 105, mass: 0.85 },
  });
  const closeIn = spring({
    fps,
    frame: Math.max(0, frame - QUICK_CLOSING_START),
    config: { damping: 20, stiffness: 100, mass: 0.9 },
  });

  return { frame, hookOpacity, hookY, mediaIn, closeIn };
};

export const BrandPill: React.FC<{
  label: string;
  color: string;
  dark?: boolean;
}> = ({ label, color, dark = true }) => (
  <div
    style={{
      position: "absolute",
      top: 66,
      left: 70,
      zIndex: 20,
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "14px 20px",
      borderRadius: 999,
      color: dark ? "#ffffff" : "#12233f",
      background: dark ? "rgba(4,7,18,0.72)" : "rgba(255,255,255,0.82)",
      border: `2px solid ${color}`,
      fontFamily: outfit,
      fontSize: 22,
      fontWeight: 800,
      letterSpacing: 2.2,
    }}
  >
    <span
      style={{
        width: 14,
        height: 14,
        borderRadius: 5,
        background: color,
        boxShadow: `0 0 18px ${color}`,
      }}
    />
    LEVELUP · {label}
  </div>
);

export const UrlFooter: React.FC<{ dark?: boolean }> = ({ dark = true }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 40,
      zIndex: 25,
      textAlign: "center",
      color: dark ? "rgba(255,255,255,0.72)" : "rgba(18,35,63,0.64)",
      fontFamily: outfit,
      fontSize: 20,
      fontWeight: 700,
      letterSpacing: 1.4,
    }}
  >
    leveluprewards.app
  </div>
);

export const FlashFX: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const beamX = interpolate(frame, [0, 330], [-width * 0.45, width * 1.35], clamp);
  const pulse = 0.72 + Math.sin(frame * 0.16) * 0.16;
  const liveIn = interpolate(frame, [78, 112, 238, 260], [0, 1, 1, 0], clamp);
  const particles = [
    [14, 22, 16],
    [82, 31, 11],
    [68, 74, 13],
    [24, 82, 10],
  ] as const;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 25,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: beamX,
          top: -height * 0.25,
          width: width > height ? 280 : 190,
          height: height * 1.5,
          transform: "rotate(17deg)",
          opacity: 0.11,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          filter: `blur(22px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -width * 0.18,
          top: height * 0.18,
          width: width * 0.62,
          height: width * 0.62,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color} 0%, transparent 68%)`,
          opacity: 0.1 * pulse,
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: width > height ? 760 : 68,
          top: width > height ? 190 : 210,
          color,
          opacity: liveIn * 0.07,
          fontFamily: outfit,
          fontSize: width > height ? 150 : 132,
          fontWeight: 800,
          letterSpacing: -5,
          lineHeight: 0.9,
        }}
      >
        LEVELUP
      </div>
      <div
        style={{
          position: "absolute",
          right: width > height ? 150 : 70,
          top: width > height ? 86 : 150,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 16px",
          borderRadius: 999,
          color,
          border: `1.5px solid ${color}`,
          background: "rgba(255,255,255,0.08)",
          fontFamily: outfit,
          fontSize: 16,
          fontWeight: 800,
          letterSpacing: 2,
          opacity: liveIn * 0.82,
          transform: `translateY(${(1 - liveIn) * 18}px)`,
        }}
      >
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 14px ${color}`,
          }}
        />
        LIVE VIEW
      </div>
      {particles.map(([left, top, size], index) => (
        <div
          key={`${left}-${top}`}
          style={{
            position: "absolute",
            left: `${left}%`,
            top: `${top}%`,
            width: size,
            height: size,
            borderRadius: index % 2 === 0 ? "50%" : 3,
            background: color,
            opacity: 0.32 + Math.sin(frame * 0.12 + index) * 0.16,
            transform: `translateY(${Math.sin(frame * 0.09 + index) * 22}px) scale(${pulse})`,
            boxShadow: `0 0 18px ${color}`,
          }}
        />
      ))}
    </div>
  );
};

export const FeatureChips: React.FC<{
  items: readonly string[];
  color: string;
  dark?: boolean;
}> = ({ items, color, dark = true }) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [90, 118], [0, 1], {
    ...clamp,
    easing: quickEase,
  });
  const foreground = dark ? "#ffffff" : "#12233f";

  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: 1360,
        zIndex: 12,
        display: "flex",
        justifyContent: "center",
        gap: 14,
        opacity: enter,
        transform: `translateY(${(1 - enter) * 26}px)`,
      }}
    >
      {items.map((item) => (
        <div
          key={item}
          style={{
            flex: 1,
            minHeight: 66,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 12px",
            borderRadius: 16,
            textAlign: "center",
            color: foreground,
            background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.72)",
            border: `1.5px solid ${color}`,
            fontFamily: outfit,
            fontSize: items.length > 2 ? 17 : 19,
            fontWeight: 800,
            letterSpacing: 1.2,
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
};

export const ClosingPanel: React.FC<{
  data: PillarQuickPromoData;
  progress: number;
  background: string;
  foreground: string;
  muted: string;
}> = ({ data, progress, background, foreground, muted }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      zIndex: 30,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      padding: "0 86px",
      textAlign: "center",
      color: foreground,
      background,
      opacity: progress,
      transform: `translateY(${(1 - progress) * 70}px)`,
    }}
  >
    <div
      style={{
        fontFamily: outfit,
        fontSize: 22,
        fontWeight: 800,
        letterSpacing: 5,
        color: data.closingAccent,
      }}
    >
      LEVELUP · {data.pillarLabel}
    </div>
    <div
      style={{
        marginTop: 40,
        fontFamily: outfit,
        fontSize: 96,
        fontWeight: 800,
        lineHeight: 0.96,
        letterSpacing: -3,
      }}
    >
      {data.promise}
    </div>
    <div
      style={{
        marginTop: 42,
        padding: "18px 28px",
        borderRadius: 999,
        background: data.closingAccent,
        color: data.buttonTextColor,
        fontFamily: outfit,
        fontSize: 24,
        fontWeight: 800,
        letterSpacing: 1.6,
      }}
    >
      {data.cta}
    </div>
    <div
      style={{
        marginTop: 36,
        fontFamily: outfit,
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: 1.3,
        color: muted,
      }}
    >
      {data.styleLabel.toUpperCase()} · leveluprewards.app
    </div>
  </div>
);

export const QuickMedia: React.FC<{
  src: string;
  type: "video" | "image";
  fit?: "cover" | "contain";
  position?: string;
}> = ({ src, type, fit = "cover", position = "center" }) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 260], [1.015, 1.075], clamp);
  const style: React.CSSProperties = {
    ...mediaBaseStyle,
    objectFit: fit,
    objectPosition: position,
    transform: type === "image" ? `scale(${zoom})` : undefined,
  };

  return type === "video" ? (
    <Video src={staticFile(src)} muted loop style={style} />
  ) : (
    <Img src={staticFile(src)} style={style} />
  );
};

const mediaBaseStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "block",
};
