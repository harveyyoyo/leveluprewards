import type { Student } from '@/lib/types';
import type { PillarSettings } from '@/lib/productPillars';
import { parseRafflePointsPerTicket, floorRaffleFullTickets } from '@/lib/raffleTickets';
import { rafflePointsForStudent } from '@/lib/raffleStudentPoints';

export type RafflePoolScope = 'eligible' | 'onTimeToday';

export type RaffleEntryRow = {
  id: string;
  name: string;
  points: number;
  /** Weight in the raffle pool (1 in equal-odds mode, or full ticket count). */
  tickets: number;
  /** floor(points / pointsPerTicket) when pointsPerTicket ≥ 1; in general raffle (0) shown as 1 for display. */
  fullTickets: number;
  deductPoints: number;
  /** Included only via manual add for this draw session. */
  manualInclude?: boolean;
  /** Excluded from pool for this draw session (shown in removed list). */
  manualExclude?: boolean;
};

export type BuildRafflePoolInput = {
  students: Student[];
  settings: PillarSettings | null | undefined;
  rafflePointsPerTicket: unknown;
  raffleOneEntryPerStudent: boolean;
  poolScope: RafflePoolScope;
  /** Student IDs with on-time attendance today (when poolScope is onTimeToday). */
  onTimeTodayIds?: ReadonlySet<string>;
  manualExcludeIds?: ReadonlySet<string>;
  manualIncludeIds?: ReadonlySet<string>;
};

function studentDisplayName(s: Student): string {
  return `${s.firstName ?? ''}${s.lastName ? ` ${s.lastName}` : ''}`.trim() || s.id;
}

function entryFromStudent(
  s: Student,
  settings: PillarSettings | null | undefined,
  isGeneralRaffle: boolean,
  pointsPerTicket: number,
  oneEntryPerStudent: boolean,
  opts?: { manualInclude?: boolean; forceEntry?: boolean },
): RaffleEntryRow | null {
  const pts = rafflePointsForStudent(s, settings);
  const name = studentDisplayName(s);

  if (isGeneralRaffle) {
    return {
      id: s.id,
      name,
      points: pts,
      tickets: 1,
      fullTickets: 1,
      deductPoints: 0,
      manualInclude: opts?.manualInclude,
    };
  }

  const fullTickets = Math.max(0, floorRaffleFullTickets(pts, pointsPerTicket));
  if (fullTickets <= 0 && !opts?.forceEntry) return null;

  const effectiveFull = fullTickets > 0 ? fullTickets : 1;
  const tickets = oneEntryPerStudent ? 1 : effectiveFull;
  const deductPoints = oneEntryPerStudent
    ? pointsPerTicket
    : effectiveFull * pointsPerTicket;

  return {
    id: s.id,
    name,
    points: pts,
    tickets,
    fullTickets: fullTickets > 0 ? fullTickets : 1,
    deductPoints,
    manualInclude: opts?.manualInclude,
  };
}

/** Build raffle pool rows with optional attendance filter and per-draw manual overrides. */
export function buildRafflePool(input: BuildRafflePoolInput): RaffleEntryRow[] {
  const {
    students,
    settings,
    rafflePointsPerTicket,
    raffleOneEntryPerStudent,
    poolScope,
    onTimeTodayIds,
    manualExcludeIds = new Set(),
    manualIncludeIds = new Set(),
  } = input;

  const { isGeneralRaffle, pointsPerTicket } = parseRafflePointsPerTicket(rafflePointsPerTicket);

  const studentById = new Map<string, Student>();
  for (const s of students || []) {
    if (s?.id) studentById.set(s.id, s);
  }

  const rows = new Map<string, RaffleEntryRow>();

  for (const s of students || []) {
    if (!s?.id || manualExcludeIds.has(s.id)) continue;
    if (poolScope === 'onTimeToday' && onTimeTodayIds && !onTimeTodayIds.has(s.id)) continue;

    const row = entryFromStudent(s, settings, isGeneralRaffle, pointsPerTicket, raffleOneEntryPerStudent);
    if (row) rows.set(s.id, row);
  }

  for (const id of manualIncludeIds) {
    if (manualExcludeIds.has(id)) continue;
    const s = studentById.get(id);
    if (!s) continue;
    const existing = rows.get(id);
    if (existing) {
      rows.set(id, { ...existing, manualInclude: true });
      continue;
    }
    const row = entryFromStudent(s, settings, isGeneralRaffle, pointsPerTicket, raffleOneEntryPerStudent, {
      manualInclude: true,
      forceEntry: true,
    });
    if (row) rows.set(id, row);
  }

  const list = Array.from(rows.values());
  list.sort((a, b) =>
    raffleOneEntryPerStudent && !isGeneralRaffle
      ? b.fullTickets - a.fullTickets || b.points - a.points || a.name.localeCompare(b.name)
      : b.tickets - a.tickets || b.points - a.points || a.name.localeCompare(b.name),
  );
  return list;
}

export function isAttendanceRaffleScopeAvailable(settings: {
  payAttendance?: boolean;
  enableClassSignIn?: boolean;
} | null | undefined): boolean {
  return (settings?.payAttendance ?? true) && !!settings?.enableClassSignIn;
}

/** Per-draw class filter for raffle pools (`all` = no class restriction). */
export type RaffleClassFilter = 'all' | 'unassigned' | string;

export function filterStudentsForRaffleClass(
  students: Student[],
  classFilter: RaffleClassFilter,
): Student[] {
  if (classFilter === 'all') return students;
  if (classFilter === 'unassigned') return students.filter((s) => !s.classId);
  return students.filter((s) => s.classId === classFilter);
}
