import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, spring, interpolate, Audio, staticFile, OffthreadVideo } from "remotion";
import { CINEMATIC } from "./promo/cinematicTheme";
import { CinematicBg, GoldSparkles, BrowserMockup, LevelUpLogoAnimated, AchievementBadge, XPBar, FloatingPrizeCard, LetterReveal } from "./promo/cinematicComponents";
import { loadFont as loadOutfit } from "@remotion/google-fonts/Outfit";
import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";

const { fontFamily: outfit } = loadOutfit("normal", {
  weights: ["600", "700", "800"],
  subsets: ["latin"],
});
const { fontFamily: jakarta } = loadJakarta("normal", {
  weights: ["400", "600", "700"],
  subsets: ["latin"],
});

const INTRO_DURATION = 235; // fits intro.mp3 (227 frames)
const OUTRO_DURATION = 220; // fits outro.mp3 (210 frames)

import { CAPTURE_PATHS } from "./promo/captureLibraryPaths";

const FEATURES_LIST = [
  { id: "themes", title: "Custom Branding", video: CAPTURE_PATHS.adminBrandingTheme, audio: "voiceover/feature/epic/themes.mp3", emoji: "🎨", duration: 260 },
  { id: "houses", title: "House Points", video: CAPTURE_PATHS.adminHouses, audio: "voiceover/feature/epic/houses.mp3", emoji: "🏰", duration: 175 },
  { id: "library", title: "Prize Library", video: CAPTURE_PATHS.adminLibrary, audio: "voiceover/feature/epic/library.mp3", emoji: "🎁", duration: 140 },
  { id: "idCards", title: "Student ID Cards", video: CAPTURE_PATHS.adminIdCard, audio: "voiceover/feature/epic/idCards.mp3", emoji: "🪪", duration: 175 },
  { id: "portal", title: "Teacher Portal", video: CAPTURE_PATHS.teacherPortal, audio: "voiceover/feature/epic/portal.mp3", emoji: "👩‍🏫", duration: 165 },
  { id: "attendance", title: "Attendance Tracking", video: CAPTURE_PATHS.adminAttendance, audio: "voiceover/feature/epic/attendance.mp3", emoji: "✅", duration: 145 },
  { id: "badges", title: "Custom Badges", video: CAPTURE_PATHS.adminBadges, audio: "voiceover/feature/epic/badges.mp3", emoji: "🏅", duration: 145 },
  { id: "bulletin", title: "Bulletin Board", video: CAPTURE_PATHS.bulletinBoard, audio: "voiceover/feature/epic/bulletin.mp3", emoji: "📌", duration: 185 },
  { id: "hallOfFame", title: "Hall of Fame", video: CAPTURE_PATHS.hallOfFame, audio: "voiceover/feature/epic/hallOfFame.mp3", emoji: "🏆", duration: 215 },
  { id: "raffle", title: "Live Raffles", video: CAPTURE_PATHS.teacherRaffle, audio: "voiceover/feature/epic/raffle.mp3", emoji: "🎟️", duration: 175 },
  { id: "notifications", title: "Notifications", video: CAPTURE_PATHS.adminNotifications, audio: "voiceover/feature/epic/notifications.mp3", emoji: "🔔", duration: 185 },
  { id: "kiosk", title: "Student Kiosk", video: CAPTURE_PATHS.kioskSigninRewards, audio: "voiceover/feature/epic/kiosk.mp3", emoji: "🎮", duration: 195 },
  { id: "prizes", title: "Instant Coupons", video: CAPTURE_PATHS.printCoupons, audio: "voiceover/feature/epic/prizes.mp3", emoji: "🖨️", duration: 175 },
  { id: "analytics", title: "Live Analytics", video: CAPTURE_PATHS.adminStats, audio: "voiceover/feature/epic/analytics.mp3", emoji: "📊", duration: 145 },
];

let runningStart = INTRO_DURATION;
const FEATURES_WITH_TIMINGS = FEATURES_LIST.map((feature) => {
  const startFrame = runningStart;
  runningStart += feature.duration;
  return {
    ...feature,
    startFrame,
  };
});

const TOTAL_FEATURES_DURATION = runningStart - INTRO_DURATION;
export const LONG_PROMO_DURATION = INTRO_DURATION + TOTAL_FEATURES_DURATION + OUTRO_DURATION;

