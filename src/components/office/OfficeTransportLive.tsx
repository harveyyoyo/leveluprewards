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
  Phone,
  Play,
  Route as RouteIcon,
  Square,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useOfficeEntityNav } from '@/components/office/OfficeEntityNavProvider';
import { OfficeEmptyState } from '@/components/office/OfficeEmptyState';
import { OfficeLoadingRows } from '@/components/office/OfficeLoadingRows';
import { OfficeTransportMap, type TransportMapLine, type TransportMapMarker } from '@/components/office/OfficeTransportMap';
import { useNow } from '@/lib/office/useOfficeTransport';
import {
  BUS_ALERT_LABEL,
  BUS_RUN_LABEL,
  LATE_THRESHOLD_MIN,
  LOCATION_STALE_MS,
  agoLabel,
  clockLabel,
  currentRun,
  distanceMeters,
  etaMinutes,
  familyUpdateMessage,
  formatDistance,
  latestTripForRoute,
  minutesLate,
  nextStop,
  orderedStops,
  pointAlongStops,
  ridersForRoute,
  routeLabel,
  stopTime,
  tripWarnings,
  type LatLng,
} from '@/lib/office/officeTransport';
import { formatScheduleTime } from '@/lib/office/officeSchedule';
import type { OfficeBusRoute, OfficeBusRun, OfficeBusTrip, OfficeStudent } from '@/lib/office/types';
import { cn } from '@/lib/utils';

type Props = {
  schoolId: string;
  routes: OfficeBusRoute[];
  trips: OfficeBusTrip[];
  students: OfficeStudent[];
  studentNameById: Map<string, string>;
  center: LatLng;
  isLoading: boolean;
  onSetUpRoutes: () => void;
};

const PRACTICE_SECONDS = 75;

/** Live view: every bus on the map, what needs attention, and each run's progress. */
export function OfficeTransportLive({ routes, trips, students, studentNameById, center, isLoading, onSetUpRoutes }: Props) {
  const now = useNow(10_000);
  const { toast } = useToast();
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

  const activeTrips = runTrips.filter((t) => t.status === 'active');
  const lateCount = activeTrips.filter((t) => {
    const r = routes.find((x) => x.id === t.routeId);
    return r ? (minutesLate(r, t, now) ?? 0) >= LATE_THRESHOLD_MIN : false;
  }).length;
  const ridersOn = activeTrips.reduce((n, t) => n + Object.values(t.riders ?? {}).filter((r) => r.status === 'on').length, 0);

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
    setPractice({
      id: `practice-${Date.now()}`,
      routeId: route.id,
      date: '',
      run,
      status: 'active',
      driverName: route.driverName ?? 'Practice driver',
      startedAt: Date.now(),
      location: first ? { lat: first.lat, lng: first.lng, at: Date.now() } : null,
      stopArrivals: {},
      riders: {},
      alerts: [],
      updatedAt: Date.now(),
    });
  };

  // ---- Map content ----
  const markers: TransportMapMarker[] = [];
  const lines: TransportMapLine[] = [];
  const visibleRoutes = selected ? [selected] : routes;
  for (const route of visibleRoutes) {
    const trip = tripFor(route.id);
    const stops = orderedStops(route, run);
    lines.push({ id: route.id, color: route.color, points: stops, faded: !selected && !trip });
    for (const s of stops) {
      markers.push({
        id: `stop:${route.id}:${s.id}`,
        kind: s.isSchool ? 'school' : 'stop',
        color: route.color,
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
    const stale = now - trip.location.at > LOCATION_STALE_MS;
    markers.push({
      id: `bus:${route.id}`,
      kind: 'bus',
      color: route.color,
      lat: trip.location.lat,
      lng: trip.location.lng,
      label: route.busNumber || route.name.slice(0, 3),
      title: `${routeLabel(route)} · ${trip.status === 'done' ? 'finished' : `seen ${agoLabel(trip.location.at, now)}`}`,
      active: trip.status === 'active',
      faded: stale || trip.status === 'done',
      selected: selected?.id === route.id,
    });
  }
  const fitPoints: LatLng[] = selected
    ? [...(selected.stops ?? []), ...(selectedTrip?.location ? [selectedTrip.location] : [])]
    : routes.flatMap((r) => r.stops ?? []);

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
              route={selected}
              trip={selectedTrip}
              run={run}
              now={now}
              riders={ridersForRoute(students, selected.id)}
              isPractice={practice?.routeId === selected.id}
              onBack={() => {
                setSelectedId(null);
                setPractice(null);
              }}
              onPractice={() => startPractice(selected)}
              onStopPractice={() => setPractice(null)}
              onOpenStudent={openStudent}
              onCopy={async () => {
                try {
                  await navigator.clipboard.writeText(familyUpdateMessage(selected, selectedTrip, now));
                  toast({ title: 'Update copied', description: 'Paste it into a text or email to families.' });
                } catch {
                  toast({ variant: 'destructive', title: 'Could not copy' });
                }
              }}
            />
          ) : (
            <ul className="divide-y dark:divide-slate-800">
              {routes.map((route) => (
                <li key={route.id}>
                  <RouteRow
                    route={route}
                    trip={tripFor(route.id)}
                    riderCount={ridersForRoute(students, route.id).length}
                    now={now}
                    onClick={() => setSelectedId(route.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
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
  if (trip.status === 'done') return { text: `Finished ${clockLabel(trip.endedAt ?? trip.updatedAt)}`, tone: 'done' };
  if (!trip.location || now - trip.location.at > LOCATION_STALE_MS) return { text: 'On the road · no signal', tone: 'stale' };
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
  const status = statusOf(route, trip, now);
  const stop = trip?.status === 'active' ? nextStop(route, trip) : null;
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
  onCopy,
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
  onCopy: () => void;
}) {
  const status = statusOf(route, trip, now);
  const stops = orderedStops(route, run);
  const next = trip?.status === 'active' ? nextStop(route, trip) : null;
  const riderStatus = trip?.riders ?? {};
  const counts = { on: 0, off: 0, absent: 0, waiting: 0 };
  for (const kid of riders) {
    const st = riderStatus[kid.id]?.status;
    if (st) counts[st] += 1;
    else counts.waiting += 1;
  }
  const alerts = [...(trip?.alerts ?? [])].reverse();

  return (
    <div className="flex max-h-[560px] flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-2 dark:border-slate-800">
        <button type="button" onClick={onBack} aria-label="All routes" className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: route.color }} aria-hidden />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{routeLabel(route)}</p>
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', TONE_CLASS[status.tone])}>
          {isPractice ? 'Practice' : status.text}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
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
              Location {agoLabel(trip.location.at, now)}
              {trip.location.speed ? ` · ${Math.round(trip.location.speed * 2.237)} mph` : ''}
              {trip.driverName ? ` · Driver ${trip.driverName}` : ''}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {route.driverPhone ? (
            <Button asChild variant="outline" size="sm" className="gap-1.5 rounded-lg">
              <a href={`tel:${route.driverPhone.replace(/[^\d+]/g, '')}`}>
                <Phone className="h-3.5 w-3.5" /> Call driver
              </a>
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-lg" onClick={onCopy}>
            <Copy className="h-3.5 w-3.5" /> Update for families
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
                      style={reached ? { backgroundColor: route.color } : isNext ? { color: route.color } : undefined}
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
                const stop = route.stops.find((s) => s.id === kid.busStopId);
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
