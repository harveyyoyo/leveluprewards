/** Local persistence for classroom seating layouts (per school + scope + class). */

import {
  normalizeClassroomAttendanceSource,
  type ClassroomAttendanceSource,
} from '@/lib/classroom/classroomAttendanceSource';
import { parseClassroomGroups } from '@/lib/classroom/classroomGroups';

export type ClassroomDesign = 'aurora' | 'minimal' | 'midnight' | 'playful' | 'brutalist';

/** Keep midnight as Night / Dark; playful stays its own colorful look. */
export function normalizeClassroomDesign(design: ClassroomDesign): ClassroomDesign {
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
  /** Points given by the “Give everyone” class award (can differ from desk tap). */
  classAwardPoints: number;
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
  /** Show the student's picture on the desk when they have one. */
  showStudentPhotos: boolean;
  /** Show student sticker / theme emoji on each desk avatar (photo still wins when photos are on). */
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
  /** Show behavior-notes shortcut tips on the live monitor. */
  showBehaviorNotesTips: boolean;
  /** When Rewards pillar is on: local classroom balance vs school reward categories. Ignored when Rewards is off. */
  awardSource: ClassroomAwardSource;
  /** Play arcade sounds when awarding or deducting points from the chart. */
  awardSounds: boolean;
  /** How the live classroom takes attendance. */
  attendanceSource: ClassroomAttendanceSource;
  /** Which setting menus appear on the fullscreen monitor toolbar. */
  monitorMenuTabs: ClassroomMonitorMenuTabs;
  /** Optional theme slug from the 15 Classroom Theme Kit designs. */
  themeKitSlug?: string;
  /** Optional customization settings (fonts, hue, vividness, corners, depth, dark mode). */
  themeKitSettings?: ClassroomThemeKitSettings;
  /** Internal — bumps when defaults change. */
  prefsVersion?: number;
};

export type ClassroomThemeKitSettings = {
  active?: number;
  headingFont: string;
  bodyFont: string;
  hue: number;
  vivid: number;
  corners: number;
  depth: 'Flat' | 'Theme' | 'Extra';
  darkMode: boolean;
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
  { id: 'quick', label: 'Good job', points: 5, description: 'Good job' },
  { id: 'question', label: 'Good question', points: 10, description: 'Good question' },
  { id: 'effort', label: 'Great effort', points: 15, description: 'Great effort' },
  { id: 'super', label: 'Superstar', points: 20, description: 'Superstar' },
];

/** Bump when classroom tap/effect defaults change — triggers one-time localStorage migration. */
export const CLASSROOM_PREFS_VERSION = 22;

