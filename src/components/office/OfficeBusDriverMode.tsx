'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Clock, LocateFixed, LocateOff, MapPin, ShieldCheck, Undo2, X } from 'lucide-react';
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
  nextStop,
  orderedStops,
  ridersForRoute,
  routeForTrip,
  routeLabel,
  stopTime,
  tripDocId,
  type LatLng,
} from '@/lib/office/officeTransport';
import { formatScheduleTime } from '@/lib/office/officeSchedule';
import { getOfficeStudentFullName } from '@/lib/office/officeUtils';
import type { OfficeBusAlertKind, OfficeBusRiderStatus, OfficeBusRoute, OfficeBusRun, OfficeBusTrip, OfficeStudent } from '@/lib/office/types';
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
  center,
  onClose,
}: {
  schoolId: string;
  routes: OfficeBusRoute[];
  trips: OfficeBusTrip[];
  students: OfficeStudent[];
  center: LatLng;
  onClose: () => void;
}) {
  const transport = useOfficeTransportApi(schoolId);
  const { toast } = useToast();
  const [routeId, setRouteId] = useState(routes[0]?.id ?? '');
  const [run, setRun] = useState<OfficeBusRun>(() => currentRun());
  const [tripId, setTripId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const trip = tripId ? trips.find((t) => t.id === tripId) ?? null : null;
  const route = routes.find((r) => r.id === (trip?.routeId ?? routeId)) ?? null;
  const existing = route
    ? trips.find((t) => t.routeId === route.id && t.run === run && t.status === 'active')
    : undefined;
  const hasPriorTrip = route ? trips.some((t) => t.routeId === route.id && t.run === run) : false;
  const hasPickupStop = !!route?.stops?.some((stop) => !stop.isSchool);
  const hasSchoolStop = !!route?.stops?.some((stop) => stop.isSchool);
  const canDrive = hasPickupStop && hasSchoolStop;

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
      setTripId(startedId);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not start', description: (e as Error).message });
    } finally {
      setStarting(false);
    }
  };

  const requestClose = () => {
    if (trip?.status === 'active' && !window.confirm('The office will stop seeing this bus if you close this screen. Close it now?')) return;
    onClose();
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
        <DrivingScreen schoolId={schoolId} route={route} trip={trip} students={students} center={center} onFinished={onClose} />
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
          <p className="text-center text-xs text-muted-foreground">
            Your phone will share where the bus is with the office until you end the run. Keep this screen open.
          </p>
        </div>
      )}
    </div>
  );
}

function DrivingScreen({
  schoolId,
  route,
  trip,
  students,
  center,
  onFinished,
}: {
  schoolId: string;
  route: OfficeBusRoute;
  trip: OfficeBusTrip;
  students: OfficeStudent[];
  center: LatLng;
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

  useEffect(() => {
    setLastServerAt(trip.location?.at ?? null);
    setSyncError(null);
    // Reset only when the run changes; live location updates should not reset the sync badge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id]);

  const activeRoute = useMemo(() => routeForTrip(route, trip) ?? route, [route, trip]);
  const stops = orderedStops(activeRoute, trip.run);
  const next = nextStop(activeRoute, trip);
  const riders = useMemo(() => {
    if (!trip.riderSnapshot) return ridersForRoute(students, activeRoute.id);
    const ids = new Set(trip.riderSnapshot);
    return students.filter((student) => ids.has(student.id));
  }, [students, activeRoute.id, trip.riderSnapshot]);
  const status = trip.riders ?? {};

  // ---- Location sharing ----
  const lastSent = useRef<{ at: number; p: LatLng } | null>(null);
  const tripRef = useRef(trip);
  tripRef.current = trip;
  useEffect(() => {
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
        const prev = lastSent.current;
        // Reaching a stop is sent right away so the office sees it without waiting.
        const upcoming = nextStop(activeRoute, t);
        const reached = upcoming && distanceMeters(p, upcoming) <= STOP_ARRIVAL_RADIUS_M ? upcoming.id : null;
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

  const mark = async (kids: OfficeStudent[], st: OfficeBusRiderStatus | null) => {
    try {
      await transport.setOfficeBusRiders(
        trip,
        route,
        kids.map((k) => ({ studentId: k.id, studentName: getOfficeStudentFullName(k), status: st })),
      );
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save', description: (e as Error).message });
    }
  };

  const arrive = async (stopId: string, reached = true) => {
    try {
      await transport.setOfficeBusStopReached(trip, stopId, reached);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save', description: (e as Error).message });
    }
  };

  const sendReport = async () => {
    if (!report) return;
    try {
      await transport.addOfficeBusTripAlert(trip, route, {
        kind: report,
        message: reportText.trim() || null,
        minutes: report === 'delay' ? reportMinutes : null,
      });
      toast({ title: 'Saved for the office', description: 'It will appear on the live Transportation page.' });
      setReport(null);
      setReportText('');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not send', description: (e as Error).message });
    }
  };

  const unresolved = riders.filter((k) => status[k.id]?.status !== 'off' && status[k.id]?.status !== 'absent');
  const finish = async () => {
    if (unresolved.length > 0) {
      toast({ variant: 'destructive', title: 'Some riders are not accounted for', description: 'Mark every rider off or not here before ending the run.' });
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
          geo === 'on' && !syncError
            ? 'bg-teal-700 text-white'
            : geo === 'waiting'
              ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
              : 'bg-amber-500 text-amber-950',
        )}
        role="status"
      >
        {geo === 'on' ? <LocateFixed className="h-4 w-4" /> : <LocateOff className="h-4 w-4" />}
        {geo === 'on' && syncError
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
              <Button type="button" className="mt-3 h-12 w-full rounded-xl text-base" onClick={() => void arrive(next.id)}>
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
              <Button type="button" variant="outline" className="mt-3 h-11 w-full rounded-xl" onClick={() => void mark(hereKids, trip.run === 'am' ? 'off' : 'on')}>
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
                        <span className="font-medium">{getOfficeStudentFullName(k)}</span>
                        {st && st !== 'on' ? (
                          <button type="button" onClick={() => void mark([k], null)} aria-label="Undo" className="rounded p-1 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800">
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
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-12 rounded-xl" onClick={() => setReport('delay')}>
              <Clock className="mr-2 h-4 w-4" /> Running late
            </Button>
            <Button type="button" variant="outline" className="h-12 rounded-xl" onClick={() => setReport('breakdown')}>
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
                      <button type="button" onClick={() => void arrive(s.id, false)} className="text-xs text-teal-800 hover:underline dark:text-teal-300">
                        Not yet
                      </button>
                    </li>
                  ))}
              </ul>
            </details>
          ) : null}

          <Button type="button" variant="destructive" className="h-12 w-full rounded-xl" onClick={() => setEnding(true)}>
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
            <Button type="button" className="rounded-xl" onClick={() => void sendReport()}>
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
              Not accounted for: {unresolved.map(getOfficeStudentFullName).join(', ')}.
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
            <Button type="button" variant="destructive" className="rounded-xl" disabled={!checked || unresolved.length > 0} onClick={() => void finish()}>
              End run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
