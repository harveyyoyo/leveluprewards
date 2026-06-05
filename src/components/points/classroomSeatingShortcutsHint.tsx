'use client';

import type { ClassroomSeatingPrefs } from '@/lib/classroomSeatingChart';
import { cn } from '@/lib/utils';

export type ClassroomSeatingShortcutsHintState = {
  prefs: ClassroomSeatingPrefs;
  editMode: boolean;
  attendanceEnabled: boolean;
  bathroomEnabled: boolean;
  /** Live awards monitor — show toolbar copy with Arrange seats. */
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

function joinExtras(parts: string[]): string {
  return parts.filter(Boolean).join(' · ');
}

export function ClassroomSeatingShortcutsHint({
  prefs,
  editMode,
  attendanceEnabled,
  bathroomEnabled,
  monitorDisplay = false,
  isFullscreen = false,
}: ClassroomSeatingShortcutsHintState) {
  const onMonitor = monitorDisplay || isFullscreen;
  if (editMode) {
    return (
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Drag desks to match your room. Use the grid controls to add rows or columns, then tap{' '}
        <span className="font-semibold text-foreground">Done arranging</span> when finished.
      </p>
    );
  }

  const tapLine = prefs.instantTap
    ? `Tap a student to award +${prefs.defaultPoints} points right away.`
    : 'Tap a student to open the awards menu.';

  const modeLine = prefs.instantTap
    ? 'Use the Awards tab in the toolbar to switch to the full menu.'
    : 'Use the Quick tab in the toolbar for one-tap quick awards.';

  const toolbarPlacement = 'next to Arrange seats in the toolbar';

  const extras = joinExtras([
    'Shift+click = note type picker',
    prefs.showRandomPicker ? 'R = random student' : '',
    prefs.showBurstAward ? 'Burst in toolbar' : '',
    'Ctrl+U = undo last award',
    attendanceEnabled ? 'Dot = attendance today' : '',
    bathroomEnabled ? 'Alt+click = bathroom pass' : '',
    'Arrange seats = edit layout',
  ]);

  return (
    <div
      className={cn(
        'space-y-2 leading-relaxed text-muted-foreground',
        onMonitor ? 'max-w-none text-xs' : 'max-w-2xl text-sm',
      )}
    >
      <p>
        <span className="font-semibold text-foreground">
          {prefs.instantTap ? 'Quick select' : 'Awards'}:
        </span>{' '}
        {tapLine} {modeLine}
      </p>
      <p>
        Hold <ShortcutKey>P</ShortcutKey>, <ShortcutKey>C</ShortcutKey>, <ShortcutKey>I</ShortcutKey>,{' '}
        <ShortcutKey>W</ShortcutKey>, or <ShortcutKey>H</ShortcutKey> and click a student — each letter opens its
        own note popup (positive, comment, incident, warning, highlight). Or use the{' '}
        <span className="font-semibold text-foreground">Quick</span> /{' '}
        <span className="font-semibold text-foreground">Awards</span> tabs {toolbarPlacement} and pick a note from
        the menu.
      </p>
      {extras ? <p className="text-xs sm:text-sm">{extras}</p> : null}
    </div>
  );
}
