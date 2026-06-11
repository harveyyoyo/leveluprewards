/** Local persistence for classroom seating layouts (per school + scope + class). */

export type ClassroomDesign = 'aurora' | 'minimal' | 'midnight' | 'playful' | 'brutalist';

/** Legacy in-classroom dark theme — migrated to aurora; use app light/dark instead. */
export function normalizeClassroomDesign(design: ClassroomDesign): ClassroomDesign {
  if (design === 'midnight') return 'aurora';
  return design;
}

/** Desk celebration on award. `flash` = simple ring (+PTS); particles are the rest. Fly-up is separate. */
export type ClassroomCelebrationEffect =
  | 'flash'
  | 'none'
  | 'sparkles'
  | 'confetti'
  | 'hearts'
  | 'stars'
  | 'fireworks'
  | 'snow';

export type ClassroomQuickAward = {
  id: string;
  label: string;
  points: number;
  description: string;
};

export type ClassroomSeatingLayout = {
  rows: number;
  cols: number;
  /** Flat grid row-major; null = empty desk */
  cells: (string | null)[];
};

export type ClassroomSeatingPrefs = {
  autoAwardMs: number;
  defaultPoints: number;
  defaultDescription: string;
  quickAwards: ClassroomQuickAward[];
  /** When true, quick select (one tap = default points); when false, show awards menu on tap. */
  instantTap: boolean;
  /** Show lifetime balance on each desk. */
  showPointBalances: boolean;
  /** Show points earned this session on each desk. */
  showSessionTotals: boolean;
  /** When session badges are on, show the latest award label under the session total. */
  showSessionLastAward: boolean;
  /** Append last name after the desk label (nickname or first name). */
  showLastName: boolean;
  /** Show student sticker / theme emoji on each desk avatar (photo still wins when set). */
  showStudentEmoji: boolean;
  /** Optional quick deduct button in the award menu. */
  correctionPoints: number;
  correctionLabel: string;
  correctionDescription: string;
  /** Visual theme for seating cards. */
  design: ClassroomDesign;
  /** When true, teacher desk is at the bottom and row 0 is nearest the desk. */
  frontAtBottom: boolean;
  /** Optional particle overlay when points are awarded (independent of fly-up). */
  celebrationEffect: ClassroomCelebrationEffect;
  /** Kiosk-style +PTS fly-up (separate from celebration particles). */
  showKioskFlyUp: boolean;
  /** Visual scale for kiosk fly-up text. */
  kioskFlyUpSize: ClassroomKioskFlyUpSize;
  /** Show Random picker on the teacher desk row (+ R shortcut when enabled). */
  showRandomPicker: boolean;
  /** Show Class +N on the teacher desk row. */
  showClassAwardButton: boolean;
  /** Show Burst select-and-award on the teacher desk row. */
  showBurstAward: boolean;
  /** When Rewards pillar is on: local classroom balance vs school reward categories. Ignored when Rewards is off. */
  awardSource: ClassroomAwardSource;
  /** Play arcade sounds when awarding or deducting points from the chart. */
  awardSounds: boolean;
  /** Which setting menus appear on the fullscreen monitor toolbar. */
  monitorMenuTabs: ClassroomMonitorMenuTabs;
  /** Internal — bumps when defaults change. */
  prefsVersion?: number;
};

export type ClassroomMonitorMenuTab =
  | 'style'
  | 'deskDisplay'
  | 'tapMode'
  | 'awardSource'
  | 'effects'
  | 'defaults'
  | 'sounds';

export type ClassroomMonitorMenuTabs = Record<ClassroomMonitorMenuTab, boolean>;

export const DEFAULT_MONITOR_MENU_TABS: ClassroomMonitorMenuTabs = {
  style: true,
  deskDisplay: true,
  tapMode: true,
  awardSource: false,
  effects: true,
  defaults: true,
  sounds: true,
};

export const MONITOR_MENU_TAB_LABELS: Record<ClassroomMonitorMenuTab, string> = {
  style: 'Chart style',
  deskDisplay: 'Desk display',
  tapMode: 'Tap mode',
  awardSource: 'Award source',
  effects: 'Effects',
  defaults: 'Default points',
  sounds: 'Sounds',
};

