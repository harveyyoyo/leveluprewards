import { z } from "zod";

const narrationCueSchema = z.object({
  id: z.string().describe("Cue id (matches MP3 filename)"),
  label: z.string().describe("Label shown in Remotion Studio"),
  text: z.string().describe("Spoken script (regenerate audio after edits)"),
  file: z.string().describe("Path under public/, e.g. voiceover/widescreen/intro.mp3"),
  startFrame: z.number().int().min(0).describe("When voice starts (frame)"),
  durationFrames: z
    .number()
    .int()
    .min(1)
    .describe("Full clip length in frames (playback capped before next cue)"),
});

const timingSchema = z
  .object({
    introEnd: z.number().int().min(1).describe("Intro section ends"),
    selectorEnd: z.number().int().min(1).describe("Portal picker section ends"),
    studentKioskEnd: z.number().int().min(1).describe("Kiosk section ends"),
    studentHomeEnd: z.number().int().min(1).describe("Student home section ends"),
    dashboardEnd: z.number().int().min(1).describe("Teacher dashboard section ends"),
    actionEnd: z.number().int().min(1).describe("Montage / rewards section ends"),
    total: z.number().int().min(1).describe("Composition length (frames)"),
  })
  .describe("Video segment boundaries on the global timeline");

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

const promoCopySchema = z.object({
  introEyebrow: z.string().optional(),
  introTagline: z.string().optional(),
  outroHeadline: z.string().optional(),
  outroSubline: z.string().optional(),
});

export const WidescreenPromoSchema = z.object({
  timing: timingSchema,
  narration: z
    .array(narrationCueSchema)
    .describe("Voiceover cues — adjust startFrame so lines do not overlap"),
  copy: promoCopySchema
    .optional()
    .describe("On-screen intro/outro text"),
  ttsVoice: openAiVoiceSchema
    .optional()
    .describe("OpenAI voice used for narration — regenerate audio after changing"),
  musicVolume: z
    .number()
    .min(0)
    .max(1)
    .describe("Background music level (0–1)"),
  musicDuckRatio: z
    .number()
    .min(0)
    .max(1)
    .describe("Music multiplier while voice plays (e.g. 0.28)"),
  musicStyle: musicStyleSchema
    .optional()
    .describe("Fade/duck preset: calm, upbeat, cinematic"),
  musicSrc: z
    .string()
    .optional()
    .describe("MP3 under public/ (e.g. music-cinematic.mp3)"),
});

export type WidescreenPromoProps = z.infer<typeof WidescreenPromoSchema>;
export type WidescreenTimingProps = WidescreenPromoProps["timing"];
export type WidescreenNarrationCue = WidescreenPromoProps["narration"][number];
