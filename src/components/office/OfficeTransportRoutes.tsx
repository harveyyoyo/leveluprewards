'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Building2, MapPin, Plus, Route as RouteIcon, Sparkles, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { useAppContext } from '@/components/AppProvider';
import { useOfficeConfirm } from '@/components/office/useOfficeConfirm';
import { useOfficeEntityNav } from '@/components/office/OfficeEntityNavProvider';
import { OfficeEmptyState } from '@/components/office/OfficeEmptyState';
import { OfficeLoadingRows } from '@/components/office/OfficeLoadingRows';
import { OfficeStudentPicker } from '@/components/office/OfficeStudentPicker';
import { OfficePlaceSearch } from '@/components/office/OfficePlaceSearch';
import { OfficeTransportMap, type TransportMapMarker } from '@/components/office/OfficeTransportMap';
import { useOfficeWrite } from '@/lib/office/useOfficeWrite';
import { saveOfficeSettings } from '@/lib/office/officeSettingsDoc';
import {
  BUS_ROUTE_COLORS,
  exampleRoutes,
  newTransportId,
  ridersForRoute,
  routeLabel,
  routeReadiness,
  type LatLng,
} from '@/lib/office/officeTransport';
import { getOfficeStudentFullName } from '@/lib/office/officeUtils';
import type { OfficeBusRoute, OfficeBusStop, OfficeStudent } from '@/lib/office/types';
import { cn } from '@/lib/utils';
import { isPublicSampleSchoolId } from '@/lib/sampleSchools';

type Props = {
  schoolId: string;
  routes: OfficeBusRoute[];
  students: OfficeStudent[];
  classNameById: Map<string, string>;
  activeRouteIds: Set<string>;
  school: { address?: string | null; lat: number; lng: number } | null;
  center: LatLng;
  isLoading: boolean;
};

