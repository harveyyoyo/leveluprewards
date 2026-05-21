import type { Settings } from '@/components/providers/SettingsProvider';
import type { HousePresetThemeId } from '@/lib/housePresets';

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
    houseHallOfFameAutoScroll: false,
  });
}

/** How house totals are maintained for competitions and Hall of Fame. */
export function resolveHousePointsSource(
  settings: Pick<Settings, 'housePointsSource' | 'housesRollupPoints'>,
): HousePointsSource {
  if (settings.housePointsSource === 'manual' || settings.housePointsSource === 'studentRollup') {
    return settings.housePointsSource;
  }
  return settings.housesRollupPoints === false ? 'manual' : 'studentRollup';
}

/** True when teacher/student point awards should update each house's cached totals. */
export function isHouseStudentPointsRollupEnabled(
  settings: Pick<Settings, 'enableHouses' | 'housePointsSource' | 'housesRollupPoints'>,
): boolean {
  return settings.enableHouses && resolveHousePointsSource(settings) === 'studentRollup';
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
    | 'hallOfFameSortBy'
    | 'hallOfFameLimit'
    | 'hallOfFamePodiumSize'
    | 'hallOfFameAutoScroll'
    | 'hallOfFameGridLayout'
  >,
): string {
  const params = new URLSearchParams();
  params.set('fullscreen', '1');
  params.set('rankType', 'houses');
  params.set('scope', 'all');
  params.set('sortBy', settings.houseHallOfFameSortBy ?? settings.hallOfFameSortBy ?? 'lifetimePoints');
  params.set('limit', String(settings.houseHallOfFameLimit ?? settings.hallOfFameLimit ?? 50));
  params.set('podiumSize', String(settings.houseHallOfFamePodiumSize ?? settings.hallOfFamePodiumSize ?? 3));
  const autoScroll = settings.houseHallOfFameAutoScroll ?? settings.hallOfFameAutoScroll ?? false;
  const gridLayout = settings.houseHallOfFameGridLayout ?? settings.hallOfFameGridLayout ?? true;
  if (autoScroll) params.set('autoScroll', '1');
  if (!gridLayout) params.set('grid', '0');
  return `/${schoolId}/hall-of-fame?${params.toString()}`;
}