export const DEFAULT_CLASSROOM_PREFS: ClassroomSeatingPrefs = {
  autoAwardMs: 3000,
  defaultPoints: 5,
  classAwardPoints: 5,
  defaultDescription: 'Quick award',
  quickAwards: DEFAULT_CLASSROOM_QUICK_AWARDS,
  instantTap: true,
  showPointBalances: true,
  showSessionTotals: true,
  showSessionLastAward: true,
  showLastName: false,
  showStudentPhotos: true,
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
  showBehaviorNotesTips: true,
  awardSource: 'local',
  awardSounds: true,
  attendanceSource: 'card-scan',
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
      showStudentPhotos: parsed.showStudentPhotos ?? DEFAULT_CLASSROOM_PREFS.showStudentPhotos,
      showStudentEmoji: parsed.showStudentEmoji ?? DEFAULT_CLASSROOM_PREFS.showStudentEmoji,
      classAwardPoints: Math.max(
        1,
        Math.min(99, Number(parsed.classAwardPoints) || parsed.defaultPoints || DEFAULT_CLASSROOM_PREFS.classAwardPoints),
      ),
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
      showBehaviorNotesTips:
        parsed.showBehaviorNotesTips ?? DEFAULT_CLASSROOM_PREFS.showBehaviorNotesTips,
      awardSource: normalizeClassroomAwardSource(parsed.awardSource),
      awardSounds: parsed.awardSounds ?? DEFAULT_CLASSROOM_PREFS.awardSounds,
      attendanceSource: normalizeClassroomAttendanceSource(parsed.attendanceSource),
      monitorMenuTabs: normalizeMonitorMenuTabs(parsed.monitorMenuTabs),
      themeKitSlug: parsed.themeKitSlug,
      themeKitSettings: parsed.themeKitSettings,
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

/** Wider grid when the live monitor shows every student instead of one class. */
export function initialLayoutColumnCount(studentCount: number): number {
  if (studentCount <= 20) return 5;
  if (studentCount <= 42) return 7;
  if (studentCount <= 80) return 10;
  return 12;
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

export type ClassroomRoomShape = 'rows' | 'pairs' | 'pods' | 'ushape';

export const CLASSROOM_ROOM_SHAPES: {
  id: ClassroomRoomShape;
  label: string;
  description: string;
  emoji: string;
}[] = [
  { id: 'rows', label: 'Classic Rows', description: 'Neat grid of desks facing forward', emoji: '🪑' },
  { id: 'pairs', label: 'Partner Pairs', description: 'Desks in pairs with aisles between them', emoji: '👥' },
  { id: 'pods', label: 'Table Pods', description: 'Clusters of 4 desks for group teamwork', emoji: '🍀' },
  { id: 'ushape', label: 'U-Shape Circle', description: 'Desks along the perimeter with an open center', emoji: '🧲' },
];

/** Build a seating chart according to common real-world classroom shapes. */
export function buildRoomShapeLayout(
  shape: ClassroomRoomShape,
  studentIds: string[],
  preferredCols?: number,
): ClassroomSeatingLayout {
  if (shape === 'rows') {
    const cols = preferredCols ?? initialLayoutColumnCount(studentIds.length);
    return buildInitialLayout(studentIds, cols);
  }

  if (shape === 'pairs') {
    // 2 desks side-by-side with an aisle column between pairs
    const pairsPerRow = studentIds.length > 16 ? 3 : 2;
    const cols = pairsPerRow * 3 - 1; // 2 pairs -> 5 cols (D D . D D), 3 pairs -> 8 cols (D D . D D . D D)
    const desksPerRow = pairsPerRow * 2;
    const rows = Math.max(2, Math.ceil(studentIds.length / desksPerRow));
    const cells: (string | null)[] = Array.from({ length: rows * cols }, () => null);

    let studentIndex = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Aisle column is every 3rd column (index 2, 5, etc.)
        if (c % 3 === 2) continue;
        if (studentIndex < studentIds.length) {
          cells[r * cols + c] = studentIds[studentIndex++];
        }
      }
    }
    // Safety check: ensure any extra students are placed
    while (studentIndex < studentIds.length) {
      cells.push(studentIds[studentIndex++]);
    }
    const finalRows = Math.ceil(cells.length / cols);
    while (cells.length < finalRows * cols) cells.push(null);
    return { rows: finalRows, cols, cells };
  }

  if (shape === 'pods') {
    // 2x2 pods with aisle row & col
    const podsPerRow = studentIds.length > 16 ? 3 : 2;
    const cols = podsPerRow * 3 - 1; // 2 pods -> 5 cols, 3 pods -> 8 cols
    const totalPods = Math.max(1, Math.ceil(studentIds.length / 4));
    const podRowBlocks = Math.ceil(totalPods / podsPerRow);
    const rows = Math.max(2, podRowBlocks * 3 - 1);
    const cells: (string | null)[] = Array.from({ length: rows * cols }, () => null);

    let studentIndex = 0;
    for (let p = 0; p < totalPods; p++) {
      const podRowBlock = Math.floor(p / podsPerRow);
      const podColBlock = p % podsPerRow;
      const r0 = podRowBlock * 3;
      const c0 = podColBlock * 3;
      const offsets = [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
      ];
      for (const [dr, dc] of offsets) {
        if (studentIndex < studentIds.length) {
          const r = r0 + dr;
          const c = c0 + dc;
          if (r < rows && c < cols) {
            cells[r * cols + c] = studentIds[studentIndex++];
          }
        }
      }
    }
    // Safety check
    while (studentIndex < studentIds.length) {
      cells.push(studentIds[studentIndex++]);
    }
    const finalRows = Math.ceil(cells.length / cols);
    while (cells.length < finalRows * cols) cells.push(null);
    return { rows: finalRows, cols, cells };
  }

  if (shape === 'ushape') {
    // Perimeter horseshoe: left column, bottom row, right column, empty center
    const cols = studentIds.length <= 14 ? 5 : studentIds.length <= 24 ? 6 : 7;
    // Perimeter spots = 2 * rows + (cols - 2)
    const neededRows = Math.max(3, Math.ceil((studentIds.length - (cols - 2)) / 2));
    const rows = neededRows;
    const cells: (string | null)[] = Array.from({ length: rows * cols }, () => null);

    const perimeterCoords: [number, number][] = [];
    // Down left column
    for (let r = 0; r < rows - 1; r++) {
      perimeterCoords.push([r, 0]);
    }
    // Across bottom row (from left to right)
    for (let c = 0; c < cols; c++) {
      perimeterCoords.push([rows - 1, c]);
    }
    // Up right column (from bottom-1 up to top)
    for (let r = rows - 2; r >= 0; r--) {
      perimeterCoords.push([r, cols - 1]);
    }

    let studentIndex = 0;
    for (const [r, c] of perimeterCoords) {
      if (studentIndex < studentIds.length) {
        cells[r * cols + c] = studentIds[studentIndex++];
      }
    }

    // If more students than outer ring, fill inner row safely
    for (let r = rows - 2; r >= 0 && studentIndex < studentIds.length; r--) {
      for (let c = 1; c < cols - 1 && studentIndex < studentIds.length; c++) {
        cells[r * cols + c] = studentIds[studentIndex++];
      }
    }

    // Safety fallback
    while (studentIndex < studentIds.length) {
      cells.push(studentIds[studentIndex++]);
    }
    const finalRows = Math.ceil(cells.length / cols);
    while (cells.length < finalRows * cols) cells.push(null);
    return { rows: finalRows, cols, cells };
  }

  return buildInitialLayout(studentIds, preferredCols ?? 5);
}

