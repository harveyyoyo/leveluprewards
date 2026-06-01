/** Feature segments for the long widescreen showcase promo */



export type FeatureClipConfig = {

  src: string;

  playbackRate?: number;

  trimBeforeSec?: number;

};



export type FeatureSegmentDef = {

  id: string;

  label: string;

  tagline: string;

  emoji: string;

  color: string;

  accent: string;

  clip: FeatureClipConfig;

};



export const FEATURE_PROMO_FPS = 30;



/** Montage order — kiosk flow, identity/branding, then modules */

export const FEATURE_SEGMENT_ORDER = [

  "kiosk",

  "idCards",

  "themes",

  "prizes",

  "coupons",

  "raffle",

  "houses",

  "hallOfFame",

  "notifications",

  "bulletin",

  "library",

  "badges",

  "analytics",

  "attendance",

] as const;



export type FeatureSegmentId = (typeof FEATURE_SEGMENT_ORDER)[number];



const clip = (

  src: string,

  playbackRate = 1.08,

  trimBeforeSec = 0,

): FeatureClipConfig => ({ src, playbackRate, trimBeforeSec });



export const FEATURE_SEGMENT_CATALOG: Record<

  FeatureSegmentId,

  FeatureSegmentDef

> = {

  kiosk: {

    id: "kiosk",

    label: "Student kiosk",

    tagline: "Scan in, see balance, redeem rewards.",

    emoji: "🎮",

    color: "#4895ef",

    accent: "#60a5fa",

    clip: clip("capture-library/student-kiosk/kiosk-signin-rewards.mp4", 1.1),

  },

  idCards: {

    id: "idCards",

    label: "Student ID cards",

    tagline: "Print-ready digital IDs with live preview.",

    emoji: "🪪",

    color: "#38bdf8",

    accent: "#7dd3fc",

    clip: clip("capture-library/admin/admin-id-card-preview.mp4", 1.05),

  },

  themes: {

    id: "themes",

    label: "Card theme designer",

    tagline: "Create themes with a prompt, colors, and live ID preview.",

    emoji: "🎨",

    color: "#f97316",

    accent: "#fb923c",

    clip: clip("capture-library/features/admin-branding-theme.mp4", 1.04),

  },

  prizes: {

    id: "prizes",

    label: "Prize shop",

    tagline: "Prizes students actually want to earn.",

    emoji: "🎁",

    color: "#f59e0b",

    accent: "#fbbf24",

    clip: clip("capture-library/student-kiosk/kiosk-prizes-hover.mp4", 1.08),

  },

  coupons: {

    id: "coupons",

    label: "Teacher coupons",

    tagline: "Print reward coupons in one click.",

    emoji: "🖨️",

    color: "#a855f7",

    accent: "#c084fc",

    clip: clip("capture-library/action/action-print-coupons.mp4", 1.1),

  },

  raffle: {

    id: "raffle",

    label: "Raffle",

    tagline: "Run raffles, spin winners, and celebrate school-wide.",

    emoji: "🎟️",

    color: "#ec4899",

    accent: "#f472b6",

    clip: clip("capture-library/features/teacher-raffle.mp4", 1.06),

  },

  houses: {

    id: "houses",

    label: "House competitions",

    tagline: "Sort students into houses and track team points.",

    emoji: "🏆",

    color: "#8b5cf6",

    accent: "#a78bfa",

    clip: clip("capture-library/features/admin-houses.mp4", 1.06),

  },

  hallOfFame: {

    id: "hallOfFame",

    label: "Hall of Fame",

    tagline: "Fullscreen leaderboards that celebrate top students.",

    emoji: "⭐",

    color: "#eab308",

    accent: "#fde047",

    clip: clip("capture-library/features/hall-of-fame.mp4", 1.04),

  },

  notifications: {

    id: "notifications",

    label: "Smart notifications",

    tagline: "Alerts for inventory, milestones, and staff.",

    emoji: "🔔",

    color: "#06b6d4",

    accent: "#22d3ee",

    clip: clip("capture-library/features/admin-notifications.mp4", 1.05),

  },

  bulletin: {

    id: "bulletin",

    label: "Bulletin board",

    tagline: "Share news and celebrations on a living display.",

    emoji: "📢",

    color: "#14b8a6",

    accent: "#2dd4bf",

    clip: clip("capture-library/features/bulletin-board.mp4", 1.05),

  },

  library: {

    id: "library",

    label: "Library checkout",

    tagline: "Track loans, due dates, and reading rewards.",

    emoji: "📚",

    color: "#6366f1",

    accent: "#818cf8",

    clip: clip("capture-library/features/admin-library.mp4", 1.06),

  },

  badges: {

    id: "badges",

    label: "Badges & goals",

    tagline: "Milestones, streaks, and achievements that stick.",

    emoji: "🎖️",

    color: "#22c55e",

    accent: "#4ade80",

    clip: clip("capture-library/features/admin-badges.mp4", 1.06),

  },

  analytics: {

    id: "analytics",

    label: "Insights & reports",

    tagline: "See trends across classes, points, and engagement.",

    emoji: "📊",

    color: "#3b82f6",

    accent: "#60a5fa",

    clip: clip("capture-library/features/admin-stats.mp4", 1.04),

  },

  attendance: {

    id: "attendance",

    label: "Attendance",

    tagline: "Kiosk sign-in tied to your attendance workflow.",

    emoji: "✅",

    color: "#10b981",

    accent: "#34d399",

    clip: clip("capture-library/features/admin-attendance.mp4", 1.06),

  },

};



export function orderedFeatureSegments(): FeatureSegmentDef[] {

  return FEATURE_SEGMENT_ORDER.map((id) => FEATURE_SEGMENT_CATALOG[id]);

}


