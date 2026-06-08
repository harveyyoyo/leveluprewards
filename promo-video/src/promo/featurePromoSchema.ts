import { z } from "zod";
import { FEATURE_PROMO_VARIANTS } from "./featurePromoScripts";
import type { FeatureVisualThemeId } from "./featureVisualThemes";

const narrationCueSchema = z.object({
  id: z.string(),
  label: z.string(),
  text: z.string(),
  file: z.string(),
  startFrame: z.number().int().min(0),
  durationFrames: z.number().int().min(1),
});

const timingSchema = z.object({
  introEnd: z.number().int().min(1),
  /** Global frame where each montage segment ends (last = outro start) */
  segmentEnds: z.array(z.number().int().min(1)),
  total: z.number().int().min(1),
});

const openAiVoiceSchema = z.enum([
  "alloy",
  "ash",
  "ballad",
  "cedar",
  "coral",
  "echo",
  "fable",
  "marin",
  "onyx",
  "nova",
  "sage",
  "shimmer",
  "verse",
]);

const musicStyleSchema = z.enum(["default", "calm", "upbeat", "cinematic"]);
const visualThemeSchema = z.enum(["neon", "aurora", "chalkboard", "arcade"]);

const variantIdSchema = z.enum(
  FEATURE_PROMO_VARIANTS.map((v) => v.id) as [
    "epic",
    "warm",
    "pro",
    "hype",
    "story",
    "aurora",
    "chalkboard",
    "arcade",
  ],
);

const copySchema = z.object({
  introEyebrow: z.string(),
  introTagline: z.string(),
  montageTitle: z.string(),
  montageSubtitle: z.string(),
  outroHeadline: z.string(),
  outroSubline: z.string(),
});

export const FeatureShowcasePromoSchema = z.object({
  variantId: variantIdSchema,
  timing: timingSchema,
  narration: z.array(narrationCueSchema),
  copy: copySchema,
  ttsVoice: openAiVoiceSchema.optional(),
  musicVolume: z.number().min(0).max(1),
  musicDuckRatio: z.number().min(0).max(1),
  musicStyle: musicStyleSchema.optional(),
  musicSrc: z.string().optional(),
  visualTheme: visualThemeSchema.optional(),
});

export type FeatureShowcasePromoProps = z.infer<typeof FeatureShowcasePromoSchema>;
export type FeaturePromoVisualThemeId = FeatureVisualThemeId;
export type FeatureNarrationCue = FeatureShowcasePromoProps["narration"][number];
export type FeatureTimingProps = FeatureShowcasePromoProps["timing"];
