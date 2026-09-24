import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OfficeRouteSuggestionsPanel } from './OfficeRouteSuggestionsPanel';

const mocks = vi.hoisted(() => ({
  authFetch: vi.fn(),
  upsertOfficeBusRoute: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/lib/authFetch', () => ({ useAuthFetch: () => mocks.authFetch }));
vi.mock('@/lib/office/useOfficeWrite', () => ({
  useOfficeWrite: () => ({
    ctx: { schoolId: 'springfield' },
    ready: true,
    upsertOfficeBusRoute: mocks.upsertOfficeBusRoute,
  }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

const school = { address: '1 School Road, Springfield', lat: 40, lng: -74 };

function suggestionResponse() {
  return {
    ok: true,
    json: async () => ({
      suggestions: [
        {
          familyIds: ['family-1', 'family-2'],
          studentIds: ['student-1', 'student-2', 'student-3'],
          studentCount: 3,
          centroid: { lat: 40.01, lng: -74.01 },
          spread: 420,
          capacity: 12,
          warnings: ['Review this draft before using it.'],
        },
      ],
      assignmentsCreated: false,
    }),
  };
}

describe('OfficeRouteSuggestionsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authFetch.mockResolvedValue(suggestionResponse());
    mocks.upsertOfficeBusRoute.mockResolvedValue('new-route-id');
  });

  it('waits for an on-demand request and creates a draft with an area and school stop', async () => {
    const onRouteCreated = vi.fn();
    render(
      <OfficeRouteSuggestionsPanel
        schoolId="springfield"
        school={school}
        routes={[]}
        onRouteCreated={onRouteCreated}
      />,
    );

    expect(screen.getByText(/Nothing is sent to the suggestion service until you choose Build draft suggestions/i)).toBeInTheDocument();
    expect(screen.queryByText(/No riders are assigned automatically/i)).not.toBeInTheDocument();
    expect(mocks.authFetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox', { name: /use family home addresses/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Build draft suggestions' }));

    await waitFor(() => expect(mocks.authFetch).toHaveBeenCalledTimes(1));
    const request = mocks.authFetch.mock.calls[0];
    expect(request[0]).toBe('/api/office/transport/suggestions');
    expect(JSON.parse(request[1].body)).toMatchObject({
      schoolId: 'springfield',
      geocodeAddresses: true,
      schoolPoint: { lat: 40, lng: -74 },
    });

    expect(await screen.findByText('Draft route 1')).toBeInTheDocument();
    expect(screen.getByText('2 families · 3 students')).toBeInTheDocument();
    expect(screen.getByText(/No riders are assigned automatically/i)).toBeInTheDocument();
    expect(screen.queryByText(/12 Maple Street/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create route draft' }));

    await waitFor(() => expect(mocks.upsertOfficeBusRoute).toHaveBeenCalledTimes(1));
    const [context, route] = mocks.upsertOfficeBusRoute.mock.calls[0];
    expect(context).toEqual({ schoolId: 'springfield' });
    expect(route).toMatchObject({
      name: 'Suggested route 1',
      capacity: 12,
      stops: [
        {
          name: 'Suggested pickup area',
          address: null,
          lat: 40.01,
          lng: -74.01,
        },
        {
          name: 'School',
          address: school.address,
          lat: school.lat,
          lng: school.lng,
          isSchool: true,
        },
      ],
    });
    expect(route).not.toHaveProperty('studentIds');
    expect(route).not.toHaveProperty('familyIds');
    expect(onRouteCreated).toHaveBeenCalledWith('new-route-id');
  });

  it('does not ask the server to geocode when home addresses are left off', async () => {
    render(
      <OfficeRouteSuggestionsPanel
        schoolId="springfield"
        school={school}
        routes={[]}
        onRouteCreated={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Build draft suggestions' }));

    await waitFor(() => expect(mocks.authFetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse(mocks.authFetch.mock.calls[0][1].body);
    expect(body.geocodeAddresses).toBe(false);
  });
});
