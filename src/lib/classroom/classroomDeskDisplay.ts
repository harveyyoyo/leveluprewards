import type { Student, StudentTheme } from '@/lib/types';
import { resolveStudentThemeWithSchoolDefault } from '@/lib/themeContrast';
import { getStudentNickname } from '@/lib/utils';

/** Minimal desk payload — avoids passing full Student into every cell. */
export type ClassroomDeskDisplay = {
  id: string;
  name: string;
  initials: string;
  points: number;
  photoUrl?: string;
  /** Custom sticker URL or theme emoji character when showStudentEmoji is on. */
  emoji?: string;
};

export type ClassroomDeskDisplayOptions = {
  showLastName?: boolean;
  showStudentEmoji?: boolean;
  defaultStudentTheme?: StudentTheme | null;
  studentThemesEnabled?: boolean;
};

export function resolveClassroomDeskEmoji(
  student: Student,
  options?: ClassroomDeskDisplayOptions,
): string | undefined {
  if (!options?.showStudentEmoji) return undefined;
  const custom = (student.customEmojiUrl || '').trim();
  if (custom) return custom;
  const theme = resolveStudentThemeWithSchoolDefault(
    student.theme,
    options.defaultStudentTheme,
    options.studentThemesEnabled !== false,
  );
  const emoji = (theme?.emoji || '').trim();
  return emoji || undefined;
}

export function classroomDeskDisplayFromStudent(
  student: Student,
  pointsOverride?: number,
  options?: ClassroomDeskDisplayOptions,
): ClassroomDeskDisplay {
  const nickname = getStudentNickname(student);
  const lastName = (student.lastName || '').trim();
  const first = nickname.charAt(0).toUpperCase();
  const last = lastName.charAt(0).toUpperCase();
  const initials = `${first}${last}` || '?';
  const name =
    options?.showLastName && lastName ? `${nickname} ${lastName}` : nickname;
  const points = pointsOverride ?? student.points ?? 0;
  const emoji = resolveClassroomDeskEmoji(student, options);
  return {
    id: student.id,
    name,
    initials,
    points,
    ...(student.photoUrl ? { photoUrl: student.photoUrl } : {}),
    ...(emoji ? { emoji } : {}),
  };
}

/** Compact signature so roster-driven re-renders skip when display fields are unchanged. */
export function classroomDeskCatalogSignature(
  students: Student[],
  classId: string,
  options?: ClassroomDeskDisplayOptions,
): string {
  const list =
    classId === 'all' ? students : students.filter((s) => s.classId === classId);
  const showLast = options?.showLastName ? '1' : '0';
  const showEmoji = options?.showStudentEmoji ? '1' : '0';
  const themeKey = options?.showStudentEmoji
    ? `${options.defaultStudentTheme?.emoji ?? ''}:${options.studentThemesEnabled !== false ? '1' : '0'}`
    : '';
  return `${showLast}:${showEmoji}:${themeKey}|${list
    .map((s) => {
      const pts = s.classroomPoints ?? s.points ?? 0;
      const deskEmoji = resolveClassroomDeskEmoji(s, options) ?? '';
      return `${s.id}:${pts}:${getStudentNickname(s)}:${s.lastName ?? ''}:${s.photoUrl ?? ''}:${s.customEmojiUrl ?? ''}:${deskEmoji}`;
    })
    .sort()
    .join('|')}`;
}

export function buildClassroomDeskCatalog(
  students: Student[],
  classId: string,
  sessionOnly: boolean,
  classroomBalances: Record<string, number>,
  previous?: Map<string, ClassroomDeskDisplay> | null,
  options?: ClassroomDeskDisplayOptions,
): Map<string, ClassroomDeskDisplay> {
  const map = new Map<string, ClassroomDeskDisplay>();
  const list = classId === 'all' ? students : students.filter((s) => s.classId === classId);
  for (const s of list) {
    const points = sessionOnly
      ? (classroomBalances[s.id] ?? s.classroomPoints ?? 0)
      : (s.points ?? 0);
    const entry = classroomDeskDisplayFromStudent(s, points, options);
    const prevEntry = previous?.get(s.id);
    if (
      prevEntry &&
      prevEntry.points === entry.points &&
      prevEntry.name === entry.name &&
      prevEntry.initials === entry.initials &&
      prevEntry.photoUrl === entry.photoUrl &&
      prevEntry.emoji === entry.emoji
    ) {
      map.set(s.id, prevEntry);
    } else {
      map.set(s.id, entry);
    }
  }
  return map;
}
