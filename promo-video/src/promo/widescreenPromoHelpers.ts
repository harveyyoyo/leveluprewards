import type {

  WidescreenNarrationCue,

  WidescreenPromoProps,

  WidescreenTimingProps,

} from "./widescreenPromoSchema";

import type { WidescreenSegment } from "./widescreenPromoTiming";
import { WIDESCREEN_BEATS } from "./widescreenBeatCatalog";

const SEGMENT_META: Record<
  string,
  Pick<WidescreenSegment, "label" | "tagline" | "emoji" | "color" | "accent">
> = {
  studentHome: {
    label: WIDESCREEN_BEATS.home.label,
    tagline: WIDESCREEN_BEATS.home.tagline,
    emoji: WIDESCREEN_BEATS.home.emoji,
    color: WIDESCREEN_BEATS.home.color,
    accent: "#60a5fa",
  },
  selector: {
    label: WIDESCREEN_BEATS.selector.label,
    tagline: WIDESCREEN_BEATS.selector.tagline,
    emoji: WIDESCREEN_BEATS.selector.emoji,
    color: WIDESCREEN_BEATS.selector.color,
    accent: "#7dd3fc",
  },
  dashboard: {
    label: WIDESCREEN_BEATS.dashboard.label,
    tagline: WIDESCREEN_BEATS.dashboard.tagline,
    emoji: WIDESCREEN_BEATS.dashboard.emoji,
    color: WIDESCREEN_BEATS.dashboard.color,
    accent: "#fbbf24",
  },
  action: {
    label: WIDESCREEN_BEATS.outro.label,
    tagline: WIDESCREEN_BEATS.outro.tagline,
    emoji: WIDESCREEN_BEATS.outro.emoji,
    color: WIDESCREEN_BEATS.outro.color,
    accent: "#4ade80",
  },
};



export function buildWidescreenSegments(

  timing: WidescreenTimingProps,

): WidescreenSegment[] {

  /** Montage: ID cards → kiosk sign-in → prizes → closing beat */
  const ranges = [
    ["selector", timing.introEnd, timing.selectorEnd],
    ["studentHome", timing.selectorEnd, timing.studentKioskEnd],
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


