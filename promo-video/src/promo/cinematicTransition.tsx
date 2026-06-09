import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { CINEMATIC } from "./cinematicTheme";

export const CinematicTransition: React.FC<{
  atFrame: number;
  duration?: number;
  type?: "slide" | "fade" | "wipe";
}> = ({ atFrame, duration = 24, type = "slide" }) => {
  const globalFrame = useCurrentFrame();
  const relativeFrame = globalFrame - atFrame;

  if (relativeFrame < 0 || relativeFrame >= duration) {
    return null;
  }

  const progress = relativeFrame / duration;

  if (type === "slide") {
    const slidePos = interpolate(progress, [0, 0.5, 1], [-100, 0, 100], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const bandOpacity = interpolate(progress, [0, 0.2, 0.8, 1], [0, 1, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });
    return (
      <AbsoluteFill style={{ zIndex: 9999, pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${slidePos}%`,
            width: "100%",
            opacity: bandOpacity,
            background: `linear-gradient(90deg, transparent 0%, ${CINEMATIC.cyan}22 18%, ${CINEMATIC.gold}cc 42%, ${CINEMATIC.offWhite}ee 50%, ${CINEMATIC.cyan}bb 58%, ${CINEMATIC.gold}22 82%, transparent 100%)`,
            boxShadow: `0 0 120px ${CINEMATIC.cyan}66`,
            mixBlendMode: "screen",
          }}
        />
      </AbsoluteFill>
    );
  }

  if (type === "wipe") {
    const radius = interpolate(progress, [0, 0.55, 1], [0, 78, 145], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });
    const glowOpacity = interpolate(progress, [0, 0.2, 0.75, 1], [0, 0.9, 0.75, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <AbsoluteFill style={{ zIndex: 9999, pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: glowOpacity,
            background: `radial-gradient(circle at 50% 50%, ${CINEMATIC.offWhite}f2 0%, ${CINEMATIC.gold}cc ${Math.max(radius - 10, 0)}%, ${CINEMATIC.cyan}88 ${radius}%, transparent ${radius + 16}%)`,
            mixBlendMode: "screen",
          }}
        />
      </AbsoluteFill>
    );
  }

  const opacity = interpolate(progress, [0, 0.45, 1], [0, 0.52, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  return (
    <AbsoluteFill
      style={{
        zIndex: 9999,
        background: `linear-gradient(135deg, ${CINEMATIC.offWhite}, ${CINEMATIC.gold} 45%, ${CINEMATIC.cyan})`,
        opacity,
        pointerEvents: "none",
      }}
    />
  );
};
