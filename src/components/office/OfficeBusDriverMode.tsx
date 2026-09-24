'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Clock, LocateFixed, LocateOff, MapPin, Save, ShieldCheck, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { OfficeTransportMap, type TransportMapMarker } from '@/components/office/OfficeTransportMap';
import { useOfficeTransportApi } from '@/lib/office/useOfficeTransportApi';
import {
  BUS_ALERT_LABEL,
  BUS_RUN_LABEL,
  STOP_ARRIVAL_RADIUS_M,
  currentRun,
  distanceMeters,
  formatDistance,
  localIsoDate,
  missingReleaseStudentIds,
  nextStop,
  orderedStops,
  ridersForRoute,
  routeForTrip,
  routeReadiness,
  routeLabel,
  stopTime,
  tripDocId,
  type LatLng,
} from '@/lib/office/officeTransport';
import { formatScheduleTime } from '@/lib/office/officeSchedule';
import { getOfficeStudentFullName } from '@/lib/office/officeUtils';
import { clearDriverOfflinePacket, readDriverOfflinePacket, saveDriverOfflinePacket, type OfficeDriverOfflinePacket } from '@/lib/office/officeDriverOffline';
import type { OfficeBusAlertKind, OfficeBusReleaseMethod, OfficeBusRiderManifestEntry, OfficeBusRiderStatus, OfficeBusRoute, OfficeBusRun, OfficeBusTrip, OfficeFamily, OfficeFamilyContact, OfficeStudent } from '@/lib/office/types';
import { cn } from '@/lib/utils';

/** Send the bus position at most this often, unless it moved far. */
const SEND_EVERY_MS = 10_000;
const SEND_IF_MOVED_M = 75;

type GeoState = 'waiting' | 'on' | 'denied' | 'unavailable';

/**
 * Driver screen for a phone: pick the bus, start the run, and the phone shares its location
 * while the driver taps riders on and off. Big buttons, one job per screen.
 */
