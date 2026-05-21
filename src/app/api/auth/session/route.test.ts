import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const firebaseAdminAuthMock = vi.hoisted(() => ({
  getFirebaseAdminAuth: vi.fn(),
  verifyIdToken: vi.fn(),
  createSessionCookie: vi.fn(),
}));

vi.mock('@/lib/server/firebaseAdminAuth', () => ({
  getFirebaseAdminAuth: firebaseAdminAuthMock.getFirebaseAdminAuth,
}));

function sessionPostRequest() {
  return new NextRequest('https://levelupenterprises.education/api/auth/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Host: 'levelupenterprises.education',
      Origin: 'https://levelupenterprises.education',
    },
    body: JSON.stringify({ idToken: 'firebase-id-token' }),
  });
}

describe('/api/auth/session POST', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_OFFICE_CANONICAL_HOST = 'office.leveluprewards.app';
    delete process.env.AUTH_SESSION_EDGE_ENFORCEMENT;
    delete process.env.DISABLE_AUTH_SESSION_EDGE;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('skips optional cookie sync failures when edge enforcement is relaxed', async () => {
    process.env.DISABLE_AUTH_SESSION_EDGE = '1';
    firebaseAdminAuthMock.getFirebaseAdminAuth.mockRejectedValue(new Error('missing admin credentials'));

    const response = await POST(sessionPostRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      skipped: true,
      reason: 'session-cookie-unavailable',
    });
  });

  it('fails cookie sync failures when strict edge enforcement is enabled', async () => {
    process.env.AUTH_SESSION_EDGE_ENFORCEMENT = '1';
    firebaseAdminAuthMock.getFirebaseAdminAuth.mockRejectedValue(new Error('missing admin credentials'));

    const response = await POST(sessionPostRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: 'Could not create session. Check Firebase Admin credentials in this environment.',
    });
  });
});
