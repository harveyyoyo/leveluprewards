'use client';

import { useCallback, useMemo } from 'react';
import { useAuthFetch } from '@/lib/authFetch';
import type { ArrivalNotificationStatus } from '@/lib/server/officeArrivalNotifications';

export type OfficeDeliveryEvent = {
  id: string;
  tripId: string | null;
  routeId: string | null;
  stopId: string | null;
  stopName: string;
  arrivedAt: number | null;
  source: 'gps_device' | 'browser' | 'manual' | 'unknown';
  notificationStatus: string;
  notificationsQueued: number;
  notificationsAlreadyQueued: number;
  createdAt: number | null;
};

type ListResponse = { events: OfficeDeliveryEvent[]; checkedAt: number };
type RetryResponse = { ok: true; queued: number; alreadyQueued?: number; status: ArrivalNotificationStatus };

async function readResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'The office could not load message delivery records.');
  return data;
}

export function useOfficeTransportDeliveryApi(schoolId: string | null) {
  const authFetch = useAuthFetch();
  const list = useCallback(async () => {
    if (!schoolId) return { events: [], checkedAt: 0 } as ListResponse;
    const response = await authFetch(`/api/office/transport/delivery-status?schoolId=${encodeURIComponent(schoolId)}`);
    return readResponse<ListResponse>(response);
  }, [authFetch, schoolId]);
  const retry = useCallback(async (eventId: string) => {
    if (!schoolId) throw new Error('School Office is not ready yet.');
    const response = await authFetch('/api/office/transport/delivery-status', {
      method: 'POST',
      body: JSON.stringify({ schoolId, eventId }),
    });
    return readResponse<RetryResponse>(response);
  }, [authFetch, schoolId]);

  return useMemo(() => ({ list, retry }), [list, retry]);
}
