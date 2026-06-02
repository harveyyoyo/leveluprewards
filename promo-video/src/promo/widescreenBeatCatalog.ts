/** Capture-library clips aligned to widescreen voice lines. */

export type CaptureClip = {
  src: string;
  playbackRate: number;
  trimBeforeSec: number;
};

const clip = (
  path: string,
  playbackRate = 1.05,
  trimBeforeSec = 0,
): CaptureClip => ({
  src: `capture-library/${path}`,
  playbackRate,
  trimBeforeSec,
});

/** Logo-only through “…built for schools.” (~3.5s @ 30fps) */
export const INTRO_LOGO_ONLY_FRAMES = 105;

export const CAPTURE_CLIPS = {
  scanEntry: clip("student-kiosk/kiosk-type-entry.mp4"),
  earnPoints: clip("student-kiosk/kiosk-new-points-on-entry.mp4", 1.08),
  prizeShop: clip("student-kiosk/kiosk-prize-shop.mp4", 1.08),
  signInPoints: clip("student-kiosk/kiosk-signin-welcome-points.mp4", 1.08),
  idCard: clip("admin/admin-id-card-preview.mp4", 1.05),
  portalHub: clip("portal/portal-hub-overview.mp4", 1.05),
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
