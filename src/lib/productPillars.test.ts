import { describe, expect, it } from 'vitest';

import { formatActivePillars, isPillarOn, isSettingsKeyAllowed } from './productPillars';

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
    expect(formatActivePillars({ payLibrary: false })).toBe('Attendance · Homework');
  });
});
