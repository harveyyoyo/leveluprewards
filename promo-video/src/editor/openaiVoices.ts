/** OpenAI tts-1-hd voices (widescreen promo) */
export const OPENAI_TTS_VOICES = [
  "alloy",
  "ash",
  "coral",
  "echo",
  "fable",
  "onyx",
  "nova",
  "sage",
  "shimmer",
] as const;

export type OpenAiTtsVoice = (typeof OPENAI_TTS_VOICES)[number];

/** Favorites shown first in the editor picker */
export const FAVORITE_OPENAI_VOICES: OpenAiTtsVoice[] = ["nova", "ash"];

export const DEFAULT_OPENAI_VOICE: OpenAiTtsVoice = "nova";

export function isOpenAiVoice(value: string): value is OpenAiTtsVoice {
  return (OPENAI_TTS_VOICES as readonly string[]).includes(value);
}