/** Setting menus users can show/hide via Toolbar options (layout is edit-mode only). */
export const MONITOR_MENU_TAB_ORDER: ClassroomMonitorMenuTab[] = [
  'style',
  'deskDisplay',
  'tapMode',
  'awardSource',
  'effects',
  'defaults',
  'sounds',
];

export type ClassroomKioskFlyUpSize = 'small' | 'medium' | 'large';

/** When Rewards pillar is on: local = quick awards + classroom balance; categories = Points tab categories + rewards balance. */
export type ClassroomAwardSource = 'local' | 'categories';

export const DEFAULT_CLASSROOM_QUICK_AWARDS: ClassroomQuickAward[] = [
  { id: 'quick', label: 'Quick tap', points: 5, description: 'Quick award' },
  { id: 'question', label: 'Good question', points: 10, description: 'Good question' },
  { id: 'effort', label: 'Great effort', points: 15, description: 'Great effort' },
  { id: 'super', label: 'Superstar', points: 20, description: 'Superstar' },
];

/** Bump when classroom tap/effect defaults change — triggers one-time localStorage migration. */
export const CLASSROOM_PREFS_VERSION = 20;

export const DEFAULT_CLASSROOM_PREFS: ClassroomSeatingPrefs = {
  autoAwardMs: 3000,
  defaultPoints: 5,
  defaultDescription: 'Quick award',
  quickAwards: DEFAULT_CLASSROOM_QUICK_AWARDS,
  instantTap: true,
  showPointBalances: true,
  showSessionTotals: true,
  showSessionLastAward: true,
  showLastName: false,
  showStudentEmoji: false,
  correctionPoints: 0,
  correctionLabel: 'Reminder',
  correctionDescription: 'Behavior reminder',
  design: 'playful',
  frontAtBottom: false,
  celebrationEffect: 'flash',
  showKioskFlyUp: true,
  kioskFlyUpSize: 'large',
  showRandomPicker: false,
  showClassAwardButton: false,
  showBurstAward: false,
  awardSource: 'local',
  awardSounds: true,
  monitorMenuTabs: { ...DEFAULT_MONITOR_MENU_TABS },
  prefsVersion: CLASSROOM_PREFS_VERSION,
};

export function normalizeMonitorMenuTabs(raw: unknown): ClassroomMonitorMenuTabs {
  const parsed = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const tab = (key: ClassroomMonitorMenuTab) =>
    typeof parsed[key] === 'boolean' ? (parsed[key] as boolean) : DEFAULT_MONITOR_MENU_TABS[key];
  return {
    style: tab('style'),
    deskDisplay: tab('deskDisplay'),
    tapMode: tab('tapMode'),
    awardSource: tab('awardSource'),
    effects: tab('effects'),
    defaults: tab('defaults'),
    sounds: tab('sounds'),
  };
}

const VALID_KIOSK_FLY_UP_SIZES: ClassroomKioskFlyUpSize[] = ['small', 'medium', 'large'];

export function normalizeKioskFlyUpSize(size: unknown): ClassroomKioskFlyUpSize {
  if (typeof size === 'string' && VALID_KIOSK_FLY_UP_SIZES.includes(size as ClassroomKioskFlyUpSize)) {
    return size as ClassroomKioskFlyUpSize;
  }
  return DEFAULT_CLASSROOM_PREFS.kioskFlyUpSize;
}

export function normalizeClassroomAwardSource(source: unknown): ClassroomAwardSource {
  return source === 'local' ? 'local' : 'categories';
}

const LAYOUT_PREFIX = 'levelup-classroom-layout:';
const PREFS_PREFIX = 'levelup-classroom-prefs:';

const VALID_CELEBRATION_EFFECTS: ClassroomCelebrationEffect[] = [
  'flash',
  'none',
  'sparkles',
  'confetti',
  'hearts',
  'stars',
  'fireworks',
  'snow',
];

/** Legacy prefs stored fly-up or desk flash as celebration. */
const LEGACY_FLY_UP_EFFECT = 'flyUp';
const LEGACY_FLASH_EFFECT = 'flash';

