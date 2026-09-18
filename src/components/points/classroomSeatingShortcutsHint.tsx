'use client';

import type { ReactNode } from 'react';
import { CLASSROOM_NOTE_SHORTCUTS } from '@/lib/classroom/classroomNoteShortcuts';
import type { ClassroomNoteDeductConfig } from '@/lib/classroom/classroomNoteDeductSettings';
import type { ClassroomSeatingPrefs } from '@/lib/classroomSeatingChart';
import { cn } from '@/lib/utils';

export type ClassroomSeatingShortcutsHintState = {
  prefs: ClassroomSeatingPrefs;
  editMode: boolean;
  attendanceEnabled: boolean;
  bathroomEnabled: boolean;
  classroomNoteDeduct?: ClassroomNoteDeductConfig;
  /** @deprecated Use classroomNoteDeduct */
  classroomDeduct?: ClassroomNoteDeductConfig;
  monitorDisplay?: boolean;
  /** @deprecated Use monitorDisplay */
  isFullscreen?: boolean;
};

function ShortcutKey({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[0.85em] font-semibold uppercase text-foreground">
      {children}
    </kbd>
  );
}

export function ClassroomSeatingShortcutsHint({
  prefs,
  editMode,
  attendanceEnabled,
  bathroomEnabled,
  classroomNoteDeduct,
  classroomDeduct,
  monitorDisplay = false,
  isFullscreen = false,
}: ClassroomSeatingShortcutsHintState) {
  const onMonitor = monitorDisplay || isFullscreen;
  const noteDeduct = classroomNoteDeduct ?? classroomDeduct ?? { enabled: false, points: 0, types: [] };

  if (editMode) {
    return (
      <p className={cn('text-muted-foreground', onMonitor ? 'text-xs' : 'text-sm')}>
        Drag desks to rearrange. Use the grid controls below for rows and columns.
      </p>
    );
  }

  const noteKeyLine = CLASSROOM_NOTE_SHORTCUTS.map(
    (shortcut) => (
      <span key={shortcut.key}>
        <ShortcutKey>{shortcut.key.toUpperCase()}</ShortcutKey> {shortcut.hintLabel}
      </span>
    ),
  ).reduce<ReactNode[]>((acc, item, index) => {
    if (index > 0) acc.push(' · ');
    acc.push(item);
    return acc;
  }, []);

  const deductTypeLabels = noteDeduct.enabled
    ? CLASSROOM_NOTE_SHORTCUTS.filter((shortcut) => noteDeduct.types.includes(shortcut.key)).map(
        (shortcut) => shortcut.hintLabel,
      )
    : [];

  if (!onMonitor) {
    const tapLine = prefs.instantTap
      ? `Tap a student to award +${prefs.defaultPoints} points right away. Right-click opens the awards menu.`
      : 'Tap a student to open the awards menu.';

    return (
      <div className="max-w-2xl space-y-2 text-sm leading-relaxed text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">Awards:</span> {tapLine}
        </p>
        <p>
          Hold {noteKeyLine} and click a student for behavior notes. Shift+click opens the note type picker.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 text-[11px] leading-snug !text-foreground sm:text-xs">
      <p className="font-semibold !text-foreground">Keyboard quick settings</p>
      <ul className="space-y-1">
        <li>
          <span className="font-semibold">Tap a desk</span> ={' '}
          {prefs.instantTap ? `+${prefs.defaultPoints} points right away · right-click = menu` : 'open the awards menu'}
          {prefs.showRandomPicker ? (
            <>
              {' '}
              · <ShortcutKey>R</ShortcutKey> = random student
            </>
          ) : null}
        </li>
        <li>
          <span className="font-semibold">Behavior notes:</span> hold {noteKeyLine} and click a desk.{' '}
          <ShortcutKey>Shift</ShortcutKey>+click = choose note type.
          {deductTypeLabels.length > 0
            ? ` Some note types can take away −${noteDeduct.points} pts (${deductTypeLabels.join(', ')}).`
            : ''}
        </li>
        {bathroomEnabled ? (
          <li>
            <ShortcutKey>Alt</ShortcutKey>+click = bathroom pass
          </li>
        ) : null}
        {attendanceEnabled ? (
          <li>Corner dots = class sign-in today (green present, orange late, red not signed in).</li>
        ) : null}
      </ul>
    </div>
  );
}