export type ClassroomSeatingGroup = {
  id: string;
  name: string;
  type: 'row' | 'table';
  studentIds: string[];
};

/**
 * Group students on the seating chart into rows and table pods for quick group awards.
 */
export function extractLayoutGroups(
  layout: ClassroomSeatingLayout,
  frontAtBottom = false,
): ClassroomSeatingGroup[] {
  const groups: ClassroomSeatingGroup[] = [];
  const { rows, cols, cells } = layout;

  // 1. Group by Rows
  for (let r = 0; r < rows; r++) {
    const rowStudentIds: string[] = [];
    for (let c = 0; c < cols; c++) {
      const id = cells[r * cols + c];
      if (id) rowStudentIds.push(id);
    }
    if (rowStudentIds.length > 0) {
      const rowNum = frontAtBottom ? rows - r : r + 1;
      groups.push({
        id: `row-${r}`,
        name: `Row ${rowNum}`,
        type: 'row',
        studentIds: rowStudentIds,
      });
    }
  }

  // 2. Detect Pods / Tables if grid is wide enough
  const hasAisleCol = cols >= 3 && Array.from({ length: rows }, (_, r) => cells[r * cols + 2]).every((id) => !id);
  const hasAisleRow = rows >= 3 && Array.from({ length: cols }, (_, c) => cells[2 * cols + c]).every((id) => !id);

  if (hasAisleCol || cols >= 4) {
    let tableNum = 1;
    const rStep = hasAisleRow ? 3 : 2;
    const cStep = hasAisleCol ? 3 : 2;
    for (let r = 0; r < rows; r += rStep) {
      for (let c = 0; c < cols; c += cStep) {
        const podIds: string[] = [];
        for (let dr = 0; dr < 2 && r + dr < rows; dr++) {
          for (let dc = 0; dc < 2 && c + dc < cols; dc++) {
            const id = cells[(r + dr) * cols + (c + dc)];
            if (id) podIds.push(id);
          }
        }
        if (podIds.length >= 2) {
          groups.push({
            id: `table-${tableNum}`,
            name: `Table ${tableNum}`,
            type: 'table',
            studentIds: podIds,
          });
          tableNum++;
        }
      }
    }
  }

  return groups;
}



