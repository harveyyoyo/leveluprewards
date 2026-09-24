import { describe, expect, it } from 'vitest';
import { transportParentAccessIsUsable, transportParentAccessSafeSummary, type OfficeTransportParentAccess } from './transportParentAccess';

describe('transport parent access', () => {
  it('accepts only active, unexpired access', () => {
    const now = 1_000_000;
    expect(transportParentAccessIsUsable({ status: 'active', expiresAt: now + 1 }, now)).toBe(true);
    expect(transportParentAccessIsUsable({ status: 'active', expiresAt: now }, now)).toBe(false);
    expect(transportParentAccessIsUsable({ status: 'revoked', expiresAt: now + 1 }, now)).toBe(false);
  });

  it('does not include the private code fields in a staff summary', () => {
    const access: OfficeTransportParentAccess = {
      id: 'access-1', familyId: 'family-1', label: 'Bus access', status: 'active', createdAt: 1,
      createdBy: 'staff', expiresAt: 10, updatedAt: 1, updatedBy: 'staff', consentVersion: 1,
      arrivalPreferences: { email: false, sms: false, whatsapp: false, updatedAt: 1 },
    };
    const summary = transportParentAccessSafeSummary(access, 'Klein family');
    expect(summary).toEqual(expect.objectContaining({ id: 'access-1', familyName: 'Klein family', status: 'active' }));
    expect(summary).not.toHaveProperty('codeHash');
    expect(summary).not.toHaveProperty('code');
  });
});
