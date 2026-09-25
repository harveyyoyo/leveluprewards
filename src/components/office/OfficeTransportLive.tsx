'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CircleDot,
  Clock,
  Copy,
  Info,
  Mail,
  Phone,
  Play,
  Route as RouteIcon,
  Square,
  Users,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useOfficeEntityNav } from '@/components/office/OfficeEntityNavProvider';
import { useOfficeTransportApi } from '@/lib/office/useOfficeTransportApi';
import { OfficeEmptyState } from '@/components/office/OfficeEmptyState';
import { OfficeLoadingRows } from '@/components/office/OfficeLoadingRows';
import { OfficeTransportMap, type TransportMapLine, type TransportMapMarker } from '@/components/office/OfficeTransportMap';
import { useNow } from '@/lib/office/useOfficeTransport';
import {
  BUS_ALERT_LABEL,
  BUS_EXCEPTION_LABEL,
  BUS_RUN_LABEL,
  LATE_THRESHOLD_MIN,
  isFreshLocation,
  agoLabel,
  clockLabel,
  currentRun,
  distanceMeters,
  etaMinutes,
  familyUpdateMessage,
  formatDistance,
  latestMaintenanceLabel,
  latestTripForRoute,
  minutesLate,
  nextStop,
  orderedStops,
  pointAlongStops,
  ridersForRoute,
  routeForTrip,
  routeLabel,
  routeReadiness,
  stopTime,
  tripWarnings,
  transportFamilyEmails,
  transportPhoneStatusText,
  trackerSourceLabel,
  vehicleDueLabel,
  vehicleLabel,
  type LatLng,
} from '@/lib/office/officeTransport';
import { formatScheduleTime } from '@/lib/office/officeSchedule';
import { buildAnnouncementMailto } from '@/lib/office/officeUtils';
import type { OfficeBusRoute, OfficeBusRun, OfficeBusRunExceptionKind, OfficeBusTrip, OfficeFamily, OfficeStudent } from '@/lib/office/types';
import { cn } from '@/lib/utils';

type Props = {
  schoolId: string;
  routes: OfficeBusRoute[];
  trips: OfficeBusTrip[];
  students: OfficeStudent[];
  familyById: Map<string, OfficeFamily>;
  studentNameById: Map<string, string>;
  center: LatLng;
  isLoading: boolean;
  onSetUpRoutes: () => void;
};

const PRACTICE_SECONDS = 75;

