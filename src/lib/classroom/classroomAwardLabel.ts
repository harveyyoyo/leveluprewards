import type { ClassroomSeatingPrefs } from '@/lib/classroomSeatingChart';

/** Human-readable label for a classroom award (quick tap, menu shortcut, category, etc.). */
export function classroomAwardDisplayLabel(
  description: string,
  prefs: Pick<
    ClassroomSeatingPrefs,
    | 'quickAwards'
    | 'defaultDescription'
    | 'defaultPoints'
    | 'correctionDescription'
    | 'correctionLabel'
  >,
): string {
  const trimmed = description.trim();
  if (!trimmed) return 'Award';

  const quick = prefs.quickAwards.find((q) => q.description === trimmed || q.label === trimmed);
  if (quick) return quick.label;

  if (trimmed === prefs.correctionDescription || trimmed === prefs.correctionLabel) {
    return prefs.correctionLabel || 'Reminder';
  }

  for (const prefix of ['Classroom burst — ', 'Classroom — ']) {
    if (trimmed.startsWith(prefix)) {
      return classroomAwardDisplayLabel(trimmed.slice(prefix.length), prefs);
    }
  }

  if (trimmed.startsWith('Undo: ')) {
    return classroomAwardDisplayLabel(trimmed.slice(6), prefs);
  }

  if (trimmed === prefs.defaultDescription) {
    const def = prefs.quickAwards.find((q) => q.points === prefs.defaultPoints);
    return def?.label ?? prefs.defaultDescription;
  }

  return trimmed.length > 28 ? `${trimmed.slice(0, 26)}…` : trimmed;
}
