/** Timeline for LandscapePromo — 1920×1080, faster & flashier */
import { CLIPS as BASE_CLIPS } from "./capturedPromoTiming";

export const LANDSCAPE_FPS = 30;

export const LANDSCAPE_TIMING = {
  fps: LANDSCAPE_FPS,
  introEnd: 70,
  loginEnd: 140,
  selectorEnd: 205,
  studentKioskEnd: 300,
  studentHomeEnd: 395,
  dashboardEnd: 500,
  actionEnd: 605,
  total: 700,
} as const;

export const LANDSCAPE_CLIPS = {
  login: { ...BASE_CLIPS.login, playbackRate: 1.5 },
  selector: { ...BASE_CLIPS.selector, playbackRate: 1.4 },
  studentKiosk: { ...BASE_CLIPS.studentKiosk, playbackRate: 1.35 },
  studentHome: { ...BASE_CLIPS.studentHome, playbackRate: 1.35 },
  dashboard: { ...BASE_CLIPS.dashboard, playbackRate: 1.25 },
  action: { ...BASE_CLIPS.action, playbackRate: 1.25 },
} as const;

export type LandscapeSegment = {
  id: string;
  label: string;
  tagline: string;
  emoji: string;
  color: string;
  accent: string;
  globalStart: number;
  globalEnd: number;
};

export const LANDSCAPE_SEGMENTS: LandscapeSegment[] = [
  {
    id: "login",
    label: "Sign in",
    tagline: "School passcode in seconds — demo uses 1234.",
    emoji: "🔑",
    color: "#ff007f",
    accent: "#ff4da6",
    globalStart: LANDSCAPE_TIMING.introEnd,
    globalEnd: LANDSCAPE_TIMING.loginEnd,
  },
  {
    id: "selector",
    label: "Pick your portal",
    tagline: "Student kiosk, teacher tools, and admin — one hub.",
    emoji: "🎯",
    color: "#4cc9f0",
    accent: "#7dd3fc",
    globalStart: LANDSCAPE_TIMING.loginEnd,
    globalEnd: LANDSCAPE_TIMING.selectorEnd,
  },
  {
    id: "studentKiosk",
    label: "Student kiosk",
    tagline: "In-school sign-in — redeem coupons and browse the prize shop.",
    emoji: "🎮",
    color: "#4895ef",
    accent: "#60a5fa",
    globalStart: LANDSCAPE_TIMING.selectorEnd,
    globalEnd: LANDSCAPE_TIMING.studentKioskEnd,
  },
  {
    id: "studentHome",
    label: "Student home",
    tagline: "At-home portal for points, prizes, and activity history.",
    emoji: "🏠",
    color: "#f59e0b",
    accent: "#fbbf24",
    globalStart: LANDSCAPE_TIMING.studentKioskEnd,
    globalEnd: LANDSCAPE_TIMING.studentHomeEnd,
  },
  {
    id: "dashboard",
    label: "Teacher dashboard",
    tagline: "Roster, classes, and points for daily classroom flow.",
    emoji: "📋",
    color: "#7f00ff",
    accent: "#a855f7",
    globalStart: LANDSCAPE_TIMING.studentHomeEnd,
    globalEnd: LANDSCAPE_TIMING.dashboardEnd,
  },
  {
    id: "action",
    label: "Reward instantly",
    tagline: "Print coupons and award points without leaving the portal.",
    emoji: "⚡",
    color: "#27c93f",
    accent: "#4ade80",
    globalStart: LANDSCAPE_TIMING.dashboardEnd,
    globalEnd: LANDSCAPE_TIMING.actionEnd,
  },
];
