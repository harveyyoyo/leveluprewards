import type { Settings } from '@/components/providers/SettingsProvider';
import {
  DEFAULT_CLASSROOM_PREFS,
  type ClassroomDesign,
  type ClassroomSeatingPrefs,
} from '@/lib/classroomSeatingChart';
import type { Class } from '@/lib/types';

/** Default idle time before leaving full-screen classroom (15 minutes). */
export const DEFAULT_CLASSROOM_SESSION_TIMEOUT_MS = 15 * 60 * 1000;

export type ClassroomSetupWizardDraft = {
  /** Class highlighted in finish links. */
  spotlightClassId: string;
  instantTap: boolean;
  defaultPoints: number;
  design: ClassroomDesign;
  enableParentView: boolean;
};

export function classroomSessionTimeoutMinFromSettings(settings?: Partial<Settings>): number {
  const raw = settings?.classroomSessionTimeoutMs;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.max(1, Math.min(1440, Math.round(raw / 60_000)));
  }
  return Math.round(DEFAULT_CLASSROOM_SESSION_TIMEOUT_MS / 60_000);
}

export function defaultClassroomWizardDraft(classes: Class[]): ClassroomSetupWizardDraft {
  const sorted = [...classes].sort((a, b) => a.name.localeCompare(b.name));
  return {
    spotlightClassId: sorted[0]?.id ?? '',
    instantTap: true,
    defaultPoints: 5,
    design: DEFAULT_CLASSROOM_PREFS.design,
    enableParentView: false,
  };
}

/** Persist classroom pillar settings from the setup wizard. */
export function applyClassroomWizardSettings(
  updateSettings: (patch: Partial<Settings>) => void,
  draft?: Pick<ClassroomSetupWizardDraft, 'enableParentView'>,
): void {
  updateSettings({
    payClassroom: true,
    ...(draft?.enableParentView ? { enableParentView: true } : {}),
  });
}

export function classroomPrefsFromDraft(draft: ClassroomSetupWizardDraft): ClassroomSeatingPrefs {
  return {
    ...DEFAULT_CLASSROOM_PREFS,
    instantTap: true,
    defaultPoints: Math.max(1, draft.defaultPoints),
    defaultDescription: 'Quick award',
    design: draft.design,
  };
}
