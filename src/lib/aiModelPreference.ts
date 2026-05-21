/** Client + server: normalize saved `arcade_ai_model` from localStorage. */

export const DEFAULT_ARCADE_AI_MODEL = 'gpt-4o-mini';
export const STAFF_HELP_AI_MODEL = DEFAULT_ARCADE_AI_MODEL;

export const ARCADE_AI_MODEL_OPTIONS = [
  'gpt-4o-mini',
  'gpt-4o',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
] as const;

export type ArcadeAiModel = (typeof ARCADE_AI_MODEL_OPTIONS)[number];

const ARCADE_AI_MODEL_SET = new Set<string>(ARCADE_AI_MODEL_OPTIONS);

export function isArcadeAiModel(value: string): value is ArcadeAiModel {
  return ARCADE_AI_MODEL_SET.has(value);
}

/** Prefer Flash over Pro — Pro often hits free-tier quota first. */
export function normalizeArcadeAiModel(saved: string | null | undefined): string {
  if (!saved?.trim()) return DEFAULT_ARCADE_AI_MODEL;
  const trimmed = saved.trim();
  if (trimmed === 'gemini-2.5-pro') return 'gemini-2.5-flash';
  if (isArcadeAiModel(trimmed)) return trimmed;
  return DEFAULT_ARCADE_AI_MODEL;
}

/** Read persisted model preference (arcade_ai_model, then legacy arcade_theme_ai_model). */
export function getArcadeAiModelFromStorage(): string {
  if (typeof window === 'undefined') return DEFAULT_ARCADE_AI_MODEL;
  const saved =
    window.localStorage.getItem('arcade_ai_model') ??
    window.localStorage.getItem('arcade_theme_ai_model');
  return normalizeArcadeAiModel(saved);
}

export function persistArcadeAiModel(model: string): void {
  if (typeof window === 'undefined') return;
  const resolved = normalizeArcadeAiModel(model);
  window.localStorage.setItem('arcade_ai_model', resolved);
  window.localStorage.setItem('arcade_theme_ai_model', resolved);
}