export function resizeLayout(
  layout: ClassroomSeatingLayout,
  rows: number,
  cols: number,
): ClassroomSeatingLayout {
  const nextRows = Math.max(1, rows);
  const nextCols = Math.max(1, cols);
  const nextCells: (string | null)[] = Array.from({ length: nextRows * nextCols }, () => null);
  const oldRows = layout.rows;
  const oldCols = layout.cols;
  for (let r = 0; r < Math.min(nextRows, oldRows); r++) {
    for (let c = 0; c < Math.min(nextCols, oldCols); c++) {
      nextCells[r * nextCols + c] = layout.cells[r * oldCols + c] ?? null;
    }
  }
  return { rows: nextRows, cols: nextCols, cells: nextCells };
}

export function overflowStudentIdsFromResize(
  previous: ClassroomSeatingLayout,
  next: ClassroomSeatingLayout,
): string[] {
  const kept = studentIdsInLayout(next);
  const overflow: string[] = [];
  for (const id of previous.cells) {
    if (id && !kept.has(id) && !overflow.includes(id)) overflow.push(id);
  }
  return overflow;
}

export function fillEmptyCellsFromIds(
  layout: ClassroomSeatingLayout,
  studentIds: string[],
): ClassroomSeatingLayout {
  const placed = studentIdsInLayout(layout);
  const remaining = studentIds.filter((id) => id && !placed.has(id));
  if (!remaining.length) return layout;
  const cells = [...layout.cells];
  let next = 0;
  for (let i = 0; i < cells.length && next < remaining.length; i += 1) {
    if (!cells[i]) {
      cells[i] = remaining[next];
      next += 1;
    }
  }
  return { ...layout, cells };
}

