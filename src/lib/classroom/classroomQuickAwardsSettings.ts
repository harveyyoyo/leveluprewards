import {
  DEFAULT_CLASSROOM_QUICK_AWARDS,
  type ClassroomQuickAward,
} from '@/lib/classroomSeatingChart';
import {
  CLASSROOM_NOTE_SHORTCUTS,
  getClassroomNoteShortcut,
  type ClassroomNoteShortcut,
  type ClassroomNoteShortcutKey,
} from '@/lib/classroom/classroomNoteShortcuts';

export type { ClassroomQuickAward as SchoolClassroomQuickAward };

export const MAX_CLASSROOM_QUICK_AWARDS = 16;
export const MAX_BEHAVIOR_QUICK_OPTIONS = 12;

export type ClassroomBehaviorQuickOptions = Partial<
  Record<ClassroomNoteShortcutKey, string[]>
>;

export type ClassroomLabelsSettings = {
  classroomQuickAwards?: unknown;
  classroomQuickTapDescription?: string;
  classroomBehaviorQuickOptions?: unknown;
};

export function newClassroomQuickAwardId(): string {
  return `qa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeOneQuickAward(raw: unknown, index: number): ClassroomQuickAward | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<ClassroomQuickAward>;
  const label = typeof row.label === 'string' ? row.label.trim() : '';
  const points = Number(row.points);
  if (!label || !Number.isFinite(points) || points <= 0) return null;
  const description =
    typeof row.description === 'string' && row.description.trim()
      ? row.description.trim()
      : label;
  const id =
    typeof row.id === 'string' && row.id.trim()
      ? row.id.trim()
      : `qa-${index}-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return { id, label, points: Math.round(points), description };
}

export function normalizeClassroomQuickAwards(
  input: unknown,
  fallback: ClassroomQuickAward[] = DEFAULT_CLASSROOM_QUICK_AWARDS,
): ClassroomQuickAward[] {
  if (!Array.isArray(input)) {
    return fallback.map((q, i) => normalizeOneQuickAward(q, i)!);
  }
  const out = input
    .map((row, i) => normalizeOneQuickAward(row, i))
    .filter((q): q is ClassroomQuickAward => q != null)
    .slice(0, MAX_CLASSROOM_QUICK_AWARDS);
  if (out.length === 0) {
    return fallback.map((q, i) => normalizeOneQuickAward(q, i)!);
  }
  return out;
}

export function resolveClassroomQuickAwards(
  settings?: ClassroomLabelsSettings | null,
): ClassroomQuickAward[] {
  if (Array.isArray(settings?.classroomQuickAwards) && settings.classroomQuickAwards.length > 0) {
    return normalizeClassroomQuickAwards(settings.classroomQuickAwards);
  }
  return normalizeClassroomQuickAwards(undefined);
}

export function resolveClassroomQuickTapDescription(
  settings?: ClassroomLabelsSettings | null,
): string {
  const custom = settings?.classroomQuickTapDescription?.trim();
  if (custom) return custom;
  const first = resolveClassroomQuickAwards(settings)[0];
  return first?.description ?? 'Quick award';
}

export function createClassroomQuickAward(
  label = 'New award',
  points = 5,
): ClassroomQuickAward {
  const trimmed = label.trim() || 'New award';
  return {
    id: newClassroomQuickAwardId(),
    label: trimmed,
    points: Math.max(1, Math.round(points)),
    description: trimmed,
  };
}

function normalizeOptionList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean))].slice(
    0,
    MAX_BEHAVIOR_QUICK_OPTIONS,
  );
}

export function normalizeBehaviorQuickOptions(input: unknown): ClassroomBehaviorQuickOptions {
  if (!input || typeof input !== 'object') return {};
  const raw = input as Record<string, unknown>;
  const out: ClassroomBehaviorQuickOptions = {};
  for (const shortcut of CLASSROOM_NOTE_SHORTCUTS) {
    const list = normalizeOptionList(raw[shortcut.key]);
    if (list.length > 0) out[shortcut.key] = list;
  }
  return out;
}

export function resolveBehaviorQuickOptionsForKey(
  key: ClassroomNoteShortcutKey,
  overrides?: ClassroomBehaviorQuickOptions | null,
): string[] {
  const custom = overrides?.[key];
  if (Array.isArray(custom) && custom.length > 0) {
    return normalizeOptionList(custom);
  }
  return getClassroomNoteShortcut(key).quickOptions;
}

export function getClassroomNoteShortcutsWithOptions(
  overrides?: ClassroomBehaviorQuickOptions | null,
): ClassroomNoteShortcut[] {
  return CLASSROOM_NOTE_SHORTCUTS.map((shortcut) => ({
    ...shortcut,
    quickOptions: resolveBehaviorQuickOptionsForKey(shortcut.key, overrides),
  }));
}

export function defaultBehaviorQuickOptions(): ClassroomBehaviorQuickOptions {
  const out: ClassroomBehaviorQuickOptions = {};
  for (const shortcut of CLASSROOM_NOTE_SHORTCUTS) {
    out[shortcut.key] = [...shortcut.quickOptions];
  }
  return out;
}
