import React from "react";
import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { PromoVariantConfig } from "./promo/promoVariants";
import {
  FeatureCallout,
  jakarta,
  outfit,
  PromoBackground,
  PromoIntro,
  PromoOutro,
} from "./promo/shared";
import { BRAND } from "./promo/theme";

const scaleForLayout = (width: number, height: number, layout: "portrait" | "square") => {
  if (layout === "square") {
    return {
      chromeW: 880,
      chromeH: 420,
      chromeMarginTop: 24,
      labelTop: 72,
      calloutBottom: 120,
      calloutWidth: 820,
      titleSize: 42,
      introTitleSize: 88,
      introSubtitleSize: 28,
    };
  }
  const compact = height < 1400;
  return {
    chromeW: compact ? 920 : 1008,
    chromeH: compact ? 520 : 580,
    chromeMarginTop: compact ? 48 : 80,
    labelTop: compact ? 100 : 120,
    calloutBottom: compact ? 160 : 200,
    calloutWidth: compact ? 860 : 920,
    titleSize: 52,
    introTitleSize: 108,
    introSubtitleSize: 36,
  };
};

const VariantIntro: React.FC<{
  titleSize: number;
  subtitleSize: number;
}> = ({ titleSize, subtitleSize }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleScale = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 110 },
  });
  const subtitleOpacity = interpolate(frame, [12, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: "0 48px",
      }}
    >
      <div style={{ textAlign: "center", zIndex: 2 }}>
        <p
          style={{
            fontFamily: outfit,
            fontSize: Math.round(subtitleSize * 0.65),
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: BRAND.cyan,
            margin: 0,
            opacity: subtitleOpacity,
          }}
        >
          School Rewards System
        </p>
        <h1
          style={{
            fontFamily: outfit,
            fontSize: titleSize,
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: -2,
            margin: "16px 0 0",
            transform: `scale(${titleScale})`,
            background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.purple})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          LevelUp
        </h1>
        <p
          style={{
            fontFamily: jakarta,
            fontSize: subtitleSize,
            fontWeight: 600,
            color: BRAND.textMuted,
            marginTop: 20,
            opacity: subtitleOpacity,
          }}
        >
          Motivate. Reward. Elevate.
        </p>
      </div>
    </AbsoluteFill>
  );
};

const DemoScene: React.FC<{
  variant: PromoVariantConfig;
  introEnd: number;
}> = ({ variant, introEnd }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const globalFrame = frame + introEnd;
  const layout = scaleForLayout(width, height, variant.layout);

  const entrance = spring({
    fps,
    frame,
    config: { damping: 16, stiffness: 88 },
  });
  const cardY = interpolate(entrance, [0, 1], [280, 0]);
  const cardScale = interpolate(entrance, [0, 1], [0.84, 1]);
  const tiltX = interpolate(frame, [0, variant.timing.demoEnd - introEnd], [8, 3], {
    extrapolateRight: "clamp",
  });
  const tiltY = interpolate(frame, [0, variant.timing.demoEnd - introEnd], [-6, -2], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: variant.layout === "square" ? "0 24px" : "0 36px",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: layout.labelTop,
          width: "100%",
          textAlign: "center",
          zIndex: 5,
        }}
      >
        <span
          style={{
            fontFamily: outfit,
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: BRAND.pink,
            background: "rgba(255, 0, 127, 0.12)",
            border: "1px solid rgba(255, 0, 127, 0.35)",
            padding: "6px 18px",
            borderRadius: 40,
          }}
        >
          {variant.demoLabel}
        </span>
      </div>

      <div
        style={{
          width: layout.chromeW,
          height: layout.chromeH,
          marginTop: layout.chromeMarginTop,
          borderRadius: 24,
          border: "1px solid rgba(255, 255, 255, 0.12)",
          background: "#0c0a1a",
          overflow: "hidden",
          boxShadow:
            "0 32px 80px -15px rgba(0, 0, 0, 0.85), 0 0 40px rgba(127, 0, 255, 0.2)",
          transform: `scale(${cardScale}) translateY(${cardY}px) perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            height: 40,
            background: "#121124",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: 8,
          }}
        >
          {["#ff5f56", "#ffbd2e", "#27c93f"].map((color) => (
            <div
              key={color}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: color,
              }}
            />
          ))}
          <div
            style={{
              flex: 1,
              marginLeft: 8,
              textAlign: "center",
              fontFamily: jakarta,
              fontSize: 12,
              color: "#94a3b8",
              background: "rgba(0,0,0,0.35)",
              borderRadius: 6,
              padding: "4px 0",
            }}
          >
            portal.leveluprewards.app
          </div>
        </div>
        <Video
          src={staticFile(variant.walkthroughSrc)}
          playbackRate={variant.playbackRate}
          muted
          objectFit="cover"
          style={{ flex: 1, width: "100%", height: "100%" }}
        />
      </div>

      {variant.features.map((feature) => (
        <FeatureCallout
          key={feature.title}
          callout={feature}
          globalFrame={globalFrame}
        />
      ))}
    </AbsoluteFill>
  );
};

export const PortraitWalkthroughPromo: React.FC<{
  variant: PromoVariantConfig;
}> = ({ variant }) => {
  const { introEnd, demoEnd, total } = variant.timing;
  const { width, height } = useVideoConfig();
  const layout = scaleForLayout(width, height, variant.layout);
  const useCompactIntro = variant.features.length === 0;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg, color: "white" }}>
      <PromoBackground totalFrames={total} />
      <Sequence durationInFrames={introEnd}>
        {useCompactIntro ? (
          <VariantIntro
            titleSize={layout.introTitleSize}
            subtitleSize={layout.introSubtitleSize}
          />
        ) : (
          <PromoIntro />
        )}
      </Sequence>
      <Sequence from={introEnd} durationInFrames={demoEnd - introEnd}>
        <DemoScene variant={variant} introEnd={introEnd} />
      </Sequence>
      <Sequence from={demoEnd} durationInFrames={total - demoEnd}>
        <PromoOutro />
      </Sequence>
    </AbsoluteFill>
  );
};
