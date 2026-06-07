import type { Settings } from '@/components/providers/SettingsProvider';
import {
  CLASSROOM_NOTE_SHORTCUTS,
  type ClassroomNoteShortcutKey,
} from '@/lib/classroom/classroomNoteShortcuts';

export type ClassroomNoteDeductConfig = {
  enabled: boolean;
  points: number;
  /** Behavior-note shortcut keys that may deduct points when a comment is saved. */
  types: ClassroomNoteShortcutKey[];
};

const DEFAULT_DEDUCT_TYPES: ClassroomNoteShortcutKey[] = ['c', 'i', 'w'];

export function defaultClassroomNoteDeductTypes(): ClassroomNoteShortcutKey[] {
  return [...DEFAULT_DEDUCT_TYPES];
}

export function normalizeClassroomNoteDeductTypes(raw: unknown): ClassroomNoteShortcutKey[] {
  if (!Array.isArray(raw)) return [...DEFAULT_DEDUCT_TYPES];
  const valid = new Set<ClassroomNoteShortcutKey>(
    CLASSROOM_NOTE_SHORTCUTS.map((shortcut) => shortcut.key),
  );
  return raw.filter(
    (key): key is ClassroomNoteShortcutKey =>
      typeof key === 'string' && valid.has(key as ClassroomNoteShortcutKey),
  );
}

export function resolveClassroomNoteDeduct(settings: Settings): ClassroomNoteDeductConfig {
  const legacyEnabled = settings.classroomDeductEnabled === true;
  const enabled =
    settings.classroomNoteDeductEnabled === true ||
    (settings.classroomNoteDeductEnabled === undefined && legacyEnabled);
  const points = Math.max(
    1,
    Math.round(
      Number(
        settings.classroomNoteDeductPoints ??
          settings.classroomDeductPoints,
      ) || 5,
    ),
  );
  const types =
    settings.classroomNoteDeductTypes !== undefined
      ? normalizeClassroomNoteDeductTypes(settings.classroomNoteDeductTypes)
      : enabled
        ? [...DEFAULT_DEDUCT_TYPES]
        : [];
  return {
    enabled: enabled && points > 0 && types.length > 0,
    points,
    types,
  };
}

export function isNoteDeductType(
  config: ClassroomNoteDeductConfig,
  key: ClassroomNoteShortcutKey,
): boolean {
  return config.enabled && config.types.includes(key);
}
