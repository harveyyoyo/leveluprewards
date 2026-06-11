/** Capture-library clips aligned to widescreen voice lines. */

import { CAPTURE_PATHS } from "./captureLibraryPaths";

export type CaptureClip = {
  src: string;
  playbackRate: number;
  trimBeforeSec: number;
};

const fromPath = (
  src: string,
  playbackRate = 1.05,
  trimBeforeSec = 0,
): CaptureClip => ({
  src,
  playbackRate,
  trimBeforeSec,
});

/** Logo-only through “…built for schools.” (~3.5s @ 30fps) */
export const INTRO_LOGO_ONLY_FRAMES = 105;

export const CAPTURE_CLIPS = {
  scanEntry: fromPath(CAPTURE_PATHS.marketingKioskReady),
  earnPoints: fromPath(CAPTURE_PATHS.marketingKioskWelcome),
  prizeShop: fromPath(CAPTURE_PATHS.marketingKioskRewardsShop),
  signInPoints: fromPath(CAPTURE_PATHS.marketingKioskWelcome),
  idCard: fromPath(CAPTURE_PATHS.marketingAdminIdCard),
  portalHub: fromPath(CAPTURE_PATHS.portalHub, 1.05, 0.35),
} as const;

/** Clips + on-screen copy aligned to each widescreen voice line. */
export const WIDESCREEN_BEATS = {
  intro: {
    clips: [
      CAPTURE_CLIPS.scanEntry,
      CAPTURE_CLIPS.earnPoints,
      CAPTURE_CLIPS.prizeShop,
    ] as const,
    label: "Built for schools",
    tagline: "Scan in · Earn points · Pick prizes",
    emoji: "✨",
    color: "#ff007f",
  },
  home: {
    clip: CAPTURE_CLIPS.signInPoints,
    label: "Kiosk sign-in",
    tagline: "Students check in and see their balance.",
    emoji: "🎮",
    color: "#4895ef",
  },
  selector: {
    clip: CAPTURE_CLIPS.idCard,
    label: "Student ID cards",
    tagline: "Print-ready digital IDs for every student.",
    emoji: "🪪",
    color: "#4cc9f0",
  },
  dashboard: {
    clip: CAPTURE_CLIPS.prizeShop,
    label: "Prize shop",
    tagline: "Browse and choose rewards.",
    emoji: "🎁",
    color: "#f59e0b",
  },
  outro: {
    clip: CAPTURE_CLIPS.scanEntry,
    label: "Scanning only",
    tagline: "Just a quick scan and you're done.",
    emoji: "📲",
    color: "#52e875",
  },
} as const;

export type WidescreenBeatId = keyof typeof WIDESCREEN_BEATS;
