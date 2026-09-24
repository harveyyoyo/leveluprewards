'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Mail, MessageSquare, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OfficeLoadingRows } from '@/components/office/OfficeLoadingRows';
import { useToast } from '@/hooks/use-toast';
import { clockLabel } from '@/lib/office/officeTransport';
import { useOfficeTransportDeliveryApi, type OfficeDeliveryEvent } from '@/lib/office/useOfficeTransportDeliveryApi';
import type { OfficeBusRoute } from '@/lib/office/types';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Waiting to send',
  queued: 'Queued for delivery',
  no_recipients: 'No opted-in family contact',
  failed: 'Could not be queued',
  not_configured: 'Arrival messages are off',
};

const SOURCE_LABEL: Record<OfficeDeliveryEvent['source'], string> = {
  gps_device: 'GPS tracker',
  browser: "Driver's phone",
  manual: 'Driver confirmed',
  unknown: 'Bus update',
};

function statusTone(status: string): 'good' | 'warn' | 'bad' | 'plain' {
  if (status === 'queued') return 'good';
  if (status === 'failed') return 'bad';
  if (status === 'pending' || status === 'no_recipients') return 'warn';
  return 'plain';
}

function deliveryText(event: OfficeDeliveryEvent): string {
  const delivery = event.delivery;
  if (!delivery || delivery.total === 0) {
    return event.notificationsQueued > 0 || event.notificationsAlreadyQueued > 0
      ? 'The message is recorded, but its delivery list is not available yet.'
      : 'No delivery list has been created yet.';
  }
  const parts: string[] = [];
  if (delivery.delivered > 0) parts.push(`${delivery.delivered} sent`);
  if (delivery.pending > 0) parts.push(`${delivery.pending} waiting`);
  if (delivery.failed > 0) parts.push(`${delivery.failed} failed`);
  return parts.join(' · ') || 'Waiting for a delivery update.';
}

export function OfficeTransportDeliveryStatus({ schoolId, routes }: { schoolId: string; routes: OfficeBusRoute[] }) {
  const api = useOfficeTransportDeliveryApi(schoolId);
  const { toast } = useToast();
  const [events, setEvents] = useState<OfficeDeliveryEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const routeNameById = useMemo(() => new Map(routes.map((route) => [route.id, route.name])), [routes]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.list();
      setEvents(result.events);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load message delivery records.');
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = async (event: OfficeDeliveryEvent) => {
    setBusyId(event.id);
    try {
      const result = await api.retry(event.id);
      toast({
        title: result.status === 'queued' ? 'Message queue checked' : 'Message queue updated',
        description: result.queued > 0
          ? `${result.queued} new message${result.queued === 1 ? '' : 's'} added.`
          : result.alreadyQueued
            ? 'This message was already in the queue. No second copy was added.'
            : 'There are no opted-in family contacts for this stop yet.',
      });
      await load();
    } catch (cause) {
      toast({ variant: 'destructive', title: 'Could not retry the message', description: cause instanceof Error ? cause.message : 'Try again in a moment.' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4" /> Arrival message delivery</h2>
          <p className="mt-1 text-xs text-muted-foreground">This checks the same message lists used elsewhere in Level Up Rewards. Only bus stop and delivery totals are shown here; child names and contact details stay private.</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => void load()} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} /> Refresh
        </Button>
      </div>

      {error ? <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">{error}</p> : null}
      {isLoading ? <OfficeLoadingRows cols={3} rows={3} /> : !error && events.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-white px-4 py-8 text-center text-sm text-muted-foreground dark:border-slate-800 dark:bg-slate-900">No arrival messages have been created yet.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => {
            const tone = statusTone(event.notificationStatus);
            const canRetry = event.notificationStatus !== 'not_configured';
            return (
              <li key={event.id} className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{event.stopName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.routeId ? routeNameById.get(event.routeId) ?? 'Bus route' : 'Bus route'} · {event.arrivedAt ? clockLabel(event.arrivedAt) : 'Time not recorded'} · {SOURCE_LABEL[event.source]}
                    </p>
                  </div>
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium', tone === 'good' && 'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200', tone === 'warn' && 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200', tone === 'bad' && 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200', tone === 'plain' && 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200')}>
                    {tone === 'good' ? <CheckCircle2 className="h-3.5 w-3.5" /> : tone === 'bad' ? <AlertTriangle className="h-3.5 w-3.5" /> : tone === 'warn' ? <Clock3 className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                    {STATUS_LABEL[event.notificationStatus] ?? 'Delivery status unavailable'}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {event.notificationsQueued > 0 ? `${event.notificationsQueued} message${event.notificationsQueued === 1 ? '' : 's'} queued.` : event.notificationsAlreadyQueued > 0 ? `${event.notificationsAlreadyQueued} already in the queue.` : 'No new message was added.'}
                  </p>
                  <p className={cn('text-xs', (event.delivery?.failed ?? 0) > 0 ? 'font-medium text-red-700 dark:text-red-300' : 'text-muted-foreground')}>
                    Delivery check: {deliveryText(event)}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">No family contact details are shown.</span>
                    {canRetry ? <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-lg" disabled={busyId === event.id} onClick={() => void retry(event)}><RotateCcw className="h-3.5 w-3.5" /> {busyId === event.id ? 'Checking…' : 'Check again'}</Button> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
