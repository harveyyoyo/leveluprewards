/** MyComp (Composition.tsx) montage — aligned with captured walkthrough clips */
import { CAPTURED_TIMING, CLIPS } from "./capturedPromoTiming";

export const MY_COMP_INTRO_END = 120;
export const MY_COMP_OUTRO_DURATION = 215;
export const MY_COMP_FPS = 30;

const montageLen = CAPTURED_TIMING.actionEnd - CAPTURED_TIMING.introEnd;

function segStart(capturedEnd: number) {
  return capturedEnd - CAPTURED_TIMING.introEnd;
}

export const MY_COMP_MONTAGE = {
  login: {
    from: segStart(CAPTURED_TIMING.introEnd),
    duration: segStart(CAPTURED_TIMING.loginEnd) - segStart(CAPTURED_TIMING.introEnd),
    playbackRate: 1.8,
    src: CLIPS.login.src,
  },
  selector: {
    from: segStart(CAPTURED_TIMING.loginEnd),
    duration: segStart(CAPTURED_TIMING.selectorEnd) - segStart(CAPTURED_TIMING.loginEnd),
    playbackRate: 1.8,
    src: CLIPS.selector.src,
  },
  studentKiosk: {
    from: segStart(CAPTURED_TIMING.selectorEnd),
    duration:
      segStart(CAPTURED_TIMING.studentKioskEnd) - segStart(CAPTURED_TIMING.selectorEnd),
    playbackRate: 1.35,
    src: CLIPS.studentKiosk.src,
  },
  studentHome: {
    from: segStart(CAPTURED_TIMING.studentKioskEnd),
    duration:
      segStart(CAPTURED_TIMING.studentHomeEnd) -
      segStart(CAPTURED_TIMING.studentKioskEnd),
    playbackRate: 1.35,
    src: CLIPS.studentHome.src,
  },
  dashboard: {
    from: segStart(CAPTURED_TIMING.studentHomeEnd),
    duration:
      segStart(CAPTURED_TIMING.dashboardEnd) - segStart(CAPTURED_TIMING.studentHomeEnd),
    playbackRate: 2.4,
    src: CLIPS.dashboard.src,
  },
  action: {
    from: segStart(CAPTURED_TIMING.dashboardEnd),
    duration: segStart(CAPTURED_TIMING.actionEnd) - segStart(CAPTURED_TIMING.dashboardEnd),
    playbackRate: 2.4,
    src: CLIPS.action.src,
  },
} as const;

export const MY_COMP_MONTAGE_DURATION = montageLen;
export const MY_COMP_OUTRO_START = MY_COMP_INTRO_END + montageLen;
export const MY_COMP_TOTAL = MY_COMP_OUTRO_START + MY_COMP_OUTRO_DURATION;

export type MyCompBanner = {
  id: string;
  emoji: string;
  title: string;
  body: string;
  color: string;
  borderColor: string;
  globalStart: number;
  globalEnd: number;
};

/** Lower-third callouts during the walkthrough montage */
export const MY_COMP_BANNERS: MyCompBanner[] = [
  {
    id: "login",
    emoji: "🔑",
    title: "Seamless Login",
    body: "Quick school authentication using passcode 1234.",
    color: "#ff007f",
    borderColor: "rgba(255, 0, 127, 0.35)",
    globalStart: MY_COMP_INTRO_END + 10,
    globalEnd: MY_COMP_INTRO_END + segStart(CAPTURED_TIMING.loginEnd) - 5,
  },
  {
    id: "selector",
    emoji: "🎯",
    title: "One Portal Hub",
    body: "Student kiosk, teacher tools, and admin — all in one place.",
    color: "#4cc9f0",
    borderColor: "rgba(76, 201, 240, 0.35)",
    globalStart: MY_COMP_INTRO_END + segStart(CAPTURED_TIMING.loginEnd) + 5,
    globalEnd: MY_COMP_INTRO_END + segStart(CAPTURED_TIMING.selectorEnd) - 5,
  },
  {
    id: "kiosk",
    emoji: "🎮",
    title: "Student Kiosk",
    body: "In-school sign-in — redeem coupons and browse the prize shop.",
    color: "#4895ef",
    borderColor: "rgba(72, 149, 239, 0.35)",
    globalStart: MY_COMP_INTRO_END + segStart(CAPTURED_TIMING.selectorEnd) + 8,
    globalEnd: MY_COMP_INTRO_END + segStart(CAPTURED_TIMING.studentKioskEnd) - 8,
  },
  {
    id: "home",
    emoji: "🏠",
    title: "Student Home Portal",
    body: "Students check points and rewards from home on any device.",
    color: "#f59e0b",
    borderColor: "rgba(245, 158, 11, 0.35)",
    globalStart: MY_COMP_INTRO_END + segStart(CAPTURED_TIMING.studentKioskEnd) + 8,
    globalEnd: MY_COMP_INTRO_END + segStart(CAPTURED_TIMING.studentHomeEnd) - 8,
  },
  {
    id: "dashboard",
    emoji: "📋",
    title: "Teacher Dashboard",
    body: "Roster, classes, and points — built for daily classroom flow.",
    color: "#4cc9f0",
    borderColor: "rgba(76, 201, 240, 0.35)",
    globalStart: MY_COMP_INTRO_END + segStart(CAPTURED_TIMING.studentHomeEnd) + 8,
    globalEnd: MY_COMP_INTRO_END + segStart(CAPTURED_TIMING.dashboardEnd) - 8,
  },
  {
    id: "action",
    emoji: "⚡",
    title: "Reward in Seconds",
    body: "Print coupons or award points without leaving the portal.",
    color: "#7f00ff",
    borderColor: "rgba(127, 0, 255, 0.35)",
    globalStart: MY_COMP_INTRO_END + segStart(CAPTURED_TIMING.dashboardEnd) + 8,
    globalEnd: MY_COMP_OUTRO_START - 10,
  },
];

export function myCompSegmentLabel(globalFrame: number): string {
  const f = globalFrame - MY_COMP_INTRO_END;
  if (f < segStart(CAPTURED_TIMING.loginEnd)) return "Sign in";
  if (f < segStart(CAPTURED_TIMING.selectorEnd)) return "Choose your portal";
  if (f < segStart(CAPTURED_TIMING.studentKioskEnd)) return "Student kiosk";
  if (f < segStart(CAPTURED_TIMING.studentHomeEnd)) return "Student home";
  if (f < segStart(CAPTURED_TIMING.dashboardEnd)) return "Teacher tools";
  return "Reward students";
}