/** Live view: every bus on the map, what needs attention, and each run's progress. */
export function OfficeTransportLive({ schoolId, routes, trips, students, familyById, studentNameById, center, isLoading, onSetUpRoutes }: Props) {
  const now = useNow(10_000);
  const { toast } = useToast();
  const transport = useOfficeTransportApi(schoolId);
  const { openStudent } = useOfficeEntityNav();
  const [run, setRun] = useState<OfficeBusRun>(() => currentRun());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [practice, setPractice] = useState<OfficeBusTrip | null>(null);

  const runTrips = useMemo(() => trips.filter((t) => t.run === run), [trips, run]);
  // A practice run stands in for the selected route's real trip while it plays.
  const tripFor = (routeId: string) =>
    practice?.routeId === routeId ? practice : latestTripForRoute(runTrips, routeId, run);
  const warnings = useMemo(() => tripWarnings(routes, runTrips, studentNameById, now), [routes, runTrips, studentNameById, now]);
  const selected = routes.find((r) => r.id === selectedId) ?? null;
  const selectedTrip = selected ? tripFor(selected.id) : null;
  const selectedDisplayRoute = selectedTrip ? routeForTrip(selected ?? undefined, selectedTrip) ?? selected : selected;
  const selectedFamilyEmails = useMemo(
    () => (selected ? transportFamilyEmails(students, familyById, selected.id, selectedTrip) : []),
    [familyById, selected, selectedTrip, students],
  );
  const selectedRiders = useMemo(
    () => (selected ? ridersForTrip(selectedTrip, students, selected.id) : []),
    [selected, selectedTrip, students],
  );
  const hasOpenRouteException = Boolean(selectedTrip && Object.values(selectedTrip.exceptions ?? {}).some((exception) => exception.status !== 'resolved'));
  const confirmFamilyUpdate = () => {
    if (!hasOpenRouteException) return true;
    return window.confirm('This run has a temporary route exception. The family update will not include the internal note. Continue?');
  };
  const emailSelectedFamilies = () => {
    if (!selectedDisplayRoute) return;
    if (!confirmFamilyUpdate()) return;
    if (selectedFamilyEmails.length === 0) {
      toast({ title: 'No family email addresses found', description: 'Add an email to a family contact first.' });
      return;
    }
    window.location.href = buildAnnouncementMailto({
      emails: selectedFamilyEmails,
      subject: `Transportation update: ${routeLabel(selectedDisplayRoute)}`,
      body: familyUpdateMessage(selectedDisplayRoute, selectedTrip, now),
    });
  };

  const copyPhoneStatus = async () => {
    if (!selectedDisplayRoute) return;
    const status = transportPhoneStatusText(selectedDisplayRoute, selectedTrip, now);
    try {
      await navigator.clipboard.writeText(status.text);
      toast({ title: 'Phone status copied', description: 'This short message can be used by the school phone service later.' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy the phone status' });
    }
  };

  const speakPhoneStatus = () => {
    if (!selectedDisplayRoute || !('speechSynthesis' in window)) {
      toast({ variant: 'destructive', title: 'Speech preview is not available' });
      return;
    }
    const status = transportPhoneStatusText(selectedDisplayRoute, selectedTrip, now);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(status.text));
    toast({ title: 'Playing phone-status preview', description: 'This is a preview; no phone number has been connected yet.' });
  };

  const queueSelectedFamilyUpdate = async () => {
    if (!selectedTrip || selectedTrip.id.startsWith('practice-')) {
      toast({ title: 'Start the bus run first', description: 'The office can queue an update after the run has started.' });
      return;
    }
    if (!confirmFamilyUpdate()) return;
    try {
      const result = await transport.queueOfficeBusFamilyUpdate(selectedTrip);
      toast({
        title: result.duplicate ? 'Already queued' : result.queued ? 'Update queued' : 'No family emails found',
        description: result.duplicate
          ? 'This exact update was already added. No second copy was sent.'
          : result.queued
            ? `${result.queued} recipient${result.queued === 1 ? '' : 's'} added to the office mail queue.`
            : 'Add an email to a family contact first.',
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not queue the update', description: (error as Error).message });
    }
  };

  const createException = async (trip: OfficeBusTrip, kind: OfficeBusRunExceptionKind, stopId: string | null, note: string): Promise<boolean> => {
    try {
      await transport.createOfficeBusRunException(trip.id, { kind, stopId, note: note || null });
      toast({ title: 'Route exception added', description: 'Office and the assigned driver can now track it.' });
      return true;
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not add the route exception', description: (error as Error).message });
      return false;
    }
  };
  const resolveException = async (trip: OfficeBusTrip, exceptionId: string) => {
    try {
      await transport.resolveOfficeBusRunException(trip.id, exceptionId);
      toast({ title: 'Route exception resolved' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not resolve the exception', description: (error as Error).message });
    }
  };

  const createHandoff = async (trip: OfficeBusTrip): Promise<{ code: string; expiresAt: number } | null> => {
    try {
      const result = await transport.createOfficeReliefHandoff(trip.id);
      toast({ title: 'Relief handoff code created', description: 'Share it only with the relief driver. It expires soon and works once.' });
      return result;
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not create a handoff code', description: (error as Error).message });
      return null;
    }
  };

  const activeTrips = runTrips.filter((t) => t.status === 'active');
  const lateCount = activeTrips.filter((t) => {
    const r = routeForTrip(routes.find((x) => x.id === t.routeId), t);
    return r ? (minutesLate(r, t, now) ?? 0) >= LATE_THRESHOLD_MIN : false;
  }).length;
  const ridersOn = activeTrips.reduce((n, t) => n + Object.values(t.riders ?? {}).filter((r) => r.status === 'on').length, 0);
  const launchRows = routes.map((route) => {
    const routeCheck = routeReadiness(route);
    const assigned = ridersForRoute(students, route.id);
    const validStopIds = new Set((route.stops ?? []).filter((stop) => !stop.isSchool).map((stop) => stop.id));
    const missingStops = assigned.filter((student) => !student.busStopId || !validStopIds.has(student.busStopId));
    const trip = latestTripForRoute(runTrips, route.id, run);
    const locationReady = !trip || trip.status !== 'active' || isFreshLocation(trip.location, now);
    const checks = [
      { label: 'Route shape', ready: routeCheck.ready, detail: routeCheck.missing[0] ?? 'Stops are in a safe order.' },
      { label: 'Rider stops', ready: missingStops.length === 0, detail: missingStops.length ? `${missingStops.length} rider${missingStops.length === 1 ? '' : 's'} need a stop.` : `${assigned.length} rider${assigned.length === 1 ? '' : 's'} assigned.` },
      { label: 'Location source', ready: locationReady, detail: trip ? trackerSourceLabel(trip) : 'Chosen when the run starts.' },
      { label: 'Release rule', ready: true, detail: route.requireReleaseConfirmations ? 'Required for drop-off.' : 'Not required.' },
      { label: 'Arrival messages', ready: true, detail: route.notifyFamiliesOnArrival ? 'On for opted-in families.' : 'Off for this route.' },
    ];
    return { route, trip, assignedCount: assigned.length, missingStops: missingStops.length, checks, ready: routeCheck.ready && missingStops.length === 0 && locationReady };
  });

  // ---- Practice run: a pretend bus drives the selected route so staff can see how it works. ----
  const practiceStart = useRef(0);
  useEffect(() => {
    if (!practice) return;
    const route = routes.find((r) => r.id === practice.routeId);
    if (!route) return;
    const stops = orderedStops(route, practice.run);
    const riders = ridersForRoute(students, route.id);
    const tick = window.setInterval(() => {
      const t = (Date.now() - practiceStart.current) / (PRACTICE_SECONDS * 1000);
      const p = pointAlongStops(stops, t);
      setPractice((prev) => {
        if (!prev) return prev;
        const arrivals = { ...(prev.stopArrivals ?? {}) };
        const ridersMap = { ...(prev.riders ?? {}) };
        stops.forEach((s, i) => {
          if (arrivals[s.id] || distanceMeters(p, s) > 60) return;
          arrivals[s.id] = Date.now();
          // Morning: riders get on at their stop, everyone gets off at school. Afternoon: the reverse.
          for (const kid of riders) {
            if (practice.run === 'am' && kid.busStopId === s.id) ridersMap[kid.id] = { status: 'on', at: Date.now() };
            if (practice.run === 'pm' && i === 0) ridersMap[kid.id] = { status: 'on', at: Date.now() };
            if (practice.run === 'pm' && kid.busStopId === s.id && i > 0) ridersMap[kid.id] = { status: 'off', at: Date.now() };
            if (practice.run === 'am' && s.isSchool && ridersMap[kid.id]?.status === 'on') ridersMap[kid.id] = { status: 'off', at: Date.now() };
          }
        });
        const done = t >= 1;
        return {
          ...prev,
          location: { lat: p.lat, lng: p.lng, speed: 9, at: Date.now() },
          stopArrivals: arrivals,
          riders: ridersMap,
          status: done ? 'done' : 'active',
          endedAt: done ? Date.now() : null,
          childCheckDone: done ? true : null,
          updatedAt: Date.now(),
        };
      });
      if (t >= 1) window.clearInterval(tick);
    }, 500);
    return () => window.clearInterval(tick);
    // Restart only when a new practice run begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practice?.id]);

  const startPractice = (route: OfficeBusRoute) => {
    practiceStart.current = Date.now();
    const first = orderedStops(route, run)[0];
    const startedAt = Date.now();
    setPractice({
      id: `practice-${Date.now()}`,
      routeId: route.id,
      date: '',
      run,
      status: 'active',
      driverName: route.driverName ?? 'Practice driver',
      startedAt,
      location: first ? { lat: first.lat, lng: first.lng, at: startedAt } : null,
      stopArrivals: {},
      riders: {},
      alerts: [],
      updatedAt: Date.now(),
    });
  };

  // ---- Map content ----
  const markers: TransportMapMarker[] = [];
  const lines: TransportMapLine[] = [];
  const visibleRoutes = selected ? [selectedDisplayRoute ?? selected] : routes;
  for (const route of visibleRoutes) {
    const trip = tripFor(route.id);
    const displayRoute = trip ? routeForTrip(routes.find((candidate) => candidate.id === route.id), trip) ?? route : route;
    const stops = orderedStops(displayRoute, run);
    lines.push({ id: route.id, color: displayRoute.color, points: stops, faded: !selected && !trip });
    for (const s of stops) {
      markers.push({
        id: `stop:${route.id}:${s.id}`,
        kind: s.isSchool ? 'school' : 'stop',
        color: displayRoute.color,
        lat: s.lat,
        lng: s.lng,
        title: `${s.name}${stopTime(s, run) ? ` · ${formatScheduleTime(stopTime(s, run)!)}` : ''}`,
        active: !!trip?.stopArrivals?.[s.id],
      });
    }
  }
  for (const route of routes) {
    const trip = tripFor(route.id);
    if (!trip?.location || (selected && selected.id !== route.id)) continue;
    const displayRoute = routeForTrip(route, trip) ?? route;
    const stale = !isFreshLocation(trip.location, now);
    markers.push({
      id: `bus:${route.id}`,
      kind: 'bus',
      color: displayRoute.color,
      lat: trip.location.lat,
      lng: trip.location.lng,
      label: displayRoute.busNumber || displayRoute.name.slice(0, 3),
      title: `${routeLabel(displayRoute)} · ${trip.closedByOffice ? 'closed by office' : trip.status === 'done' ? 'finished' : `seen ${agoLabel(trip.location.at, now)}`}`,
      active: trip.status === 'active',
      faded: stale || trip.status === 'done',
      selected: selected?.id === route.id,
    });
  }
  const fitPoints: LatLng[] = selected
    ? [...(selectedDisplayRoute?.stops ?? []), ...(selectedTrip?.location ? [selectedTrip.location] : [])]
    : routes.flatMap((r) => {
        const trip = tripFor(r.id);
        return trip ? routeForTrip(r, trip)?.stops ?? r.stops ?? [] : r.stops ?? [];
      });

  if (isLoading) return <OfficeLoadingRows cols={3} rows={4} />;

  if (routes.length === 0) {
    return (
      <OfficeEmptyState
        icon={RouteIcon}
        title="No bus routes yet"
        description="Add your routes and stops first. Then drivers tap Drive on their phone and every bus shows up here, live."
        action={
          <Button type="button" className="rounded-xl" onClick={onSetUpRoutes}>
            Set up routes
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="On the road" value={activeTrips.length} tone={activeTrips.length ? 'good' : 'plain'} />
        <Stat label="Finished" value={runTrips.filter((t) => t.status === 'done').length} />
        <Stat label="Running late" value={lateCount} tone={lateCount ? 'warn' : 'plain'} />
        <Stat label="Riders on buses" value={ridersOn} />
      </div>

      <section className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900" aria-label="Ready to leave board">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Ready-to-leave board</h2>
            <p className="mt-1 text-xs text-muted-foreground">A quick private check for each route. It does not show family contact details or a child’s location.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">{launchRows.filter((row) => row.ready).length}/{launchRows.length} ready</span>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {launchRows.map((row) => (
            <button key={row.route.id} type="button" onClick={() => setSelectedId(row.route.id)} className={cn('rounded-xl border p-3 text-left transition hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500', row.ready ? 'border-teal-200 bg-teal-50/40 dark:border-teal-900 dark:bg-teal-950/20' : 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20')}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{routeLabel(row.route)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{row.assignedCount} rider{row.assignedCount === 1 ? '' : 's'} · {row.trip ? statusOf(row.route, row.trip, now).text : 'Not started'}</p>
                </div>
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', row.ready ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200' : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200')}>
                  {row.ready ? 'Ready' : 'Needs setup'}
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {row.checks.map((check) => (
                  <li key={check.label} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                    {check.ready ? <Check className="mt-0.5 h-3 w-3 shrink-0 text-teal-700 dark:text-teal-300" /> : <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-700 dark:text-amber-300" />}
                    <span><span className="font-medium text-foreground">{check.label}:</span> {check.detail}</span>
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </section>

      {warnings.length > 0 ? (
        <ul className="space-y-1.5" aria-label="Needs attention">
          {warnings.slice(0, 5).map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => setSelectedId(w.routeId)}
                className={cn(
                  'flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm',
                  w.tone === 'danger'
                    ? 'bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100'
                    : w.tone === 'caution'
                      ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100',
                )}
              >
                {w.tone === 'info' ? <Info className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                {w.text}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <OfficeTransportMap
          markers={markers}
          lines={lines}
          fitPoints={fitPoints.length ? fitPoints : [center]}
          fitKey={`${selectedId ?? 'all'}-${run}-${routes.length}`}
          initialCenter={center}
          onMarkerClick={(id) => {
            const [, routeId] = id.split(':');
            if (routeId) setSelectedId(routeId);
          }}
          className="h-80 lg:h-[560px]"
        >
          <div data-map-control className="absolute left-2 top-2 grid grid-cols-2 gap-1 rounded-xl bg-white/95 p-1 shadow-sm dark:bg-slate-900/95">
            {(['am', 'pm'] as const).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={run === r}
                onClick={() => {
                  setRun(r);
                  setPractice(null);
                }}
                className={cn(
                  'rounded-lg px-3 py-1 text-xs font-semibold',
                  run === r ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )}
              >
                {BUS_RUN_LABEL[r]}
              </button>
            ))}
          </div>
        </OfficeTransportMap>

        <div className="min-w-0 rounded-2xl border bg-white dark:border-slate-800 dark:bg-slate-900">
          {selected ? (
            <RouteDetail
              route={selectedDisplayRoute ?? selected}
              trip={selectedTrip}
              run={run}
              now={now}
              riders={selectedRiders}
              isPractice={practice?.routeId === selected.id}
              onBack={() => {
                setSelectedId(null);
                setPractice(null);
              }}
              onPractice={() => startPractice(selected)}
              onStopPractice={() => setPractice(null)}
              onOpenStudent={openStudent}
              onCopyPhoneStatus={copyPhoneStatus}
              onSpeakPhoneStatus={speakPhoneStatus}
              onCopy={async () => {
                if (!confirmFamilyUpdate()) return;
                try {
                  await navigator.clipboard.writeText(familyUpdateMessage(selectedDisplayRoute ?? selected, selectedTrip, now));
                  toast({ title: 'Update copied', description: 'Paste it into a text or email to families.' });
                } catch {
                  toast({ variant: 'destructive', title: 'Could not copy' });
                }
              }}
              onEmailFamilies={emailSelectedFamilies}
              familyRecipientCount={selectedFamilyEmails.length}
              onQueueEmail={queueSelectedFamilyUpdate}
              onCreateException={createException}
              onResolveException={resolveException}
              onCreateHandoff={createHandoff}
            />
          ) : (
            <ul className="divide-y dark:divide-slate-800">
              {routes.map((route) => {
                const trip = tripFor(route.id);
                const displayRoute = trip ? routeForTrip(route, trip) ?? route : route;
                return (
                  <li key={route.id}>
                    <RouteRow
                      route={displayRoute}
                      trip={trip}
                      riderCount={trip?.riderManifest?.length ?? ridersForRoute(students, route.id).length}
                      now={now}
                      onClick={() => setSelectedId(route.id)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ridersForTrip(trip: OfficeBusTrip | null, students: OfficeStudent[], routeId: string): OfficeStudent[] {
  if (!trip?.riderManifest?.length) return ridersForRoute(students, routeId);
  return trip.riderManifest.map((entry) => {
    const current = students.find((student) => student.id === entry.studentId);
    if (current) {
      return {
        ...current,
        firstName: entry.displayName,
        lastName: '',
        busRouteId: routeId,
        busStopId: entry.busStopId ?? current.busStopId,
        transportMode: 'bus' as const,
      };
    }
    return {
      id: entry.studentId,
      firstName: entry.displayName,
      lastName: '',
      familyId: entry.familyId ?? null,
      busRouteId: routeId,
      busStopId: entry.busStopId ?? null,
      transportMode: 'bus',
      status: 'active',
      updatedAt: trip.updatedAt,
    };
  });
}

function Stat({ label, value, tone = 'plain' }: { label: string; value: number; tone?: 'plain' | 'good' | 'warn' }) {
  return (
    <div className="rounded-2xl border bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <p
        className={cn(
          'text-2xl font-semibold tabular-nums',
          tone === 'good' && 'text-teal-700 dark:text-teal-400',
          tone === 'warn' && 'text-amber-700 dark:text-amber-400',
        )}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function statusOf(route: OfficeBusRoute, trip: OfficeBusTrip | null, now: number): { text: string; tone: 'idle' | 'live' | 'late' | 'done' | 'stale' } {
  if (!trip) return { text: 'Not started', tone: 'idle' };
  if (trip.status === 'done') return { text: trip.closedByOffice ? 'Closed by School Office' : `Finished ${clockLabel(trip.endedAt ?? trip.updatedAt)}`, tone: 'done' };
  if (!isFreshLocation(trip.location, now)) return { text: 'On the road · no signal', tone: 'stale' };
  const late = minutesLate(route, trip, now) ?? 0;
  if (late >= LATE_THRESHOLD_MIN) return { text: `About ${late} min late`, tone: 'late' };
  return { text: 'On the road · on time', tone: 'live' };
}

const TONE_CLASS = {
  idle: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  live: 'bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200',
  late: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
  stale: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
  done: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
} as const;

function RouteRow({
  route,
  trip,
  riderCount,
  now,
  onClick,
}: {
  route: OfficeBusRoute;
  trip: OfficeBusTrip | null;
  riderCount: number;
  now: number;
  onClick: () => void;
}) {
  const displayRoute = trip ? routeForTrip(route, trip) ?? route : route;
  const status = statusOf(displayRoute, trip, now);
  const stop = trip?.status === 'active' ? nextStop(displayRoute, trip) : null;
  const onBoard = Object.values(trip?.riders ?? {}).filter((r) => r.status === 'on').length;
  return (
    <button type="button" onClick={onClick} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60">
      <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: route.color }} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold">{routeLabel(route)}</span>
          <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', TONE_CLASS[status.tone])}>{status.text}</span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {[
            route.driverName,
            trip?.status === 'active' ? `${onBoard} on board` : `${riderCount} rider${riderCount === 1 ? '' : 's'}`,
            stop && trip?.location ? `Next: ${stop.name} in ~${etaMinutes(trip.location, stop)} min` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </span>
    </button>
  );
}

function RouteDetail({
  route,
  trip,
  run,
  now,
  riders,
  isPractice,
  onBack,
  onPractice,
  onStopPractice,
  onOpenStudent,
  onCopyPhoneStatus,
  onSpeakPhoneStatus,
  onCopy,
  onEmailFamilies,
  familyRecipientCount,
  onQueueEmail,
  onCreateException,
  onResolveException,
  onCreateHandoff,
}: {
  route: OfficeBusRoute;
  trip: OfficeBusTrip | null;
  run: OfficeBusRun;
  now: number;
  riders: OfficeStudent[];
  isPractice: boolean;
  onBack: () => void;
  onPractice: () => void;
  onStopPractice: () => void;
  onOpenStudent: (id: string) => void;
  onCopyPhoneStatus: () => void;
  onSpeakPhoneStatus: () => void;
  onCopy: () => void;
  onEmailFamilies: () => void;
  familyRecipientCount: number;
  onQueueEmail: () => void;
  onCreateException: (trip: OfficeBusTrip, kind: OfficeBusRunExceptionKind, stopId: string | null, note: string) => Promise<boolean>;
  onResolveException: (trip: OfficeBusTrip, exceptionId: string) => void;
  onCreateHandoff: (trip: OfficeBusTrip) => Promise<{ code: string; expiresAt: number } | null>;
}) {
  const { toast } = useToast();
  const displayRoute = trip ? routeForTrip(route, trip) ?? route : route;
  const status = statusOf(displayRoute, trip, now);
  const stops = orderedStops(displayRoute, run);
  const next = trip?.status === 'active' ? nextStop(displayRoute, trip) : null;
  const riderStatus = trip?.riders ?? {};
  const [exceptionFormOpen, setExceptionFormOpen] = useState(false);
  const [exceptionKind, setExceptionKind] = useState<OfficeBusRunExceptionKind>('detour');
  const [exceptionStopId, setExceptionStopId] = useState('');
  const [exceptionNote, setExceptionNote] = useState('');
  const [exceptionSaving, setExceptionSaving] = useState(false);
  const [handoffCode, setHandoffCode] = useState<string | null>(null);
  const [handoffExpiresAt, setHandoffExpiresAt] = useState<number | null>(null);
  const [handoffSaving, setHandoffSaving] = useState(false);
  const exceptions = Object.values(trip?.exceptions ?? {}).sort((a, b) => b.createdAt - a.createdAt);
  useEffect(() => {
    setExceptionFormOpen(false);
    setExceptionStopId('');
    setExceptionNote('');
    setHandoffCode(null);
    setHandoffExpiresAt(null);
  }, [route.id, trip?.id]);
  const counts = { on: 0, off: 0, absent: 0, waiting: 0 };
  for (const kid of riders) {
    const st = riderStatus[kid.id]?.status;
    if (st) counts[st] += 1;
    else counts.waiting += 1;
  }
  const alerts = [...(trip?.alerts ?? [])].reverse();
  const vehicle = vehicleLabel(displayRoute.vehicle);
  const vehicleDue = vehicleDueLabel(displayRoute.vehicle, now);
  const lastService = latestMaintenanceLabel(displayRoute.vehicle);
  const createHandoffCode = async () => {
    if (!trip) return;
    setHandoffSaving(true);
    try {
      const result = await onCreateHandoff(trip);
      if (result) {
        setHandoffCode(result.code);
        setHandoffExpiresAt(result.expiresAt);
      }
    } finally {
      setHandoffSaving(false);
    }
  };
  const copyHandoffCode = async () => {
    if (!handoffCode) return;
    try {
      await navigator.clipboard.writeText(handoffCode);
      toast({ title: 'Handoff code copied', description: 'Share it only with the relief driver.' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy the handoff code' });
    }
  };

  return (
    <div className="flex max-h-[560px] flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-2 dark:border-slate-800">
        <button type="button" onClick={onBack} aria-label="All routes" className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: displayRoute.color }} aria-hidden />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{routeLabel(displayRoute)}</p>
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', TONE_CLASS[status.tone])}>
          {isPractice ? 'Practice' : status.text}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {trip?.status === 'active' && !trip.location ? (
          <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
            <p className="font-medium">Waiting for a bus update</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Tracking source: {trackerSourceLabel(trip)}</p>
          </div>
        ) : null}
        {trip?.location && trip.status === 'active' ? (
          <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
            {next ? (
              <p>
                Next stop <span className="font-semibold">{next.name}</span> · about {etaMinutes(trip.location, next)} min
                <span className="text-muted-foreground"> ({formatDistance(distanceMeters(trip.location, next))})</span>
              </p>
            ) : (
              <p>Every stop reached.</p>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">
              Location {agoLabel(trip.location.at, now)} · {trackerSourceLabel(trip)}
              {!isFreshLocation(trip.location, now) ? ' · signal stale' : ' · updating'}
              {trip.location.speed ? ` · ${Math.round(trip.location.speed * 2.237)} mph` : ''}
              {trip.driverName ? ` · Driver ${trip.driverName}` : ''}
            </p>
          </div>
        ) : null}

        {vehicle || lastService ? (
          <p className={cn('rounded-xl px-3 py-2 text-xs', vehicleDue ? 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-100' : 'bg-slate-50 text-muted-foreground dark:bg-slate-800/60')}>
            {vehicle ? `Vehicle: ${vehicle}` : 'Vehicle service history'}
            {vehicleDue ? ` · ${vehicleDue}` : ''}
            {lastService ? ` · Last service ${lastService}` : ''}
          </p>
        ) : null}

        {trip?.status === 'active' && displayRoute.reliefDriverName ? (
          <section className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 dark:border-teal-900 dark:bg-teal-950/20">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Relief driver handoff</p>
                <p className="mt-1 text-xs text-muted-foreground">Create a short-lived code when the relief driver needs to take over this active run.</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg text-xs" disabled={handoffSaving} onClick={() => void createHandoffCode()}>
                {handoffSaving ? 'Making code…' : handoffCode ? 'Make a new code' : 'Create handoff code'}
              </Button>
            </div>
            {handoffCode ? (
              <div className="mt-3 rounded-lg border border-teal-200 bg-white/80 p-3 dark:border-teal-900 dark:bg-slate-900/60">
                <p className="text-xs font-medium text-muted-foreground">One-time code</p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-[0.3em]">{handoffCode}</p>
                <p className="mt-1 text-xs text-muted-foreground">{handoffExpiresAt && handoffExpiresAt > now ? `Expires at ${clockLabel(handoffExpiresAt)}` : 'This code has expired. Make a new one.'}</p>
                <Button type="button" variant="outline" size="sm" className="mt-2 h-8 rounded-lg text-xs" onClick={() => void copyHandoffCode()}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy code
                </Button>
              </div>
            ) : null}
            <p className="mt-2 text-[11px] text-muted-foreground">The code is not saved in the trip record. Share it only with the relief driver.</p>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {displayRoute.driverPhone ? (
            <Button asChild variant="outline" size="sm" className="gap-1.5 rounded-lg">
              <a href={`tel:${displayRoute.driverPhone.replace(/[^\d+]/g, '')}`}>
                <Phone className="h-3.5 w-3.5" /> Call driver
              </a>
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-lg" onClick={onCopyPhoneStatus} title="Copy a safe status message for a future phone service">
            <Phone className="h-3.5 w-3.5" /> Copy phone status
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-lg" onClick={onSpeakPhoneStatus} title="Hear a preview of the phone message">
            <Volume2 className="h-3.5 w-3.5" /> Hear phone status
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-lg" onClick={onCopy}>
            <Copy className="h-3.5 w-3.5" /> Update for families
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-lg" onClick={onEmailFamilies} disabled={familyRecipientCount === 0}>
            <Mail className="h-3.5 w-3.5" /> Email families ({familyRecipientCount})
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-lg" onClick={onQueueEmail} disabled={!trip || trip.id.startsWith('practice-') || familyRecipientCount === 0} title="Add this update to the office mail queue">
            <Mail className="h-3.5 w-3.5" /> Queue office email
          </Button>
          {isPractice ? (
            <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-lg" onClick={onStopPractice}>
              <Square className="h-3.5 w-3.5" /> Stop practice
            </Button>
          ) : !trip && stops.length >= 2 ? (
            <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-lg" onClick={onPractice}>
              <Play className="h-3.5 w-3.5" /> Watch a practice run
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">The phone-status message contains bus information only. It does not include a child's name, address, or live location.</p>
        {isPractice ? (
          <p className="text-xs text-muted-foreground">A pretend bus is driving this route so you can see how it looks. Nothing is saved.</p>
        ) : null}

        {alerts.length > 0 ? (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">From the driver</h3>
            <ul className="mt-2 space-y-1.5">
              {alerts.map((a) => (
                <li key={a.id} className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                  <span className="font-medium">{BUS_ALERT_LABEL[a.kind]}</span>
                  {a.minutes ? ` · about ${a.minutes} min` : ''}
                  {a.message ? ` — ${a.message}` : ''}
                  <span className="block text-xs opacity-80">{clockLabel(a.at)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {trip?.status === 'active' && !isPractice ? (
           <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
             <div className="flex items-center justify-between gap-2">
               <h3 className="text-xs font-bold uppercase tracking-wide text-amber-900 dark:text-amber-100">Temporary route exceptions</h3>
               <Button type="button" variant="outline" size="sm" className="h-7 rounded-lg text-xs" onClick={() => setExceptionFormOpen((open) => !open)}>
                 {exceptionFormOpen ? 'Cancel' : 'Add exception'}
               </Button>
             </div>
             {exceptionFormOpen ? (
               <div className="mt-3 space-y-2">
                 <select aria-label="Exception type" value={exceptionKind} onChange={(event) => setExceptionKind(event.target.value as OfficeBusRunExceptionKind)} className="h-9 w-full rounded-lg border bg-background px-2 text-sm">
                   {Object.entries(BUS_EXCEPTION_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                 </select>
                 <select aria-label="Exception stop" value={exceptionStopId} onChange={(event) => setExceptionStopId(event.target.value)} className="h-9 w-full rounded-lg border bg-background px-2 text-sm">
                   <option value="">No specific stop</option>
                   {stops.filter((stop) => !stop.isSchool).map((stop) => <option key={stop.id} value={stop.id}>{stop.name}</option>)}
                 </select>
                 <input aria-label="Internal exception note" value={exceptionNote} onChange={(event) => setExceptionNote(event.target.value)} maxLength={300} placeholder="Short internal note (optional)" className="h-9 w-full rounded-lg border bg-background px-2 text-sm" />
                 <Button type="button" className="h-9 w-full rounded-lg" disabled={exceptionSaving} onClick={async () => {
                   setExceptionSaving(true);
                   try {
                     const saved = await onCreateException(trip, exceptionKind, exceptionStopId || null, exceptionNote.trim());
                     if (saved) {
                       setExceptionNote('');
                       setExceptionStopId('');
                       setExceptionFormOpen(false);
                     }
                   } finally {
                     setExceptionSaving(false);
                   }
                 }}>
                   {exceptionSaving ? 'Saving…' : 'Save exception'}
                 </Button>
               </div>
             ) : null}
             {exceptions.length > 0 ? (
               <ul className="mt-3 space-y-2">
                 {exceptions.map((exception) => (
                   <li key={exception.id} className="rounded-lg border border-amber-200/80 bg-white/70 p-2.5 text-xs dark:border-amber-900 dark:bg-slate-900/50">
                     <div className="flex items-start justify-between gap-2">
                       <span className="font-medium">{BUS_EXCEPTION_LABEL[exception.kind]}{exception.stopId ? ` · ${displayRoute.stops.find((stop) => stop.id === exception.stopId)?.name ?? 'Stop'}` : ''}</span>
                       <span className="shrink-0 text-[11px] text-muted-foreground">{exception.status === 'resolved' ? 'Resolved' : exception.expiresAt <= now ? 'Expired' : exception.status === 'acknowledged' ? 'Acknowledged' : 'Open'}</span>
                     </div>
                     {exception.note ? <p className="mt-1">{exception.note}</p> : null}
                     <p className="mt-1 text-[11px] text-muted-foreground">Added {clockLabel(exception.createdAt)} · expires {clockLabel(exception.expiresAt)}</p>
                     {exception.status !== 'resolved' && (exception.status === 'acknowledged' || exception.expiresAt <= now) ? <Button type="button" variant="outline" size="sm" className="mt-2 h-7 rounded-lg text-xs" onClick={() => onResolveException(trip, exception.id)}>Mark resolved</Button> : null}
                   </li>
                 ))}
               </ul>
             ) : <p className="mt-2 text-xs text-muted-foreground">No temporary exceptions on this run.</p>}
             <p className="mt-2 text-[11px] text-muted-foreground">Internal notes for Office and the assigned driver. Nothing here is sent to families automatically. If you prepare a family update, the page will ask you to confirm first.</p>
           </section>
         ) : null}

         <section>
           <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{BUS_RUN_LABEL[run]} stops</h3>
          <ol className="mt-2">
            {stops.map((s, i) => {
              const reached = trip?.stopArrivals?.[s.id];
              const isNext = next?.id === s.id;
              const planned = stopTime(s, run);
              const lateBy = reached && planned ? Math.round((minutesOfDayMs(reached) - planMinutes(planned))) : null;
              return (
                <li key={s.id} className="flex gap-3">
                  <span className="flex flex-col items-center">
                    <span
                      className={cn(
                        'mt-1 flex h-4 w-4 items-center justify-center rounded-full border-2',
                        reached ? 'border-transparent text-white' : isNext ? 'border-current' : 'border-slate-300 dark:border-slate-600',
                      )}
                      style={reached ? { backgroundColor: displayRoute.color } : isNext ? { color: displayRoute.color } : undefined}
                    >
                      {reached ? <Check className="h-2.5 w-2.5" /> : isNext ? <CircleDot className="h-2.5 w-2.5" /> : null}
                    </span>
                    {i < stops.length - 1 ? <span className="w-px flex-1 bg-slate-200 dark:bg-slate-700" /> : null}
                  </span>
                  <span className="min-w-0 flex-1 pb-3">
                    <span className={cn('block text-sm', isNext && 'font-semibold')}>{s.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {planned ? `Planned ${formatScheduleTime(planned)}` : 'No planned time'}
                      {reached ? ` · reached ${clockLabel(reached)}` : ''}
                      {lateBy !== null && lateBy >= LATE_THRESHOLD_MIN ? (
                        <span className="text-amber-700 dark:text-amber-400"> · {lateBy} min late</span>
                      ) : null}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        <section>
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Riders ({riders.length})
          </h3>
          {trip ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {counts.on} on bus · {counts.off} dropped off · {counts.absent} not riding · {counts.waiting} not marked
            </p>
          ) : null}
          {riders.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No students on this route yet. Add them in Riders.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {riders.map((kid) => {
                const st = riderStatus[kid.id];
                const stop = displayRoute.stops.find((s) => s.id === kid.busStopId);
                return (
                  <li key={kid.id} className="flex items-center justify-between gap-2 text-sm">
                    <button type="button" className="min-w-0 truncate text-left hover:text-teal-800 dark:hover:text-teal-300" onClick={() => onOpenStudent(kid.id)}>
                      {kid.firstName} {kid.lastName}
                      {stop ? <span className="text-xs text-muted-foreground"> · {stop.name}</span> : null}
                    </button>
                    {st ? (
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                          st.status === 'on'
                            ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200'
                            : st.status === 'off'
                              ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                              : 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
                        )}
                      >
                        {st.status === 'on' ? 'On bus' : st.status === 'off' ? 'Dropped off' : 'Not riding'} · {clockLabel(st.at)}
                      </span>
                    ) : trip ? (
                      <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" /> Not marked
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function minutesOfDayMs(ms: number): number {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

function planMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}
