// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const authMocks = vi.hoisted(() => ({
  sameOriginCheck: vi.fn(() => true),
  verifyIdToken: vi.fn(async () => ({ uid: 'office-user' })),
  checkSchoolRole: vi.fn(async () => true),
}));

const dbMocks = vi.hoisted(() => ({
  familyDocs: [] as Array<{ id: string; data: () => Record<string, unknown> }>,
  studentDocs: [] as Array<{ id: string; data: () => Record<string, unknown> }>,
}));

vi.mock('@/lib/server/kioskSnapshotAuth', () => ({
  sameOriginCheck: authMocks.sameOriginCheck,
  verifyIdToken: authMocks.verifyIdToken,
  checkSchoolRole: authMocks.checkSchoolRole,
}));

vi.mock('@/lib/server/firebaseAdminAuth', () => ({
  getFirebaseAdminFirestore: async () => ({
    collection: () => ({
      doc: () => ({
        collection: (name: string) => ({
          get: async () => ({
            docs: name === 'officeFamilies' ? dbMocks.familyDocs : dbMocks.studentDocs,
          }),
        }),
      }),
    }),
  }),
}));

function suggestionRequest(body: Record<string, unknown> = {}) {
  return new NextRequest('https://example.com/api/office/transport/suggestions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer office-token',
      'Content-Type': 'application/json',
      Host: 'example.com',
      Origin: 'https://example.com',
    },
    body: JSON.stringify({ schoolId: 'springfield', ...body }),
  });
}

describe('/api/office/transport/suggestions POST', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.sameOriginCheck.mockReturnValue(true);
    authMocks.verifyIdToken.mockResolvedValue({ uid: 'office-user' });
    authMocks.checkSchoolRole.mockResolvedValue(true);
    dbMocks.familyDocs = [
      {
        id: 'family-1',
        data: () => ({ homeAddress: '12 Maple Street, Springfield', archived: false }),
      },
    ];
    dbMocks.studentDocs = [
      {
        id: 'student-1',
        data: () => ({ familyId: 'family-1', status: 'active', archived: false }),
      },
    ];
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not geocode home addresses unless the request explicitly opts in', async () => {
    const response = await POST(suggestionRequest({ schoolPoint: { lat: 40, lng: -74 } }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(body).toMatchObject({
      geocoding: { requested: false, attemptedFamilyCount: 0 },
      assignmentsCreated: false,
    });
    expect(JSON.stringify(body)).not.toContain('12 Maple Street');
  });

  it('geocodes only when requested and never returns an address or saves an assignment', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ features: [{ geometry: { coordinates: [-74.01, 40.02] } }] }),
    });

    const response = await POST(
      suggestionRequest({
        geocodeAddresses: true,
        schoolPoint: { lat: 40, lng: -74 },
        defaultCapacity: 12,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('12+Maple+Street');
    expect(body).toMatchObject({
      geocoding: {
        requested: true,
        attemptedFamilyCount: 1,
        locatedFamilyCount: 1,
      },
      assignmentsCreated: false,
      suggestions: [
        {
          familyIds: ['family-1'],
          studentIds: ['student-1'],
          studentCount: 1,
          capacity: 12,
        },
      ],
    });
    expect(JSON.stringify(body)).not.toContain('12 Maple Street');
  });

  it('rejects staff who do not have access to the school before reading the roster', async () => {
    authMocks.checkSchoolRole.mockResolvedValue(false);

    const response = await POST(suggestionRequest({ geocodeAddresses: true }));

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
