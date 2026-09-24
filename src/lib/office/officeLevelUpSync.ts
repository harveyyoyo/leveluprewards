/**
 * Sharing between the School Office and levelUp (Settings → levelUp sync).
 *
 * The two apps keep separate records (`officeStudents` vs levelUp's `students`, etc. — see
 * .agent/knowledge/office-rewards-separation.md). When a school turns sharing on for something,
 * the matching records are linked (`levelUpId` on the office record, `officeId` on the levelUp one)
 * and kept the same, in the direction chosen. Removing a record is never copied: points, prizes
 * and history live on the levelUp side and must not disappear because of an office change.
 *
 * This file only decides what should change; the server route does the writing.
 */

export type OfficeSyncMode = 'off' | 'toLevelUp' | 'fromLevelUp' | 'both';

export type OfficeSyncItem = 'students' | 'classes' | 'families' | 'attendance';

export type OfficeLevelUpSyncSettings = Partial<Record<OfficeSyncItem, OfficeSyncMode>>;

export const OFFICE_SYNC_MODES: Array<{ id: OfficeSyncMode; label: string }> = [
  { id: 'off', label: 'Off' },
  { id: 'toLevelUp', label: 'Office → levelUp' },
  { id: 'fromLevelUp', label: 'levelUp → Office' },
  { id: 'both', label: 'Both ways' },
];

export const OFFICE_SYNC_ITEMS: Array<{ id: OfficeSyncItem; label: string; detail: string; ready: boolean }> = [
  { id: 'students', label: 'Students', detail: 'Names, nickname and class.', ready: true },
  { id: 'classes', label: 'Classes and teachers', detail: 'Which classes exist and who teaches them.', ready: false },
  { id: 'families', label: 'Families and contacts', detail: 'The main parent email and phone for each student.', ready: false },
  { id: 'attendance', label: 'Attendance', detail: 'Present, late and excused marks (no points are given).', ready: false },
];

export function syncsToLevelUp(mode: OfficeSyncMode | undefined): boolean {
  return mode === 'toLevelUp' || mode === 'both';
}

export function syncsFromLevelUp(mode: OfficeSyncMode | undefined): boolean {
  return mode === 'fromLevelUp' || mode === 'both';
}

/** The fields of a student that are shared. */
export type SyncStudentFields = {
  firstName: string;
  lastName: string;
  nickname: string | null;
  /** The class in the other app's terms (already translated), or null. */
  classId: string | null;
};

export type SyncOfficeStudent = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  classId?: string | null;
  status?: string | null;
  archived?: boolean;
  levelUpId?: string | null;
  updatedAt?: number;
};

export type SyncLevelUpStudent = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  classId?: string | null;
  officeId?: string | null;
  updatedAt?: number;
};

export type SyncClass = { id: string; name?: string | null; levelUpId?: string | null; officeId?: string | null };

export type StudentSyncPlan = {
  /** New links between records that already exist on both sides (matched by name). */
  links: Array<{ officeId: string; levelUpId: string }>;
  createInLevelUp: Array<{ officeId: string; fields: SyncStudentFields }>;
  createInOffice: Array<{ levelUpId: string; fields: SyncStudentFields }>;
  updateLevelUp: Array<{ levelUpId: string; fields: SyncStudentFields }>;
  updateOffice: Array<{ officeId: string; fields: SyncStudentFields }>;
};

const clean = (v: string | null | undefined) => (v ?? '').trim().replace(/\s+/g, ' ');
const nameKey = (first: string | null | undefined, last: string | null | undefined) =>
  `${clean(first).toLowerCase()}|${clean(last).toLowerCase()}`;

