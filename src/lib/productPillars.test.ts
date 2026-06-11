import { describe, expect, it } from 'vitest';

import {
  applyPillarAccessToSettings,
  formatActivePillars,
  hasPillarAccess,
  HOMEWORK_PILLAR_LIVE,
  isPillarOn,
  isSettingsKeyAllowed,
} from './productPillars';

describe('product pillars', () => {
  it('defaults pillars to on except homework and office', () => {
    expect(isPillarOn({}, 'payLibrary')).toBe(true);
    expect(isPillarOn({}, 'payHomework')).toBe(false);
    expect(isPillarOn({ payHomework: true }, 'payHomework')).toBe(HOMEWORK_PILLAR_LIVE);
    expect(isPillarOn({ payHomework: false }, 'payHomework')).toBe(false);
  });

  it('gates homework and attendance features by pillar only', () => {
    expect(isSettingsKeyAllowed({}, 'enableHomework')).toBe(false);
    expect(isSettingsKeyAllowed({ payHomework: false }, 'enableHomework')).toBe(false);
    expect(isSettingsKeyAllowed({ payHomework: true }, 'enableHomework')).toBe(HOMEWORK_PILLAR_LIVE);
    expect(isSettingsKeyAllowed({ payAttendance: false }, 'enableClassSignIn')).toBe(false);
    expect(isSettingsKeyAllowed({}, 'enableBadges')).toBe(true);
    expect(isSettingsKeyAllowed({}, 'enableNotifications')).toBe(true);
  });

  it('formats active pillar labels', () => {
    expect(formatActivePillars({ payLibrary: false })).toMatch(/^Classroom Management.+Attendance$/);
    if (HOMEWORK_PILLAR_LIVE) {
      expect(formatActivePillars({ payHomework: true })).toContain('Homework');
    } else {
      expect(formatActivePillars({ payHomework: true })).not.toContain('Homework');
    }
  });

  it('separates pillar access from active settings', () => {
    expect(hasPillarAccess({ payLibrary: false }, 'payLibrary')).toBe(false);
    expect(isPillarOn({ payLibrary: true }, 'payLibrary', { payLibrary: false })).toBe(false);
    expect(isSettingsKeyAllowed({ payLibrary: true }, 'payLibrary', { pillarAccess: { payLibrary: false } })).toBe(false);
    expect(isSettingsKeyAllowed({ payLibrary: true }, 'libraryAutoStudentPortalEnabled', { pillarAccess: { payLibrary: false } })).toBe(false);
    expect(applyPillarAccessToSettings({ payLibrary: true }, { payLibrary: false }).payLibrary).toBe(false);
  });
});