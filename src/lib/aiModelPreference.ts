/** Client + server: normalize saved `arcade_ai_model` from localStorage. */

/** Prefer Flash over Pro — Pro often hits free-tier quota first. */
export function normalizeArcadeAiModel(saved: string | null | undefined): string {
  if (!saved) return 'gpt-4o-mini';
  if (saved === 'gemini-2.5-pro') return 'gemini-2.5-flash';
  return saved;
}
