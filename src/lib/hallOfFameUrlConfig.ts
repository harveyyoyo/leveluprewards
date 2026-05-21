export type HallOfFameRankType = 'students' | 'classes' | 'houses' | 'goals';

export type HallOfFameUrlConfig = {
  rankType: HallOfFameRankType;
  sortBy: string;
  scope: 'all' | string;
  limit: number;
  podiumSize: number;
  autoScroll: boolean;
  gridLayout: boolean;
  /** True when the URL explicitly configures the display (should not follow live appSettings). */
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
};

function parseRankType(raw: string): HallOfFameRankType | null {
  const rank = raw.trim().toLowerCase();
  if (rank === 'classes' || rank === 'class-standings' || rank === 'class_standings') return 'classes';
  if (rank === 'houses' || rank === 'house-standings' || rank === 'house_standings') return 'houses';
  if (rank === 'goals' || rank === 'school-goals' || rank === 'school_goals') return 'goals';
  if (rank === 'students' || rank === 'student') return 'students';
  return null;
}

function parseBoolParam(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (v === '1' || v === 'true') return true;
  if (v === '0' || v === 'false') return false;
  return null;
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

  const hasUrlConfig = !!(
    rankRaw ||
    sortRaw ||
    scopeRaw ||
    params.get('limit') ||
    params.get('podiumSize') ||
    autoRaw ||
    gridRaw
  );

  if (!hasUrlConfig) return defaults;

  const config: HallOfFameUrlConfig = { ...defaults, locked: true };

  const parsedRank = rankRaw ? parseRankType(rankRaw) : null;
  if (parsedRank) config.rankType = parsedRank;

  if (sortRaw) config.sortBy = sortRaw;

  if (scopeRaw) config.scope = scopeRaw;

  const lim = parseInt(limitRaw, 10);
  if (!Number.isNaN(lim) && lim > 0) config.limit = lim;

  const pod = parseInt(podiumRaw, 10);
  if (!Number.isNaN(pod) && pod >= 0) config.podiumSize = Math.max(0, Math.min(3, pod));

  const auto = parseBoolParam(autoRaw);
  if (auto !== null) config.autoScroll = auto;

  const grid = parseBoolParam(gridRaw);
  if (grid !== null) config.gridLayout = grid;

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
