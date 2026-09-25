import { z } from "zod";
import { CAPTURE_PATHS } from "../promo/captureLibraryPaths";

export const PILLAR_QUICK_FPS = 30;
export const PILLAR_QUICK_TOTAL_FRAMES = 330;
export const PILLAR_QUICK_WIDTH = 1080;
export const PILLAR_QUICK_HEIGHT = 1920;
export const PILLAR_QUICK_LANDSCAPE_WIDTH = 1920;
export const PILLAR_QUICK_LANDSCAPE_HEIGHT = 1080;

export type PillarQuickPromoId =
  | "rewards"
  | "attendance"
  | "library"
  | "classroom"
  | "office"
  | "houses";

export const PILLAR_QUICK_PROMO_IDS = [
  "rewards",
  "attendance",
  "library",
  "classroom",
  "office",
  "houses",
] as const satisfies readonly PillarQuickPromoId[];

export const PillarQuickPromoSchema = z.object({
  pillarId: z.enum(PILLAR_QUICK_PROMO_IDS),
});

export type PillarQuickPromoData = {
  id: PillarQuickPromoId;
  pillarLabel: string;
  styleLabel: string;
  eyebrow: string;
  hook: readonly string[];
  promise: string;
  cta: string;
  screenCaption: string;
  features: readonly string[];
  media: string;
  mediaType: "video" | "image";
  color: string;
  background: string;
  closingBackground: string;
  foreground: string;
  closingAccent: string;
  buttonTextColor: string;
  musicTrimFrames: number;
  musicRate: number;
};

export const PILLAR_QUICK_PROMOS: Record<
  PillarQuickPromoId,
  PillarQuickPromoData
