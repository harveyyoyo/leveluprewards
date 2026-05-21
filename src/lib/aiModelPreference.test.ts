import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ARCADE_AI_MODEL,
  getArcadeAiModelFromStorage,
  normalizeArcadeAiModel,
} from './aiModelPreference';

describe('aiModelPreference', () => {
  it('defaults to gpt-4o-mini when unset', () => {
    expect(normalizeArcadeAiModel(null)).toBe(DEFAULT_ARCADE_AI_MODEL);
    expect(normalizeArcadeAiModel(undefined)).toBe(DEFAULT_ARCADE_AI_MODEL);
    expect(normalizeArcadeAiModel('')).toBe(DEFAULT_ARCADE_AI_MODEL);
  });

  it('maps legacy gemini-2.5-pro to flash', () => {
    expect(normalizeArcadeAiModel('gemini-2.5-pro')).toBe('gemini-2.5-flash');
  });

  it('keeps valid saved models', () => {
    expect(normalizeArcadeAiModel('gpt-4o')).toBe('gpt-4o');
    expect(normalizeArcadeAiModel('gemini-2.5-flash-lite')).toBe('gemini-2.5-flash-lite');
  });

  it('falls back to mini for unknown models', () => {
    expect(normalizeArcadeAiModel('gpt-5')).toBe(DEFAULT_ARCADE_AI_MODEL);
  });

  it('returns mini on the server', () => {
    expect(getArcadeAiModelFromStorage()).toBe(DEFAULT_ARCADE_AI_MODEL);
  });
});
