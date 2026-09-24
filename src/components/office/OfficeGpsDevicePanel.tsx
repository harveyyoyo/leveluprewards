'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthFetch } from '@/lib/authFetch';
import { routeLabel } from '@/lib/office/officeTransport';
import type { OfficeBusGpsDevice, OfficeBusRoute } from '@/lib/office/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Props = {
  schoolId: string;
  routes: OfficeBusRoute[];
  isLoading?: boolean;
};

type PairingResponse = { device?: OfficeBusGpsDevice; deviceKey?: string; error?: string };
type DevicesResponse = { devices?: OfficeBusGpsDevice[]; error?: string };

function lastSeenLabel(lastSeenAt: number | null | undefined): string {
  if (!lastSeenAt) return 'No update yet';
  const age = Date.now() - lastSeenAt;
  if (age >= 0 && age < 2 * 60_000) return 'Reporting now';
  return `Last update ${new Date(lastSeenAt).toLocaleString()}`;
}

export function OfficeGpsDevicePanel({ schoolId, routes, isLoading: parentLoading = false }: Props) {
  const authFetch = useAuthFetch();
  const { toast } = useToast();
  const [devices, setDevices] = useState<OfficeBusGpsDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [routeId, setRouteId] = useState(routes[0]?.id ?? '');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pairing, setPairing] = useState<{ device: OfficeBusGpsDevice; deviceKey: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(`/api/office/transport/devices?schoolId=${encodeURIComponent(schoolId)}`);
      const data = (await response.json().catch(() => ({}))) as DevicesResponse;
      if (!response.ok) throw new Error(data.error || 'Could not load GPS trackers.');
      setDevices(Array.isArray(data.devices) ? data.devices : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load GPS trackers.');
    } finally {
      setLoading(false);
    }
  }, [authFetch, schoolId]);

  useEffect(() => {
    setRouteId((current) => current || routes[0]?.id || '');
  }, [routes]);

  useEffect(() => {
    void load();
  }, [load]);

  const post = async (body: Record<string, unknown>): Promise<PairingResponse> => {
    const response = await authFetch('/api/office/transport/devices', {
      method: 'POST',
      body: JSON.stringify({ schoolId, ...body }),
    });
    const data = (await response.json().catch(() => ({}))) as PairingResponse;
    if (!response.ok) throw new Error(data.error || 'Could not update the GPS tracker.');
    return data;
  };

  const enroll = async () => {
    if (!label.trim() || !routeId) return;
    setBusyId('new');
    try {
      const result = await post({ action: 'enroll', label: label.trim(), routeId });
      if (!result.device || !result.deviceKey) throw new Error('The tracker was created without a pairing key.');
      setPairing({ device: result.device, deviceKey: result.deviceKey });
      setLabel('');
      setFormOpen(false);
      await load();
      toast({ title: 'GPS tracker paired', description: 'Copy the one-time key into the tracker setup.' });
    } catch (cause) {
      toast({ variant: 'destructive', title: 'Could not pair the tracker', description: cause instanceof Error ? cause.message : undefined });
    } finally {
      setBusyId(null);
    }
  };

  const rotate = async (device: OfficeBusGpsDevice) => {
    if (!window.confirm(`Replace the private key for ${device.label}? The old key will stop working.`)) return;
    setBusyId(device.id);
    try {
      const result = await post({ action: 'rotate', deviceId: device.id });
      if (result.device && result.deviceKey) setPairing({ device: result.device, deviceKey: result.deviceKey });
      await load();
      toast({ title: 'New tracker key created', description: 'Copy the new one-time key into the device.' });
    } catch (cause) {
      toast({ variant: 'destructive', title: 'Could not rotate the tracker key', description: cause instanceof Error ? cause.message : undefined });
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (device: OfficeBusGpsDevice) => {
    if (!window.confirm(`Revoke ${device.label}? Its location updates will stop.`)) return;
    setBusyId(device.id);
    try {
      await post({ action: 'revoke', deviceId: device.id });
      await load();
      toast({ title: 'GPS tracker revoked' });
    } catch (cause) {
      toast({ variant: 'destructive', title: 'Could not revoke the tracker', description: cause instanceof Error ? cause.message : undefined });
    } finally {
      setBusyId(null);
    }
  };

  const assign = async (device: OfficeBusGpsDevice, nextRouteId: string) => {
    setBusyId(device.id);
    try {
      await post({ action: 'assign', deviceId: device.id, routeId: nextRouteId === 'none' ? null : nextRouteId });
      await load();
    } catch (cause) {
      toast({ variant: 'destructive', title: 'Could not change the tracker route', description: cause instanceof Error ? cause.message : undefined });
    } finally {
      setBusyId(null);
    }
  };

  const copyPairingKey = async () => {
    if (!pairing) return;
    try {
      await navigator.clipboard.writeText(pairing.deviceKey);
      toast({ title: 'Pairing key copied' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy the pairing key' });
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="gps-device-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
            <ShieldCheck className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <h2 id="gps-device-title" className="font-semibold">Bus GPS trackers</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pair one private tracker to each bus. The office can see its last update; the tracker key is shown only once.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" className="gap-1.5 rounded-lg" onClick={() => void load()} disabled={loading || parentLoading} aria-label="Refresh GPS trackers">
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
          </Button>
          <Button type="button" size="sm" className="gap-1.5 rounded-lg" onClick={() => setFormOpen((open) => !open)} disabled={routes.length === 0}>
            <Plus className="h-3.5 w-3.5" /> Pair tracker
          </Button>
        </div>
      </div>

      {formOpen ? (
        <div className="grid gap-3 rounded-xl border bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end dark:border-slate-800 dark:bg-slate-800/50">
          <div className="space-y-1.5">
            <Label htmlFor="gps-device-label">Tracker name</Label>
            <Input id="gps-device-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Bus 4 tracker" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gps-device-route">Assign to route</Label>
            <Select value={routeId} onValueChange={setRouteId}>
              <SelectTrigger id="gps-device-route" className="rounded-lg"><SelectValue placeholder="Choose a route" /></SelectTrigger>
              <SelectContent>
                {routes.map((route) => <SelectItem key={route.id} value={route.id}>{routeLabel(route)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" className="rounded-lg" onClick={() => void enroll()} disabled={!label.trim() || !routeId || busyId === 'new'}>
            {busyId === 'new' ? 'Pairing…' : 'Pair tracker'}
          </Button>
        </div>
      ) : null}

      {pairing ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          <p className="font-semibold">Copy this key now for {pairing.device.label}</p>
          <p className="mt-1 break-all font-mono text-xs">{pairing.deviceKey}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => void copyPairingKey()}><Copy className="h-3.5 w-3.5" /> Copy key</Button>
            <Button type="button" size="sm" variant="ghost" className="rounded-lg" onClick={() => setPairing(null)}>Hide key</Button>
          </div>
          <p className="mt-2 text-xs">For safety, the app will not show this key again.</p>
        </div>
      ) : null}

      {error ? <p role="alert" className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">{error}</p> : null}
      {devices.length === 0 && !loading && !error ? <p className="text-sm text-muted-foreground">No GPS trackers are paired yet.</p> : null}
      {devices.length > 0 ? (
        <ul className="space-y-2">
          {devices.map((device) => {
            const assigned = routes.find((route) => route.id === device.assignedRouteId);
            const busy = busyId === device.id;
            return (
              <li key={device.id} className="flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 text-sm dark:border-slate-800">
                <div className="min-w-[180px] flex-1">
                  <p className="font-medium">{device.label}</p>
                  <p className="text-xs text-muted-foreground">{device.status === 'revoked' ? 'Revoked' : lastSeenLabel(device.lastSeenAt)} · {assigned ? routeLabel(assigned) : 'Not assigned'}</p>
                </div>
                {device.status === 'active' ? (
                  <Select value={device.assignedRouteId ?? 'none'} onValueChange={(value) => void assign(device, value)} disabled={busy}>
                    <SelectTrigger className="h-9 w-48 rounded-lg text-xs" aria-label={`Route for ${device.label}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not assigned</SelectItem>
                      {routes.map((route) => <SelectItem key={route.id} value={route.id}>{routeLabel(route)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : null}
                {device.status === 'active' ? <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-lg" disabled={busy} onClick={() => void rotate(device)}><KeyRound className="h-3.5 w-3.5" /> Rotate key</Button> : null}
                {device.status === 'active' ? <Button type="button" variant="ghost" size="sm" className="gap-1.5 rounded-lg text-red-700 disabled:opacity-50 dark:text-red-400" disabled={busy} onClick={() => void revoke(device)}><Trash2 className="h-3.5 w-3.5" /> Revoke</Button> : null}
                {device.status === 'active' && device.lastSeenAt ? <Check className="h-4 w-4 text-teal-700" aria-label="Tracker has checked in" /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
