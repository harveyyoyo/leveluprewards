import { describe, expect, it } from 'vitest';
import { DEFAULT_CLASSROOM_PREFS } from '@/lib/classroomSeatingChart';
import {
  classroomMonitorDisplayFromSettings,
  deskDisplayFlagsFromPointsMode,
  normalizeClassroomMonitorPointsDisplay,
  resolveEffectiveDeskDisplayPrefs,
} from '@/lib/classroom/classroomMonitorDisplaySettings';

describe('classroomMonitorDisplaySettings', () => {
  it('normalizes points display mode', () => {
    expect(normalizeClassroomMonitorPointsDisplay('session')).toBe('session');
    expect(normalizeClassroomMonitorPointsDisplay('invalid')).toBe('both');
  });

  it('maps points display mode to desk flags', () => {
    expect(deskDisplayFlagsFromPointsMode('off')).toEqual({
      showPointBalances: false,
      showSessionTotals: false,
    });
    expect(deskDisplayFlagsFromPointsMode('both')).toEqual({
      showPointBalances: true,
      showSessionTotals: true,
    });
  });

  it('reads school settings with include toggles', () => {
    expect(
      classroomMonitorDisplayFromSettings({
        classroomMonitorPointsDisplay: 'session',
        classroomMonitorIncludeSessionLastAward: false,
        classroomMonitorIncludeLastName: true,
      }),
    ).toEqual({
      showPointBalances: false,
      showSessionTotals: true,
      showSessionLastAward: false,
      showLastName: true,
      showStudentEmoji: false,
    });
  });

  it('uses school settings when local prefs are still defaults', () => {
    expect(
      resolveEffectiveDeskDisplayPrefs(
        { classroomMonitorPointsDisplay: 'balance' },
        DEFAULT_CLASSROOM_PREFS,
      ),
    ).toEqual({
      showPointBalances: true,
      showSessionTotals: false,
      showSessionLastAward: true,
      showLastName: false,
      showStudentEmoji: false,
    });
  });

  it('prefers local monitor overrides when customized', () => {
    expect(
      resolveEffectiveDeskDisplayPrefs(
        { classroomMonitorPointsDisplay: 'both' },
        { ...DEFAULT_CLASSROOM_PREFS, showSessionTotals: false },
      ),
    ).toEqual({
      showPointBalances: true,
      showSessionTotals: false,
      showSessionLastAward: true,
      showLastName: false,
      showStudentEmoji: false,
    });
  });
});