/** Office class id ↔ levelUp class id, from links first and then the same class name. */
export function matchSyncClasses(officeClasses: SyncClass[], levelUpClasses: SyncClass[]) {
  const toLevelUp = new Map<string, string>();
  const toOffice = new Map<string, string>();
  const levelUpIds = new Set(levelUpClasses.map((c) => c.id));
  const officeIds = new Set(officeClasses.map((c) => c.id));
  for (const c of officeClasses) {
    if (c.levelUpId && levelUpIds.has(c.levelUpId)) {
      toLevelUp.set(c.id, c.levelUpId);
      toOffice.set(c.levelUpId, c.id);
    }
  }
  for (const c of levelUpClasses) {
    if (c.officeId && officeIds.has(c.officeId) && !toOffice.has(c.id) && !toLevelUp.has(c.officeId)) {
      toOffice.set(c.id, c.officeId);
      toLevelUp.set(c.officeId, c.id);
    }
  }
  const byName = (list: SyncClass[]) => {
    const map = new Map<string, SyncClass[]>();
    for (const c of list) {
      const key = clean(c.name).toLowerCase();
      if (!key) continue;
      map.set(key, [...(map.get(key) ?? []), c]);
    }
    return map;
  };
  const officeByName = byName(officeClasses);
  const levelUpByName = byName(levelUpClasses);
  for (const [key, offices] of officeByName) {
    const levelUps = levelUpByName.get(key) ?? [];
    if (offices.length !== 1 || levelUps.length !== 1) continue;
    const [o, l] = [offices[0]!, levelUps[0]!];
    if (toLevelUp.has(o.id) || toOffice.has(l.id)) continue;
    toLevelUp.set(o.id, l.id);
    toOffice.set(l.id, o.id);
  }
  return { toLevelUp, toOffice };
}

function officeFields(s: SyncOfficeStudent, classToLevelUp: Map<string, string>): SyncStudentFields {
  return {
    firstName: clean(s.firstName),
    lastName: clean(s.lastName),
    nickname: clean(s.nickname) || null,
    classId: s.classId ? (classToLevelUp.get(s.classId) ?? null) : null,
  };
}

function levelUpFields(s: SyncLevelUpStudent, classToOffice: Map<string, string>): SyncStudentFields {
  return {
    firstName: clean(s.firstName),
    lastName: clean(s.lastName),
    nickname: clean(s.nickname) || null,
    classId: s.classId ? (classToOffice.get(s.classId) ?? null) : null,
  };
}

/**
 * What differs, as the fields to write on the other side. A class that has no match on the
 * other side is left alone there (rather than cleared), so an unmatched class never wipes one.
 */
function changedFields(
  from: SyncStudentFields,
  toCurrent: { firstName?: string | null; lastName?: string | null; nickname?: string | null; classId?: string | null },
  fromHadClass: boolean,
): SyncStudentFields | null {
  const next: SyncStudentFields = {
    ...from,
    classId: from.classId ?? (fromHadClass ? (toCurrent.classId ?? null) : null),
  };
  const same =
    next.firstName === clean(toCurrent.firstName) &&
    next.lastName === clean(toCurrent.lastName) &&
    (next.nickname ?? '') === clean(toCurrent.nickname) &&
    (next.classId ?? '') === (toCurrent.classId ?? '');
  return same ? null : next;
}

const isActiveOfficeStudent = (s: SyncOfficeStudent) => !s.archived && (s.status ?? 'active') === 'active';

