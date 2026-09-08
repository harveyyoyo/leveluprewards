// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { consumeParentPortalCode, requestParentPortalCode } from './parentPortalChallenge';

function memoryDb() {
  const records = new Map<string, any>();
  let sequence = 0;
  const ref = (path: string): any => ({
    path,
    collection: (name: string) => ref(`${path}/${name}`),
    doc: (id = String(++sequence)) => ref(`${path}/${id}`),
  });
  const db = {
    collection: (name: string) => ref(name),
    runTransaction: async (fn: any) => fn({
      get: async (r: any) => ({ data: () => records.get(r.path) }),
      set: (r: any, data: any) => records.set(r.path, data),
      update: (r: any, patch: any) => records.set(r.path, { ...records.get(r.path), ...patch }),
    }),
  } as unknown as Firestore;
  const getCode = () => [...records.entries()].filter(([path]) => path.startsWith('mail/')).at(-1)![1].message.text.match(/\b\d{6}\b/)[0];
  return { db, records, getCode };
}

describe('parent email verification', () => {
  beforeEach(() => { vi.stubEnv('AUTH_GATE_SIGNING_SECRET', 'test-secret-for-parent-login-at-least-32-characters'); vi.useFakeTimers(); });
  afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

  it('only accepts the emailed code, once, for its student and email', async () => {
    const { db, getCode, records } = memoryDb();
    const result = await requestParentPortalCode(db, 'school', 'student', 'parent@example.com');
    expect(result).toEqual({ challengeId: expect.any(String) });
    const code = getCode();
    expect(records.get('schools/school/secrets/parentLogin_student').digest).toMatch(/^[a-f0-9]{64}$/);
    expect(await consumeParentPortalCode(db, 'school', 'other', 'parent@example.com', result.challengeId!, code)).toBe(false);
    expect(await consumeParentPortalCode(db, 'school', 'student', 'changed@example.com', result.challengeId!, code)).toBe(false);
    expect(await consumeParentPortalCode(db, 'school', 'student', 'parent@example.com', result.challengeId!, code)).toBe(true);
    expect(await consumeParentPortalCode(db, 'school', 'student', 'parent@example.com', result.challengeId!, code)).toBe(false);
  });

  it('locks a challenge after five incorrect attempts', async () => {
    const { db, getCode } = memoryDb();
    const { challengeId } = await requestParentPortalCode(db, 'school', 'student', 'parent@example.com');
    const code = getCode();
    const wrong = code === '000000' ? '000001' : '000000';
    for (let attempt = 0; attempt < 5; attempt++) {
      expect(await consumeParentPortalCode(db, 'school', 'student', 'parent@example.com', challengeId!, wrong)).toBe(false);
    }
    expect(await consumeParentPortalCode(db, 'school', 'student', 'parent@example.com', challengeId!, code)).toBe(false);
  });

  it('expires codes and rate-limits resends across requests', async () => {
    const { db, getCode } = memoryDb();
    const first = await requestParentPortalCode(db, 'school', 'student', 'parent@example.com');
    const code = getCode();
    expect(await requestParentPortalCode(db, 'school', 'student', 'parent@example.com')).toHaveProperty('error');
    vi.advanceTimersByTime(10 * 60_000);
    expect(await consumeParentPortalCode(db, 'school', 'student', 'parent@example.com', first.challengeId!, code)).toBe(false);
    for (let request = 0; request < 4; request++) {
      expect(await requestParentPortalCode(db, 'school', 'student', 'parent@example.com')).toHaveProperty('challengeId');
      vi.advanceTimersByTime(60_000);
    }
    expect(await requestParentPortalCode(db, 'school', 'student', 'parent@example.com')).toHaveProperty('error');
  });

  it('invalidates the previous code when a replacement is issued', async () => {
    const { db, getCode } = memoryDb();
    const first = await requestParentPortalCode(db, 'school', 'student', 'parent@example.com');
    const code = getCode();
    vi.advanceTimersByTime(60_000);
    await requestParentPortalCode(db, 'school', 'student', 'parent@example.com');
    expect(await consumeParentPortalCode(db, 'school', 'student', 'parent@example.com', first.challengeId!, code)).toBe(false);
  });
});
