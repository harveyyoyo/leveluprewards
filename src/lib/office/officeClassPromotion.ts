import type { OfficeClass } from '@/lib/office/types';

export type OfficeClassPromotionRow = {
  classId: string;
  currentName: string;
  nextName: string;
};

export type OfficeClassPromotionSkip = {
  classId: string;
  name: string;
  reason: string;
};

export type OfficeClassPromotionPlan = {
  changes: OfficeClassPromotionRow[];
  skipped: OfficeClassPromotionSkip[];
};

function ordinalSuffix(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

function ordinalGradeLabel(n: number): string {
  return `${n}${ordinalSuffix(n)} Grade`;
}

export type AdvanceOfficeClassNameResult =
  | { kind: 'next'; nextName: string }
  | { kind: 'skip'; reason: string };

/** Bump a single class label for the next school year (e.g. Grade 5 → Grade 6). */
export function advanceOfficeClassName(name: string): AdvanceOfficeClassNameResult {
  const trimmed = name.trim();
  if (!trimmed) return { kind: 'skip', reason: 'Empty name' };

  const preK = trimmed.match(/^pre[\s-]?k(?:\s+(.+))?$/i);
  if (preK) {
    const suffix = preK[1]?.trim();
    return { kind: 'next', nextName: suffix ? `Kindergarten ${suffix}` : 'Kindergarten' };
  }

  const kindergarten = trimmed.match(/^kindergarten(?:\s+(.+))?$/i);
  if (kindergarten) {
    const suffix = kindergarten[1]?.trim();
    return { kind: 'next', nextName: suffix ? `Grade 1 ${suffix}` : 'Grade 1' };
  }

  const kShort = trimmed.match(/^k(?:\s+(.+))?$/i);
  if (kShort) {
    const suffix = kShort[1]?.trim();
    return { kind: 'next', nextName: suffix ? `Grade 1 ${suffix}` : 'Grade 1' };
  }

  const gradeMatch = trimmed.match(/^grade\s+(\d+)(.*)$/i);
  if (gradeMatch) {
    const num = Number.parseInt(gradeMatch[1], 10);
    const rawSuffix = gradeMatch[2] ?? '';
    if (!Number.isFinite(num) || num < 1) return { kind: 'skip', reason: 'Unrecognized grade number' };
    if (num >= 12) return { kind: 'skip', reason: 'Graduating grade — rename manually' };
    const next = num + 1;
    if (rawSuffix && !rawSuffix.startsWith(' ') && /^[A-Za-z]/.test(rawSuffix)) {
      return { kind: 'next', nextName: `Grade ${next}${rawSuffix}` };
    }
    const suffix = rawSuffix.trim();
    return { kind: 'next', nextName: suffix ? `Grade ${next} ${suffix}` : `Grade ${next}` };
  }

  const ordinalMatch = trimmed.match(/^(\d+)(st|nd|rd|th)\s+grade(.*)$/i);
  if (ordinalMatch) {
    const num = Number.parseInt(ordinalMatch[1], 10);
    const rawSuffix = ordinalMatch[3] ?? '';
    if (!Number.isFinite(num) || num < 1) return { kind: 'skip', reason: 'Unrecognized grade number' };
    if (num >= 12) return { kind: 'skip', reason: 'Graduating grade — rename manually' };
    const next = num + 1;
    const suffix = rawSuffix.trim();
    const nextLabel = ordinalGradeLabel(next);
    return { kind: 'next', nextName: suffix ? `${nextLabel} ${suffix}` : nextLabel };
  }

  return { kind: 'skip', reason: 'Use formats like Grade 5, Kindergarten A, or 3rd Grade' };
}

/** Preview bulk class-name promotion for end-of-year rollover. */
export function planOfficeClassPromotion(classes: Pick<OfficeClass, 'id' | 'name'>[]): OfficeClassPromotionPlan {
  const changes: OfficeClassPromotionRow[] = [];
  const skipped: OfficeClassPromotionSkip[] = [];

  for (const cls of classes) {
    const result = advanceOfficeClassName(cls.name);
    if (result.kind === 'skip') {
      skipped.push({ classId: cls.id, name: cls.name, reason: result.reason });
      continue;
    }
    if (result.nextName === cls.name.trim()) {
      skipped.push({ classId: cls.id, name: cls.name, reason: 'Already at target name' });
      continue;
    }
    changes.push({ classId: cls.id, currentName: cls.name, nextName: result.nextName });
  }

  changes.sort((a, b) => a.currentName.localeCompare(b.currentName));
  skipped.sort((a, b) => a.name.localeCompare(b.name));

  return { changes, skipped };
}
