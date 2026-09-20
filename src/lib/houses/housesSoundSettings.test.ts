import { describe, expect, it } from 'vitest';
import {
  isHousesCeremonySoundEnabled,
  isHousesMasterSoundEnabled,
  isHousesUiSoundEnabled,
} from './housesSoundSettings';

describe('housesSoundSettings', () => {
  it('defaults all Houses sounds on when unset', () => {
    expect(isHousesMasterSoundEnabled({})).toBe(true);
    expect(isHousesUiSoundEnabled({})).toBe(true);
    expect(isHousesCeremonySoundEnabled({})).toBe(true);
  });

  it('master off mutes UI and ceremony', () => {
    const settings = { housesSoundsEnabled: false };
    expect(isHousesMasterSoundEnabled(settings)).toBe(false);
    expect(isHousesUiSoundEnabled(settings)).toBe(false);
    expect(isHousesCeremonySoundEnabled(settings)).toBe(false);
  });

  it('allows turning UI or ceremony off independently', () => {
    expect(
      isHousesUiSoundEnabled({ housesSoundsEnabled: true, housesUiSoundsEnabled: false }),
    ).toBe(false);
    expect(
      isHousesCeremonySoundEnabled({
        housesSoundsEnabled: true,
        housesCeremonySoundsEnabled: false,
      }),
    ).toBe(false);
    expect(
      isHousesCeremonySoundEnabled({
        housesSoundsEnabled: true,
        housesUiSoundsEnabled: false,
        housesCeremonySoundsEnabled: true,
      }),
    ).toBe(true);
  });
});
