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
  /** When true, tap once awards default points; when false, opens the award menu. */
  instantTap: boolean;
  /** Show lifetime balance on each desk. */
  showPointBalances: boolean;
  /** Show points earned this session on each desk. */
  showSessionTotals: boolean;
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
  /** Show Random picker button and R keyboard shortcut on the seating toolbar. */
  showRandomPicker: boolean;
  /** Show Class +N button to award everyone on the seating chart at once. */
  showClassAwardButton: boolean;
  /** Internal — bumps when defaults change. */
  prefsVersion?: number;
};

export type ClassroomKioskFlyUpSize = 'small' | 'medium' | 'large';

export const DEFAULT_CLASSROOM_QUICK_AWARDS: ClassroomQuickAward[] = [
  { id: 'quick', label: 'Quick tap', points: 5, description: 'Quick award' },
  { id: 'question', label: 'Good question', points: 10, description: 'Good question' },
  { id: 'effort', label: 'Great effort', points: 15, description: 'Great effort' },
  { id: 'super', label: 'Superstar', points: 20, description: 'Superstar' },
];

/** Bump when classroom tap/effect defaults change — triggers one-time localStorage migration. */
export const CLASSROOM_PREFS_VERSION = 8;

export const DEFAULT_CLASSROOM_PREFS: ClassroomSeatingPrefs = {
  autoAwardMs: 3000,
  defaultPoints: 5,
  defaultDescription: 'Quick award',
  quickAwards: DEFAULT_CLASSROOM_QUICK_AWARDS,
  instantTap: true,
  showPointBalances: true,
  showSessionTotals: true,
  correctionPoints: 2,
  correctionLabel: 'Reminder',
  correctionDescription: 'Behavior reminder',
  design: 'aurora',
  frontAtBottom: false,
  celebrationEffect: 'none',
  showKioskFlyUp: true,
  kioskFlyUpSize: 'medium',
  showRandomPicker: false,
  showClassAwardButton: false,
  prefsVersion: CLASSROOM_PREFS_VERSION,
};

const VALID_KIOSK_FLY_UP_SIZES: ClassroomKioskFlyUpSize[] = ['small', 'medium', 'large'];

export function normalizeKioskFlyUpSize(size: unknown): ClassroomKioskFlyUpSize {
  if (typeof size === 'string' && VALID_KIOSK_FLY_UP_SIZES.includes(size as ClassroomKioskFlyUpSize)) {
    return size as ClassroomKioskFlyUpSize;
  }
  return DEFAULT_CLASSROOM_PREFS.kioskFlyUpSize;
}

const LAYOUT_PREFIX = 'levelup-classroom-layout:';
const PREFS_PREFIX = 'levelup-classroom-prefs:';

const VALID_CELEBRATION_EFFECTS: ClassroomCelebrationEffect[] = [
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
      instantTap: true,
      showPointBalances: parsed.showPointBalances ?? DEFAULT_CLASSROOM_PREFS.showPointBalances,
      showSessionTotals: parsed.showSessionTotals ?? DEFAULT_CLASSROOM_PREFS.showSessionTotals,
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
      prefsVersion: CLASSROOM_PREFS_VERSION,
    };
    if (
      migrated ||
      parsed.instantTap === false ||
      parsed.design === 'midnight' ||
      hadLegacyFlyUpEffect(parsed.celebrationEffect) ||
      String(parsed.celebrationEffect) === LEGACY_FLASH_EFFECT ||
      (parsedVersion < 5 && parsed.celebrationEffect === 'none')
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

function sessionStorageKey(schoolId: string, scope: string, classId: string) {
  const day = new Date().toISOString().slice(0, 10);
  return `${SESSION_PREFIX}${schoolId}:${scope}:${classId}:${day}`;
}

export type ClassroomSessionTotals = Record<string, number>;

export type ClassroomSessionLastAward = {
  label: string;
  points: number;
  at: number;
};

export type ClassroomSessionData = {
  totals: ClassroomSessionTotals;
  lastAward: Record<string, ClassroomSessionLastAward>;
};

const EMPTY_SESSION: ClassroomSessionData = { totals: {}, lastAward: {} };

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
    return { totals, lastAward };
  }
  return { totals: record as ClassroomSessionTotals, lastAward: {} };
}

export function loadClassroomSession(
  schoolId: string,
  scope: string,
  classId: string,
): ClassroomSessionData {
  if (typeof window === 'undefined') return EMPTY_SESSION;
  try {
    const raw = sessionStorage.getItem(sessionStorageKey(schoolId, scope, classId));
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

export function saveClassroomSession(
  schoolId: string,
  scope: string,
  classId: string,
  data: ClassroomSessionData,
) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(sessionStorageKey(schoolId, scope, classId), JSON.stringify(data));
  } catch {
    /* quota */
  }
}

export function applyClassroomSessionAward(
  schoolId: string,
  scope: string,
  classId: string,
  studentIds: string[],
  pointsDelta: number,
  awardLabel: string,
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
  const next: ClassroomSessionData = { totals: nextTotals, lastAward: nextLast };
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
