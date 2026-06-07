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
    return (
      <AbsoluteFill style={{ zIndex: 9999, pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${slidePos}%`,
            width: "100%",
            background: `linear-gradient(90deg, transparent, ${CINEMATIC.gold}66 15%, ${CINEMATIC.navy} 35%, ${CINEMATIC.navy} 65%, ${CINEMATIC.cyan}66 85%, transparent)`,
            boxShadow: "0 0 120px rgba(0,0,0,0.9)",
          }}
        />
      </AbsoluteFill>
    );
  }

  if (type === "wipe") {
    const radius = interpolate(progress, [0, 0.5, 1], [120, 0, 120], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <AbsoluteFill style={{ zIndex: 9999, pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: CINEMATIC.navy,
            clipPath: `circle(${radius}% at 50% 50%)`,
          }}
        />
      </AbsoluteFill>
    );
  }

  const opacity = interpolate(progress, [0, 0.5, 1], [0, 0.55, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  return (
    <AbsoluteFill
      style={{
        zIndex: 9999,
        backgroundColor: CINEMATIC.navy,
        opacity,
        pointerEvents: "none",
      }}
    />
  );
};
