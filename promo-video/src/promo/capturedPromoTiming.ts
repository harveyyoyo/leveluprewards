/** Timeline for CapturedPromo — synced to promo-video/public walkthrough-*.mp4 */
export const CAPTURED_FPS = 30;

export const CAPTURED_TIMING = {
  fps: CAPTURED_FPS,
  introEnd: 75,
  loginEnd: 150,
  selectorEnd: 220,
  studentKioskEnd: 320,
  studentHomeEnd: 420,
  dashboardEnd: 530,
  actionEnd: 640,
  total: 750,
} as const;

export const CLIPS = {
  login: {
    src: "walkthrough-login.mp4",
    playbackRate: 1.35,
    trimBeforeSec: 0,
  },
  selector: {
    src: "walkthrough-selector.mp4",
    playbackRate: 1.25,
    trimBeforeSec: 0,
  },
  studentKiosk: {
    src: "walkthrough-student-kiosk.mp4",
    playbackRate: 1.2,
    trimBeforeSec: 0,
  },
  studentHome: {
    src: "walkthrough-student-home.mp4",
    playbackRate: 1.2,
    trimBeforeSec: 0,
  },
  dashboard: {
    src: "walkthrough-dashboard.mp4",
    playbackRate: 1.1,
    trimBeforeSec: 0,
  },
  action: {
    src: "walkthrough-action.mp4",
    playbackRate: 1.1,
    trimBeforeSec: 0,
  },
} as const;

export const CALLOUTS = [
  {
    start: 85,
    end: 145,
    emoji: "🔑",
    title: "Quick school login",
    body: "Demo schools sign in with passcode 1234.",
    color: "#ff007f",
  },
  {
    start: 158,
    end: 215,
    emoji: "🎯",
    title: "One portal, every role",
    body: "Student kiosk, teacher tools, and admin — all in one place.",
    color: "#4cc9f0",
  },
  {
    start: 228,
    end: 315,
    emoji: "🎮",
    title: "Student kiosk",
    body: "Scan or type in — students redeem coupons and open the prize shop.",
    color: "#4895ef",
  },
  {
    start: 328,
    end: 415,
    emoji: "🏠",
    title: "Student home portal",
    body: "Students check points and rewards from home on any device.",
    color: "#f59e0b",
  },
  {
    start: 430,
    end: 520,
    emoji: "📋",
    title: "Teacher dashboard",
    body: "Roster, classes, and points — built for daily classroom flow.",
    color: "#7f00ff",
  },
  {
    start: 535,
    end: 630,
    emoji: "⚡",
    title: "Reward in seconds",
    body: "Print coupons or award points without leaving the portal.",
    color: "#27c93f",
  },
] as const;