/** Routes: one card per bus, with stops and riders inside. */
export function OfficeTransportRoutes({ schoolId, routes, students, classNameById, activeRouteIds, school, center, isLoading }: Props) {
  const write = useOfficeWrite(schoolId);
  const firestore = useFirestore();
  const { userName } = useAppContext();
  const { toast } = useToast();
  const [openId, setOpenId] = useState<string | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingSchool, setEditingSchool] = useState(false);
  const isDemoSchool = isPublicSampleSchoolId(schoolId);

  const saveSchool = async (place: LatLng & { label: string }) => {
    if (!firestore) return;
    try {
      await saveOfficeSettings(firestore, schoolId, { transportSchoolLocation: { address: place.label, lat: place.lat, lng: place.lng } }, userName);
      toast({ title: 'School location saved' });
      setEditingSchool(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save', description: (e as Error).message });
    }
  };

  const addExamples = async () => {
    if (!write.ctx) return;
    setBusy(true);
    try {
      for (const r of exampleRoutes(school ?? center)) await write.upsertOfficeBusRoute(write.ctx, r);
      toast({ title: 'Added 3 example routes', description: 'Rename them, move the stops, or remove them any time.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not add examples', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <OfficeLoadingRows cols={3} rows={3} />;

  const openRoute = openId && openId !== 'new' ? routes.find((r) => r.id === openId) ?? null : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <Building2 className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" aria-hidden />
        {editingSchool || !school ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <p className="text-sm font-medium">Where is your school?</p>
            <OfficePlaceSearch schoolId={schoolId} near={center} onPick={(p) => void saveSchool(p)} placeholder="School address" className="min-w-[220px] flex-1" />
            {school ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingSchool(false)}>
                Cancel
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <p className="min-w-0 flex-1 truncate text-sm">
              <span className="font-medium">School:</span> {school.address || 'Location set'}
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingSchool(true)}>
              Change
            </Button>
          </>
        )}
      </div>

      {routes.length === 0 ? (
        <OfficeEmptyState
          icon={RouteIcon}
          title="Add your first bus route"
          description="A route is one bus: its driver, its stops in order, and the students who ride it."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" className="gap-2 rounded-xl" onClick={() => setOpenId('new')}>
                <Plus className="h-4 w-4" /> Add a route
              </Button>
              {isDemoSchool ? (
                <Button type="button" variant="outline" className="gap-2 rounded-xl" disabled={busy} onClick={() => void addExamples()}>
                  <Sparkles className="h-4 w-4" /> {busy ? 'Adding…' : 'Try with examples'}
                </Button>
              ) : null}
            </div>
          }
        />
      ) : (
        <>
          <div className="flex justify-end">
            <Button type="button" className="gap-2 rounded-xl" onClick={() => setOpenId('new')}>
              <Plus className="h-4 w-4" /> New route
            </Button>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {routes.map((route) => {
              const riders = ridersForRoute(students, route.id).length;
              const pct = route.capacity ? Math.min(100, Math.round((riders / route.capacity) * 100)) : null;
              const readiness = routeReadiness(route);
              return (
                <li key={route.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(route.id)}
                    className="w-full rounded-2xl border bg-white p-4 text-left transition-colors hover:border-teal-600/40 hover:bg-teal-50/30 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-teal-950/20"
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: route.color }} aria-hidden />
                      <span className="truncate font-semibold">{routeLabel(route)}</span>
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {[route.driverName || 'No driver yet', `${route.stops?.length ?? 0} stop${route.stops?.length === 1 ? '' : 's'}`].join(' · ')}
                    </span>
                    {!readiness.ready ? (
                      <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                        Add {readiness.missing.join(' and ')}
                      </span>
                    ) : null}
                    <span className="mt-3 flex items-center justify-between text-xs">
                      <span>
                        {riders} rider{riders === 1 ? '' : 's'}
                        {route.capacity ? ` of ${route.capacity} seats` : ''}
                      </span>
                      {pct !== null && pct >= 100 ? <span className="font-medium text-amber-700 dark:text-amber-400">Full</span> : null}
                    </span>
                    {pct !== null ? (
                      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: route.color }} />
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <OfficeBusRouteSheet
        key={openId ?? 'closed'}
        schoolId={schoolId}
        open={openId !== null}
        route={openRoute}
        routes={routes}
        students={students}
        classNameById={classNameById}
        activeRouteIds={activeRouteIds}
        center={school ?? center}
        onOpenChange={(o) => (!o ? setOpenId(null) : undefined)}
        onCreated={(id) => setOpenId(id)}
      />
    </div>
  );
}

type Draft = Omit<OfficeBusRoute, 'id' | 'updatedAt' | 'updatedBy'>;

function draftFrom(route: OfficeBusRoute | null, used: string[]): Draft {
  if (route) {
    const { id: _id, updatedAt: _u, updatedBy: _b, ...rest } = route;
    return { ...rest, stops: route.stops ?? [] };
  }
  return {
    name: '',
    busNumber: '',
    color: BUS_ROUTE_COLORS.find((c) => !used.includes(c)) ?? BUS_ROUTE_COLORS[0],
    driverName: '',
    driverPhone: '',
    capacity: null,
    stops: [],
    notes: '',
  };
}

function OfficeBusRouteSheet({
  schoolId,
  open,
  route,
  routes,
  students,
  classNameById,
  activeRouteIds,
  center,
  onOpenChange,
  onCreated,
}: {
  schoolId: string;
  open: boolean;
  route: OfficeBusRoute | null;
  routes: OfficeBusRoute[];
  students: OfficeStudent[];
  classNameById: Map<string, string>;
  activeRouteIds: Set<string>;
  center: LatLng;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const write = useOfficeWrite(schoolId);
  const { toast } = useToast();
  const { confirm, confirmDialog } = useOfficeConfirm();
  const { openStudent } = useOfficeEntityNav();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(route, routes.map((r) => r.color)));
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [focusStop, setFocusStop] = useState<string | null>(null);
  const [addStudentId, setAddStudentId] = useState('');
  const locked = !!route && activeRouteIds.has(route.id);

  // A different route opened, or someone else saved this one while it was open and nothing here changed.
  useEffect(() => {
    if (!dirty) setDraft(draftFrom(route, routes.map((r) => r.color)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.updatedAt]);

  const patch = (p: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...p }));
    setDirty(true);
  };
  const setStop = (id: string, p: Partial<OfficeBusStop>) => patch({ stops: draft.stops.map((s) => (s.id === id ? { ...s, ...p } : s)) });
  const addStop = (at: LatLng & { label?: string }) => {
    const stop: OfficeBusStop = {
      id: newTransportId('stop'),
      name: at.label?.split(',')[0] || `Stop ${draft.stops.filter((s) => !s.isSchool).length + 1}`,
      address: at.label ?? null,
      lat: at.lat,
      lng: at.lng,
      amTime: null,
      pmTime: null,
    };
    // New pickup stops go before the school so the morning run still ends there.
    const schoolIdx = draft.stops.findIndex((s) => s.isSchool);
    const stops = [...draft.stops];
    stops.splice(schoolIdx >= 0 ? schoolIdx : stops.length, 0, stop);
    patch({ stops });
    setFocusStop(stop.id);
  };
  const addSchoolStop = () => {
    if (draft.stops.some((s) => s.isSchool)) return;
    patch({ stops: [...draft.stops, { id: newTransportId('stop'), name: 'School', address: null, lat: center.lat, lng: center.lng, amTime: null, pmTime: null, isSchool: true }] });
  };
  const moveStop = (i: number, dir: -1 | 1) => {
    const stops = [...draft.stops];
    const j = i + dir;
    if (j < 0 || j >= stops.length) return;
    [stops[i], stops[j]] = [stops[j], stops[i]];
    patch({ stops });
  };

  const riders = route ? ridersForRoute(students, route.id) : [];
  const assignedStudents = route
    ? students.filter((s) => s.transportMode === 'bus' && s.busRouteId === route.id)
    : [];
  const available = students.filter((s) => !(s.transportMode === 'bus' && s.busRouteId === route?.id));

  const save = async () => {
    if (locked) {
      toast({ variant: 'destructive', title: 'Bus is on the road', description: 'Wait until this run ends before changing the route.' });
      return;
    }
    if (!write.ctx) return;
    if (!draft.name.trim()) {
      toast({ variant: 'destructive', title: 'Give the route a name', description: 'For example North, Route 3, or Hillside.' });
      return;
    }
    setBusy(true);
    try {
      const id = await write.upsertOfficeBusRoute(write.ctx, {
        ...draft,
        id: route?.id,
        expectedUpdatedAt: route?.updatedAt ?? null,
        name: draft.name.trim(),
        busNumber: draft.busNumber?.trim() || null,
        driverName: draft.driverName?.trim() || null,
        driverPhone: draft.driverPhone?.trim() || null,
        notes: draft.notes?.trim() || null,
        capacity: draft.capacity && draft.capacity > 0 ? Math.round(draft.capacity) : null,
      });
      if (route) {
        const removedStopIds = route.stops.filter((oldStop) => !draft.stops.some((newStop) => newStop.id === oldStop.id)).map((oldStop) => oldStop.id);
        const affected = assignedStudents.filter((student) => student.busStopId && removedStopIds.includes(student.busStopId));
        if (affected.length) {
          try {
            await write.setOfficeStudentsTransport(
              write.ctx,
              affected.map((student) => ({
                student,
                studentName: getOfficeStudentFullName(student),
                patch: { transportMode: 'bus', busRouteId: route.id, busStopId: null },
              })),
              (name) => `${name}'s stop was removed from ${routeLabel(route)}`,
            );
          } catch (cleanupError) {
            toast({ variant: 'destructive', title: 'Route saved, but rider stops need attention', description: (cleanupError as Error).message });
          }
        }
      }
      setDirty(false);
      toast({ title: route ? 'Route saved' : 'Route added', description: route ? undefined : 'Now add the students who ride it.' });
      if (!route) onCreated(id);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (locked) {
      toast({ variant: 'destructive', title: 'Bus is on the road', description: 'Wait until this run ends before removing the route.' });
      return;
    }
    if (!route || !write.ctx) return;
    const ok = await confirm({
      title: `Remove ${routeLabel(route)}?`,
      description:
        assignedStudents.length > 0
          ? `${assignedStudents.length} student${assignedStudents.length === 1 ? '' : 's'} ride this bus. They will show as "not set" in Riders. Past trips stay in History.`
          : 'Past trips stay in History.',
      confirmLabel: 'Remove route',
      tone: 'caution',
    });
    if (!ok) return;
    try {
      if (assignedStudents.length) {
        await write.setOfficeStudentsTransport(
          write.ctx,
          assignedStudents.map((s) => ({ student: s, studentName: getOfficeStudentFullName(s), patch: { transportMode: null, busRouteId: null, busStopId: null } })),
          (n) => `${n} taken off ${routeLabel(route)} (route removed)`,
        );
      }
      await write.archiveOfficeBusRoute(write.ctx, route);
      toast({ title: 'Route removed' });
      onOpenChange(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not remove', description: (e as Error).message });
    }
  };

  const setRider = async (student: OfficeStudent, stopId: string | null, removeRider = false) => {
    if (locked) {
      toast({ variant: 'destructive', title: 'Bus is on the road', description: 'Wait until this run ends before changing its riders.' });
      return;
    }
    if (!write.ctx || !route) return;
    try {
      await write.setOfficeStudentsTransport(
        write.ctx,
        [
          {
            student,
            studentName: getOfficeStudentFullName(student),
            patch: removeRider ? { transportMode: null, busRouteId: null, busStopId: null } : { transportMode: 'bus', busRouteId: route.id, busStopId: stopId },
          },
        ],
        (n) =>
          removeRider
            ? `${n} taken off ${routeLabel(route)}`
            : `${n} rides ${routeLabel(route)}${stopId ? ` from ${route.stops.find((s) => s.id === stopId)?.name ?? 'a stop'}` : ''}`,
      );
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save', description: (e as Error).message });
    }
  };

  const removeStop = (stopId: string) => {
    if (locked) {
      toast({ variant: 'destructive', title: 'Bus is on the road', description: 'Wait until this run ends before changing its stops.' });
      return;
    }
    patch({ stops: draft.stops.filter((s) => s.id !== stopId) });
  };

  const markers: TransportMapMarker[] = draft.stops.map((s, i) => ({
    id: s.id,
    kind: s.isSchool ? 'school' : 'stop',
    color: draft.color,
    lat: s.lat,
    lng: s.lng,
    title: `${i + 1}. ${s.name}`,
    active: true,
    selected: focusStop === s.id,
  }));
  const pickupStops = draft.stops.filter((s) => !s.isSchool);
  const fitKey = useMemo(() => `${route?.id ?? 'new'}-${open}`, [route?.id, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {confirmDialog}
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: draft.color }} aria-hidden />
            {route ? routeLabel(route) : 'New route'}
          </SheetTitle>
          <SheetDescription>The bus, its stops in morning order, and who rides it.</SheetDescription>
          {locked ? (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              This bus is on the road right now. Wait until the run ends before changing its route, stops, or riders.
            </p>
          ) : null}
        </SheetHeader>

        <div className="mt-5 space-y-6 pb-20">
          <section className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5 sm:col-span-1">
              <Label htmlFor="route-name">Route name</Label>
              <Input id="route-name" value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. North" className="rounded-xl" />
            </div>
            <div className="col-span-2 space-y-1.5 sm:col-span-1">
              <Label htmlFor="route-bus">Bus number</Label>
              <Input id="route-bus" value={draft.busNumber ?? ''} onChange={(e) => patch({ busNumber: e.target.value })} placeholder="e.g. 4" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="route-driver">Driver</Label>
              <Input id="route-driver" value={draft.driverName ?? ''} onChange={(e) => patch({ driverName: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="route-phone">Driver phone</Label>
              <Input id="route-phone" type="tel" value={draft.driverPhone ?? ''} onChange={(e) => patch({ driverPhone: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="route-seats">Seats</Label>
              <Input
                id="route-seats"
                type="number"
                min={1}
                value={draft.capacity ?? ''}
                onChange={(e) => patch({ capacity: e.target.value ? Number(e.target.value) : null })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-1.5 pt-1" role="radiogroup" aria-label="Route color">
                {BUS_ROUTE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={draft.color === c}
                    aria-label={`Color ${c}`}
                    onClick={() => patch({ color: c })}
                    className={cn('h-6 w-6 rounded-full border-2', draft.color === c ? 'border-slate-900 dark:border-white' : 'border-transparent')}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Stops ({draft.stops.length})</h3>
              {!draft.stops.some((s) => s.isSchool) ? (
                <button type="button" onClick={addSchoolStop} className="text-xs font-medium text-teal-800 hover:underline dark:text-teal-300">
                  + Add the school as the last stop
                </button>
              ) : null}
            </div>
            <OfficePlaceSearch schoolId={schoolId} near={center} onPick={(p) => addStop(p)} placeholder="Add a stop: type an address…" />
            <OfficeTransportMap
              markers={markers}
              lines={[{ id: 'route', color: draft.color, points: draft.stops }]}
              fitPoints={draft.stops.length ? draft.stops : [center]}
              fitKey={fitKey}
              initialCenter={center}
              onMapClick={(p) => addStop(p)}
              onMarkerClick={(id) => setFocusStop(id)}
              className="h-56"
            />
            <p className="text-xs text-muted-foreground">Tap the map to drop a stop. List them in morning order; the afternoon run goes in reverse.</p>
            {draft.stops.length > 0 ? (
              <ol className="space-y-2">
                {draft.stops.map((s, i) => (
                  <li
                    key={s.id}
                    className={cn(
                      'rounded-xl border p-2.5 dark:border-slate-800',
                      focusStop === s.id && 'border-teal-600/50 bg-teal-50/40 dark:bg-teal-950/20',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{ backgroundColor: draft.color }}
                      >
                        {s.isSchool ? <Building2 className="h-3 w-3" /> : i + 1}
                      </span>
                      <Input
                        value={s.name}
                        onChange={(e) => setStop(s.id, { name: e.target.value })}
                        onFocus={() => setFocusStop(s.id)}
                        aria-label={`Stop ${i + 1} name`}
                        className="h-8 flex-1 rounded-lg"
                      />
                      <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => moveStop(i, -1)} className="rounded p-1 text-muted-foreground hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        disabled={i === draft.stops.length - 1}
                        onClick={() => moveStop(i, 1)}
                        className="rounded p-1 text-muted-foreground hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${s.name}`}
                        onClick={() => removeStop(s.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-8 text-xs text-muted-foreground">
                      <label className="flex items-center gap-1.5">
                        Morning
                        <Input type="time" value={s.amTime ?? ''} onChange={(e) => setStop(s.id, { amTime: e.target.value || null })} className="h-7 w-28 rounded-lg text-xs" />
                      </label>
                      <label className="flex items-center gap-1.5">
                        Afternoon
                        <Input type="time" value={s.pmTime ?? ''} onChange={(e) => setStop(s.id, { pmTime: e.target.value || null })} className="h-7 w-28 rounded-lg text-xs" />
                      </label>
                      {s.address ? (
                        <span className="flex min-w-0 items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" /> {s.address}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Riders ({riders.length}
              {draft.capacity ? ` of ${draft.capacity}` : ''})
            </h3>
            {!route ? (
              <p className="text-sm text-muted-foreground">Save the route first, then add the students who ride it.</p>
            ) : (
              <>
                {riders.length > 0 ? (
                  <ul className="space-y-1.5">
                    {riders.map((kid) => (
                      <li key={kid.id} className="flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm dark:border-slate-800">
                        <button type="button" className="min-w-0 flex-1 truncate text-left font-medium hover:text-teal-800 dark:hover:text-teal-300" onClick={() => openStudent(kid.id)}>
                          {getOfficeStudentFullName(kid)}
                        </button>
                        <Select value={kid.busStopId ?? ''} onValueChange={(v) => void setRider(kid, v)}>
                          <SelectTrigger className="h-8 w-40 rounded-lg text-xs" aria-label={`Stop for ${getOfficeStudentFullName(kid)}`}>
                            <SelectValue placeholder="Pick a stop" />
                          </SelectTrigger>
                          <SelectContent>
                            {route.stops
                              .filter((s) => !s.isSchool)
                              .map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <button
                          type="button"
                          aria-label={`Take ${getOfficeStudentFullName(kid)} off this route`}
                          onClick={() => void setRider(kid, null, true)}
                          className="rounded-full p-1 text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <OfficeStudentPicker students={available} classNameById={classNameById} value={addStudentId} onChange={setAddStudentId} />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    disabled={!addStudentId}
                    onClick={() => {
                      const kid = students.find((s) => s.id === addStudentId);
                      if (kid) void setRider(kid, pickupStops.length === 1 ? pickupStops[0].id : null);
                      setAddStudentId('');
                    }}
                  >
                    Add rider
                  </Button>
                </div>
              </>
            )}
          </section>

          <section className="space-y-1.5">
            <Label htmlFor="route-notes">Notes</Label>
            <Textarea
              id="route-notes"
              value={draft.notes ?? ''}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder="Anything drivers or the office should know"
              className="min-h-[70px] rounded-xl"
            />
          </section>

          {route ? (
            <button type="button" disabled={locked} onClick={() => void remove()} className="flex items-center gap-1.5 text-sm text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400">
              <Trash2 className="h-3.5 w-3.5" /> Remove this route
            </button>
          ) : null}
        </div>

        <div className="sticky bottom-0 -mx-6 flex justify-end gap-2 border-t bg-background px-6 py-3">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            {dirty ? 'Cancel' : 'Close'}
          </Button>
          <Button type="button" className="rounded-xl" disabled={locked || busy || (!dirty && !!route)} onClick={() => void save()}>
            {busy ? 'Saving…' : route ? 'Save changes' : 'Add route'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
