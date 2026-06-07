import type { Settings } from '@/components/providers/SettingsProvider';
import type { HousePresetThemeId } from '@/lib/houses/housePresets';

export type HousePointsSource = 'studentRollup' | 'manual';

export type HouseAssignMode = 'skip' | 'balanced' | 'random';

export type HouseSetupWizardDraft = {
  themeId: HousePresetThemeId | 'skip';
  pointsSource: HousePointsSource;
  assignMode: HouseAssignMode;
  syncTotalsFromStudents: boolean;
  showHouseOnKiosk: boolean;
  hallOfFameSortBy: 'lifetimePoints' | 'points';
  hallOfFamePodiumSize: number;
};

/** Persist house wizard choices into school appSettings. */
export function applyHouseWizardSettings(
  draft: HouseSetupWizardDraft,
  updateSettings: (patch: Partial<Settings>) => void,
): void {
  updateSettings({
    enableHouses: true,
    ...housePointsSourceSettingsPatch(draft.pointsSource),
    showHouseOnStudentKiosk: draft.showHouseOnKiosk,
    houseHallOfFameSortBy: draft.hallOfFameSortBy,
    houseHallOfFamePodiumSize: draft.hallOfFamePodiumSize,
    houseHallOfFameLimit: 50,
    houseHallOfFameGridLayout: true,
    houseHallOfFameGridColumns: 3,
    houseHallOfFameAutoScroll: false,
    houseHallOfFameLayout: 'landscape',
  });
}

/**
 * How house standings are maintained.
 * `studentRollup` — totals follow LevelUp student point awards (default).
 * `manual` — house points are entered on the Houses tab; not rolled up from student LevelUp balances.
 */
export function resolveHousePointsSource(
  settings: Partial<Pick<Settings, 'housePointsSource' | 'housesRollupPoints'>>,
): HousePointsSource {
  if (settings.housePointsSource === 'manual' || settings.housePointsSource === 'studentRollup') {
    return settings.housePointsSource;
  }
  return settings.housesRollupPoints === false ? 'manual' : 'studentRollup';
}

/** True when teacher/student point awards should update each house's cached totals. */
export function isHouseStudentPointsRollupEnabled(
  settings: Partial<Pick<Settings, 'enableHouses' | 'housePointsSource' | 'housesRollupPoints'>>,
): boolean {
  return !!settings.enableHouses && resolveHousePointsSource(settings) === 'studentRollup';
}

export function housePointsSourceSettingsPatch(source: HousePointsSource): Pick<Settings, 'housePointsSource' | 'housesRollupPoints'> {
  return {
    housePointsSource: source,
    housesRollupPoints: source === 'studentRollup',
  };
}

export function buildHouseHallOfFameHref(
  schoolId: string,
  settings: Pick<
    Settings,
    | 'houseHallOfFameSortBy'
    | 'houseHallOfFameLimit'
    | 'houseHallOfFamePodiumSize'
    | 'houseHallOfFameAutoScroll'
    | 'houseHallOfFameGridLayout'
    | 'houseHallOfFameGridColumns'
    | 'houseHallOfFameLayout'
    | 'hallOfFameSortBy'
    | 'hallOfFameLimit'
    | 'hallOfFamePodiumSize'
    | 'hallOfFameAutoScroll'
    | 'hallOfFameGridLayout'
    | 'hallOfFameGridColumns'
    | 'hallOfFameLayout'
  >,
): string {
  const params = new URLSearchParams();
  params.set('fullscreen', '1');
  params.set('board', 'houses');
  return `/${schoolId}/hall-of-fame?${params.toString()}`;
}
