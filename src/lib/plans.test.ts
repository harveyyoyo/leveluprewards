import { describe, expect, it } from 'vitest';

import { getSchoolEntitlements, isFeatureAllowed } from './plans';

describe('plan metadata (legacy)', () => {
  it('does not gate features by tier anymore', () => {
    const entitlements = getSchoolEntitlements({ plan: 'free' });

    expect(entitlements.enableAttendance).toBe(true);
    expect(entitlements.enableBadges).toBe(true);
    expect(entitlements.enableNotifications).toBe(true);
    expect(entitlements.enableStudentPortal).toBe(true);
    expect(isFeatureAllowed({ plan: 'free' }, 'enablePrizeAiSurprise')).toBe(true);
  });
});
