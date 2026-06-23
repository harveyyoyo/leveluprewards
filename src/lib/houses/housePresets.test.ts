import { describe, expect, it } from 'vitest';
import { visibleHousePresetThemes } from './housePresets';

describe('house preset visibility', () => {
  it('hides the yeshiva middot preset for standard schools', () => {
    const themes = visibleHousePresetThemes({ includeJewishOrthodox: false });

    expect(themes.map((theme) => theme.id)).not.toContain('yeshiva');
  });

  it('shows the yeshiva middot preset for Jewish Orthodox schools', () => {
    const themes = visibleHousePresetThemes({ includeJewishOrthodox: true });

    expect(themes.map((theme) => theme.id)).toContain('yeshiva');
  });
});