function normalizeCelebrationEffect(effect: string | undefined): ClassroomCelebrationEffect {
  if (effect === LEGACY_FLY_UP_EFFECT) return 'none';
  if (effect === LEGACY_FLASH_EFFECT || effect === 'flash') return 'flash';
  if (effect && VALID_CELEBRATION_EFFECTS.includes(effect as ClassroomCelebrationEffect)) {
    return effect as ClassroomCelebrationEffect;
  }
  return DEFAULT_CLASSROOM_PREFS.celebrationEffect;
}

function hadLegacyFlyUpEffect(celebrationEffect: unknown): boolean {
  return typeof celebrationEffect === 'string' && celebrationEffect === LEGACY_FLY_UP_EFFECT;
}

function normalizeShowKioskFlyUp(
  parsed: Partial<ClassroomSeatingPrefs> & { celebrationEffect?: string },
): boolean {
  if (typeof parsed.showKioskFlyUp === 'boolean') return parsed.showKioskFlyUp;
  if (hadLegacyFlyUpEffect(parsed.celebrationEffect)) return true;
  return DEFAULT_CLASSROOM_PREFS.showKioskFlyUp;
}

function layoutKey(schoolId: string, scope: string, classId: string) {
  return `${LAYOUT_PREFIX}${schoolId}:${scope}:${classId}`;
}

function prefsKey(schoolId: string, scope: string) {
  return `${PREFS_PREFIX}${schoolId}:${scope}`;
}

export function loadClassroomLayout(
  schoolId: string,
  scope: string,
  classId: string,
): ClassroomSeatingLayout | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(layoutKey(schoolId, scope, classId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClassroomSeatingLayout;
    if (!parsed?.rows || !parsed?.cols || !Array.isArray(parsed.cells)) return null;
    const size = parsed.rows * parsed.cols;
    if (parsed.cells.length !== size) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveClassroomLayout(
  schoolId: string,
  scope: string,
  classId: string,
  layout: ClassroomSeatingLayout,
) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(layoutKey(schoolId, scope, classId), JSON.stringify(layout));
  } catch {
    /* quota */
  }
}

