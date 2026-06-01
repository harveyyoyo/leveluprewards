import type { Student } from '@/lib/types';
import { getStudentNickname } from '@/lib/utils';

/** Minimal desk payload — avoids passing full Student into every cell. */
export type ClassroomDeskDisplay = {
  id: string;
  name: string;
  initials: string;
  points: number;
  photoUrl?: string;
};

export function classroomDeskDisplayFromStudent(
  student: Student,
  pointsOverride?: number,
): ClassroomDeskDisplay {
  const first = getStudentNickname(student).charAt(0).toUpperCase();
  const last = (student.lastName || '').charAt(0).toUpperCase();
  const initials = `${first}${last}` || '?';
  const name = getStudentNickname(student);
  const points = pointsOverride ?? student.points ?? 0;
  return {
    id: student.id,
    name,
    initials,
    points,
    ...(student.photoUrl ? { photoUrl: student.photoUrl } : {}),
  };
}

/** Compact signature so roster-driven re-renders skip when display fields are unchanged. */
export function classroomDeskCatalogSignature(students: Student[], classId: string): string {
  const list =
    classId === 'all' ? students : students.filter((s) => s.classId === classId);
  return list
    .map((s) => {
      const pts = s.classroomPoints ?? s.points ?? 0;
      return `${s.id}:${pts}:${getStudentNickname(s)}:${s.lastName ?? ''}:${s.photoUrl ?? ''}`;
    })
    .sort()
    .join('|');
}

export function buildClassroomDeskCatalog(
  students: Student[],
  classId: string,
  sessionOnly: boolean,
  classroomBalances: Record<string, number>,
  previous?: Map<string, ClassroomDeskDisplay> | null,
): Map<string, ClassroomDeskDisplay> {
  const map = new Map<string, ClassroomDeskDisplay>();
  const list = classId === 'all' ? students : students.filter((s) => s.classId === classId);
  for (const s of list) {
    const points = sessionOnly
      ? (classroomBalances[s.id] ?? s.classroomPoints ?? 0)
      : (s.points ?? 0);
    const entry = classroomDeskDisplayFromStudent(s, points);
    const prevEntry = previous?.get(s.id);
    if (
      prevEntry &&
      prevEntry.points === entry.points &&
      prevEntry.name === entry.name &&
      prevEntry.initials === entry.initials &&
      prevEntry.photoUrl === entry.photoUrl
    ) {
      map.set(s.id, prevEntry);
    } else {
      map.set(s.id, entry);
    }
  }
  return map;
}
