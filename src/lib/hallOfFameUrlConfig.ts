export type HallOfFameRankType = 'students' | 'classes' | 'houses' | 'goals';
export type HallOfFameLayout = 'landscape' | 'portrait';

export type HallOfFameUrlConfig = {
  rankType: HallOfFameRankType;
  sortBy: string;
  scope: 'all' | string;
  limit: number;
  podiumSize: number;
  autoScroll: boolean;
  gridLayout: boolean;
  gridColumns: number;
  layout: HallOfFameLayout;
  /** True when legacy URL params are present (rank type pin still applies via {@link parseHallOfFameUrlRankTypePin}). */
  locked: boolean;
};

export type HallOfFameSettingsDefaults = {
  hallOfFameRankType?: HallOfFameRankType;
  hallOfFameSortBy?: string;
  hallOfFameScope?: 'all' | string;
  hallOfFameLimit?: number;
  hallOfFamePodiumSize?: number;
  hallOfFameAutoScroll?: boolean;
  hallOfFameGridLayout?: boolean;
  hallOfFameGridColumns?: number;
  hallOfFameLayout?: HallOfFameLayout;
};

import { isHouseStudentPointsRollupEnabled } from '@/lib/houses/housePointsSettings';

export type HallOfFameLiveSettings = HallOfFameSettingsDefaults & {
  enableHouses?: boolean;
  housePointsSource?: 'studentRollup' | 'manual';
  housesRollupPoints?: boolean;
  houseHallOfFameSortBy?: string;
  houseHallOfFameLimit?: number;
  houseHallOfFamePodiumSize?: number;
  houseHallOfFameAutoScroll?: boolean;
  houseHallOfFameGridLayout?: boolean;
  houseHallOfFameGridColumns?: number;
  houseHallOfFameLayout?: HallOfFameLayout;
};

export type HallOfFameDisplayConfig = Omit<HallOfFameUrlConfig, 'locked'>;

export type PodiumPlace = 1 | 2 | 3 | 4 | 5;

export const HALL_OF_FAME_PODIUM_SIZES = [1, 3, 5] as const;
export type HallOfFamePodiumSize = (typeof HALL_OF_FAME_PODIUM_SIZES)[number];

/** Podium size is limited to 1, 3, or 5 (invalid values snap to nearest). */
export function clampHallOfFamePodiumSize(value: number | undefined): HallOfFamePodiumSize {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 3;
  if (n <= 1) return 1;
  if (n <= 3) return 3;
  return 5;
}

const PODIUM_DISPLAY_PLACES: Record<HallOfFamePodiumSize, PodiumPlace[]> = {
  1: [1],
  3: [2, 1, 3],
  5: [4, 2, 1, 3, 5],
};

/** Build podium slots in display order (e.g. 4th, 2nd, 1st, 3rd, 5th) honoring configured podium size. */
export function buildPodiumDisplaySlots<T>(items: T[], podiumSize: number): { item: T; place: PodiumPlace }[] {
  if (items.length === 0) return [];
  const size = clampHallOfFamePodiumSize(podiumSize);
  return PODIUM_DISPLAY_PLACES[size]
    .filter((place) => place <= items.length)
    .map((place) => ({ item: items[place - 1], place }));
}

export function clampHallOfFameGridColumns(value: number | undefined): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 3;
  return Math.max(1, Math.min(4, n));
}

export function clampHallOfFameLimit(value: number | undefined): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 50;
  return Math.max(1, n);
}

/** House boards only support points / lifetime / period sorts (period requires student rollup). */
export function normalizeHouseHallOfFameSortBy(
  sortBy: string | undefined,
  rollupEnabled: boolean,
): string {
  const normalized = normalizeHallOfFameSortBy(sortBy ?? 'lifetimePoints');
  if (isHallOfFamePointsSort(normalized)) {
    return normalized === 'points' ? 'points' : 'lifetimePoints';
  }
  if (normalized.startsWith('period_') && rollupEnabled) return normalized;
  return 'lifetimePoints';
}

export function hallOfFameUsesClientSideStudentRanking(sortBy: string): boolean {
  return !isHallOfFamePointsSort(sortBy);
}