> = {
  rewards: {
    id: "rewards",
    pillarLabel: "REWARDS",
    styleLabel: "Neon reward drop",
    eyebrow: "REWARDS, REIMAGINED",
    hook: ["GOOD CHOICES", "SHOULD FEEL", "THIS GOOD."],
    promise: "Make effort feel electric.",
    cta: "TURN GOOD CHOICES INTO MOMENTUM.",
    screenCaption: "Students see progress. Teachers see momentum.",
    features: ["SCAN", "CHOOSE", "REDEEM"],
    media: CAPTURE_PATHS.marketingKioskRewardsLive,
    mediaType: "image",
    color: "#ff2f92",
    background:
      "radial-gradient(circle at 78% 24%, rgba(255,47,146,0.34), transparent 34%), linear-gradient(145deg, #05030a 0%, #12031a 55%, #050713 100%)",
    closingBackground:
      "linear-gradient(150deg, rgba(255,47,146,0.97), rgba(91,15,180,0.98) 56%, #09051c 100%)",
    foreground: "#ffffff",
    closingAccent: "#ffffff",
    buttonTextColor: "#2b071c",
    musicTrimFrames: 450,
    musicRate: 1.08,
  },
  attendance: {
    id: "attendance",
    pillarLabel: "ATTENDANCE",
    styleLabel: "Clear data",
    eyebrow: "LESS ADMIN. MORE TEACHING.",
    hook: ["THE MORNING", "ROLL, MINUS", "THE HEADACHE."],
    promise: "Clean records. Better habits.",
    cta: "MAKE EVERY ARRIVAL COUNT.",
    screenCaption: "One simple flow for the whole school day.",
    features: ["PERIODS", "CHECK-INS", "REPORTS"],
    media: CAPTURE_PATHS.marketingAdminAttendance,
    mediaType: "image",
    color: "#24b47e",
    background:
      "radial-gradient(circle at 18% 18%, rgba(36,180,126,0.18), transparent 28%), linear-gradient(160deg, #f8fbff 0%, #edf4ff 58%, #ffffff 100%)",
    closingBackground:
      "linear-gradient(155deg, #ffffff 0%, #e8fff5 58%, #dff3ff 100%)",
    foreground: "#12233f",
    closingAccent: "#0b7a5b",
    buttonTextColor: "#052e24",
    musicTrimFrames: 450,
    musicRate: 1,
  },
  library: {
    id: "library",
    pillarLabel: "LIBRARY",
    styleLabel: "Storybook warmth",
    eyebrow: "WHERE READING BECOMES A ROUTINE",
    hook: ["CHECK OUT.", "LEVEL UP."],
    promise: "Reading routines that reward themselves.",
    cta: "KEEP READING IN THE ROUTINE.",
    screenCaption: "Every checkout becomes part of the reading story.",
    features: ["CATALOG", "CHECKOUT", "READING REWARDS"],
    media: CAPTURE_PATHS.marketingAdminLibrary,
    mediaType: "image",
    color: "#c47b18",
    background:
      "radial-gradient(circle at 82% 16%, rgba(255,255,255,0.9), transparent 30%), linear-gradient(145deg, #f7e8c8 0%, #ead0a0 52%, #fff8e8 100%)",
    closingBackground:
      "linear-gradient(150deg, #5a2d10 0%, #9a5a17 52%, #d79a32 100%)",
    foreground: "#3f2b18",
    closingAccent: "#ffd88a",
    buttonTextColor: "#4a2708",
    musicTrimFrames: 900,
    musicRate: 0.94,
  },
  classroom: {
    id: "classroom",
    pillarLabel: "CLASSROOM",
    styleLabel: "Arcade grid",
    eyebrow: "CLASSROOM MOMENTS, UNLOCKED",
    hook: ["TAP THE DESK.", "REWARD THE", "MOMENT."],
    promise: "Fast tools for the moment that matters.",
    cta: "REWARD THE MOMENT.",
    screenCaption: "One tap. One award. Class momentum.",
    features: ["QUICK AWARDS", "SEATING CHART", "CLASS DISPLAY"],
    media: CAPTURE_PATHS.marketingClassroomSeating,
    mediaType: "image",
    color: "#facc15",
    background:
      "radial-gradient(circle at 18% 20%, rgba(34,211,238,0.25), transparent 32%), linear-gradient(150deg, #030712 0%, #0b1230 58%, #111827 100%)",
    closingBackground:
      "linear-gradient(150deg, #07152d 0%, #123b66 52%, #0b1327 100%)",
    foreground: "#ffffff",
    closingAccent: "#fde047",
    buttonTextColor: "#1f2937",
    musicTrimFrames: 1350,
    musicRate: 1.1,
  },
  office: {
    id: "office",
    pillarLabel: "OFFICE",
    styleLabel: "Calm operations",
    eyebrow: "A CALMER FRONT DESK",
    hook: ["THE FRONT DESK,", "IN ONE", "CLEAN FLOW."],
    promise: "Grades, billing, and daily work—together.",
    cta: "KEEP THE FRONT DESK MOVING.",
    screenCaption: "One home for the work that keeps school moving.",
    features: ["GRADES", "BILLING", "REPORTS"],
    media: "marketing/screenshots/office-dashboard.png",
    mediaType: "image",
    color: "#0f9f91",
    background:
      "radial-gradient(circle at 84% 18%, rgba(15,159,145,0.2), transparent 30%), linear-gradient(150deg, #eef9f7 0%, #f7fbff 52%, #e8f4f6 100%)",
    closingBackground:
      "linear-gradient(150deg, #073b4c 0%, #0b7b75 52%, #0f9f91 100%)",
    foreground: "#102d3a",
    closingAccent: "#fef3c7",
    buttonTextColor: "#073b4c",
    musicTrimFrames: 1800,
    musicRate: 0.98,
  },
  houses: {
    id: "houses",
    pillarLabel: "HOUSES",
    styleLabel: "Tournament energy",
    eyebrow: "TEAM COLORS. REAL SCORES. SCHOOL SPIRIT.",
    hook: ["SORT STUDENTS", "INTO TEAMS.", "CHEER TOGETHER."],
    promise: "Friendly competition, all year long.",
    cta: "CHEER FOR EVERY TEAM.",
    screenCaption: "Team colors. Real scores. School-wide spirit.",
    features: ["TEAM POINTS", "ROSTERS", "HALL OF FAME"],
    media: "marketing/screenshots/houses-realm.png",
    mediaType: "image",
    color: "#a855f7",
    background:
      "radial-gradient(circle at 82% 14%, rgba(168,85,247,0.36), transparent 30%), linear-gradient(145deg, #070713 0%, #17102e 55%, #090b18 100%)",
    closingBackground:
      "linear-gradient(145deg, #2b0f57 0%, #6d28d9 52%, #a16207 100%)",
    foreground: "#ffffff",
    closingAccent: "#fde68a",
    buttonTextColor: "#3b0764",
    musicTrimFrames: 2250,
    musicRate: 1.12,
  },
};
