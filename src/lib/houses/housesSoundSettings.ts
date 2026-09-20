/**
 * Houses sound toggles (school appSettings).
 * Undefined means ON — same pattern as libraryNavSoundEffects / soundEnabled.
 */

export type HousesSoundSettingsSlice = {
  housesSoundsEnabled?: boolean;
  housesCeremonySoundsEnabled?: boolean;
  housesUiSoundsEnabled?: boolean;
};

/** Master switch for all Houses audio (UI clicks, awards, ceremony). Default on. */
export function isHousesMasterSoundEnabled(
  settings: Partial<HousesSoundSettingsSlice> | null | undefined,
): boolean {
  return settings?.housesSoundsEnabled !== false;
}

/** Tab clicks, chart switches, editor/wizard feedback, award chimes. Default on. */
export function isHousesUiSoundEnabled(
  settings: Partial<HousesSoundSettingsSlice> | null | undefined,
): boolean {
  return isHousesMasterSoundEnabled(settings) && settings?.housesUiSoundsEnabled !== false;
}

/**
 * Sorting ceremony fanfare / reveal / step sounds.
 * Default on. Independent of school-wide soundEnabled (assembly use case).
 */
export function isHousesCeremonySoundEnabled(
  settings: Partial<HousesSoundSettingsSlice> | null | undefined,
): boolean {
  return isHousesMasterSoundEnabled(settings) && settings?.housesCeremonySoundsEnabled !== false;
}
