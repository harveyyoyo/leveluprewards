import React from "react";
import { loadFont } from "@remotion/google-fonts/DMSerifDisplay";
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

const dmSerif = loadFont("normal", {
  weights: ["400"],
  subsets: ["latin"],
}).fontFamily;
const data = PILLAR_QUICK_PROMOS.library;

export const LibraryStyle: React.FC = () => {
  const { frame, hookOpacity, hookY, mediaIn, closeIn } =
    usePillarSceneMotion();
  const storyIn = interpolate(frame, [105, 138], [0, 1], {
    ...clamp,
    easing: quickEase,
  });
  const pageTurn = interpolate(frame, [54, 255], [-9, 2], {
    ...clamp,
    easing: quickEase,
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        color: "#3f2b18",
        background:
          "radial-gradient(circle at 82% 16%, rgba(255,255,255,0.9), transparent 30%), linear-gradient(145deg, #f7e8c8 0%, #ead0a0 52%, #fff8e8 100%)",
        fontFamily: jakarta,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 36,
          background: "linear-gradient(180deg, #7c3f13, #c47b18, #8b4b17)",
          boxShadow: "10px 0 30px rgba(94,50,18,0.22)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.16,
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0, transparent 7px, rgba(85,53,28,0.08) 8px)",
        }}
      />
      <BrandPill label={data.pillarLabel} color={data.color} dark={false} />
      <div
        style={{
          position: "absolute",
          left: 78,
          right: 66,
          top: 262,
          zIndex: 5,
          opacity: hookOpacity,
          transform: `translateY(${hookY}px)`,
        }}
      >
        <div
          style={{
            color: data.color,
            fontFamily: outfit,
            fontSize: 23,
            fontWeight: 800,
            letterSpacing: 4.2,
          }}
        >
          WHERE READING BECOMES A ROUTINE
        </div>
        <h1
          style={{
            margin: "30px 0 0",
            fontFamily: dmSerif,
            fontSize: 148,
            fontWeight: 400,
            lineHeight: 0.82,
            letterSpacing: -3.5,
          }}
        >
          {data.hook.map((line, index) => (
            <div
              key={line}
              style={{
                color: index === data.hook.length - 1 ? data.color : "#3f2b18",
                fontStyle: index === data.hook.length - 1 ? "italic" : "normal",
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
          left: 72,
          top: 655,
          width: 936,
          height: 600,
          zIndex: 8,
          overflow: "hidden",
          borderRadius: "12px 44px 12px 44px",
          border: "4px solid rgba(124,63,19,0.34)",
          background: "#fffaf0",
          boxShadow: "26px 28px 0 rgba(124,63,19,0.13), 0 36px 80px rgba(94,50,18,0.22)",
          opacity: mediaIn,
          transform: `perspective(1200px) translateY(${(1 - mediaIn) * 90}px) rotateY(${pageTurn}deg) scale(${0.92 + mediaIn * 0.08})`,
          transformOrigin: "left center",
        }}
      >
        <QuickMedia src={data.media} type={data.mediaType} />
        <div
          style={{
            position: "absolute",
            right: 24,
            bottom: 22,
            padding: "14px 20px",
            borderRadius: 14,
            background: "rgba(255,250,240,0.94)",
            border: "2px solid #c47b18",
            color: "#7c3f13",
            fontFamily: outfit,
            fontSize: 19,
            fontWeight: 800,
            letterSpacing: 1.4,
            boxShadow: "0 12px 26px rgba(67,40,19,0.18)",
            opacity: storyIn,
            transform: `translateY(${(1 - storyIn) * 20}px)`,
          }}
        >
          BORROW · RETURN · REWARD
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 88,
          right: 88,
          top: 1280,
          zIndex: 10,
          color: "#6a4a2b",
          textAlign: "center",
          fontFamily: dmSerif,
          fontSize: 32,
          fontStyle: "italic",
          opacity: storyIn,
        }}
      >
        Every checkout becomes part of the reading story.
      </div>
      <FeatureChips items={data.features} color={data.color} dark={false} />
      <UrlFooter dark={false} />
      <ClosingPanel
        data={data}
        progress={closeIn}
        background="linear-gradient(150deg, #5a2d10 0%, #9a5a17 52%, #d79a32 100%)"
        foreground="#fffaf0"
        muted="rgba(255,250,240,0.78)"
      />
    </div>
  );
};
