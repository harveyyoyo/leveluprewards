import { describe, expect, it } from 'vitest';
import { CLASSROOM_APPEARANCE_THEMES } from './classroomAppearanceThemes';

describe('classroomAppearanceThemes', () => {
  it('exposes four owner-friendly looks mapped to existing design ids', () => {
    expect(CLASSROOM_APPEARANCE_THEMES.map((theme) => [theme.id, theme.title])).toEqual([
      ['aurora', 'Vibrant / Playful'],
      ['minimal', 'Focus / Clean'],
      ['midnight', 'Night / Dark'],
      ['brutalist', 'Retro / Bold'],
    ]);
  });
});
