import type {

  WidescreenNarrationCue,

  WidescreenPromoProps,

  WidescreenTimingProps,

} from "./widescreenPromoSchema";

import type { WidescreenSegment } from "./widescreenPromoTiming";



const SEGMENT_META: Record<

  string,

  Pick<WidescreenSegment, "label" | "tagline" | "emoji" | "color" | "accent">

> = {

  selector: {

    label: "Student ID cards",

    tagline: "Print-ready digital IDs for every student.",

    emoji: "🪪",

    color: "#4cc9f0",

    accent: "#7dd3fc",

  },

  studentKiosk: {

    label: "Teacher coupons",

    tagline: "Print reward coupons from the teacher portal.",

    emoji: "🖨️",

    color: "#a855f7",

    accent: "#c084fc",

  },

  studentHome: {

    label: "Kiosk sign-in",

    tagline: "Students check in and see their balance.",

    emoji: "🎮",

    color: "#4895ef",

    accent: "#60a5fa",

  },

  dashboard: {

    label: "Prize shop",

    tagline: "Browse and choose rewards.",

    emoji: "🎁",

    color: "#f59e0b",

    accent: "#fbbf24",

  },

  action: {

    label: "Scan to play",

    tagline: "Type or scan a student ID — no mouse required.",

    emoji: "📷",

    color: "#27c93f",

    accent: "#4ade80",

  },

};



export function buildWidescreenSegments(

  timing: WidescreenTimingProps,

): WidescreenSegment[] {

  /** Student-first montage: kiosk sign-in → ID cards → prizes → scan (no portal/teacher beat). */
  const ranges = [

    ["studentHome", timing.introEnd, timing.selectorEnd],

    ["selector", timing.selectorEnd, timing.studentKioskEnd],

    ["dashboard", timing.studentKioskEnd, timing.studentHomeEnd],

    ["action", timing.studentHomeEnd, timing.dashboardEnd],

  ] as const;



  return ranges.map(([id, globalStart, globalEnd]) => ({

    id,

    globalStart,

    globalEnd,

    ...SEGMENT_META[id],

  }));

}



export function getCuePlayDuration(

  cue: WidescreenNarrationCue,

  index: number,

  narration: WidescreenNarrationCue[],

  totalFrames: number,

): number {

  const next = narration[index + 1];

  const untilNext = next

    ? next.startFrame - cue.startFrame

    : totalFrames - cue.startFrame;

  return Math.max(1, Math.min(cue.durationFrames, untilNext));

}



export function isWidescreenVoiceActive(

  frame: number,

  props: Pick<WidescreenPromoProps, "narration" | "timing">,

): boolean {

  return props.narration.some((cue, index) => {

    const play = getCuePlayDuration(

      cue,

      index,

      props.narration,

      props.timing.total,

    );

    return frame >= cue.startFrame && frame < cue.startFrame + play;

  });

}



export function getFlashBoundaries(timing: WidescreenTimingProps): number[] {

  return [

    timing.selectorEnd,

    timing.studentKioskEnd,

    timing.studentHomeEnd,

    timing.dashboardEnd,

  ];

}


