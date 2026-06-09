import React from "react";
import {
  AbsoluteFill,
  Sequence,
  Series,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { LandscapeBrowser } from "./landscapeShared";
import { PromoClipVideo } from "./PromoClipVideo";
import { jakarta, outfit } from "./shared";
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
  const isPortrait = height > width;

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

  const leftColumnX = isPortrait ? width * 0.5 : width * 0.13;
  const logoCenterX = interpolate(
    slideProgress,
    [0, 1],
    [width * 0.5, leftColumnX],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const logoCenterY = isPortrait
    ? interpolate(slideProgress, [0, 1], [height * 0.43, 230], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : height * 0.5;
  const logoScale = interpolate(
    slideProgress,
    [0, 1],
    [variant === "cinematic" ? 1.55 : 3.2, isPortrait ? 0.95 : 1],
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
  const panelScale = interpolate(slideProgress, [0.34, 0.88], [0.94, 1], {
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
  const wordBurstProgress = spring({
    fps,
    frame: frame - 158,
    durationInFrames: 34,
    config: { damping: 15, stiffness: 92 },
  });
  const wordBurstOpacity = interpolate(frame, [154, 170, 218, 224], [0, 1, 1, 0], {
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

      {variant !== "cinematic" && (
        <div
          style={{
            position: "absolute",
            left: 72,
            top: logoCenterY + 96,
            width: width * 0.32,
            padding: "26px 30px",
            borderRadius: 22,
            background:
              "linear-gradient(135deg, rgba(12,10,26,0.78), rgba(20,20,46,0.42))",
            border: "1px solid rgba(76,201,240,0.16)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
            transform: `translateY(${copyLift}px) scale(${panelScale})`,
            transformOrigin: "left top",
            opacity: copyOpacity * titleIn,
            zIndex: 11,
            textAlign: "left",
          }}
        >
          <p
            style={{
              fontFamily: outfit,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: BRAND.cyan,
              margin: 0,
            }}
          >
            {eyebrow}
          </p>
          <h2
            style={{
              fontFamily: outfit,
              fontSize: 42,
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: 0,
              color: "white",
              margin: "14px 0 0",
            }}
          >
            Rewards, recognition, and motivation in one flow.
          </h2>
          <p
            style={{
              fontFamily: jakarta,
              fontSize: 20,
              fontWeight: 700,
              lineHeight: 1.35,
              color: BRAND.textMuted,
              marginTop: 16,
              marginBottom: 0,
            }}
          >
            {beat.tagline}
          </p>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          right: isPortrait ? "auto" : variant === "cinematic" ? 48 : 40,
          left: isPortrait ? 54 : "auto",
          top: isPortrait ? 450 : "50%",
          width: isPortrait ? width - 108 : "auto",
          transform: isPortrait
            ? `scale(${browserScale * 0.68})`
            : `translateY(-50%) scale(${browserScale})`,
          opacity: browserOpacity,
          transformOrigin: isPortrait ? "top left" : "center center",
          zIndex: 10,
        }}
      >
        <LandscapeBrowser scale={1} rotateY={-3} kenBurn={1.02}>
          <Sequence
            from={INTRO_LOGO_ONLY_FRAMES}
            durationInFrames={previewDuration}
          >
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
          </Sequence>
        </LandscapeBrowser>
      </div>

      {variant === "cinematic" && (
        <div
          style={{
            position: "absolute",
            left: 72,
            right: 72,
            bottom: isPortrait ? 110 : 78,
            zIndex: 18,
            display: "grid",
            gridTemplateColumns: isPortrait ? "1fr" : "repeat(3, 1fr)",
            gap: isPortrait ? 18 : 28,
            opacity: wordBurstOpacity,
            transform: `translateY(${interpolate(wordBurstProgress, [0, 1], [40, 0])}px)`,
          }}
        >
          {[
            { label: "Scan in", detail: "students start fast", color: "#4cc9f0" },
            { label: "Earn points", detail: "motivation shows up", color: "#f5c842" },
            { label: "Pick prizes", detail: "rewards become real", color: "#52e875" },
          ].map((item, i) => {
            const pop = spring({
              fps,
              frame: frame - 158 - i * 8,
              durationInFrames: 28,
              config: { damping: 12, stiffness: 150 },
            });
            return (
              <div
                key={item.label}
                style={{
                  minHeight: isPortrait ? 112 : 124,
                  borderRadius: 24,
                  border: `2px solid ${item.color}77`,
                  background: `linear-gradient(135deg, rgba(10,22,40,0.86), ${item.color}24)`,
                  boxShadow: `0 26px 80px rgba(0,0,0,0.34), 0 0 42px ${item.color}44`,
                  padding: isPortrait ? "22px 28px" : "24px 28px",
                  transform: `scale(${interpolate(pop, [0, 1], [0.82, 1])})`,
                  transformOrigin: "center center",
                }}
              >
                <div
                  style={{
                    fontFamily: outfit,
                    fontSize: isPortrait ? 48 : 44,
                    lineHeight: 1,
                    fontWeight: 900,
                    letterSpacing: 0,
                    color: "#f0f4ff",
                    textTransform: "uppercase",
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontFamily: jakarta,
                    fontSize: isPortrait ? 16 : 18,
                    fontWeight: 800,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: item.color,
                    marginTop: 12,
                  }}
                >
                  {item.detail}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};