/** Shrink or grow the room without silently dropping students. Extras become overflow. */
export function changeClassroomGridSize(
  layout: ClassroomSeatingLayout,
  rows: number,
  cols: number,
  waitingIds: string[] = [],
): { layout: ClassroomSeatingLayout; overflowIds: string[]; displacedIds: string[] } {
  const next = resizeLayout(layout, rows, cols);
  const displacedIds = overflowStudentIdsFromResize(layout, next);
  const fillOrder = [
    ...displacedIds,
    ...waitingIds.filter((id) => id && !displacedIds.includes(id) && !studentIdsInLayout(next).has(id)),
  ];
  const filled = fillEmptyCellsFromIds(next, fillOrder);
  const placed = studentIdsInLayout(filled);
  return {
    layout: filled,
    overflowIds: fillOrder.filter((id) => !placed.has(id)),
    displacedIds,
  };
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

export function cloneClassroomLayout(layout: ClassroomSeatingLayout): ClassroomSeatingLayout {
  return { rows: layout.rows, cols: layout.cols, cells: [...layout.cells] };
}

export function classroomLayoutsEqual(a: ClassroomSeatingLayout, b: ClassroomSeatingLayout): boolean {
  return (
    a.rows === b.rows &&
    a.cols === b.cols &&
    a.cells.length === b.cells.length &&
    a.cells.every((id, index) => id === b.cells[index])
  );
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

export type ClassroomVisualCell = { visualRow: number; visualCol: number; cellIndex: number };

/** Live/class view: only occupied desks, packed so leftover empty seats do not leave holes. */
export function compactClassroomOccupiedDisplay(
  visualCells: ClassroomVisualCell[],
  cellStudentIds: (string | null)[],
  layoutCols: number,
): { cells: ClassroomVisualCell[]; rows: number; cols: number } {
  const occupied = visualCells.filter((cell) => !!cellStudentIds[cell.cellIndex]);
  const count = occupied.length;
  const cols = Math.max(1, Math.min(Math.max(1, layoutCols), count || 1));
  const rows = Math.max(1, Math.ceil(Math.max(count, 1) / cols));
  return { cells: occupied, rows, cols };
}

export type ClassroomSeatingGridFit = {
  cellSize: number;
  gridWidth: number;
  gridHeight: number;
};

/**
 * Largest square desks that fit in the available box without changing rows/cols.
 * When the window is short or narrow, desks shrink instead of stretching into pills.
 */
export function fitClassroomSeatingGrid(input: {
  containerWidth: number;
  containerHeight: number;
  rows: number;
  cols: number;
  gap: number;
}): ClassroomSeatingGridFit {
  const rows = Math.max(1, Math.floor(input.rows) || 1);
  const cols = Math.max(1, Math.floor(input.cols) || 1);
  const gap = Math.max(0, input.gap);
  const width = Math.max(0, input.containerWidth);
  const height = Math.max(0, input.containerHeight);
  const gapX = gap * Math.max(0, cols - 1);
  const gapY = gap * Math.max(0, rows - 1);
  const cellByWidth = (width - gapX) / cols;
  const cellByHeight = (height - gapY) / rows;
  const cellSize = Math.max(0, Math.floor(Math.min(cellByWidth, cellByHeight)));
  return {
    cellSize,
    gridWidth: cellSize * cols + gapX,
    gridHeight: cellSize * rows + gapY,
  };
}

export type ClassroomDeskVisualScale = 'sm' | 'md' | 'lg';

/** Shrink desk labels when cells get small so names don’t overflow. */
export function classroomDeskVisualScale(cellSize: number): ClassroomDeskVisualScale {
  if (cellSize < 72) return 'sm';
  if (cellSize < 104) return 'md';
  return 'lg';
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

export type ClassroomSessionGroups = {
  count: number;
  byStudent: Record<string, number>;
};

export type ClassroomSessionRandomPick = {
  studentId: string | null;
  winnerId: string | null;
  label?: string;
  at: number;
};

export type ClassroomSessionRaffleProjector = {
  show: boolean;
  mode: 'jackpot' | 'wheel';
  pool: { id: string; name: string }[];
  winnerId?: string | null;
  winnerName?: string | null;
  spinId?: number;
};

export type ClassroomSessionData = {
  totals: ClassroomSessionTotals;
  lastAward: Record<string, ClassroomSessionLastAward>;
  activity?: ClassroomSessionActivityEntry[];
  groups?: ClassroomSessionGroups;
  randomPick?: ClassroomSessionRandomPick;
  rollMarks?: Record<string, 'present' | 'absent' | 'late'>;
  raffleProjector?: ClassroomSessionRaffleProjector;
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
    const groups = parseClassroomGroups(record.groups);
    const randomPick = normalizeSessionRandomPick(record.randomPick);
    const rollMarks = normalizeSessionRollMarks(record.rollMarks);
    const raffleProjector = normalizeSessionRaffleProjector(record.raffleProjector);
    return { totals, lastAward, activity, groups, randomPick, rollMarks, raffleProjector };
  }
  return { totals: record as ClassroomSessionTotals, lastAward: {}, activity: [] };
}

function normalizeSessionRollMarks(raw: unknown): Record<string, 'present' | 'absent' | 'late'> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const next: Record<string, 'present' | 'absent' | 'late'> = {};
  for (const [id, mark] of Object.entries(raw as Record<string, unknown>)) {
    if (mark === 'present' || mark === 'absent' || mark === 'late') next[id] = mark;
  }
  return Object.keys(next).length ? next : undefined;
}

function normalizeSessionRaffleProjector(raw: unknown): ClassroomSessionRaffleProjector | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const pool = Array.isArray(record.pool)
    ? record.pool.flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return [];
        const row = entry as Record<string, unknown>;
        if (typeof row.id !== 'string' || typeof row.name !== 'string') return [];
        return [{ id: row.id, name: row.name }];
      })
    : [];
  return {
    show: record.show === true,
    mode: record.mode === 'wheel' ? 'wheel' : 'jackpot',
    pool,
    winnerId: typeof record.winnerId === 'string' ? record.winnerId : null,
    winnerName: typeof record.winnerName === 'string' ? record.winnerName : null,
    spinId: typeof record.spinId === 'number' ? record.spinId : undefined,
  };
}

