// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkDemoLink, demoShareKey, demoShareKeys } from './demoShareKey';

describe('owner-made demo links', () => {
  beforeEach(() => vi.stubEnv('AUTH_GATE_SIGNING_SECRET', 'demo-share-test-secret-at-least-32-characters'));
  afterEach(() => vi.unstubAllEnvs());

  it('makes one stable, short key per demo school', () => {
    const keys = demoShareKeys();
    expect(keys?.schoolabc).toMatch(/^[\w-]{22}$/);
    expect(keys?.yeshiva).toMatch(/^[\w-]{22}$/);
    expect(keys?.schoolabc).not.toBe(keys?.yeshiva);
    expect(demoShareKey('schoolabc')).toBe(keys?.schoolabc);
  });

  it('opens the page only with the right key for that school', () => {
    const key = demoShareKey('schoolabc')!;
    expect(checkDemoLink('/demo/library', `?tab=catalog&key=${key}`)).toEqual({
      ok: true,
      target: { schoolId: 'schoolabc', href: '/schoolabc/library?tab=catalog', needsAdmin: false },
    });
    expect(checkDemoLink('/demo/yeshiva/library', `?key=${key}`).ok).toBe(false);
  });

  it('sends links without a valid key to the normal sign-in', () => {
    expect(checkDemoLink('/demo/library', '')).toEqual({
      ok: false,
      redirectTo: '/login?school=schoolabc&next=%2Fschoolabc%2Flibrary',
    });
    expect(checkDemoLink('/demo/library', '?key=wrong').ok).toBe(false);
    expect(checkDemoLink('/demo/library', `?key=${'é'.repeat(22)}`).ok).toBe(false);
    expect(checkDemoLink('/demo/library.html', '')).toEqual({ ok: false, redirectTo: '/login' });
  });

  it('changes every key when the secret changes, and makes none without one', () => {
    const before = demoShareKey('schoolabc');
    vi.stubEnv('AUTH_GATE_SIGNING_SECRET', 'a-different-secret-that-is-also-32-characters-long');
    expect(demoShareKey('schoolabc')).not.toBe(before);
    vi.stubEnv('AUTH_GATE_SIGNING_SECRET', '');
    expect(demoShareKeys()).toBeNull();
    expect(checkDemoLink('/demo/library', `?key=${before}`).ok).toBe(false);
  });
});
