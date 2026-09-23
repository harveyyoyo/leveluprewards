'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { OfficeBusRoute, OfficeBusTrip } from '@/lib/office/types';
import { withoutArchived } from '@/lib/office/officeUtils';

const LOCAL_PERMISSION_ERRORS = { reportPermissionErrors: false as const };

/** Every bus route, A–Z. `error` is set until the database allows transportation records. */
export function useOfficeBusRoutes(schoolId: string | null) {
  const firestore = useFirestore();
  const routesQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'officeBusRoutes') : null),
    [firestore, schoolId],
  );
  const { data, isLoading, error } = useCollection<OfficeBusRoute>(routesQuery, LOCAL_PERMISSION_ERRORS);
  const routes = useMemo(
    () => withoutArchived(data).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    [data],
  );
  return { routes, allRoutes: data ?? [], isLoading, error };
}

/** One day's bus runs (live while they are on the road). */
export function useOfficeBusTripsForDate(schoolId: string | null, date: string | null) {
  const firestore = useFirestore();
  const tripsQuery = useMemoFirebase(
    () =>
      firestore && schoolId && date
        ? query(collection(firestore, 'schools', schoolId, 'officeBusTrips'), where('date', '==', date))
        : null,
    [firestore, schoolId, date],
  );
  const { data, isLoading, error } = useCollection<OfficeBusTrip>(tripsQuery, LOCAL_PERMISSION_ERRORS);
  const trips = useMemo(() => [...(data ?? [])].sort((a, b) => a.startedAt - b.startedAt), [data]);
  return { trips, isLoading, error };
}

/** Re-renders every `ms` so "2 min ago" and late warnings stay current. */
export function useNow(ms = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}
