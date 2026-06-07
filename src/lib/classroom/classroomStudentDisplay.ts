import { CLASSROOM_NOTE_SHORTCUTS } from '@/lib/classroom/classroomNoteShortcuts';
import type { ClassroomSessionData } from '@/lib/classroomSeatingChart';

/** True when a session label came from a behavior-note shortcut (Comment, Incident, etc.). */
export function isClassroomBehaviorNoteLabel(label: string): boolean {
  const trimmed = label.trim();
  return CLASSROOM_NOTE_SHORTCUTS.some(
    (shortcut) => trimmed.startsWith(`${shortcut.hintLabel}:`) || trimmed === shortcut.hintLabel,
  );
}

/** Strip behavior-note text from session data shown on the class projector. */
export function sanitizeSessionForStudentDisplay(data: ClassroomSessionData): ClassroomSessionData {
  const lastAward = Object.fromEntries(
    Object.entries(data.lastAward).map(([id, entry]) => [
      id,
      isClassroomBehaviorNoteLabel(entry.label) ? { ...entry, label: '' } : entry,
    ]),
  );
  const activity = (data.activity ?? []).filter((entry) => !isClassroomBehaviorNoteLabel(entry.label));
  return { ...data, lastAward, activity };
}
