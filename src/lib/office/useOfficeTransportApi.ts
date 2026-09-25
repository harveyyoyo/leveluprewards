'use client';

import { useCallback, useMemo } from 'react';
import { useAuthFetch } from '@/lib/authFetch';
import type {
  OfficeBusAlertKind,
  OfficeBusLocation,
  OfficeBusReleaseMethod,
  OfficeBusRunExceptionKind,
  OfficeBusRiderStatus,
  OfficeBusRoute,
  OfficeBusRun,
  OfficeBusTrip,
} from '@/lib/office/types';

type ApiError = { error?: string };

async function readResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) throw new Error(data.error || 'The office could not save that change.');
  return data;
}

/** Writes safety-sensitive bus records through the server instead of trusting browser fields. */
export function useOfficeTransportApi(schoolId: string | null) {
  const authFetch = useAuthFetch();
  const call = useCallback(
    async <T,>(body: Record<string, unknown>): Promise<T> => {
      if (!schoolId) throw new Error('School Office is not ready yet.');
      const response = await authFetch('/api/office/transport', {
        method: 'POST',
        body: JSON.stringify({ ...body, schoolId }),
      });
      return readResponse<T>(response);
    },
    [authFetch, schoolId],
  );

  return useMemo(
    () => ({
      startOfficeBusTrip: (route: OfficeBusRoute, params: { tripId: string; date: string; run: OfficeBusRun; driverRole: 'primary' | 'relief' }) =>
        call<{ tripId: string }>({ action: 'start', routeId: route.id, ...params }),
      updateOfficeBusTripLocation: (tripId: string, location: OfficeBusLocation, reachedStopId?: string | null) =>
        call<{ ok: true; ignored?: boolean }>({ action: 'location', tripId, location, reachedStopId: reachedStopId ?? null }),
      setOfficeBusStopReached: (trip: Pick<OfficeBusTrip, 'id'>, stopId: string, reached: boolean) =>
        call<{ ok: true }>({ action: 'stop', tripId: trip.id, stopId, reached }),
      setOfficeBusRiders: (
        trip: Pick<OfficeBusTrip, 'id' | 'run'>,
        _route: OfficeBusRoute,
        changes: Array<{ studentId: string; studentName: string; status: OfficeBusRiderStatus | null }>,
      ) => call<{ ok: true }>({ action: 'riders', tripId: trip.id, run: trip.run, changes }),
      recordOfficeBusRelease: (
        trip: Pick<OfficeBusTrip, 'id' | 'run'>,
        studentId: string,
        release: { method: OfficeBusReleaseMethod; contactId?: string | null; recipientName?: string | null; note?: string | null; correctionReason?: string | null },
      ) => call<{ release: unknown }>({ action: 'release', tripId: trip.id, studentId, ...release }),
      queueOfficeBusFamilyUpdate: (trip: Pick<OfficeBusTrip, 'id'>) =>
        call<{ queued: number; duplicate?: boolean }>({ action: 'queue', tripId: trip.id }),
      addOfficeBusTripAlert: (
        trip: Pick<OfficeBusTrip, 'id' | 'run'>,
        _route: OfficeBusRoute,
        alert: { kind: OfficeBusAlertKind; message?: string | null; minutes?: number | null },
      ) => call<{ ok: true; notificationsQueued: number; notificationStatus: 'not_configured' | 'queued' | 'no_recipients' | 'failed' | 'office_only' }>({ action: 'alert', tripId: trip.id, run: trip.run, ...alert }),
      createOfficeBusRunException: (tripId: string, input: { kind: OfficeBusRunExceptionKind; stopId?: string | null; note?: string | null; expiresInMinutes?: number }) =>
        call<{ exception: unknown }>({ action: 'exception-create', tripId, ...input }),
      acknowledgeOfficeBusRunException: (tripId: string, exceptionId: string) =>
        call<{ exception: unknown }>({ action: 'exception-acknowledge', tripId, exceptionId }),
      resolveOfficeBusRunException: (tripId: string, exceptionId: string) =>
        call<{ exception: unknown }>({ action: 'exception-resolve', tripId, exceptionId }),
      endOfficeBusTrip: (trip: Pick<OfficeBusTrip, 'id' | 'run'>, _route: OfficeBusRoute, childCheckDone: boolean) =>
        call<{ ok: true }>({ action: 'end', tripId: trip.id, run: trip.run, childCheckDone }),
      closeStaleOfficeBusTrip: (tripId: string, reason: string, sameDay = false) =>
        call<{ ok: true }>({ action: 'close-stale', tripId, reason, sameDay, confirmed: sameDay }),
    }),
    [call],
  );
}
