import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Auth } from 'firebase/auth';
import type { Functions } from 'firebase/functions';
import { httpsCallable } from 'firebase/functions';
import { verifyAdminPasscodeLogin } from './adminPasscodeLogin';
import { authFetch } from '@/lib/authFetch';

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}));

vi.mock('@/lib/authFetch', () => ({
  authFetch: vi.fn(),
}));

vi.mock('@/lib/google/googleAuthSession', () => ({
  refreshGoogleIdToken: vi.fn(async () => undefined),
}));

function mockAuth(): Auth {
  return {
    currentUser: {
      getIdToken: vi.fn(async () => 'token'),
      providerData: [],
    },
  } as unknown as Auth;
}

function jsonResponse(status: number, body: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('verifyAdminPasscodeLogin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('in production returns as soon as the faster path succeeds', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.mocked(authFetch).mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.mocked(httpsCallable).mockReturnValue(
      (() =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: { success: true } }), 2000);
        })) as ReturnType<typeof httpsCallable>,
    );

    const result = await verifyAdminPasscodeLogin(mockAuth(), {} as Functions, {
      schoolId: 'yeshiva',
      passcode: 'secret',
    });

    expect(result).toEqual({ ok: true });
  });

  it('in production uses the callable when the API is down', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.mocked(authFetch).mockResolvedValue(
      jsonResponse(503, { error: 'Could not verify school access. Check Firebase Admin credentials.' }),
    );
    vi.mocked(httpsCallable).mockReturnValue((async () => ({ data: { success: true } })) as ReturnType<
      typeof httpsCallable
    >);

    const result = await verifyAdminPasscodeLogin(mockAuth(), {} as Functions, {
      schoolId: 'yeshiva',
      passcode: 'secret',
    });

    expect(result).toEqual({ ok: true });
  });

  it('in production waits for both paths before treating a passcode as wrong', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.mocked(authFetch).mockResolvedValue(jsonResponse(403, { error: 'Invalid admin passcode.' }));
    vi.mocked(httpsCallable).mockReturnValue(
      (async () => {
        throw { code: 'functions/permission-denied', message: 'Invalid passcode.' };
      }) as unknown as ReturnType<typeof httpsCallable>,
    );

    const result = await verifyAdminPasscodeLogin(mockAuth(), {} as Functions, {
      schoolId: 'yeshiva',
      passcode: 'nope',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message.toLowerCase()).toMatch(/invalid/);
    }
  });
});
