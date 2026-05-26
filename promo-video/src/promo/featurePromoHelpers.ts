import {
  FEATURE_SEGMENT_ORDER,
  orderedFeatureSegments,
  type FeatureSegmentDef,
} from "./featurePromoCatalog";
import type {
  FeatureNarrationCue,
  FeatureShowcasePromoProps,
  FeatureTimingProps,
} from "./featurePromoSchema";

export type FeatureMontageSegment = FeatureSegmentDef & {
  globalStart: number;
  globalEnd: number;
};

export function buildFeatureMontageSegments(
  timing: FeatureTimingProps,
): FeatureMontageSegment[] {
  const defs = orderedFeatureSegments();
  let start = timing.introEnd;
  return defs.map((def, i) => {
    const globalEnd =
      timing.segmentEnds[i] ??
      timing.segmentEnds[timing.segmentEnds.length - 1]!;
    const seg = { ...def, globalStart: start, globalEnd };
    start = globalEnd;
    return seg;
  });
}

export function getFeatureCuePlayDuration(
  cue: FeatureNarrationCue,
  index: number,
  narration: FeatureNarrationCue[],
  totalFrames: number,
): number {
  const next = narration[index + 1];
  const untilNext = next
    ? next.startFrame - cue.startFrame
    : totalFrames - cue.startFrame;
  return Math.max(1, Math.min(cue.durationFrames, untilNext));
}

export function isFeatureVoiceActive(
  frame: number,
  props: Pick<FeatureShowcasePromoProps, "narration" | "timing">,
): boolean {
  return props.narration.some((cue, index) => {
    const play = getFeatureCuePlayDuration(
      cue,
      index,
      props.narration,
      props.timing.total,
    );
    return frame >= cue.startFrame && frame < cue.startFrame + play;
  });
}

export function getFeatureFlashBoundaries(timing: FeatureTimingProps): number[] {
  return timing.segmentEnds;
}

export function segmentDurationFrames(
  timing: FeatureTimingProps,
  index: number,
): number {
  const start =
    index === 0 ? timing.introEnd : timing.segmentEnds[index - 1] ?? timing.introEnd;
  const end =
    timing.segmentEnds[index] ??
    timing.segmentEnds[timing.segmentEnds.length - 1] ??
    timing.introEnd;
  return Math.max(1, end - start);
}

export function cueLabelForSegment(segmentId: string): string {
  const def = orderedFeatureSegments().find((s) => s.id === segmentId);
  return def?.label ?? segmentId;
}

export const FEATURE_SEGMENT_COUNT = FEATURE_SEGMENT_ORDER.length;
