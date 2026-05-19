import React from "react";
import { AbsoluteFill, Sequence, Video, staticFile, useVideoConfig, spring, useCurrentFrame, interpolate } from "remotion";
import {
  MY_COMP_BANNERS,
  MY_COMP_INTRO_END,
  MY_COMP_MONTAGE,
  MY_COMP_MONTAGE_DURATION,
  MY_COMP_OUTRO_START,
  MY_COMP_TOTAL,
  myCompSegmentLabel,
} from "./promo/myCompTiming";

const FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;600;700;800&display=swap');
  
  .font-outfit {
    font-family: 'Outfit', -apple-system, sans-serif;
  }
  
  .font-jakarta {
    font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
  }

  .text-glow-pink {
    text-shadow: 0 0 20px rgba(255, 0, 127, 0.4), 0 0 40px rgba(255, 0, 127, 0.2);
  }

  .text-glow-cyan {
    text-shadow: 0 0 20px rgba(76, 201, 240, 0.4), 0 0 40px rgba(76, 201, 240, 0.2);
  }

  .gradient-text-pink-purple {
    background: linear-gradient(135deg, #ff007f 0%, #7f00ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .gradient-text-cyan-blue {
    background: linear-gradient(135deg, #4cc9f0 0%, #4895ef 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .glass-card {
    background: rgba(18, 17, 36, 0.8);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
`;

export const MyComposition = () => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();

  const INTRO_END = MY_COMP_INTRO_END;
  const OUTRO_START = MY_COMP_OUTRO_START;

  // --- Intro Sequence Animations (0s - 4s) ---
  const introScale = spring({ 
    fps, 
    frame, 
    config: { damping: 13, stiffness: 100 } 
  });
  
  const introSubOpacity = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const introSubTranslate = interpolate(frame, [25, 45], [30, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Floating background circles for Intro
  const circle1X = interpolate(frame, [0, MY_COMP_TOTAL], [-200, 200]);
  const circle2Y = interpolate(frame, [0, MY_COMP_TOTAL], [height + 200, -200]);

  // --- Walkthrough Sequence Entrance Animations (4s - 24s) ---
  const walkthroughFrame = frame - INTRO_END;
  
  const walkthroughEntrance = spring({
    fps,
    frame: walkthroughFrame,
    config: { damping: 16, stiffness: 85 }
  });

  const cardY = interpolate(walkthroughEntrance, [0, 1], [400, 0]);
  const cardScale = interpolate(walkthroughEntrance, [0, 1], [0.75, 1]);

  // Cinematic rotation breathing animation
  const cardRotateX = interpolate(walkthroughFrame, [0, MY_COMP_MONTAGE_DURATION], [8, 4], {
    extrapolateRight: "clamp",
  });
  const cardRotateY = interpolate(walkthroughFrame, [0, MY_COMP_MONTAGE_DURATION], [-6, -2], {
    extrapolateRight: "clamp",
  });
  const cardRotateZ = interpolate(walkthroughFrame, [0, MY_COMP_MONTAGE_DURATION], [2, 0], {
    extrapolateRight: "clamp",
  });

  const montageClips = Object.values(MY_COMP_MONTAGE);

  // --- Outro Sequence Animations (24s - 30s) ---
  const outroFrame = frame - OUTRO_START;
  const outroScale = spring({
    fps,
    frame: outroFrame,
    config: { damping: 13, stiffness: 80 }
  });

  const outroButtonPulse = interpolate(Math.sin(outroFrame * 0.08), [-1, 1], [1, 1.04]);
  const outroOpacity = interpolate(frame, [OUTRO_START, OUTRO_START + 25], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#04030a", color: "white", overflow: "hidden" }}>
      <style>{FONT_STYLE}</style>

      {/* BACKGROUND GRADIENTS */}
      <div 
        style={{
          position: "absolute",
          top: "-5%",
          left: "-20%",
          width: "140%",
          height: "60%",
          background: "radial-gradient(ellipse at center, rgba(127, 0, 255, 0.22) 0%, rgba(0,0,0,0) 70%)",
          filter: "blur(60px)",
          pointerEvents: "none"
        }}
      />
      <div 
        style={{
          position: "absolute",
          top: circle2Y - 300,
          left: circle1X - 300,
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255, 0, 127, 0.16) 0%, rgba(0,0,0,0) 75%)",
          filter: "blur(70px)",
          pointerEvents: "none"
        }}
      />

      {/* HEADER BANNER */}
      {frame >= INTRO_END && frame < OUTRO_START && (
        <div
          style={{
            position: "absolute",
            top: "140px",
            left: 0,
            width: "100%",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 10
          }}
        >
          <span 
            className="font-outfit"
            style={{
              background: "rgba(255, 0, 127, 0.15)",
              border: "1px solid rgba(255, 0, 127, 0.3)",
              color: "#ff007f",
              padding: "8px 24px",
              borderRadius: "40px",
              fontSize: "20px",
              fontWeight: 700,
              letterSpacing: "2px",
              textTransform: "uppercase"
            }}
          >
            LevelUp Rewards
          </span>
          <h2 
            className="font-outfit text-glow-cyan gradient-text-cyan-blue"
            style={{ 
              fontSize: "64px", 
              fontWeight: 800, 
              margin: "20px 0 0 0",
              letterSpacing: "-1.5px"
            }}
          >
            {myCompSegmentLabel(frame)}
          </h2>
        </div>
      )}

      {/* SEQUENCE 1: Portrait Intro (0s - 4s) */}
      <Sequence from={0} durationInFrames={INTRO_END}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", zIndex: 20, padding: "0 60px" }}>
          <div style={{ textAlign: "center" }}>
            <h1 
              className="font-outfit text-glow-pink gradient-text-pink-purple"
              style={{ 
                fontSize: "110px", 
                fontWeight: 800, 
                margin: 0,
                lineHeight: "1.0",
                letterSpacing: "-3px",
                transform: `scale(${introScale})`
              }}
            >
              LevelUp<br/>EDU
            </h1>
            <h2 
              className="font-jakarta text-glow-cyan"
              style={{ 
                fontSize: "38px", 
                fontWeight: 600,
                color: "#4cc9f0", 
                marginTop: "32px",
                lineHeight: "1.3",
                opacity: introSubOpacity,
                transform: `translateY(${introSubTranslate}px)`
              }}
            >
              Empower Student<br/>Success
            </h2>
            <div
              style={{
                width: "120px",
                height: "6px",
                background: "linear-gradient(90deg, #ff007f, #7f00ff)",
                borderRadius: "3px",
                margin: "48px auto 0 auto",
                opacity: introSubOpacity
              }}
            />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* SEQUENCE 2: Cinematic Portrait Showcase with Separate Physical Video Files (4s - 24s) */}
      <Sequence from={INTRO_END} durationInFrames={OUTRO_START - INTRO_END}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 40px" }}>
          
          {/* Main Showcase App Card */}
          <div
            style={{
              width: "1000px",
              height: "560px",
              transform: `scale(${cardScale}) translateY(${cardY}px) perspective(1500px) rotateX(${cardRotateX}deg) rotateY(${cardRotateY}deg) rotateZ(${cardRotateZ}deg)`,
              boxShadow: "0 40px 100px -15px rgba(0, 0, 0, 0.8), 0 0 50px rgba(127, 0, 255, 0.25)",
              borderRadius: "28px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              background: "#0c0a1a",
              overflow: "hidden",
              position: "relative",
              display: "flex",
              flexDirection: "column"
            }}
          >
            {/* Mockup Browser Window Header */}
            <div
              style={{
                height: "50px",
                background: "#121124",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                alignItems: "center",
                padding: "0 24px",
                justifyContent: "space-between",
                flexShrink: 0
              }}
            >
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: "#ff5f56" }} />
                <div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: "#ffbd2e" }} />
                <div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: "#27c93f" }} />
              </div>
              <div 
                className="font-jakarta"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.3)",
                  fontSize: "16px",
                  color: "#a0aec0",
                  padding: "6px 40px",
                  borderRadius: "10px",
                  width: "520px",
                  textAlign: "center",
                  border: "1px solid rgba(255, 255, 255, 0.06)"
                }}
              >
                portal.leveluprewards.app
              </div>
              <div style={{ width: "62px" }} />
            </div>

            <div style={{ flex: 1, position: "relative", backgroundColor: "#000" }}>
              {montageClips.map((clip) => (
                <Sequence key={clip.src} from={clip.from} durationInFrames={clip.duration}>
                  <Video
                    src={staticFile(clip.src)}
                    playbackRate={clip.playbackRate}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    volume={0}
                    muted
                  />
                </Sequence>
              ))}
            </div>
          </div>


          {MY_COMP_BANNERS.map((banner) => {
            if (frame < banner.globalStart || frame >= banner.globalEnd) return null;
            const progress = spring({
              fps,
              frame: frame - banner.globalStart,
              config: { damping: 12 },
            });
            const opacity = interpolate(
              frame,
              [banner.globalStart, banner.globalStart + 12, banner.globalEnd - 12, banner.globalEnd],
              [0, 1, 1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            return (
              <div
                key={banner.id}
                className="font-outfit glass-card"
                style={{
                  position: "absolute",
                  bottom: "220px",
                  width: "900px",
                  padding: "36px 48px",
                  borderRadius: "32px",
                  border: `1px solid ${banner.borderColor}`,
                  boxShadow: "0 30px 60px rgba(0, 0, 0, 0.5)",
                  opacity,
                  transform: `scale(${progress}) translateY(${interpolate(progress, [0, 1], [50, 0])}px)`,
                  zIndex: 30,
                }}
              >
                <div style={{ display: "flex", gap: "28px", alignItems: "center" }}>
                  <div style={{ fontSize: "64px" }}>{banner.emoji}</div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "40px", color: banner.color, fontWeight: 800 }}>
                      {banner.title}
                    </h3>
                    <p
                      className="font-jakarta"
                      style={{ margin: "10px 0 0 0", fontSize: "24px", color: "#e2e8f0", lineHeight: "1.5" }}
                    >
                      {banner.body}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

        </AbsoluteFill>
      </Sequence>

      {/* SEQUENCE 3: Portrait Outro CTA (24s - 30s) */}
      <Sequence from={OUTRO_START} durationInFrames={MY_COMP_TOTAL - OUTRO_START}>
        <AbsoluteFill 
          style={{ 
            justifyContent: "center", 
            alignItems: "center", 
            backgroundColor: "#06050e",
            opacity: outroOpacity,
            zIndex: 40,
            padding: "0 60px"
          }}
        >
          <div style={{ textAlign: "center" }}>
            <h1 
              className="font-outfit text-glow-pink gradient-text-pink-purple"
              style={{ 
                fontSize: "80px", 
                fontWeight: 800, 
                margin: 0,
                lineHeight: "1.1",
                letterSpacing: "-2.5px",
                transform: `scale(${outroScale})`
              }}
            >
              Transform Your<br/>Classroom
            </h1>
            
            <p 
              className="font-jakarta" 
              style={{ 
                fontSize: "28px", 
                color: "#cbd5e0", 
                marginTop: "32px", 
                marginBottom: "80px",
                lineHeight: "1.4"
              }}
            >
              Motivate. Reward. Elevate.
            </p>

            {/* Glowing CTA Button */}
            <div
              className="font-outfit"
              style={{
                display: "inline-block",
                padding: "24px 64px",
                borderRadius: "50px",
                background: "linear-gradient(135deg, #ff007f 0%, #7f00ff 100%)",
                boxShadow: "0 15px 40px rgba(255, 0, 127, 0.45), 0 0 25px rgba(127, 0, 255, 0.35)",
                fontSize: "36px",
                fontWeight: 700,
                color: "white",
                letterSpacing: "-0.5px",
                transform: `scale(${outroScale * outroButtonPulse})`,
                transition: "transform 0.1s ease-in-out"
              }}
            >
              leveluprewards.app
            </div>

            <p 
              className="font-jakarta"
              style={{ 
                fontSize: "18px", 
                color: "#5f6c80", 
                marginTop: "80px" 
              }}
            >
              Created programmatically with Remotion Studio
            </p>
          </div>
        </AbsoluteFill>
      </Sequence>

    </AbsoluteFill>
  );
};
