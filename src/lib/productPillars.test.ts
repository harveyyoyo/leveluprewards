import { describe, expect, it } from 'vitest';

import {
  applyPillarAccessToSettings,
  formatActivePillars,
  hasPillarAccess,
  isPillarOn,
  isSettingsKeyAllowed,
} from './productPillars';

describe('product pillars', () => {
  it('defaults pillars to on', () => {
    expect(isPillarOn({}, 'payLibrary')).toBe(true);
    expect(isPillarOn({ payHomework: false }, 'payHomework')).toBe(false);
  });

  it('gates homework and attendance features by pillar only', () => {
    expect(isSettingsKeyAllowed({ payHomework: false }, 'enableHomework')).toBe(false);
    expect(isSettingsKeyAllowed({ payHomework: true }, 'enableHomework')).toBe(true);
    expect(isSettingsKeyAllowed({ payAttendance: false }, 'enableClassSignIn')).toBe(false);
    expect(isSettingsKeyAllowed({}, 'enableBadges')).toBe(true);
    expect(isSettingsKeyAllowed({}, 'enableNotifications')).toBe(true);
  });

  it('formats active pillar labels', () => {
    expect(formatActivePillars({ payLibrary: false })).toMatch(/^Classroom Management.+Attendance.+Homework$/);
  });

  it('separates pillar access from active settings', () => {
    expect(hasPillarAccess({ payLibrary: false }, 'payLibrary')).toBe(false);
    expect(isPillarOn({ payLibrary: true }, 'payLibrary', { payLibrary: false })).toBe(false);
    expect(isSettingsKeyAllowed({ payLibrary: true }, 'payLibrary', { pillarAccess: { payLibrary: false } })).toBe(false);
    expect(isSettingsKeyAllowed({ payLibrary: true }, 'libraryAutoStudentPortalEnabled', { pillarAccess: { payLibrary: false } })).toBe(false);
    expect(applyPillarAccessToSettings({ payLibrary: true }, { payLibrary: false }).payLibrary).toBe(false);
  });
});