function normalizeSessionRandomPick(raw: unknown): ClassroomSessionRandomPick | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const studentId = typeof record.studentId === 'string' ? record.studentId : null;
  const winnerId = typeof record.winnerId === 'string' ? record.winnerId : null;
  const label = typeof record.label === 'string' ? record.label : undefined;
  const at = typeof record.at === 'number' ? record.at : 0;
  if (!studentId && !winnerId) return undefined;
  return { studentId, winnerId, label, at };
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
    const key = classroomSessionStorageKey(schoolId, scope, classId);
    const raw = localStorage.getItem(key) ?? sessionStorage.getItem(key);
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
    // Daily sessions must be readable by newly opened projector tabs as well.
    localStorage.setItem(key, JSON.stringify(data));
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
  const next: ClassroomSessionData = {
    totals: nextTotals,
    lastAward: nextLast,
    activity,
    groups: current.groups,
    randomPick: current.randomPick,
    rollMarks: current.rollMarks,
    raffleProjector: current.raffleProjector,
  };
  saveClassroomSession(schoolId, scope, classId, next);
  return next;
}

export function setClassroomSessionGroups(
  schoolId: string,
  scope: string,
  classId: string,
  groups: ClassroomSessionGroups | null,
): ClassroomSessionData {
  const current = loadClassroomSession(schoolId, scope, classId);
  const next: ClassroomSessionData = { ...current, groups: groups ?? undefined };
  if (!groups) delete next.groups;
  saveClassroomSession(schoolId, scope, classId, next);
  return next;
}

export function setClassroomSessionRollMarks(
  schoolId: string,
  scope: string,
  classId: string,
  rollMarks: Record<string, 'present' | 'absent' | 'late'> | null,
): ClassroomSessionData {
  const current = loadClassroomSession(schoolId, scope, classId);
  const next: ClassroomSessionData = { ...current, rollMarks: rollMarks ?? undefined };
  if (!rollMarks || !Object.keys(rollMarks).length) delete next.rollMarks;
  saveClassroomSession(schoolId, scope, classId, next);
  return next;
}

export function setClassroomSessionRandomPick(
  schoolId: string,
  scope: string,
  classId: string,
  pick: ClassroomSessionRandomPick | null,
): ClassroomSessionData {
  const current = loadClassroomSession(schoolId, scope, classId);
  const next: ClassroomSessionData = { ...current, randomPick: pick ?? undefined };
  if (!pick) delete next.randomPick;
  saveClassroomSession(schoolId, scope, classId, next);
  return next;
}

export function setClassroomSessionRaffleProjector(
  schoolId: string,
  scope: string,
  classId: string,
  raffleProjector: ClassroomSessionRaffleProjector | null,
): ClassroomSessionData {
  const current = loadClassroomSession(schoolId, scope, classId);
  const next: ClassroomSessionData = { ...current, raffleProjector: raffleProjector ?? undefined };
  if (!raffleProjector) delete next.raffleProjector;
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
