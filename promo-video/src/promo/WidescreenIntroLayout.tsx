import React from "react";
import {
  AbsoluteFill,
  Series,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { LandscapeBrowser } from "./landscapeShared";
import { PromoClipVideo } from "./PromoClipVideo";
import { outfit } from "./shared";
import { BRAND } from "./theme";
import {
  INTRO_LOGO_ONLY_FRAMES,
  WIDESCREEN_BEATS,
} from "./widescreenBeatCatalog";

type Props = {
  eyebrow: string;
  durationFrames: number;
  /** "widescreen" = gradient LevelUp wordmark; "cinematic" = animated logo slot */
  variant?: "widescreen" | "cinematic";
  logo?: React.ReactNode;
};

/** Frames for logo to travel from center fullscreen to the left column. */
const LOGO_SLIDE_FRAMES = 42;

export const WidescreenIntroLayout: React.FC<Props> = ({
  eyebrow,
  durationFrames,
  variant = "widescreen",
  logo,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const beat = WIDESCREEN_BEATS.intro;

  const titleIn = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const slideProgress = spring({
    fps,
    frame: frame - INTRO_LOGO_ONLY_FRAMES,
    durationInFrames: LOGO_SLIDE_FRAMES,
    config: { damping: 26, stiffness: 68, mass: 1.05 },
  });

  const leftColumnX = width * 0.13;
  const logoCenterX = interpolate(
    slideProgress,
    [0, 1],
    [width * 0.5, leftColumnX],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const logoCenterY = height * 0.5;
  const logoScale = interpolate(
    slideProgress,
    [0, 1],
    [variant === "cinematic" ? 1.55 : 3.2, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const copyOpacity = interpolate(slideProgress, [0.42, 0.88], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const copyLift = interpolate(slideProgress, [0.42, 0.88], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const previewIn = spring({
    fps,
    frame: frame - INTRO_LOGO_ONLY_FRAMES - 8,
    durationInFrames: LOGO_SLIDE_FRAMES + 6,
    config: { damping: 18, stiffness: 78 },
  });
  const browserOpacity = interpolate(previewIn, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const browserScale = interpolate(previewIn, [0, 1], [0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const previewDuration = Math.max(1, durationFrames - INTRO_LOGO_ONLY_FRAMES);
  const clipDur = Math.max(
    1,
    Math.floor(previewDuration / beat.clips.length),
  );

  const defaultLogo = (
    <h1
      style={{
        fontFamily: outfit,
        fontSize: 100,
        fontWeight: 800,
        lineHeight: 0.92,
        letterSpacing: -4,
        margin: 0,
        background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.purple}, ${BRAND.cyan})`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
    >
      LevelUp
    </h1>
  );

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: logoCenterX,
          top: logoCenterY,
          transform: `translate(-50%, -50%) scale(${logoScale * titleIn})`,
          opacity: titleIn,
          zIndex: 12,
          transformOrigin: "center center",
        }}
      >
        {logo ?? defaultLogo}
      </div>

      <div
        style={{
          position: "absolute",
          left: leftColumnX,
          top: logoCenterY + 88,
          width: width * 0.28,
          transform: `translateX(-50%) translateY(${copyLift}px)`,
          opacity: copyOpacity * titleIn,
          zIndex: 11,
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: outfit,
            fontSize: variant === "cinematic" ? 18 : 20,
            fontWeight: 700,
            letterSpacing: variant === "cinematic" ? 5 : 6,
            textTransform: "uppercase",
            color: variant === "cinematic" ? "#f5c842" : BRAND.cyan,
            margin: 0,
          }}
        >
          {eyebrow}
        </p>
        <p
          style={{
            fontFamily: outfit,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: beat.color,
            marginTop: 18,
            marginBottom: 0,
          }}
        >
          {beat.emoji} {beat.tagline}
        </p>
      </div>

      <div
        style={{
          position: "absolute",
          right: variant === "cinematic" ? 48 : 40,
          top: "50%",
          transform: `translateY(-50%) scale(${browserScale})`,
          opacity: browserOpacity,
          transformOrigin: "center center",
          zIndex: 10,
        }}
      >
        <LandscapeBrowser scale={1} rotateY={-3} kenBurn={1.02}>
          <Series>
            {beat.clips.map((c, i) => (
              <Series.Sequence
                key={i}
                durationInFrames={
                  i === beat.clips.length - 1
                    ? previewDuration - clipDur * (beat.clips.length - 1)
                    : clipDur
                }
              >
                <PromoClipVideo clip={c} />
              </Series.Sequence>
            ))}
          </Series>
        </LandscapeBrowser>
      </div>
    </AbsoluteFill>
  );
};