export function OfficeBusDriverMode({
  schoolId,
  routes,
  trips,
  students,
  familyById,
  center,
  onClose,
}: {
  schoolId: string;
  routes: OfficeBusRoute[];
  trips: OfficeBusTrip[];
  students: OfficeStudent[];
  familyById: Map<string, OfficeFamily>;
  center: LatLng;
  onClose: () => void;
}) {
  const transport = useOfficeTransportApi(schoolId);
  const { toast } = useToast();
  const [routeId, setRouteId] = useState(routes[0]?.id ?? '');
  const [run, setRun] = useState<OfficeBusRun>(() => currentRun());
  const [tripId, setTripId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [offlinePacket, setOfflinePacket] = useState<OfficeDriverOfflinePacket | null>(() => readDriverOfflinePacket(schoolId));
  const [offlineOpen, setOfflineOpen] = useState(false);

  const liveTrip = tripId ? trips.find((t) => t.id === tripId) ?? null : null;
  const trip = offlineOpen && offlinePacket ? offlinePacket.trip : liveTrip;
  const route = offlineOpen && offlinePacket ? offlinePacket.route : routes.find((r) => r.id === (trip?.routeId ?? routeId)) ?? null;
  const existing = route
    ? trips.find((t) => t.routeId === route.id && t.run === run && t.status === 'active')
    : undefined;
  const hasPriorTrip = route ? trips.some((t) => t.routeId === route.id && t.run === run) : false;
  const readiness = route ? routeReadiness(route) : { ready: false, missing: ['a route'] };
  const canDrive = readiness.ready;

  // Keep the screen on while driving.
  const driving = trip?.status === 'active';
  useEffect(() => {
    if (!driving) return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => undefined);
    return () => void lock?.release().catch(() => undefined);
  }, [driving]);

  const start = async () => {
    if (!route || !canDrive) return;
    setStarting(true);
    try {
      const date = localIsoDate();
      const id = existing?.id ?? tripDocId(date, route.id, run);
      const { tripId: startedId } = await transport.startOfficeBusTrip(route, { tripId: id, date, run });
      setOfflineOpen(false);
      setTripId(startedId);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not start', description: (e as Error).message });
    } finally {
      setStarting(false);
    }
  };

  const requestClose = () => {
    if (!offlineOpen && trip?.status === 'active' && !window.confirm('The office will stop seeing this bus if you close this screen. Close it now?')) return;
    onClose();
  };

  const openOfflinePacket = () => {
    if (!offlinePacket) return;
    setRouteId(offlinePacket.route.id);
    setTripId(offlinePacket.trip.id);
    setOfflineOpen(true);
  };

  const discardOfflinePacket = () => {
    clearDriverOfflinePacket(schoolId);
    setOfflinePacket(null);
    toast({ title: 'Saved trip copy removed' });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f4f7f9] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex items-center gap-2 border-b bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        {route ? <span className="h-3 w-3 rounded-full" style={{ backgroundColor: route.color }} aria-hidden /> : null}
        <p className="min-w-0 flex-1 truncate font-semibold">{trip && route ? `${routeLabel(route)} · ${BUS_RUN_LABEL[trip.run]}` : 'Drive a bus'}</p>
        <button type="button" onClick={requestClose} aria-label="Close driver screen" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
          <X className="h-5 w-5" />
        </button>
      </header>

      {trip && route && trip.status === 'active' ? (
        <DrivingScreen
          schoolId={schoolId}
          route={route}
          trip={trip}
          students={students}
          familyById={familyById}
          center={center}
          readOnly={offlineOpen}
          onOfflineSaved={() => setOfflinePacket(readDriverOfflinePacket(schoolId))}
          onFinished={() => {
            if (offlinePacket?.trip.id === trip.id) {
              clearDriverOfflinePacket(schoolId);
              setOfflinePacket(null);
            }
            onClose();
          }}
        />
      ) : (
        <div className="mx-auto w-full max-w-md flex-1 space-y-5 overflow-y-auto p-5">
          <div>
            <p className="text-sm font-semibold">Which bus?</p>
            <div className="mt-2 grid gap-2">
              {routes.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={routeId === r.id}
                  onClick={() => setRouteId(r.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border-2 bg-white px-4 py-3 text-left dark:bg-slate-900',
                    routeId === r.id ? 'border-teal-700' : 'border-transparent',
                  )}
                >
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: r.color }} aria-hidden />
                  <span className="flex-1">
                    <span className="block font-semibold">{routeLabel(r)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {r.stops?.length ?? 0} stops · {ridersForRoute(students, r.id).length} riders
                    </span>
                  </span>
                  {routeId === r.id ? <Check className="h-5 w-5 text-teal-700" /> : null}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">Which run?</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(['am', 'pm'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={run === r}
                  onClick={() => setRun(r)}
                  className={cn('rounded-2xl border-2 bg-white py-3 font-semibold dark:bg-slate-900', run === r ? 'border-teal-700' : 'border-transparent')}
                >
                  {BUS_RUN_LABEL[r]}
                </button>
              ))}
            </div>
          </div>
          {route && !canDrive ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              Add at least one student stop and the school before driving.
            </p>
          ) : null}
          <Button type="button" className="h-14 w-full rounded-2xl text-lg" disabled={!route || starting || !canDrive} onClick={() => void start()}>
            {starting ? 'Starting…' : existing ? 'Continue this run' : hasPriorTrip ? 'Start another run' : 'Start run'}
          </Button>
          {offlinePacket ? (
            <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/30">
              <div>
                <p className="font-semibold">Saved trip copy</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {routeLabel(offlinePacket.route)} · {offlinePacket.trip.riderManifest?.length ?? 0} riders · saved {new Date(offlinePacket.savedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="rounded-xl" onClick={openOfflinePacket}>
                  Open saved copy
                </Button>
                <Button type="button" variant="ghost" className="rounded-xl" onClick={discardOfflinePacket}>
                  Remove saved copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">The saved copy is read-only and stays on this phone until this page is closed. It may be old, so check the live page before driving. Reconnect to the live run before making changes.</p>
            </div>
          ) : null}
          <p className="text-center text-xs text-muted-foreground">
            Your phone will share where the bus is with the office until you end the run. Keep this screen open.
          </p>
        </div>
      )}
    </div>
  );
}

