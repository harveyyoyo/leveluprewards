import type { Student, StudentTheme } from '@/lib/types';
import { resolveStudentThemeWithSchoolDefault } from '@/lib/themeContrast';
import { displayStudentNameOnSharedBoard, getStudentNickname, type PrivacyStudentNameDisplayMode } from '@/lib/utils';

/** How student names appear in the library (desk, catalog, kiosk, slips). */
export type LibraryStudentNameDisplayMode =
  | 'preferred_full'
  | 'preferred_only'
  | 'legal_full'
  | 'follow_school';

/** How each student's LevelUp theme appears next to their library name. */
export type LibraryStudentThemeDisplay = 'off' | 'emoji' | 'emoji_and_color';

export type ResolvedLibraryStudentNameMode = Exclude<LibraryStudentNameDisplayMode, 'follow_school'>;

export const LIBRARY_STUDENT_NAME_DISPLAY_LABELS: Record<LibraryStudentNameDisplayMode, string> = {
  preferred_full: 'Preferred name + last name',
  preferred_only: 'Preferred name only',
  legal_full: 'Legal first + last name',
  follow_school: 'Follow school leaderboard privacy',
};

export const LIBRARY_STUDENT_THEME_DISPLAY_LABELS: Record<LibraryStudentThemeDisplay, string> = {
  off: 'Do not use student themes',
  emoji: 'Theme emoji next to the name',
  emoji_and_color: 'Theme emoji and name color',
};

export const DEFAULT_LIBRARY_STUDENT_NAME_DISPLAY_MODE: LibraryStudentNameDisplayMode = 'preferred_full';
export const DEFAULT_LIBRARY_STUDENT_THEME_DISPLAY: LibraryStudentThemeDisplay = 'emoji_and_color';

export function resolveLibraryStudentNameMode(
  libraryMode?: LibraryStudentNameDisplayMode | null,
  schoolPrivacyMode?: PrivacyStudentNameDisplayMode | null,
): ResolvedLibraryStudentNameMode {
  const mode = libraryMode ?? DEFAULT_LIBRARY_STUDENT_NAME_DISPLAY_MODE;
  if (mode !== 'follow_school') return mode;
  return schoolPrivacyMode === 'preferred_only' ? 'preferred_only' : 'preferred_full';
}

export function formatLibraryStudentName(
  student: { firstName?: string; lastName?: string; nickname?: string } | null | undefined,
  mode: ResolvedLibraryStudentNameMode = 'preferred_full',
  fallback = 'Unknown student',
): string {
  if (!student) return fallback;
  if (mode === 'legal_full') {
    const first = (student.firstName || '').trim();
    const last = (student.lastName || '').trim();
    return `${first} ${last}`.trim() || fallback;
  }
  const preferred =
    getStudentNickname({
      firstName: student.firstName || '',
      lastName: student.lastName,
      nickname: student.nickname,
    }).trim() || (student.firstName || '').trim();
  if (!preferred) return fallback;
  return displayStudentNameOnSharedBoard(
    {
      firstName: student.firstName || preferred,
      lastName: student.lastName,
      nickname: student.nickname,
    },
    mode === 'preferred_only' ? 'preferred_only' : 'full',
  );
}

export type LibraryStudentThemeMark = {
  emoji?: string;
  emojiUrl?: string;
  color?: string;
};

export function resolveLibraryStudentThemeMark(
  student: Pick<Student, 'theme' | 'customEmojiUrl'> | null | undefined,
  options: {
    display?: LibraryStudentThemeDisplay | null;
    schoolDefault?: StudentTheme | null;
    studentThemesEnabled?: boolean;
  } = {},
): LibraryStudentThemeMark {
  const display = options.display ?? DEFAULT_LIBRARY_STUDENT_THEME_DISPLAY;
  if (display === 'off' || options.studentThemesEnabled === false) return {};

  const custom = (student?.customEmojiUrl || '').trim();
  const theme = resolveStudentThemeWithSchoolDefault(
    student?.theme,
    options.schoolDefault,
    true,
  );
  const mark: LibraryStudentThemeMark = {};
  if (custom) {
    mark.emojiUrl = custom;
  } else {
    const emoji = (theme?.emoji || '').trim();
    if (emoji) mark.emoji = emoji;
  }
  if (display === 'emoji_and_color') {
    const color = (theme?.primary || '').trim();
    if (color) mark.color = color;
  }
  return mark;
}
