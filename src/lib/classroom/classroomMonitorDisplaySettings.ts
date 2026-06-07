import type { Settings } from '@/components/providers/SettingsProvider';
import {
  DEFAULT_CLASSROOM_PREFS,
  type ClassroomSeatingPrefs,
} from '@/lib/classroomSeatingChart';

export type ClassroomMonitorPointsDisplay = 'off' | 'balance' | 'session' | 'both';

export type ClassroomMonitorDisplayFlags = {
  showPointBalances: boolean;
  showSessionTotals: boolean;
  showSessionLastAward: boolean;
  showLastName: boolean;
  showStudentEmoji: boolean;
};

export const DEFAULT_CLASSROOM_MONITOR_POINTS_DISPLAY: ClassroomMonitorPointsDisplay = 'both';

const VALID_POINTS_DISPLAY: ClassroomMonitorPointsDisplay[] = ['off', 'balance', 'session', 'both'];

export function normalizeClassroomMonitorPointsDisplay(
  value: unknown,
): ClassroomMonitorPointsDisplay {
  if (typeof value === 'string' && VALID_POINTS_DISPLAY.includes(value as ClassroomMonitorPointsDisplay)) {
    return value as ClassroomMonitorPointsDisplay;
  }
  return DEFAULT_CLASSROOM_MONITOR_POINTS_DISPLAY;
}

export function deskDisplayFlagsFromPointsMode(
  mode: ClassroomMonitorPointsDisplay,
): Pick<ClassroomMonitorDisplayFlags, 'showPointBalances' | 'showSessionTotals'> {
  switch (mode) {
    case 'off':
      return { showPointBalances: false, showSessionTotals: false };
    case 'balance':
      return { showPointBalances: true, showSessionTotals: false };
    case 'session':
      return { showPointBalances: false, showSessionTotals: true };
    case 'both':
    default:
      return { showPointBalances: true, showSessionTotals: true };
  }
}

export function classroomMonitorDisplayFromSettings(
  settings?: Partial<Settings>,
): ClassroomMonitorDisplayFlags {
  const mode = normalizeClassroomMonitorPointsDisplay(settings?.classroomMonitorPointsDisplay);
  const fromMode = deskDisplayFlagsFromPointsMode(mode);
  return {
    ...fromMode,
    showSessionLastAward: settings?.classroomMonitorIncludeSessionLastAward !== false,
    showLastName: settings?.classroomMonitorIncludeLastName === true,
    showStudentEmoji: settings?.classroomMonitorIncludeStudentEmoji === true,
  };
}

function localDeskDisplayMatchesDefaults(prefs: ClassroomSeatingPrefs): boolean {
  return (
    prefs.showPointBalances === DEFAULT_CLASSROOM_PREFS.showPointBalances &&
    prefs.showSessionTotals === DEFAULT_CLASSROOM_PREFS.showSessionTotals &&
    (prefs.showSessionLastAward ?? DEFAULT_CLASSROOM_PREFS.showSessionLastAward) ===
      DEFAULT_CLASSROOM_PREFS.showSessionLastAward &&
    prefs.showLastName === DEFAULT_CLASSROOM_PREFS.showLastName &&
    prefs.showStudentEmoji === DEFAULT_CLASSROOM_PREFS.showStudentEmoji
  );
}

/** School live settings apply until the teacher customizes desk display on the monitor. */
export function resolveEffectiveDeskDisplayPrefs(
  settings: Partial<Settings> | undefined,
  localPrefs: ClassroomSeatingPrefs,
): ClassroomMonitorDisplayFlags {
  const school = classroomMonitorDisplayFromSettings(settings);
  if (localDeskDisplayMatchesDefaults(localPrefs)) return school;
  return {
    showPointBalances: localPrefs.showPointBalances,
    showSessionTotals: localPrefs.showSessionTotals,
    showSessionLastAward:
      localPrefs.showSessionLastAward ?? DEFAULT_CLASSROOM_PREFS.showSessionLastAward,
    showLastName: localPrefs.showLastName,
    showStudentEmoji: localPrefs.showStudentEmoji,
  };
}

export function classroomMonitorPointsDisplayLabel(mode: ClassroomMonitorPointsDisplay): string {
  switch (mode) {
    case 'off':
      return 'Hidden';
    case 'balance':
      return 'Point balance only';
    case 'session':
      return 'Session totals only';
    case 'both':
    default:
      return 'Balance and session';
  }
}
