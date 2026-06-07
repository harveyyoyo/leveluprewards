'use client';

import type { ReactNode } from 'react';
import { CLASSROOM_NOTE_SHORTCUTS } from '@/lib/classroom/classroomNoteShortcuts';
import type { ClassroomDeductConfig } from '@/lib/classroom/classroomDeductSettings';
import type { ClassroomSeatingPrefs } from '@/lib/classroomSeatingChart';
import { cn } from '@/lib/utils';

export type ClassroomSeatingShortcutsHintState = {
  prefs: ClassroomSeatingPrefs;
  editMode: boolean;
  attendanceEnabled: boolean;
  bathroomEnabled: boolean;
  classroomDeduct?: ClassroomDeductConfig;
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
  classroomDeduct,
  monitorDisplay = false,
  isFullscreen = false,
}: ClassroomSeatingShortcutsHintState) {
  const onMonitor = monitorDisplay || isFullscreen;
  const deduct = classroomDeduct ?? { enabled: false, points: 0, label: 'Deduct', description: '' };

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

  if (!onMonitor) {
    const tapLine = prefs.instantTap
      ? `Tap a student to award +${prefs.defaultPoints} points right away.`
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
    <div className="space-y-1.5 text-[11px] leading-snug text-muted-foreground sm:text-xs">
      <p>
        <span className="font-semibold text-foreground">Awards:</span>{' '}
        {prefs.instantTap
          ? `Tap a desk = +${prefs.defaultPoints} points.`
          : 'Tap a desk = awards menu (pick category or quick award).'}
        {prefs.showRandomPicker ? (
          <>
            {' '}
            <ShortcutKey>R</ShortcutKey> = random student.
          </>
        ) : null}{' '}
        <ShortcutKey>Ctrl</ShortcutKey>+<ShortcutKey>U</ShortcutKey> = undo last award.
        {prefs.showBurstAward ? ' Burst on the toolbar = select several desks, award once.' : null}
      </p>
      <p>
        <span className="font-semibold text-foreground">Behavior notes:</span> Hold {noteKeyLine} and click a
        student. Shift+click = choose note type from a menu.
      </p>
      {attendanceEnabled || bathroomEnabled || deduct.enabled ? (
        <p>
          <span className="font-semibold text-foreground">Other:</span>{' '}
          {attendanceEnabled ? (
            <>
              Colored dot on each desk = class sign-in today (green present, amber late, red absent).{' '}
            </>
          ) : null}
          {bathroomEnabled ? (
            <>
              <ShortcutKey>Alt</ShortcutKey>+click = bathroom pass timer.{' '}
            </>
          ) : null}
          {deduct.enabled ? (
            <>
              <ShortcutKey>Ctrl</ShortcutKey>+click = deduct {deduct.points} pts ({deduct.label}).
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
