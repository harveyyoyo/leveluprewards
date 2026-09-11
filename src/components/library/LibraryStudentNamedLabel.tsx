'use client';

import { useMemo } from 'react';
import type { Student } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useSettings } from '@/components/providers/SettingsProvider';
import {
  formatLibraryStudentName,
  resolveLibraryStudentNameMode,
  resolveLibraryStudentThemeMark,
  type LibraryStudentThemeMark,
  type ResolvedLibraryStudentNameMode,
} from '@/lib/library/libraryStudentDisplay';

export function useLibraryStudentDisplay() {
  const { settings } = useSettings();
  const nameMode = resolveLibraryStudentNameMode(
    settings.libraryStudentNameDisplayMode,
    settings.privacyStudentNameDisplayMode,
  );
  const themeDisplay = settings.libraryStudentThemeDisplay ?? 'emoji_and_color';
  const schoolDefault = settings.defaultStudentTheme ?? null;
  const studentThemesEnabled = settings.enableStudentThemes !== false;

  const formatName = useMemo(
    () => (student?: Student | null, fallback?: string) =>
      formatLibraryStudentName(student, nameMode, fallback),
    [nameMode],
  );

  const getThemeMark = useMemo(
    () => (student?: Student | null) =>
      resolveLibraryStudentThemeMark(student, {
        display: themeDisplay,
        schoolDefault,
        studentThemesEnabled,
      }),
    [themeDisplay, schoolDefault, studentThemesEnabled],
  );

  return { nameMode, themeDisplay, formatName, getThemeMark };
}

export function LibraryStudentNamedLabel({
  student,
  nameMode,
  themeMark,
  className,
  nameClassName,
  applyColor = true,
}: {
  student: Student;
  nameMode?: ResolvedLibraryStudentNameMode;
  themeMark?: LibraryStudentThemeMark;
  className?: string;
  nameClassName?: string;
  /** Set false when the row is already highlighted (e.g. selected picker row). */
  applyColor?: boolean;
}) {
  const { formatName, getThemeMark } = useLibraryStudentDisplay();
  const name = nameMode
    ? formatLibraryStudentName(student, nameMode)
    : formatName(student);
  const mark = themeMark ?? getThemeMark(student);
  const color = applyColor ? mark.color : undefined;

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5', className)}>
      {mark.emojiUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mark.emojiUrl} alt="" className="h-4 w-4 shrink-0 rounded-sm object-contain" />
      ) : mark.emoji ? (
        <span className="shrink-0 text-sm leading-none" aria-hidden>
          {mark.emoji}
        </span>
      ) : null}
      <span
        className={cn('min-w-0 truncate', nameClassName)}
        style={color ? { color } : undefined}
      >
        {name}
      </span>
    </span>
  );
}