export function hallOfFameGridColumnClass(
  columns: number,
  portrait = false,
  /** Fullscreen stage: apply column count directly (no responsive breakpoints). */
  fixedColumns = false,
): string {
  if (portrait) return 'grid-cols-1';
  const n = clampHallOfFameGridColumns(columns);
  if (fixedColumns) {
    if (n === 1) return 'grid-cols-1';
    if (n === 2) return 'grid-cols-2';
    if (n === 3) return 'grid-cols-3';
    return 'grid-cols-4';
  }
  if (n === 1) return 'grid-cols-1';
  if (n === 2) return 'grid-cols-1 sm:grid-cols-2';
  if (n === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
}

function parseRankType(raw: string): HallOfFameRankType | null {
  const rank = raw.trim().toLowerCase();
  if (rank === 'classes' || rank === 'class-standings' || rank === 'class_standings') return 'classes';
  if (rank === 'houses' || rank === 'house-standings' || rank === 'house_standings') return 'houses';
  if (rank === 'goals' || rank === 'school-goals' || rank === 'school_goals') return 'goals';
  if (rank === 'students' || rank === 'student') return 'students';
  return null;
}

/** Normalize sortBy URL typos (e.g. lifeTimePoints → lifetimePoints). */
export function normalizeHallOfFameSortBy(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return 'lifetimePoints';
  const compact = trimmed.toLowerCase().replace(/[_\s-]/g, '');
  if (compact === 'lifetimepoints') return 'lifetimePoints';
  if (compact === 'points' || compact === 'currentpoints') return 'points';
  if (compact === 'periodday') return 'period_day';
  if (compact === 'periodweek') return 'period_week';
  if (compact === 'periodmonth') return 'period_month';
  return trimmed;
}

export function isHallOfFamePointsSort(sortBy: string): boolean {
  const compact = sortBy.trim().toLowerCase().replace(/[_\s-]/g, '');
  return compact === 'points' || compact === 'lifetimepoints';
}

export function getHallOfFameStageSizeStyle(portrait: boolean): {
  width: string;
  height: string;
} {
  if (portrait) {
    return {
      width: 'min(100vw, calc(100dvh * 9 / 16))',
      height: 'min(100dvh, calc(100vw * 16 / 9))',
    };
  }
  return {
    width: 'min(100vw, calc(100dvh * 16 / 9))',
    height: 'min(100dvh, calc(100vw * 9 / 16))',
  };
}

function parseBoolParam(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (v === '1' || v === 'true') return true;
  if (v === '0' || v === 'false') return false;
  return null;
}

/** When set, keeps the monitor on a specific leaderboard type (e.g. houses). */
export function parseHallOfFameUrlRankTypePin(
  params: URLSearchParams | null | undefined,
): HallOfFameRankType | null {
  if (!params) return null;

  const rankRaw = (params.get('rankType') || params.get('rank') || '').trim();
  const parsedRank = rankRaw ? parseRankType(rankRaw) : null;
  if (parsedRank) return parsedRank;

  const view = (params.get('view') || '').trim().toLowerCase();
  if (view === 'house-standings' || view === 'house_standings') return 'houses';
  if (view === 'class-standings' || view === 'classes' || view === 'class_standings') return 'classes';
  if (view === 'goals' || view === 'school-goals' || view === 'school_goals') return 'goals';

  return null;
}

/** Live monitor display config — always follows saved school settings. */
export function resolveHallOfFameDisplayConfig(
  settings: HallOfFameLiveSettings,
  urlRankTypePin?: HallOfFameRankType | null,
): HallOfFameDisplayConfig {
  const rankType = urlRankTypePin ?? settings.hallOfFameRankType ?? 'students';
  const housesView = rankType === 'houses';
  const rollupEnabled = isHouseStudentPointsRollupEnabled(settings);

  return {
    rankType,
    sortBy: housesView
      ? normalizeHouseHallOfFameSortBy(
          settings.houseHallOfFameSortBy ?? settings.hallOfFameSortBy,
          rollupEnabled,
        )
      : (settings.hallOfFameSortBy ?? 'lifetimePoints'),
    scope: housesView ? 'all' : (settings.hallOfFameScope ?? 'all'),
    limit: clampHallOfFameLimit(
      housesView
        ? (settings.houseHallOfFameLimit ?? settings.hallOfFameLimit)
        : settings.hallOfFameLimit,
    ),
    podiumSize: clampHallOfFamePodiumSize(
      housesView
        ? (settings.houseHallOfFamePodiumSize ?? settings.hallOfFamePodiumSize)
        : settings.hallOfFamePodiumSize,
    ),
    autoScroll: housesView
      ? (settings.houseHallOfFameAutoScroll ?? settings.hallOfFameAutoScroll ?? false)
      : (settings.hallOfFameAutoScroll ?? false),
    gridLayout: housesView
      ? (settings.houseHallOfFameGridLayout ?? settings.hallOfFameGridLayout ?? true)
      : (settings.hallOfFameGridLayout ?? true),
    gridColumns: clampHallOfFameGridColumns(
      housesView
        ? (settings.houseHallOfFameGridColumns ?? settings.hallOfFameGridColumns)
        : settings.hallOfFameGridColumns,
    ),
    layout: housesView
      ? (settings.houseHallOfFameLayout ?? settings.hallOfFameLayout ?? 'landscape')
      : (settings.hallOfFameLayout ?? 'landscape'),
  };
}

/** Read Hall of Fame display options from query string (shared by page + tests). */
export function parseHallOfFameSearchParams(
  params: URLSearchParams | null | undefined,
  settingsDefaults: HallOfFameSettingsDefaults = {},
): HallOfFameUrlConfig {
  const defaults: HallOfFameUrlConfig = {
    rankType: settingsDefaults.hallOfFameRankType ?? 'students',
    sortBy: settingsDefaults.hallOfFameSortBy ?? 'lifetimePoints',
    scope: settingsDefaults.hallOfFameScope ?? 'all',
    limit: settingsDefaults.hallOfFameLimit ?? 50,
    podiumSize: settingsDefaults.hallOfFamePodiumSize ?? 3,
    autoScroll: settingsDefaults.hallOfFameAutoScroll ?? false,
    gridLayout: settingsDefaults.hallOfFameGridLayout ?? true,
    gridColumns: clampHallOfFameGridColumns(settingsDefaults.hallOfFameGridColumns),
    layout: settingsDefaults.hallOfFameLayout ?? 'landscape',
    locked: false,
  };

  if (!params) return defaults;

  const rankRaw = (params.get('rankType') || params.get('rank') || params.get('view') || '').trim();
  const sortRaw = (params.get('sortBy') || '').trim();
  const scopeRaw = (params.get('scope') || '').trim();
  const limitRaw = (params.get('limit') || '').trim();
  const podiumRaw = (params.get('podiumSize') || '').trim();
  const autoRaw = (params.get('autoScroll') || '').trim();
  const gridRaw = (params.get('grid') || '').trim();
  const gridColumnsRaw = (params.get('gridColumns') || '').trim();
  const layoutRaw = (params.get('layout') || '').trim().toLowerCase();

  const hasUrlConfig = !!(
    rankRaw ||
    sortRaw ||
    scopeRaw ||
    params.get('limit') ||
    params.get('podiumSize') ||
    autoRaw ||
    gridRaw ||
    gridColumnsRaw ||
    layoutRaw
  );

  if (!hasUrlConfig) return defaults;

  const config: HallOfFameUrlConfig = { ...defaults, locked: true };

  const parsedRank = rankRaw ? parseRankType(rankRaw) : null;
  if (parsedRank) config.rankType = parsedRank;

  if (sortRaw) config.sortBy = normalizeHallOfFameSortBy(sortRaw);

  if (scopeRaw) config.scope = scopeRaw;

  const lim = parseInt(limitRaw, 10);
  if (!Number.isNaN(lim) && lim > 0) config.limit = lim;

  const pod = parseInt(podiumRaw, 10);
  if (!Number.isNaN(pod) && pod >= 0) config.podiumSize = clampHallOfFamePodiumSize(pod);

  const auto = parseBoolParam(autoRaw);
  if (auto !== null) config.autoScroll = auto;

  const grid = parseBoolParam(gridRaw);
  if (grid !== null) config.gridLayout = grid;

  const gridCols = parseInt(gridColumnsRaw, 10);
  if (!Number.isNaN(gridCols) && gridCols > 0) config.gridColumns = clampHallOfFameGridColumns(gridCols);

  if (layoutRaw === 'portrait' || layoutRaw === 'landscape') config.layout = layoutRaw;

  // Back-compat: older links only passed `view`.
  const view = (params.get('view') || params.get('rank') || '').trim().toLowerCase();
  if (view === 'class-standings' || view === 'classes' || view === 'class_standings') {
    config.rankType = 'classes';
    config.sortBy = 'points';
  } else if (view === 'goals' || view === 'school-goals' || view === 'school_goals') {
    config.rankType = 'goals';
    config.sortBy = 'lifetimePoints';
  }

  return config;
}

/** Build a launch URL for the Hall of Fame display from saved settings. */
export function buildHallOfFameHref(
  schoolId: string,
  settings: HallOfFameSettingsDefaults & { hallOfFameRankType?: HallOfFameRankType },
): string {
  const params = new URLSearchParams();
  params.set('fullscreen', '1');
  const rankType = settings.hallOfFameRankType ?? 'students';
  if (rankType !== 'students') params.set('rankType', rankType);
  return `/${schoolId}/hall-of-fame?${params.toString()}`;
}
