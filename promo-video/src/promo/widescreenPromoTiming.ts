/** Widescreen 1920×1080 — simple scan-first promo (clips matched to each beat) */

export const WIDESCREEN_FPS = 30;



/** ~20s — room for voice + readable UI moments */

export const WIDESCREEN_TIMING = {

  fps: WIDESCREEN_FPS,

  introEnd: 75,

  selectorEnd: 170,

  studentKioskEnd: 265,

  studentHomeEnd: 360,

  dashboardEnd: 455,

  actionEnd: 545,

  total: 820,

} as const;



/**

 * Montage order (timing keys are legacy names):
 * selector → ID cards | studentHome → kiosk sign-in
 * dashboard → prize shop | action → quick scan

 */

import { CAPTURE_CLIPS } from "./widescreenBeatCatalog";

export const WIDESCREEN_CLIPS = {
  selector: CAPTURE_CLIPS.idCard,
  studentKiosk: CAPTURE_CLIPS.prizeShop,
  studentHome: CAPTURE_CLIPS.signInPoints,
  dashboard: CAPTURE_CLIPS.prizeShop,
  action: CAPTURE_CLIPS.scanEntry,
} as const;



export type WidescreenClipKey = keyof typeof WIDESCREEN_CLIPS;



export type WidescreenSegment = {

  id: string;

  label: string;

  tagline: string;

  emoji: string;

  color: string;

  accent: string;

  globalStart: number;

  globalEnd: number;

};



export const WIDESCREEN_SEGMENTS: WidescreenSegment[] = [

  {

    id: "selector",

    label: "Student ID cards",

    tagline: "Print-ready digital IDs for every student.",

    emoji: "🪪",

    color: "#4cc9f0",

    accent: "#7dd3fc",

    globalStart: WIDESCREEN_TIMING.introEnd,

    globalEnd: WIDESCREEN_TIMING.selectorEnd,

  },

  {

    id: "studentKiosk",

    label: "Teacher coupons",

    tagline: "Print reward coupons from the teacher portal.",

    emoji: "🖨️",

    color: "#a855f7",

    accent: "#c084fc",

    globalStart: WIDESCREEN_TIMING.selectorEnd,

    globalEnd: WIDESCREEN_TIMING.studentKioskEnd,

  },

  {

    id: "studentHome",

    label: "Kiosk sign-in",

    tagline: "Students check in and see their balance.",

    emoji: "🎮",

    color: "#4895ef",

    accent: "#60a5fa",

    globalStart: WIDESCREEN_TIMING.studentKioskEnd,

    globalEnd: WIDESCREEN_TIMING.studentHomeEnd,

  },

  {

    id: "dashboard",

    label: "Prize shop",

    tagline: "Browse and choose rewards.",

    emoji: "🎁",

    color: "#f59e0b",

    accent: "#fbbf24",

    globalStart: WIDESCREEN_TIMING.studentHomeEnd,

    globalEnd: WIDESCREEN_TIMING.dashboardEnd,

  },

  {

    id: "action",

    label: "Scan to play",

    tagline: "Type or scan a student ID — no mouse required.",

    emoji: "📷",

    color: "#27c93f",

    accent: "#4ade80",

    globalStart: WIDESCREEN_TIMING.dashboardEnd,

    globalEnd: WIDESCREEN_TIMING.actionEnd,

  },

];


