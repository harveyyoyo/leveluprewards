// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';
import { PARENT_PORTAL_JWT_ISS, signParentPortalSession, verifyParentPortalSession } from './parentPortalSession';

describe('parent session versioning', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('rejects legacy sessions and accepts verified-email sessions', async () => {
    const secret = 'parent-session-test-secret-at-least-32-characters';
    vi.stubEnv('AUTH_GATE_SIGNING_SECRET', secret);
    const legacy = await new SignJWT({ v: 1, sch: 'school', sid: 'student' })
      .setProtectedHeader({ alg: 'HS256' }).setIssuer(PARENT_PORTAL_JWT_ISS).setExpirationTime('7d')
      .sign(new TextEncoder().encode(secret));
    expect(await verifyParentPortalSession(legacy)).toBeNull();
    const token = await signParentPortalSession({ schoolId: 'school', studentId: 'student', email: 'Parent@example.com' });
    expect(await verifyParentPortalSession(token!)).toEqual({ schoolId: 'school', studentId: 'student', email: 'parent@example.com' });
  });
});