export function loadClassroomPrefs(schoolId: string, scope: string): ClassroomSeatingPrefs {
  if (typeof window === 'undefined') return DEFAULT_CLASSROOM_PREFS;
  try {
    const raw = localStorage.getItem(prefsKey(schoolId, scope));
    if (!raw) return DEFAULT_CLASSROOM_PREFS;
    const parsed = JSON.parse(raw) as Partial<ClassroomSeatingPrefs>;
    const parsedVersion = parsed.prefsVersion ?? 1;
    const migrated = parsedVersion < CLASSROOM_PREFS_VERSION;
    const prefs: ClassroomSeatingPrefs = {
      ...DEFAULT_CLASSROOM_PREFS,
      ...parsed,
      quickAwards:
        parsed.quickAwards?.length && parsed.quickAwards.every((q) => q.label && q.points > 0)
          ? parsed.quickAwards
          : DEFAULT_CLASSROOM_PREFS.quickAwards,
      instantTap:
        typeof parsed.instantTap === 'boolean'
          ? parsed.instantTap
          : DEFAULT_CLASSROOM_PREFS.instantTap,
      showPointBalances: parsed.showPointBalances ?? DEFAULT_CLASSROOM_PREFS.showPointBalances,
      showSessionTotals: parsed.showSessionTotals ?? DEFAULT_CLASSROOM_PREFS.showSessionTotals,
      showSessionLastAward:
        parsed.showSessionLastAward ?? DEFAULT_CLASSROOM_PREFS.showSessionLastAward,
      showLastName: parsed.showLastName ?? DEFAULT_CLASSROOM_PREFS.showLastName,
      showStudentEmoji: parsed.showStudentEmoji ?? DEFAULT_CLASSROOM_PREFS.showStudentEmoji,
      correctionPoints: parsed.correctionPoints ?? DEFAULT_CLASSROOM_PREFS.correctionPoints,
      correctionLabel: parsed.correctionLabel ?? DEFAULT_CLASSROOM_PREFS.correctionLabel,
      correctionDescription:
        parsed.correctionDescription ?? DEFAULT_CLASSROOM_PREFS.correctionDescription,
      design: normalizeClassroomDesign(parsed.design ?? DEFAULT_CLASSROOM_PREFS.design),
      frontAtBottom: parsed.frontAtBottom ?? DEFAULT_CLASSROOM_PREFS.frontAtBottom,
      celebrationEffect: normalizeCelebrationEffect(parsed.celebrationEffect),
      showKioskFlyUp: normalizeShowKioskFlyUp(parsed),
      kioskFlyUpSize: normalizeKioskFlyUpSize(parsed.kioskFlyUpSize),
      showRandomPicker: parsed.showRandomPicker ?? DEFAULT_CLASSROOM_PREFS.showRandomPicker,
      showClassAwardButton:
        parsed.showClassAwardButton ?? DEFAULT_CLASSROOM_PREFS.showClassAwardButton,
      showBurstAward: parsed.showBurstAward ?? DEFAULT_CLASSROOM_PREFS.showBurstAward,
      awardSource: normalizeClassroomAwardSource(parsed.awardSource),
      awardSounds: parsed.awardSounds ?? DEFAULT_CLASSROOM_PREFS.awardSounds,
      monitorMenuTabs: normalizeMonitorMenuTabs(parsed.monitorMenuTabs),
      prefsVersion: CLASSROOM_PREFS_VERSION,
    };
    if (parsedVersion < 18) {
      prefs.showRandomPicker = false;
      prefs.showClassAwardButton = false;
      prefs.showBurstAward = false;
    }
    if (parsedVersion < 19 && prefs.kioskFlyUpSize === 'medium') {
      prefs.kioskFlyUpSize = 'large';
    }
    if (parsedVersion < 13 && prefs.celebrationEffect === 'none') {
      prefs.celebrationEffect = 'flash';
    }
    if (
      migrated ||
      parsed.instantTap === false ||
      parsed.design === 'midnight' ||
      hadLegacyFlyUpEffect(parsed.celebrationEffect) ||
      String(parsed.celebrationEffect) === LEGACY_FLASH_EFFECT ||
      (parsedVersion < 5 && parsed.celebrationEffect === 'none') ||
      parsedVersion < 13
    ) {
      if (parsedVersion < 5 && parsed.celebrationEffect === 'none') {
        prefs.celebrationEffect = 'flash';
      }
      saveClassroomPrefs(schoolId, scope, prefs);
    }
    return prefs;
  } catch {
    return DEFAULT_CLASSROOM_PREFS;
  }
}

export function saveClassroomPrefs(schoolId: string, scope: string, prefs: ClassroomSeatingPrefs) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(prefsKey(schoolId, scope), JSON.stringify(prefs));
  } catch {
    /* quota */
  }
}

/** Build an initial grid that fits all student ids (5 columns by default). */
export function buildInitialLayout(studentIds: string[], cols = 5): ClassroomSeatingLayout {
  const count = Math.max(studentIds.length, cols);
  const rows = Math.max(1, Math.ceil(count / cols));
  const cells: (string | null)[] = Array.from({ length: rows * cols }, () => null);
  studentIds.forEach((id, i) => {
    if (i < cells.length) cells[i] = id;
  });
  return { rows, cols, cells };
}

export function resizeLayout(
  layout: ClassroomSeatingLayout,
  rows: number,
  cols: number,
): ClassroomSeatingLayout {
  const nextCells: (string | null)[] = Array.from({ length: rows * cols }, () => null);
  const oldRows = layout.rows;
  const oldCols = layout.cols;
  for (let r = 0; r < Math.min(rows, oldRows); r++) {
    for (let c = 0; c < Math.min(cols, oldCols); c++) {
      nextCells[r * cols + c] = layout.cells[r * oldCols + c] ?? null;
    }
  }
  return { rows, cols, cells: nextCells };
}

export function swapCells(layout: ClassroomSeatingLayout, from: number, to: number): ClassroomSeatingLayout {
  const cells = [...layout.cells];
  const tmp = cells[from] ?? null;
  cells[from] = cells[to] ?? null;
  cells[to] = tmp;
  return { ...layout, cells };
}

export function studentIdsInLayout(layout: ClassroomSeatingLayout): Set<string> {
  return new Set(layout.cells.filter((id): id is string => !!id));
}