/** Everything that should change for students, for the chosen direction. */
export function planStudentSync(input: {
  mode: OfficeSyncMode;
  officeStudents: SyncOfficeStudent[];
  levelUpStudents: SyncLevelUpStudent[];
  officeClasses: SyncClass[];
  levelUpClasses: SyncClass[];
}): StudentSyncPlan {
  const plan: StudentSyncPlan = { links: [], createInLevelUp: [], createInOffice: [], updateLevelUp: [], updateOffice: [] };
  const { mode } = input;
  if (mode === 'off') return plan;
  const { toLevelUp: classToLevelUp, toOffice: classToOffice } = matchSyncClasses(input.officeClasses, input.levelUpClasses);

  const levelUpById = new Map(input.levelUpStudents.map((s) => [s.id, s]));
  const officeById = new Map(input.officeStudents.map((s) => [s.id, s]));

  // 1. Pairs already linked (either side's link is enough, as long as both records still exist).
  const pairs: Array<[SyncOfficeStudent, SyncLevelUpStudent]> = [];
  const pairedOffice = new Set<string>();
  const pairedLevelUp = new Set<string>();
  const pair = (o: SyncOfficeStudent, l: SyncLevelUpStudent) => {
    pairs.push([o, l]);
    pairedOffice.add(o.id);
    pairedLevelUp.add(l.id);
  };
  for (const o of input.officeStudents) {
    const l = o.levelUpId ? levelUpById.get(o.levelUpId) : undefined;
    if (l && !pairedLevelUp.has(l.id)) pair(o, l);
  }
  for (const l of input.levelUpStudents) {
    const o = l.officeId ? officeById.get(l.officeId) : undefined;
    if (o && !pairedOffice.has(o.id) && !pairedLevelUp.has(l.id)) pair(o, l);
  }

  // 2. Match the rest by first + last name, only when the name is unique on both sides.
  const group = <T extends { firstName?: string | null; lastName?: string | null }>(list: T[]) => {
    const map = new Map<string, T[]>();
    for (const s of list) {
      const key = nameKey(s.firstName, s.lastName);
      if (key === '|') continue;
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return map;
  };
  const officeUnpaired = input.officeStudents.filter((s) => !pairedOffice.has(s.id) && !s.levelUpId);
  const levelUpUnpaired = input.levelUpStudents.filter((s) => !pairedLevelUp.has(s.id) && !s.officeId);
  const levelUpByName = group(levelUpUnpaired);
  for (const [key, offices] of group(officeUnpaired)) {
    const levelUps = levelUpByName.get(key) ?? [];
    if (offices.length === 1 && levelUps.length === 1) pair(offices[0]!, levelUps[0]!);
  }

  // Pairs whose links aren't written on both records yet.
  for (const [o, l] of pairs) {
    if (o.levelUpId !== l.id || l.officeId !== o.id) plan.links.push({ officeId: o.id, levelUpId: l.id });
  }

  // 3. Keep linked pairs the same.
  for (const [o, l] of pairs) {
    const oFields = officeFields(o, classToLevelUp);
    const lFields = levelUpFields(l, classToOffice);
    const officeWins =
      mode === 'toLevelUp' || (mode === 'both' && (o.updatedAt ?? 0) >= (l.updatedAt ?? 0));
    if (officeWins) {
      const diff = changedFields(oFields, l, !!o.classId);
      if (diff) plan.updateLevelUp.push({ levelUpId: l.id, fields: diff });
    } else {
      const diff = changedFields(lFields, o, !!l.classId);
      if (diff) plan.updateOffice.push({ officeId: o.id, fields: diff });
    }
  }

  // 4. Copy students that exist on one side only.
  if (syncsToLevelUp(mode)) {
    for (const o of input.officeStudents) {
      if (pairedOffice.has(o.id) || !isActiveOfficeStudent(o)) continue;
      // A link to a record that's gone means it was removed in levelUp on purpose: don't bring it back.
      if (o.levelUpId) continue;
      const fields = officeFields(o, classToLevelUp);
      if (fields.firstName || fields.lastName) plan.createInLevelUp.push({ officeId: o.id, fields });
    }
  }
  if (syncsFromLevelUp(mode)) {
    for (const l of input.levelUpStudents) {
      if (pairedLevelUp.has(l.id) || l.officeId) continue;
      const fields = levelUpFields(l, classToOffice);
      if (fields.firstName || fields.lastName) plan.createInOffice.push({ levelUpId: l.id, fields });
    }
  }
  return plan;
}

/** Plain-words summary for the "before you turn this on" check. */
export function describeStudentSyncPlan(plan: StudentSyncPlan): string[] {
  const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
  const lines: string[] = [];
  if (plan.links.length) lines.push(`${n(plan.links.length, 'student is', 'students are')} in both apps already and will be linked.`);
  if (plan.createInLevelUp.length) lines.push(`${n(plan.createInLevelUp.length, 'student', 'students')} will be added to levelUp.`);
  if (plan.createInOffice.length) lines.push(`${n(plan.createInOffice.length, 'student', 'students')} will be added to the Office.`);
  if (plan.updateLevelUp.length) lines.push(`${n(plan.updateLevelUp.length, 'student', 'students')} will be updated in levelUp.`);
  if (plan.updateOffice.length) lines.push(`${n(plan.updateOffice.length, 'student', 'students')} will be updated in the Office.`);
  if (!lines.length) lines.push('Everything already matches — nothing needs to change.');
  return lines;
}