const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ fps, frame, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <CinematicBg totalFrames={INTRO_DURATION} />
      <GoldSparkles count={20} seed="intro" />
      <div style={{ transform: `scale(${scale})`, textAlign: "center" }}>
        <LevelUpLogoAnimated startFrame={10} />
        <h1 style={{ fontFamily: outfit, fontSize: 80, fontWeight: 800, color: CINEMATIC.offWhite, marginTop: 40, letterSpacing: -2 }}>
          Complete Feature Tour
        </h1>
      </div>
    </AbsoluteFill>
  );
};

const FeatureShowcasePanel: React.FC<{ feature: typeof FEATURES_WITH_TIMINGS[0]; index: number }> = ({ feature, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ fps, frame, config: { damping: 14 } });
  
  const yOffset = interpolate(enter, [0, 1], [100, 0]);
  const opacity = interpolate(enter, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <CinematicBg totalFrames={feature.duration} />
      <GoldSparkles count={15} seed={feature.id} />
      <div style={{ position: "absolute", top: 60, textAlign: "center", opacity, transform: `translateY(${yOffset}px)` }}>
        <div style={{ fontFamily: outfit, fontSize: 50, fontWeight: 800, color: CINEMATIC.gold, textTransform: "uppercase", letterSpacing: 4 }}>
          {feature.emoji} <LetterReveal text={feature.title} startFrame={10} charStyle={{ color: CINEMATIC.gold }} />
        </div>
      </div>
      <div style={{ position: "absolute", top: 160, opacity, transform: `translateY(${yOffset}px) scale(${interpolate(enter, [0,1], [0.9, 1])})` }}>
        <BrowserMockup style={{ width: 1200, height: 675 }}>
          <OffthreadVideo src={staticFile(feature.video)} loop muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </BrowserMockup>
      </div>

      {/* Dynamic Cinematic Effects */}
      {index % 3 === 0 && (
        <FloatingPrizeCard emoji="🌟" label="New Milestone" points={150} startFrame={20} offsetX={-650} offsetY={100} seed={feature.id} color={CINEMATIC.cyan} />
      )}
      {index % 3 === 1 && (
        <FloatingPrizeCard emoji="🏆" label="Achievement" points={300} startFrame={30} offsetX={650} offsetY={-50} seed={feature.id} color={CINEMATIC.gold} />
      )}
      {index % 3 === 2 && (
        <FloatingPrizeCard emoji="⚡" label="Power Up" points={100} startFrame={25} offsetX={-650} offsetY={-150} seed={feature.id} color={CINEMATIC.coral} />
      )}

      <AchievementBadge emoji={feature.emoji} title={feature.title} xp={(index + 1) * 25} startFrame={60} endFrame={feature.duration - 15} color={index % 2 === 0 ? CINEMATIC.gold : CINEMATIC.cyan} />
    </AbsoluteFill>
  );
};

const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ fps, frame: frame - 20, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <CinematicBg totalFrames={OUTRO_DURATION} />
      <GoldSparkles count={30} seed="outro" />
      <div style={{ transform: `scale(${scale})`, textAlign: "center" }}>
        <h1 style={{ fontFamily: outfit, fontSize: 100, fontWeight: 800, color: CINEMATIC.gold, letterSpacing: -2, margin: 0 }}>
          Level Up Your School
        </h1>
        <p style={{ fontFamily: jakarta, fontSize: 30, color: CINEMATIC.textMuted, marginTop: 20 }}>
          Get started today at leveluprewards.app
        </p>
      </div>
    </AbsoluteFill>
  );
};

export const LongFeaturePromo: React.FC = () => {
  const globalFrame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: CINEMATIC.navy }}>
      <Audio src={staticFile("background-music.mp3")} volume={0.12} loop />
      <Sequence durationInFrames={INTRO_DURATION}>
        <IntroScene />
        <Audio src={staticFile("voiceover/feature/epic/intro.mp3")} volume={0.9} />
      </Sequence>

      {FEATURES_WITH_TIMINGS.map((feature, i) => {
        return (
          <Sequence key={feature.id} from={feature.startFrame} durationInFrames={feature.duration}>
            <FeatureShowcasePanel feature={feature} index={i} />
            <Audio src={staticFile(feature.audio)} volume={0.9} />
          </Sequence>
        );
      })}

      <Sequence from={INTRO_DURATION + TOTAL_FEATURES_DURATION} durationInFrames={OUTRO_DURATION}>
        <OutroScene />
        <Audio src={staticFile("voiceover/feature/epic/outro.mp3")} volume={0.9} />
      </Sequence>

      <XPBar progress={interpolate(globalFrame, [0, LONG_PROMO_DURATION], [0, 1], { extrapolateRight: "clamp" })} />
    </AbsoluteFill>
  );
};