/** Map visual grid position (top-left first) to flat layout cell index. */
export function layoutCellIndexAt(
  layout: ClassroomSeatingLayout,
  visualRow: number,
  visualCol: number,
  frontAtBottom: boolean,
): number {
  const row = frontAtBottom ? layout.rows - 1 - visualRow : visualRow;
  return row * layout.cols + visualCol;
}

/** Visual positions in render order (row-major from top of screen). */
export function visualLayoutPositions(
  layout: ClassroomSeatingLayout,
  frontAtBottom: boolean,
): { visualRow: number; visualCol: number; cellIndex: number }[] {
  const out: { visualRow: number; visualCol: number; cellIndex: number }[] = [];
  for (let vr = 0; vr < layout.rows; vr++) {
    for (let vc = 0; vc < layout.cols; vc++) {
      out.push({
        visualRow: vr,
        visualCol: vc,
        cellIndex: layoutCellIndexAt(layout, vr, vc, frontAtBottom),
      });
    }
  }
  return out;
}

const SESSION_PREFIX = 'levelup-classroom-session:';
const SESSION_SYNC_CHANNEL = 'levelup-classroom-session-sync';

export function classroomSessionStorageKey(schoolId: string, scope: string, classId: string) {
  const day = new Date().toISOString().slice(0, 10);
  return `${SESSION_PREFIX}${schoolId}:${scope}:${classId}:${day}`;
}

export type ClassroomSessionTotals = Record<string, number>;

export type ClassroomSessionLastAward = {
  label: string;
  points: number;
  at: number;
};

export type ClassroomSessionActivityEntry = {
  id: string;
  at: number;
  label: string;
  points: number;
  studentLabel: string;
};

export type ClassroomSessionData = {
  totals: ClassroomSessionTotals;
  lastAward: Record<string, ClassroomSessionLastAward>;
  activity?: ClassroomSessionActivityEntry[];
};

export type ClassroomSessionAwardDelta = {
  studentId: string;
  points: number;
  at: number;
};

/** Positive awards that appeared since the previous session snapshot (for class-screen effect sync). */
export function findNewSessionAwards(
  previous: Record<string, ClassroomSessionLastAward>,
  next: Record<string, ClassroomSessionLastAward>,
): ClassroomSessionAwardDelta[] {
  const deltas: ClassroomSessionAwardDelta[] = [];
  for (const [studentId, entry] of Object.entries(next)) {
    if (!entry || entry.points <= 0) continue;
    const prev = previous[studentId];
    if (!prev || entry.at > prev.at) {
      deltas.push({ studentId, points: entry.points, at: entry.at });
    }
  }
  return deltas.sort((a, b) => a.at - b.at);
}

const EMPTY_SESSION: ClassroomSessionData = { totals: {}, lastAward: {}, activity: [] };

function normalizeSessionPayload(parsed: unknown): ClassroomSessionData {
  if (!parsed || typeof parsed !== 'object') return EMPTY_SESSION;
  const record = parsed as Record<string, unknown>;
  if ('totals' in record || 'lastAward' in record) {
    const totals =
      record.totals && typeof record.totals === 'object'
        ? (record.totals as ClassroomSessionTotals)
        : {};
    const lastAward =
      record.lastAward && typeof record.lastAward === 'object'
        ? (record.lastAward as Record<string, ClassroomSessionLastAward>)
        : {};
    const activity = Array.isArray(record.activity)
      ? (record.activity as ClassroomSessionActivityEntry[]).filter(
          (e) => e && typeof e.at === 'number' && typeof e.label === 'string',
        )
      : [];
    return { totals, lastAward, activity };
  }
  return { totals: record as ClassroomSessionTotals, lastAward: {}, activity: [] };
}

const SESSION_ACTIVITY_LIMIT = 40;

export function appendClassroomSessionActivity(
  data: ClassroomSessionData,
  entry: Omit<ClassroomSessionActivityEntry, 'id'> & { id?: string },
): ClassroomSessionActivityEntry[] {
  const id = entry.id ?? `${entry.at}-${Math.random().toString(36).slice(2, 8)}`;
  return [{ ...entry, id }, ...(data.activity ?? [])].slice(0, SESSION_ACTIVITY_LIMIT);
}