type DriverRider = {
  id: string;
  displayName: string;
  busStopId?: string | null;
};

function driverRiders(trip: OfficeBusTrip, students: OfficeStudent[], routeId: string): DriverRider[] {
  if (trip.riderManifest) {
    return trip.riderManifest.map((entry: OfficeBusRiderManifestEntry) => ({
      id: entry.studentId,
      displayName: entry.displayName || 'Student',
      busStopId: entry.busStopId ?? null,
    }));
  }
  const ids = trip.riderSnapshot ? new Set(trip.riderSnapshot) : null;
  const current = ridersForRoute(students, routeId).filter((student) => !ids || ids.has(student.id));
  if (ids) {
    const byId = new Map(current.map((student) => [student.id, student]));
    return [...ids].map((id) => {
      const student = byId.get(id);
      return student
        ? { id, displayName: getOfficeStudentFullName(student), busStopId: student.busStopId ?? null }
        : { id, displayName: 'Student', busStopId: null };
    });
  }
  return current.map((student) => ({ id: student.id, displayName: getOfficeStudentFullName(student), busStopId: student.busStopId ?? null }));
}

function driverFamilyContacts(
  rider: DriverRider,
  trip: OfficeBusTrip,
  students: OfficeStudent[],
  familyById: Map<string, OfficeFamily>,
): OfficeFamilyContact[] {
  const familyId =
    trip.riderManifest?.find((entry) => entry.studentId === rider.id)?.familyId ??
    students.find((student) => student.id === rider.id)?.familyId ??
    null;
  return familyId ? (familyById.get(familyId)?.contacts ?? []).filter((contact) => contact.pickupAuthorized !== false) : [];
}

