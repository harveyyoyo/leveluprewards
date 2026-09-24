// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { signTransportParentSession, verifyTransportParentSession } from './transportParentSession';

describe('private transport parent session', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('signs and verifies only the school and access id', async () => {
    vi.stubEnv('AUTH_GATE_SIGNING_SECRET', 'transport-parent-test-secret-at-least-32-characters');
    const token = await signTransportParentSession({ schoolId: 'School', accessId: 'access-1' });
    expect(await verifyTransportParentSession(token!)).toEqual({ schoolId: 'school', accessId: 'access-1' });
  });
});