export function loadClassroomSession(
  schoolId: string,
  scope: string,
  classId: string,
): ClassroomSessionData {
  if (typeof window === 'undefined') return EMPTY_SESSION;
  try {
    const raw = sessionStorage.getItem(classroomSessionStorageKey(schoolId, scope, classId));
    if (!raw) return EMPTY_SESSION;
    return normalizeSessionPayload(JSON.parse(raw));
  } catch {
    return EMPTY_SESSION;
  }
}

/** @deprecated Use loadClassroomSession — totals only. */
export function loadClassroomSessionTotals(
  schoolId: string,
  scope: string,
  classId: string,
): ClassroomSessionTotals {
  return loadClassroomSession(schoolId, scope, classId).totals;
}

type ClassroomSessionSyncMessage = {
  key: string;
  data: ClassroomSessionData;
};

function broadcastClassroomSessionUpdate(storageKey: string, data: ClassroomSessionData) {
  if (typeof BroadcastChannel === 'undefined') return;
  try {
    const channel = new BroadcastChannel(SESSION_SYNC_CHANNEL);
    channel.postMessage({ key: storageKey, data } satisfies ClassroomSessionSyncMessage);
    channel.close();
  } catch {
    /* unsupported */
  }
}

/** Listen for session updates from other tabs (teacher monitor → class screen). */
export function subscribeClassroomSessionUpdates(
  onUpdate: (storageKey: string, data: ClassroomSessionData) => void,
): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => undefined;
  try {
    const channel = new BroadcastChannel(SESSION_SYNC_CHANNEL);
    channel.onmessage = (event: MessageEvent<ClassroomSessionSyncMessage>) => {
      const { key, data } = event.data ?? {};
      if (typeof key === 'string' && data && typeof data === 'object') onUpdate(key, data);
    };
    return () => channel.close();
  } catch {
    return () => undefined;
  }
}

export function saveClassroomSession(
  schoolId: string,
  scope: string,
  classId: string,
  data: ClassroomSessionData,
) {
  if (typeof window === 'undefined') return;
  try {
    const key = classroomSessionStorageKey(schoolId, scope, classId);
    sessionStorage.setItem(key, JSON.stringify(data));
    broadcastClassroomSessionUpdate(key, data);
  } catch {
    /* quota */
  }
}

/** Clears on-screen session totals only — does not change stored student points. */
export function clearClassroomSession(
  schoolId: string,
  scope: string,
  classId: string,
): ClassroomSessionData {
  const empty: ClassroomSessionData = { totals: {}, lastAward: {}, activity: [] };
  saveClassroomSession(schoolId, scope, classId, empty);
  return empty;
}

export function applyClassroomSessionAward(
  schoolId: string,
  scope: string,
  classId: string,
  studentIds: string[],
  pointsDelta: number,
  awardLabel: string,
  activityMeta?: { studentLabel: string },
): ClassroomSessionData {
  const current = loadClassroomSession(schoolId, scope, classId);
  const nextTotals = { ...current.totals };
  const nextLast = { ...current.lastAward };
  const stamp = Date.now();
  const label = awardLabel.trim() || 'Award';
  for (const id of studentIds) {
    nextTotals[id] = (nextTotals[id] ?? 0) + pointsDelta;
    if (pointsDelta !== 0) {
      nextLast[id] = { label, points: pointsDelta, at: stamp };
    }
  }
  let activity = current.activity ?? [];
  if (activityMeta?.studentLabel && pointsDelta !== 0) {
    activity = appendClassroomSessionActivity(current, {
      at: stamp,
      label,
      points: pointsDelta,
      studentLabel: activityMeta.studentLabel,
    });
  }
  const next: ClassroomSessionData = { totals: nextTotals, lastAward: nextLast, activity };
  saveClassroomSession(schoolId, scope, classId, next);
  return next;
}

/** @deprecated Use applyClassroomSessionAward */
export function addToClassroomSession(
  schoolId: string,
  scope: string,
  classId: string,
  studentIds: string[],
  pointsDelta: number,
): ClassroomSessionTotals {
  const next = applyClassroomSessionAward(
    schoolId,
    scope,
    classId,
    studentIds,
    pointsDelta,
    'Award',
  );
  return next.totals;
}
