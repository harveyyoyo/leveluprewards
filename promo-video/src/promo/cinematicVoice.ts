import { defaultWidescreenPromoProps } from "./widescreenPromoDefaults";
import type { WidescreenPromoProps } from "./widescreenPromoSchema";

/** Widescreen voice timing is used as-is (no cold-open offset). */
export const CINEMATIC_VOICE_OFFSET = 0;

/** Widescreen narration + timing shifted to sit after the cinematic cold open. */
export function getCinematicVoiceProps(): Pick<
  WidescreenPromoProps,
  "narration" | "timing"
> {
  const o = CINEMATIC_VOICE_OFFSET;
  const { narration, timing } = defaultWidescreenPromoProps;

  return {
    narration: narration.map((c) => ({
      ...c,
      startFrame: c.startFrame + o,
    })),
    timing: {
      introEnd: timing.introEnd + o,
      selectorEnd: timing.selectorEnd + o,
      studentKioskEnd: timing.studentKioskEnd + o,
      studentHomeEnd: timing.studentHomeEnd + o,
      dashboardEnd: timing.dashboardEnd + o,
      actionEnd: timing.actionEnd + o,
      total: timing.total + o,
    },
  };
}
