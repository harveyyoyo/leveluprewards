import { RECESS_REASON_BY_VALUE } from '@/lib/recess/recessReasons';
import type { BathroomPassActive, RecessPassActive, RecessReason } from '@/lib/types';
import { recessLimitMinutes, type RecessLimit } from '@/lib/recess/recessKioskSettings';

export type ClassroomWhosOutPassSource = 'recess' | 'bathroom';

export type ClassroomWhosOutPass = {
  studentId: string;
  studentName: string;
  startedAt?: number;
  passLabel: string;
  source: ClassroomWhosOutPassSource;
  maxMinutes: number;
};

export function classroomWhosOutPassLabel(reason?: string | null): string {
  if (!reason) return 'Bathroom';
  const known = RECESS_REASON_BY_VALUE.get(reason as RecessReason);
  if (known) return known.label;
  const trimmed = reason.trim();
  if (!trimmed) return 'Bathroom';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** Show “Maya — Nurse” when any pass is not a plain bathroom trip. */
export function classroomWhosOutShowsPassType(passes: Pick<ClassroomWhosOutPass, 'passLabel'>[]): boolean {
  return passes.some((pass) => pass.passLabel !== 'Bathroom');
}

export function classroomWhosOutDisplayName(
  pass: Pick<ClassroomWhosOutPass, 'studentName' | 'passLabel'>,
  showType: boolean,
): string {
  if (!showType) return pass.studentName;
  return `${pass.studentName} — ${pass.passLabel}`;
}

export function mergeClassroomWhosOutPasses({
  recess,
  bathroom,
  nameFor,
  recessMaxMinutes,
  bathroomMaxMinutes,
}: {
  recess: Iterable<[string, RecessPassActive]> | Map<string, RecessPassActive>;
  bathroom: Iterable<[string, BathroomPassActive]> | Map<string, BathroomPassActive>;
  nameFor: (studentId: string, fallbackName?: string) => string;
  /** One limit for every pass, or a lookup so each pass type can have its own. */
  recessMaxMinutes: RecessLimit;
  bathroomMaxMinutes: number;
}): ClassroomWhosOutPass[] {
  const recessMap = recess instanceof Map ? recess : new Map(recess);
  const bathroomMap = bathroom instanceof Map ? bathroom : new Map(bathroom);
  const ids = new Set<string>([...recessMap.keys(), ...bathroomMap.keys()]);
  const list: ClassroomWhosOutPass[] = [];

  for (const studentId of ids) {
    const recessPass = recessMap.get(studentId);
    const bathroomPass = bathroomMap.get(studentId);
    if (recessPass) {
      list.push({
        studentId,
        studentName: nameFor(studentId, recessPass.studentName),
        startedAt: recessPass.startedAt,
        passLabel: classroomWhosOutPassLabel(recessPass.reason),
        source: 'recess',
        maxMinutes: recessLimitMinutes(recessMaxMinutes, recessPass.reason),
      });
      continue;
    }
    if (bathroomPass) {
      list.push({
        studentId,
        studentName: nameFor(studentId, bathroomPass.studentName),
        startedAt: bathroomPass.startedAt,
        passLabel: 'Bathroom',
        source: 'bathroom',
        maxMinutes: bathroomMaxMinutes,
      });
    }
  }

  return list.sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0));
}

/** Lookup for seating-chart Pass Out badges — same students as the hall header. */
export function classroomHallPassByStudent(
  passes: ClassroomWhosOutPass[],
): Map<string, ClassroomWhosOutPass> {
  const map = new Map<string, ClassroomWhosOutPass>();
  for (const pass of passes) {
    if (pass?.studentId) map.set(pass.studentId, pass);
  }
  return map;
}
