// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const mocks = vi.hoisted(() => ({ request: vi.fn(), consume: vi.fn(), sign: vi.fn() }));
vi.mock('@/lib/server/parentPortalChallenge', () => ({ requestParentPortalCode: mocks.request, consumeParentPortalCode: mocks.consume }));
vi.mock('@/lib/parentPortal/parentPortalSession', () => ({ PARENT_PORTAL_COOKIE_NAME: 'edu_parent_portal', signParentPortalSession: mocks.sign }));
vi.mock('@/lib/server/studentPortalDb', () => ({ lookupStudentIdByBadge: vi.fn().mockResolvedValue('student') }));
vi.mock('@/lib/server/firebaseAdminAuth', () => ({
  getFirebaseAdminFirestore: async () => {
    const ref: any = { collection: () => ref, doc: () => ref, get: async () => ({ exists: true, data: () => ({ appSettings: { payClassroom: true, enableParentView: true }, parentEmail: 'parent@example.com' }) }) };
    return ref;
  },
}));
function request(extra = {}) {
  return new NextRequest('https://example.com/api/parent-portal/verify', {
    method: 'POST', headers: { Host: 'example.com', Origin: 'https://example.com', 'Content-Type': 'application/json' },
    body: JSON.stringify({ schoolId: 'school', studentLookup: 'student', parentEmail: 'parent@example.com', ...extra }),
  });
}
describe('parent login session boundary', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.sign.mockResolvedValue('verified-session'); });
  it('does not issue a session for matching student ID and email alone', async () => {
    mocks.request.mockResolvedValue({ challengeId: 'challenge' });
    const response = await POST(request());
    expect(await response.json()).toMatchObject({ requiresCode: true });
    expect(response.cookies.get('edu_parent_portal')).toBeUndefined();
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it.each([false, true])('issues a session only after code verification: %s', async (valid) => {
    mocks.consume.mockResolvedValue(valid);
    const response = await POST(request({ code: '123456', challengeId: '12345678-1234-1234-1234-123456789012' }));
    expect(response.status).toBe(valid ? 200 : 403);
    expect(!!response.cookies.get('edu_parent_portal')).toBe(valid);
  });
});
