'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useOfficeEntityNav } from '@/components/office/OfficeEntityNavProvider';
import { OfficeLoadingRows } from '@/components/office/OfficeLoadingRows';
import { useOfficeWrite } from '@/lib/office/useOfficeWrite';
import { TRANSPORT_MODE_LABEL, routeLabel } from '@/lib/office/officeTransport';
import { getOfficeStudentFullName } from '@/lib/office/officeUtils';
import type { OfficeBusRoute, OfficeFamily, OfficeStudent, OfficeTransportMode } from '@/lib/office/types';
import { cn } from '@/lib/utils';

type Filter = 'all' | OfficeTransportMode | 'unset';
const NOT_SET = '__unset__';
const PAGE = 60;

type Props = {
  schoolId: string;
  routes: OfficeBusRoute[];
  students: OfficeStudent[];
  classNameById: Map<string, string>;
  familyById: Map<string, OfficeFamily>;
  activeRouteIds: Set<string>;
  isLoading: boolean;
};

/** Riders: one line per student — bus (which route and stop), car pickup, walks, or after care. */
export function OfficeTransportRiders({ schoolId, routes, students, classNameById, familyById, activeRouteIds, isLoading }: Props) {
  const write = useOfficeWrite(schoolId);
  const { toast } = useToast();
  const { openStudent } = useOfficeEntityNav();
  const [filter, setFilter] = useState<Filter>('all');
  const [routeFilter, setRouteFilter] = useState<string>('all');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const routeById = useMemo(() => new Map(routes.map((r) => [r.id, r])), [routes]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: students.length, bus: 0, car: 0, walk: 0, aftercare: 0, unset: 0 };
    for (const s of students) c[s.transportMode ?? 'unset'] += 1;
    return c;
  }, [students]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return students
      .filter((s) => filter === 'all' || (s.transportMode ?? 'unset') === filter)
      .filter((s) => routeFilter === 'all' || (s.transportMode === 'bus' && s.busRouteId === routeFilter))
      .filter((s) => {
        if (!needle) return true;
        const cls = (s.classId && classNameById.get(s.classId)) || '';
        const route = s.busRouteId ? routeById.get(s.busRouteId)?.name ?? '' : '';
        return `${getOfficeStudentFullName(s)} ${cls} ${route}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  }, [students, filter, routeFilter, q, classNameById, routeById]);

  const save = async (s: OfficeStudent, patch: Pick<OfficeStudent, 'transportMode' | 'busRouteId' | 'busStopId'>) => {
    const currentRouteIsActive = !!s.busRouteId && activeRouteIds.has(s.busRouteId);
    const nextRouteIsActive = !!patch.busRouteId && activeRouteIds.has(patch.busRouteId);
    if (currentRouteIsActive || nextRouteIsActive) {
      toast({ variant: 'destructive', title: 'Bus is on the road', description: 'Wait until this run ends before changing a rider.' });
      return;
    }
    if (!write.ctx) return;
    const name = getOfficeStudentFullName(s);
    const route = patch.busRouteId ? routeById.get(patch.busRouteId) : undefined;
    const stop = route?.stops.find((x) => x.id === patch.busStopId);
    try {
      await write.setOfficeStudentsTransport(write.ctx, [{ student: s, studentName: name, patch }], (n) =>
        !patch.transportMode
          ? `${n}: how they get home cleared`
          : patch.transportMode === 'bus'
            ? `${n} rides ${route ? routeLabel(route) : 'the bus'}${stop ? ` from ${stop.name}` : ''}`
            : `${n} gets home by ${TRANSPORT_MODE_LABEL[patch.transportMode].toLowerCase()}`,
      );
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save', description: (e as Error).message });
    }
  };

  if (isLoading) return <OfficeLoadingRows cols={4} rows={6} />;

  const chips: Array<[Filter, string]> = [
    ['all', 'Everyone'],
    ['bus', 'Bus'],
    ['car', 'Car pickup'],
    ['walk', 'Walks'],
    ['aftercare', 'After care'],
    ['unset', 'Not set'],
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a student, class, or route" className="h-10 rounded-xl pl-9" />
        </div>
        {routes.length > 0 ? (
          <Select value={routeFilter} onValueChange={setRouteFilter}>
            <SelectTrigger className="h-10 w-48 rounded-xl" aria-label="Route">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All routes</SelectItem>
              {routes.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {routeLabel(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show">
        {chips.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => {
              setFilter(id);
              setLimit(PAGE);
            }}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium',
              filter === id
                ? 'border-teal-700 bg-teal-700 text-white'
                : id === 'unset' && counts.unset > 0
                  ? 'border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
            )}
          >
            {label} ({counts[id]})
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-white px-4 py-8 text-center text-sm text-muted-foreground dark:border-slate-800 dark:bg-slate-900">
          No students match.
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {rows.slice(0, limit).map((s) => {
            const route = s.busRouteId ? routeById.get(s.busRouteId) : undefined;
            const family = s.familyId ? familyById.get(s.familyId) : undefined;
            const stopExists = !!route?.stops?.some((stop) => stop.id === s.busStopId && !stop.isSchool);
            const isLocked = !!s.busRouteId && activeRouteIds.has(s.busRouteId);
            const oldRoute = !s.transportMode ? s.busRoute?.trim() || family?.busRoute?.trim() : null;
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <div className="min-w-[160px] flex-1">
                  <button type="button" className="text-sm font-medium hover:text-teal-800 dark:hover:text-teal-300" onClick={() => openStudent(s.id)}>
                    {getOfficeStudentFullName(s)}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {(s.classId && classNameById.get(s.classId)) || 'No class'}
                    {oldRoute ? ` · family note: ${oldRoute}` : ''}
                  </p>
                </div>
                <Select
                  value={s.transportMode ?? NOT_SET}
                  onValueChange={(v) => {
                    if (v === NOT_SET) void save(s, { transportMode: null, busRouteId: null, busStopId: null });
                    else if (v === 'bus') void save(s, { transportMode: 'bus', busRouteId: s.busRouteId ?? (routes.length === 1 ? routes[0].id : null), busStopId: s.busStopId ?? null });
                    else void save(s, { transportMode: v as OfficeTransportMode, busRouteId: null, busStopId: null });
                  }}
                >
                  <SelectTrigger
                    disabled={isLocked}
                    className={cn('h-9 w-36 rounded-lg text-xs', !s.transportMode && 'border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-300')}
                    aria-label={`How ${getOfficeStudentFullName(s)} gets home`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NOT_SET}>Not set</SelectItem>
                    {(Object.keys(TRANSPORT_MODE_LABEL) as OfficeTransportMode[]).map((m) => (
                      <SelectItem key={m} value={m}>
                        {TRANSPORT_MODE_LABEL[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {s.transportMode === 'bus' ? (
                  <>
                    <Select value={s.busRouteId ?? ''} onValueChange={(v) => void save(s, { transportMode: 'bus', busRouteId: v, busStopId: null })}>
                      <SelectTrigger disabled={isLocked} className="h-9 w-40 rounded-lg text-xs" aria-label="Route">
                        <SelectValue placeholder="Pick a route" />
                      </SelectTrigger>
                      <SelectContent>
                        {routes.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {routeLabel(r)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={s.busStopId ?? ''}
                      disabled={!route}
                      onValueChange={(v) => void save(s, { transportMode: 'bus', busRouteId: s.busRouteId ?? null, busStopId: v })}
                    >
                      <SelectTrigger disabled={isLocked || !route} className="h-9 w-40 rounded-lg text-xs" aria-label="Stop">
                        <SelectValue placeholder={route ? 'Pick a stop' : 'Route first'} />
                      </SelectTrigger>
                      <SelectContent>
                        {(route?.stops ?? [])
                          .filter((x) => !x.isSchool)
                          .map((x) => (
                            <SelectItem key={x.id} value={x.id}>
                              {x.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {isLocked ? (
                      <span className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> On the road
                      </span>
                    ) : !route || !s.busStopId || !stopExists ? (
                      <AlertTriangle className="h-4 w-4 text-amber-600" aria-label="Route or stop missing" />
                    ) : null}
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {rows.length > limit ? (
        <button type="button" onClick={() => setLimit(limit + PAGE)} className="w-full rounded-xl border py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">
          Show more ({rows.length - limit} left)
        </button>
      ) : null}
    </div>
  );
}