function DrivingScreen({
  schoolId,
  route,
  trip,
  students,
  familyById,
  center,
  readOnly = false,
  onOfflineSaved,
  onFinished,
}: {
  schoolId: string;
  route: OfficeBusRoute;
  trip: OfficeBusTrip;
  students: OfficeStudent[];
  familyById: Map<string, OfficeFamily>;
  center: LatLng;
  readOnly?: boolean;
  onOfflineSaved?: () => void;
  onFinished: () => void;
}) {
  const transport = useOfficeTransportApi(schoolId);
  const { toast } = useToast();
  const [geo, setGeo] = useState<GeoState>('waiting');
  const [lastServerAt, setLastServerAt] = useState<number | null>(trip.location?.at ?? null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [me, setMe] = useState<(LatLng & { speed?: number | null }) | null>(trip.location ?? null);
  const [showAll, setShowAll] = useState(false);
  const [report, setReport] = useState<OfficeBusAlertKind | null>(null);
  const [reportText, setReportText] = useState('');
  const [reportMinutes, setReportMinutes] = useState<number | null>(10);
  const [ending, setEnding] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [releaseRider, setReleaseRider] = useState<DriverRider | null>(null);
  const [releaseMethod, setReleaseMethod] = useState<OfficeBusReleaseMethod>('authorized_contact');
  const [releaseContactId, setReleaseContactId] = useState('');
  const [releaseRecipientName, setReleaseRecipientName] = useState('');
  const [releaseNote, setReleaseNote] = useState('');
  const [releaseSaving, setReleaseSaving] = useState(false);
  const [offlineSaved, setOfflineSaved] = useState(false);

  useEffect(() => {
    setLastServerAt(trip.location?.at ?? null);
    setSyncError(null);
    // Reset only when the run changes; live location updates should not reset the sync badge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id]);

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine);
    updateConnection();
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, []);

  const activeRoute = useMemo(() => routeForTrip(route, trip) ?? route, [route, trip]);
  const stops = orderedStops(activeRoute, trip.run);
  const next = nextStop(activeRoute, trip);
  const riders = useMemo(
    () => driverRiders(trip, students, activeRoute.id),
    // Only the rider lists matter here; live location updates shouldn't rebuild it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeRoute.id, students, trip.riderManifest, trip.riderSnapshot],
  );
  const status = trip.riders ?? {};

  // ---- Location sharing ----
  const lastSent = useRef<{ at: number; p: LatLng } | null>(null);
  const tripRef = useRef(trip);
  tripRef.current = trip;
  useEffect(() => {
    if (readOnly) {
      setGeo('unavailable');
      return;
    }
    if (!('geolocation' in navigator)) {
      setGeo('unavailable');
      return;
    }
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        setGeo('on');
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, speed: pos.coords.speed };
        setMe(p);
        const t = tripRef.current;
        const now = Date.now();
        if (!navigator.onLine) {
          setSyncError('No internet connection. Location will resume when the phone reconnects.');
          return;
        }
        const prev = lastSent.current;
        // Reaching a stop is sent right away so the office sees it without waiting.
        const upcoming = nextStop(activeRoute, t);
        const accurateEnough = pos.coords.accuracy != null && pos.coords.accuracy <= 100;
        const reached = !t.gpsDeviceId && accurateEnough && !(t.run === 'pm' && upcoming?.isSchool) && upcoming && distanceMeters(p, upcoming) <= STOP_ARRIVAL_RADIUS_M ? upcoming.id : null;
        if (!reached && prev && now - prev.at < SEND_EVERY_MS && distanceMeters(prev.p, p) < SEND_IF_MOVED_M) return;
        lastSent.current = { at: now, p };
        void transport
          .updateOfficeBusTripLocation(
            t.id,
            { lat: p.lat, lng: p.lng, accuracy: pos.coords.accuracy ?? null, speed: pos.coords.speed ?? null, heading: pos.coords.heading ?? null, at: now },
            reached,
          )
          .then(() => {
            setLastServerAt(now);
            setSyncError(null);
          })
          .catch((error: unknown) => {
            setSyncError(error instanceof Error ? error.message : 'The office has not received the latest location.');
          });
      },
      (err) => setGeo(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 30_000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
    // One location watch for the whole run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id]);

  const ensureOnline = () => {
    if (readOnly) {
      toast({ variant: 'destructive', title: 'This is a saved copy', description: 'Reopen the live run before saving rider changes or ending the trip.' });
      return false;
    }
    if (isOnline) return true;
    toast({ variant: 'destructive', title: 'No internet connection', description: 'Reconnect before saving this change. The trip will not be marked complete offline.' });
    return false;
  };

  const saveOfflineCopy = () => {
    if (readOnly) return;
    const saved = saveDriverOfflinePacket(schoolId, trip, activeRoute);
    if (!saved) {
      toast({ variant: 'destructive', title: 'Could not save the trip copy', description: 'This browser may be full or may not allow saved information.' });
      return;
    }
    setOfflineSaved(true);
    onOfflineSaved?.();
    toast({ title: 'Trip copy saved', description: 'It is read-only and stays on this phone until this page is closed.' });
  };

  const mark = async (kids: DriverRider[], st: OfficeBusRiderStatus | null) => {
    if (!ensureOnline()) return;
    try {
      await transport.setOfficeBusRiders(
        trip,
        route,
        kids.map((k) => ({ studentId: k.id, studentName: k.displayName, status: st })),
      );
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save', description: (e as Error).message });
    }
  };

  const openRelease = (rider: DriverRider) => {
    const contacts = driverFamilyContacts(rider, trip, students, familyById);
    setReleaseRider(rider);
    setReleaseMethod(contacts.length ? 'authorized_contact' : 'id_checked');
    setReleaseContactId(contacts[0]?.id ?? '');
    setReleaseRecipientName('');
    setReleaseNote('');
  };

  const saveRelease = async () => {
    if (!releaseRider) return;
    if (releaseMethod === 'authorized_contact' && !releaseContactId) {
      toast({ variant: 'destructive', title: 'Choose an approved contact' });
      return;
    }
    if (releaseMethod !== 'authorized_contact' && !releaseRecipientName.trim()) {
      toast({ variant: 'destructive', title: 'Add the name of the person who received the rider' });
      return;
    }
    if (releaseMethod === 'office_override' && !releaseNote.trim()) {
      toast({ variant: 'destructive', title: 'Add an office note' });
      return;
    }
    setReleaseSaving(true);
    try {
      await transport.recordOfficeBusRelease(trip, releaseRider.id, {
        method: releaseMethod,
        contactId: releaseMethod === 'authorized_contact' ? releaseContactId : null,
        recipientName: releaseMethod === 'authorized_contact' ? null : releaseRecipientName.trim(),
        note: releaseNote.trim() || null,
      });
      toast({ title: 'Release recorded', description: 'The office can now see who received this rider.' });
      setReleaseRider(null);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save the release', description: (e as Error).message });
    } finally {
      setReleaseSaving(false);
    }
  };

  const arrive = async (stopId: string, reached = true) => {
    if (!ensureOnline()) return;
    try {
      await transport.setOfficeBusStopReached(trip, stopId, reached);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save', description: (e as Error).message });
    }
  };

  const sendReport = async () => {
    if (!report || !ensureOnline()) return;
    try {
      const result = await transport.addOfficeBusTripAlert(trip, route, {
        kind: report,
        message: reportText.trim() || null,
        minutes: report === 'delay' ? reportMinutes : null,
      });
      toast({
        title: 'Saved for the office',
        description:
          result.notificationStatus === 'failed'
            ? 'The report is safe, but the family update could not be queued. Please tell the office.'
            : result.notificationStatus === 'no_recipients'
              ? 'The report is safe, but no opted-in family email was found.'
              : result.notificationsQueued > 0
                ? `It will appear on the live page, and ${result.notificationsQueued} family update${result.notificationsQueued === 1 ? '' : 's'} will be queued.`
                : 'It will appear on the live Transportation page.',
      });
      setReport(null);
      setReportText('');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not send', description: (e as Error).message });
    }
  };

  const unresolved = riders.filter((k) => status[k.id]?.status !== 'off' && status[k.id]?.status !== 'absent');
  const missingReleaseRiders = useMemo(() => {
    const ids = new Set(missingReleaseStudentIds(trip));
    return riders.filter((k) => ids.has(k.id));
  }, [riders, trip]);
  const finish = async () => {
    if (!ensureOnline()) return;
    if (unresolved.length > 0) {
      toast({ variant: 'destructive', title: 'Some riders are not accounted for', description: 'Mark every rider off or not here before ending the run.' });
      return;
    }
    if (activeRoute.requireReleaseConfirmations === true && missingReleaseRiders.length > 0) {
      toast({ variant: 'destructive', title: 'Record each release first', description: `Use “Record who received them” for ${missingReleaseRiders.map((rider) => rider.displayName).join(', ')}.` });
      return;
    }
    if (!checked) {
      toast({ variant: 'destructive', title: 'Walk the bus first', description: 'Confirm that nobody was left on before ending the run.' });
      return;
    }
    try {
      await transport.endOfficeBusTrip(trip, route, checked);
      toast({ title: 'Run finished', description: checked ? 'Thanks for checking the bus.' : undefined });
      onFinished();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not finish', description: (e as Error).message });
    }
  };

  // Riders who matter at the next stop: morning pickups there, afternoon drop-offs there,
  // and at the school everyone still to get on (afternoon) or off (morning).
  const atSchool = !!next?.isSchool;
  const hereKids = next
    ? atSchool
      ? trip.run === 'am'
        ? riders.filter((k) => status[k.id]?.status === 'on')
        : riders.filter((k) => !status[k.id])
      : riders.filter((k) => k.busStopId === next.id)
    : [];
  const listed = showAll ? riders : hereKids;

  const markers: TransportMapMarker[] = [
    ...stops.map((s) => ({
      id: s.id,
      kind: (s.isSchool ? 'school' : 'stop') as TransportMapMarker['kind'],
      color: activeRoute.color,
      lat: s.lat,
      lng: s.lng,
      title: s.name,
      active: !!trip.stopArrivals?.[s.id],
      selected: next?.id === s.id,
    })),
    ...(me ? [{ id: 'me', kind: 'you' as const, color: '#2563eb', lat: me.lat, lng: me.lng, title: 'You' }] : []),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm font-medium',
          readOnly
            ? 'bg-blue-800 text-white'
            : !isOnline
              ? 'bg-slate-700 text-white'
              : geo === 'on' && !syncError
              ? 'bg-teal-700 text-white'
            : geo === 'waiting'
              ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
              : 'bg-amber-500 text-amber-950',
        )}
        role="status"
      >
        {readOnly ? <Save className="h-4 w-4" /> : !isOnline ? <LocateOff className="h-4 w-4" /> : geo === 'on' ? <LocateFixed className="h-4 w-4" /> : <LocateOff className="h-4 w-4" />}
        {readOnly
          ? 'Saved copy. Reopen the live run before making changes.'
          : !isOnline
            ? 'No internet connection. Reconnect before saving rider changes or ending this run.'
            : geo === 'on' && syncError
            ? 'Location found, but the office has not received it yet. Trying again…'
            : geo === 'on' && lastServerAt
              ? 'Sharing bus location with the office'
              : geo === 'on'
                ? 'Sending the first bus location…'
                : geo === 'waiting'
                  ? 'Finding your location…'
                  : geo === 'denied'
                    ? 'Location is off. Allow location for this site so the office can see the bus.'
                    : 'Can’t find your location right now. The rider list still works.'}
      </div>

      {readOnly ? (
        <div className="border-b bg-blue-50 px-4 py-2 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
          This is a saved, read-only copy. Rider changes, reports, and ending the run are turned off here.
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 border-b bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-muted-foreground">Keep a copy on this phone before leaving signal.</p>
          <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5 rounded-lg" onClick={saveOfflineCopy}>
            <Save className="h-3.5 w-3.5" /> {offlineSaved ? 'Saved on this phone' : 'Save trip copy'}
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <OfficeTransportMap
          markers={markers}
          lines={[{ id: 'r', color: activeRoute.color, points: stops }]}
          fitPoints={me && next ? [me, next] : stops.length ? stops : [center]}
          fitKey={`${next?.id ?? 'end'}`}
          initialCenter={me ?? center}
          className="h-52 rounded-none border-x-0 border-t-0"
        />

        <div className="mx-auto max-w-md space-y-4 p-4">
          {next ? (
            <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Next stop</p>
              <p className="mt-1 text-xl font-semibold">{next.name}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                {stopTime(next, trip.run) ? (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {formatScheduleTime(stopTime(next, trip.run)!)}
                  </span>
                ) : null}
                {me ? (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {formatDistance(distanceMeters(me, next))} away
                  </span>
                ) : null}
              </p>
              <Button type="button" className="mt-3 h-12 w-full rounded-xl text-base" disabled={readOnly} onClick={() => void arrive(next.id)}>
                {atSchool ? 'At school' : 'At this stop'} — next
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl bg-white p-4 text-center shadow-sm dark:bg-slate-900">
              <p className="text-lg font-semibold">Every stop done</p>
              <p className="text-sm text-muted-foreground">Walk the bus, then end the run.</p>
            </div>
          )}

          <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                {showAll ? `All riders (${riders.length})` : next ? (atSchool ? (trip.run === 'am' ? 'Getting off at school' : 'Getting on at school') : `Riders at ${next.name}`) : 'Riders'}
              </p>
              <button type="button" onClick={() => setShowAll(!showAll)} className="text-xs font-medium text-teal-800 hover:underline dark:text-teal-300">
                {showAll ? 'Just this stop' : 'Show all'}
              </button>
            </div>
            {!showAll && atSchool && hereKids.length > 1 ? (
              <Button type="button" variant="outline" className="mt-3 h-11 w-full rounded-xl" disabled={readOnly} onClick={() => void mark(hereKids, trip.run === 'am' ? 'off' : 'on')}>
                {trip.run === 'am' ? `Everyone off (${hereKids.length})` : `Everyone on (${hereKids.length})`}
              </Button>
            ) : null}
            {listed.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nobody to mark here.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {listed.map((k) => {
                  const st = status[k.id]?.status;
                  return (
                    <li key={k.id} className="rounded-xl border p-2 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-2 px-1">
                        <span className="font-medium">{k.displayName}</span>
                        {st && st !== 'on' ? (
                          <button type="button" disabled={readOnly} onClick={() => void mark([k], null)} aria-label="Undo" className="rounded p-1 text-muted-foreground hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800">
                            <Undo2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-1.5">
                        {(
                          [
                            ['on', 'On bus'],
                            ['off', 'Off'],
                            ['absent', 'Not here'],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            disabled={readOnly}
                            aria-pressed={st === value}
                            onClick={() => void mark([k], st === value ? null : value)}
                            className={cn(
                              'h-11 rounded-lg text-sm font-semibold',
                              st === value
                                ? value === 'on'
                                  ? 'bg-teal-700 text-white'
                                  : value === 'off'
                                    ? 'bg-slate-700 text-white'
                                    : 'bg-amber-500 text-amber-950'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {st === 'off' ? (
                        trip.releases?.[k.id] ? (
                          <p className="mt-2 text-xs text-teal-700 dark:text-teal-300">Released to {trip.releases[k.id].contactName}</p>
                        ) : (
                          <Button type="button" variant="outline" size="sm" className="mt-2 w-full gap-2 rounded-lg" disabled={readOnly} onClick={() => openRelease(k)}>
                            <ShieldCheck className="h-3.5 w-3.5" /> Record who received them
                          </Button>
                        )
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-12 rounded-xl" disabled={readOnly} onClick={() => setReport('delay')}>
              <Clock className="mr-2 h-4 w-4" /> Running late
            </Button>
            <Button type="button" variant="outline" className="h-12 rounded-xl" disabled={readOnly} onClick={() => setReport('breakdown')}>
              <AlertTriangle className="mr-2 h-4 w-4" /> Report a problem
            </Button>
          </div>

          {Object.keys(trip.stopArrivals ?? {}).length > 0 ? (
            <details className="rounded-2xl bg-white p-4 text-sm shadow-sm dark:bg-slate-900">
              <summary className="cursor-pointer font-medium">Stops done ({Object.keys(trip.stopArrivals ?? {}).length})</summary>
              <ul className="mt-2 space-y-1">
                {stops
                  .filter((s) => trip.stopArrivals?.[s.id])
                  .map((s) => (
                    <li key={s.id} className="flex items-center justify-between">
                      <span>{s.name}</span>
                      <button type="button" disabled={readOnly} onClick={() => void arrive(s.id, false)} className="text-xs text-teal-800 hover:underline dark:text-teal-300">
                        Not yet
                      </button>
                    </li>
                  ))}
              </ul>
            </details>
          ) : null}

          <Button type="button" variant="destructive" className="h-12 w-full rounded-xl" disabled={readOnly || !isOnline || (activeRoute.requireReleaseConfirmations === true && missingReleaseRiders.length > 0)} onClick={() => setEnding(true)}>
            End run
          </Button>
        </div>
      </div>

      <Dialog open={report !== null} onOpenChange={(o) => (!o ? setReport(null) : undefined)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Tell the office</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(BUS_ALERT_LABEL) as OfficeBusAlertKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={report === k}
                  onClick={() => setReport(k)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm',
                    report === k ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-200 dark:border-slate-700',
                  )}
                >
                  {BUS_ALERT_LABEL[k]}
                </button>
              ))}
            </div>
            {report === 'delay' ? (
              <div className="grid grid-cols-4 gap-1.5">
                {[5, 10, 15, 30].map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={reportMinutes === m}
                    onClick={() => setReportMinutes(m)}
                    className={cn('h-11 rounded-lg text-sm font-semibold', reportMinutes === m ? 'bg-teal-700 text-white' : 'bg-slate-100 dark:bg-slate-800')}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            ) : null}
            <Input value={reportText} onChange={(e) => setReportText(e.target.value)} placeholder="What happened? (optional)" className="h-11 rounded-xl" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setReport(null)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-xl" disabled={readOnly} onClick={() => void sendReport()}>
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ending} onOpenChange={setEnding}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>End this run?</DialogTitle>
          </DialogHeader>
          {unresolved.length > 0 ? (
            <p className="flex gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Not accounted for: {unresolved.map((rider) => rider.displayName).join(', ')}.
            </p>
          ) : null}
          {activeRoute.requireReleaseConfirmations === true && missingReleaseRiders.length > 0 ? (
            <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Record who received: {missingReleaseRiders.map((rider) => rider.displayName).join(', ')}.
            </p>
          ) : null}
          <label className="flex items-start gap-3 rounded-xl border p-3 text-sm dark:border-slate-800">
            <Checkbox checked={checked} onCheckedChange={(c) => setChecked(c === true)} className="mt-0.5" />
            <span>
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="h-4 w-4 text-teal-700" /> I walked the whole bus
              </span>
              <span className="text-muted-foreground">Nobody is left on board.</span>
            </span>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setEnding(false)}>
              Keep driving
            </Button>
            <Button type="button" variant="destructive" className="rounded-xl" disabled={readOnly || !isOnline || !checked || unresolved.length > 0 || (activeRoute.requireReleaseConfirmations === true && missingReleaseRiders.length > 0)} onClick={() => void finish()}>
              End run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!releaseRider} onOpenChange={(open) => (!open ? setReleaseRider(null) : undefined)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Record release</DialogTitle>
          </DialogHeader>
          {releaseRider ? (
            <div className="space-y-3">
              <p className="text-sm">Who received <span className="font-semibold">{releaseRider.displayName}</span>?</p>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  ['authorized_contact', 'Family contact'],
                  ['id_checked', 'ID checked'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={releaseMethod === value}
                    onClick={() => setReleaseMethod(value)}
                    className={cn(
                      'rounded-lg border px-2 py-2 text-xs font-medium',
                      releaseMethod === value ? 'border-teal-700 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-100' : 'border-slate-200 dark:border-slate-700',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {releaseMethod !== 'authorized_contact' ? (
                <Input value={releaseRecipientName} onChange={(e) => setReleaseRecipientName(e.target.value)} placeholder="Recipient's name" className="rounded-xl" />
              ) : (
                <select
                  value={releaseContactId}
                  onChange={(e) => setReleaseContactId(e.target.value)}
                  className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
                  aria-label="Approved family contact"
                >
                  <option value="">Choose an approved contact</option>
                  {driverFamilyContacts(releaseRider, trip, students, familyById).map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}{contact.relationship ? ` · ${contact.relationship}` : ''}
                    </option>
                  ))}
                </select>
              )}
              <Input value={releaseNote} onChange={(e) => setReleaseNote(e.target.value)} placeholder={releaseMethod === 'office_override' ? 'Why did the office approve this?' : 'Optional note'} className="rounded-xl" />
              <p className="text-xs text-muted-foreground">This is saved with the trip history. It does not send a message to families.</p>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setReleaseRider(null)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-xl" disabled={releaseSaving} onClick={() => void saveRelease()}>
              {releaseSaving ? 'Saving…' : 'Save release'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
