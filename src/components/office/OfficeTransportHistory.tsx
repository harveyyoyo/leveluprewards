'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Download, Printer, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OfficeLoadingRows } from '@/components/office/OfficeLoadingRows';
import { useToast } from '@/hooks/use-toast';
import { useOfficeBusTripsForDate } from '@/lib/office/useOfficeTransport';
import { downloadCsv } from '@/lib/office/officeUtils';
import {
  BUS_ALERT_LABEL,
  BUS_RELEASE_METHOD_LABEL,
  BUS_RUN_LABEL,
  clockLabel,
  localIsoDate,
  orderedStops,
  routeForTrip,
  riderNameForTrip,
  routeLabel,
  transportDaySummary,
  transportDaySummaryText,
  vehicleLabel,
} from '@/lib/office/officeTransport';
import type { OfficeBusEvent, OfficeBusRoute, OfficeBusTrip } from '@/lib/office/types';
import { cn } from '@/lib/utils';

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localIsoDate(d);
}

/** History: every run on a chosen day — when it started and ended, stops, riders, and problems. */
export function OfficeTransportHistory({
  schoolId,
  routes,
  studentNameById,
}: {
  schoolId: string;
  routes: OfficeBusRoute[];
  studentNameById: Map<string, string>;
}) {
  const today = localIsoDate();
  const [date, setDate] = useState(today);
  const [openId, setOpenId] = useState<string | null>(null);
  const { trips, isLoading, error } = useOfficeBusTripsForDate(schoolId, date);
  const summary = useMemo(() => transportDaySummary(trips, routes), [trips, routes]);
  const { toast } = useToast();
  // Removed routes are still named here so old trips stay readable.
  const routeById = new Map(routes.map((r) => [r.id, r]));

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(transportDaySummaryText(date, summary));
      toast({ title: 'Summary copied', description: 'The day’s transportation numbers are ready to paste.' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy the summary' });
    }
  };

  const downloadDayCsv = () => {
    const rows = trips.map((trip) => {
      const route = routeForTrip(routeById.get(trip.routeId), trip);
      const minutes = trip.endedAt ? Math.round((trip.endedAt - trip.startedAt) / 60_000) : '';
      return [
        date,
        BUS_RUN_LABEL[trip.run],
        route ? routeLabel(route) : 'Removed route',
        route?.busNumber ?? '',
        trip.driverName ?? route?.driverName ?? '',
        trip.status === 'done' ? 'Finished' : 'On the road',
        clockLabel(trip.startedAt),
        trip.endedAt ? clockLabel(trip.endedAt) : '',
        String(minutes),
        String(Object.values(trip.riders ?? {}).filter((rider) => rider.status !== 'absent').length),
        String((trip.alerts ?? []).length),
        String(Object.keys(trip.stopArrivals ?? {}).length),
        trip.childCheckDone === true ? 'Yes' : 'No',
      ];
    });
    downloadCsv(
      `transportation-${date}.csv`,
      ['Date', 'Run', 'Route', 'Bus number', 'Driver', 'Status', 'Started', 'Ended', 'Minutes', 'Riders', 'Driver reports', 'Stops reached', 'Bus checked'],
      rows,
    );
    toast({ title: 'CSV downloaded', description: 'The selected day’s trip records are ready to open in a spreadsheet.' });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-lg" aria-label="Previous day" onClick={() => setDate(shiftDate(date, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-9 w-40 rounded-lg" aria-label="Day" />
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-lg" aria-label="Next day" disabled={date >= today} onClick={() => setDate(shiftDate(date, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {date !== today ? (
          <button type="button" className="ml-1 text-xs font-medium text-teal-800 hover:underline dark:text-teal-300" onClick={() => setDate(today)}>
            Today
          </button>
        ) : null}
      </div>

      {!isLoading && !error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <SummaryMetric label="Runs" value={summary.totalRuns} />
            <SummaryMetric label="Finished" value={summary.completedRuns} />
            <SummaryMetric label="Rider rides" value={summary.riderRides} />
            <SummaryMetric label="Driver reports" value={summary.alertCount} />
            <SummaryMetric label="Average minutes" value={summary.averageMinutes ?? '—'} />
            {summary.lateRuns ? <SummaryMetric label="Running late" value={summary.lateRuns} tone="warn" /> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => void copySummary()}>
              <Copy className="h-4 w-4" /> Copy summary
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-2 rounded-xl" onClick={downloadDayCsv}>
              <Download className="h-4 w-4" /> Download CSV
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-8 text-center text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          Past bus runs could not be loaded right now. Try again in a moment.
        </p>
      ) : isLoading ? (
        <OfficeLoadingRows cols={3} rows={3} />
      ) : trips.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-white px-4 py-8 text-center text-sm text-muted-foreground dark:border-slate-800 dark:bg-slate-900">
          No bus runs {date === today ? 'today' : 'on this day'}.
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {trips.map((trip) => (
            <TripRow
              key={trip.id}
              trip={trip}
              route={routeForTrip(routeById.get(trip.routeId), trip)}
              open={openId === trip.id}
              onToggle={() => setOpenId(openId === trip.id ? null : trip.id)}
              studentNameById={studentNameById}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SummaryMetric({ label, value, tone = 'plain' }: { label: string; value: number | string; tone?: 'plain' | 'warn' }) {
  return (
    <div>
      <p className={cn('text-lg font-semibold tabular-nums', tone === 'warn' && 'text-amber-700 dark:text-amber-400')}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function TripRow({
  trip,
  route,
  open,
  onToggle,
  studentNameById,
}: {
  trip: OfficeBusTrip;
  route: OfficeBusRoute | undefined;
  open: boolean;
  onToggle: () => void;
  studentNameById: Map<string, string>;
}) {
  const riders = Object.entries(trip.riders ?? {});
  const riderEvents = (trip.events ?? []).filter(
    (event): event is Extract<OfficeBusEvent, { kind: 'rider' }> => event.kind === 'rider',
  );
  const releaseEvents = (trip.events ?? []).filter(
    (event): event is Extract<OfficeBusEvent, { kind: 'release' }> => event.kind === 'release',
  );
  const rode = riders.filter(([, r]) => r.status !== 'absent').length;
  const leftOn = riders.filter(([, r]) => r.status === 'on');
  const alerts = trip.alerts ?? [];
  const minutes = trip.endedAt ? Math.round((trip.endedAt - trip.startedAt) / 60_000) : null;
  const stops = route ? orderedStops(route, trip.run) : [];
  const vehicle = vehicleLabel(route?.vehicle);

  return (
    <li>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60">
        <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: route?.color ?? '#94a3b8' }} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{route ? routeLabel(route) : 'Removed route'}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {BUS_RUN_LABEL[trip.run]}
            </span>
            {trip.status === 'active' ? (
              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800 dark:bg-teal-950/50 dark:text-teal-200">On the road</span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {[
              `${clockLabel(trip.startedAt)}${trip.endedAt ? ` – ${clockLabel(trip.endedAt)}` : ''}`,
              minutes !== null ? `${minutes} min` : null,
              `${rode} rode`,
              trip.driverName ? `Driver ${trip.driverName}` : null,
              vehicle,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
          <span className="mt-1 flex flex-wrap gap-1.5">
            {leftOn.length && trip.status === 'done' ? (
              <Flag tone="danger">{leftOn.length} never marked off</Flag>
            ) : null}
            {alerts.length ? <Flag tone="caution">{alerts.length} report{alerts.length === 1 ? '' : 's'} from driver</Flag> : null}
            {trip.status === 'done' ? (
              trip.childCheckDone ? (
                <Flag tone="good">
                  <ShieldCheck className="h-3 w-3" /> Bus checked
                </Flag>
              ) : (
                <Flag tone="caution">Bus check not confirmed</Flag>
              )
            ) : null}
          </span>
        </span>
        <ChevronDown className={cn('mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div className="grid gap-4 border-t bg-slate-50/60 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/60 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Stops</p>
            <ul className="mt-1.5 space-y-1">
              {stops.map((s) => {
                const at = trip.stopArrivals?.[s.id];
                return (
                  <li key={s.id} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      {at ? <Check className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" /> : <span className="h-3.5 w-3.5" />}
                      {s.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{at ? clockLabel(at) : 'Not reached'}</span>
                  </li>
                );
              })}
            </ul>
            {alerts.length ? (
              <>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">From the driver</p>
                <ul className="mt-1.5 space-y-1">
                  {alerts.map((a) => (
                    <li key={a.id}>
                      <span className="font-medium">{BUS_ALERT_LABEL[a.kind]}</span>
                      {a.minutes ? ` · ${a.minutes} min` : ''}
                      {a.message ? ` — ${a.message}` : ''} <span className="text-xs text-muted-foreground">{clockLabel(a.at)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Riders</p>
            {riders.length === 0 ? (
              <p className="mt-1.5 text-muted-foreground">Nobody was marked on this run.</p>
            ) : (
              <ul className="mt-1.5 space-y-1">
                {riders
                  .sort((a, b) => riderNameForTrip(trip, a[0], studentNameById).localeCompare(riderNameForTrip(trip, b[0], studentNameById)))
                  .map(([id, r]) => (
                    <li key={id} className="flex items-center justify-between gap-2">
                      <span className={cn(r.status === 'on' && trip.status === 'done' && 'font-medium text-red-700 dark:text-red-400')}>
                        {r.status === 'on' && trip.status === 'done' ? <AlertTriangle className="mr-1 inline h-3 w-3" /> : null}
                        {riderNameForTrip(trip, id, studentNameById)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {r.status === 'on' ? 'Got on' : r.status === 'off' ? 'Got off' : 'Not riding'} · {clockLabel(r.at)}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
            {riderEvents.length > 0 ? (
              <div className="mt-4 border-t pt-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Recorded rider changes</p>
                <ul className="mt-1.5 space-y-1">
                  {riderEvents.map((event, index) => (
                    <li key={`${event.studentId}-${event.at}-${index}`} className="flex items-center justify-between gap-2 text-xs">
                      <span>{riderNameForTrip(trip, event.studentId, studentNameById)}</span>
                      <span className="text-muted-foreground">
                        {event.status === 'on' ? 'Got on' : event.status === 'off' ? 'Got off' : event.status === 'absent' ? 'Not riding' : 'Mark cleared'} · {clockLabel(event.at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {releaseEvents.length > 0 ? (
              <div className="mt-4 border-t pt-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Release confirmations</p>
                <ul className="mt-1.5 space-y-1">
                  {releaseEvents.map((event, index) => (
                    <li key={`${event.studentId}-${event.at}-${index}`} className="flex items-center justify-between gap-2 text-xs">
                      <span>{riderNameForTrip(trip, event.studentId, studentNameById)}</span>
                      <span className="text-muted-foreground">
                        {BUS_RELEASE_METHOD_LABEL[event.method]} · {event.contactName} · {clockLabel(event.at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}

function Flag({ tone, children }: { tone: 'good' | 'caution' | 'danger'; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        tone === 'good' && 'bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200',
        tone === 'caution' && 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
        tone === 'danger' && 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200',
      )}
    >
      {children}
    </span>
  );
}
