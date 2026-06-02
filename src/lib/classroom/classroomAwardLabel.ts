import type { ClassroomSeatingPrefs } from '@/lib/classroomSeatingChart';

import type { ClassroomQuickAward } from '@/lib/classroomSeatingChart';

export type ClassroomAwardLabelContext = Pick<
  ClassroomSeatingPrefs,
  'defaultPoints' | 'correctionDescription' | 'correctionLabel'
> & {
  quickAwards: ClassroomQuickAward[];
  quickTapDescription: string;
};

/** Human-readable label for a classroom award (quick tap, menu shortcut, category, etc.). */
export function classroomAwardDisplayLabel(
  description: string,
  ctx: ClassroomAwardLabelContext,
): string {
  const trimmed = description.trim();
  if (!trimmed) return 'Award';

  const quick = ctx.quickAwards.find((q) => q.description === trimmed || q.label === trimmed);
  if (quick) return quick.label;

  if (trimmed === ctx.correctionDescription || trimmed === ctx.correctionLabel) {
    return ctx.correctionLabel || 'Reminder';
  }

  for (const prefix of ['Classroom burst — ', 'Classroom — ']) {
    if (trimmed.startsWith(prefix)) {
      return classroomAwardDisplayLabel(trimmed.slice(prefix.length), ctx);
    }
  }

  if (trimmed.startsWith('Undo: ')) {
    return classroomAwardDisplayLabel(trimmed.slice(6), ctx);
  }

  if (trimmed === ctx.quickTapDescription) {
    const def = ctx.quickAwards.find((q) => q.points === ctx.defaultPoints);
    return def?.label ?? ctx.quickTapDescription;
  }

  return trimmed.length > 28 ? `${trimmed.slice(0, 26)}…` : trimmed;
}
