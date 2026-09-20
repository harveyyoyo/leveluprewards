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

  const quick = ctx.quickAwards.find(
    (q) => q && (q.description === trimmed || q.label === trimmed),
  );
  if (quick?.label) return sanitizeAwardWords(quick.label);

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
    const def = ctx.quickAwards.find((q) => q && q.points === ctx.defaultPoints);
    return sanitizeAwardWords(def?.label ?? ctx.quickTapDescription);
  }

  return sanitizeAwardWords(trimmed.length > 28 ? `${trimmed.slice(0, 26)}…` : trimmed);
}

export function replaceForbiddenQuickTapLabel(label: string | null | undefined): string {
  if (!label) return 'Good job';
  return /^quick\s*tap$/i.test(label.trim()) ? 'Good job' : label;
}

function sanitizeAwardWords(label: string): string {
  return replaceForbiddenQuickTapLabel(label);
}

/** Words that must never appear on a student desk card. */
const FORBIDDEN_DESK_AWARD_LABEL = /^quick\s*tap$/i;

export function sanitizeClassroomDeskAwardLabel(label: string | null | undefined): string | null {
  const trimmed = label?.trim();
  if (!trimmed) return null;
  if (FORBIDDEN_DESK_AWARD_LABEL.test(trimmed)) return null;
  return trimmed;
}
