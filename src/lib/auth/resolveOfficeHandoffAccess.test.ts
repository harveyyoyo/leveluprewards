import { describe, expect, it, vi } from 'vitest';
import { resolveOfficeHandoffAccess } from '@/lib/auth/resolveOfficeHandoffAccess';

vi.mock('@/lib/server/resolveSchoolGateScopes', () => ({
  resolveSchoolGateScopes: vi.fn(async () => ['admin']),
}));

describe('resolveOfficeHandoffAccess', () => {
  it('allows admin from gate cookie scopes', async () => {
    const result = await resolveOfficeHandoffAccess('uid1', 'yeshiva', new Set(['admin']));
    expect(result).toEqual({ allowed: true, loginState: 'admin', userName: 'Admin' });
  });

  it('falls back to Firestore when gate scopes are empty', async () => {
    const result = await resolveOfficeHandoffAccess('uid1', 'yeshiva', new Set());
    expect(result?.loginState).toBe('admin');
  });

  it('denies when neither gate nor Firestore grants office access', async () => {
    const { resolveSchoolGateScopes } = await import('@/lib/server/resolveSchoolGateScopes');
    vi.mocked(resolveSchoolGateScopes).mockResolvedValueOnce(['teacher']);
    const result = await resolveOfficeHandoffAccess('uid1', 'yeshiva', null);
    expect(result).toBeNull();
  });
});
