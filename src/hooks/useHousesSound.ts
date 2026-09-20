'use client';

import { useCallback } from 'react';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useArcadeSound, type SoundEffect } from '@/hooks/useArcadeSound';
import {
  isHousesCeremonySoundEnabled,
  isHousesUiSoundEnabled,
} from '@/lib/houses/housesSoundSettings';

/**
 * Houses-scoped arcade sounds.
 * - UI / awards: respect Houses master + UI toggles and school-wide soundEnabled.
 * - Ceremony: respect Houses master + ceremony toggles; ignore school mute (assemblies).
 */
export function useHousesSound() {
  const { settings } = useSettings();
  const playArcade = useArcadeSound();
  const playCeremonyArcade = useArcadeSound({ ignoreSchoolSoundMute: true });

  const uiEnabled = isHousesUiSoundEnabled(settings);
  const ceremonyEnabled = isHousesCeremonySoundEnabled(settings);

  const playUi = useCallback(
    (sound: SoundEffect) => {
      if (!uiEnabled) return;
      playArcade(sound);
    },
    [uiEnabled, playArcade],
  );

  const playCeremony = useCallback(
    (sound: SoundEffect) => {
      if (!ceremonyEnabled) return;
      playCeremonyArcade(sound);
    },
    [ceremonyEnabled, playCeremonyArcade],
  );

  return { playUi, playCeremony, uiEnabled, ceremonyEnabled };
}
