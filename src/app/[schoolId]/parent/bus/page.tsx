'use client';

import { useCallback, useEffect, useState } from 'react';
import { BusFront, Clock3, Loader2, LogOut, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  fetchTransportParentStatus,
  signInTransportParent,
  signOutTransportParent,
  updateTransportParentPreferences,
  type TransportParentArrivalPreferences,
  type TransportParentStatus,
} from '@/lib/parentPortal/transportParentClient';
import { cn } from '@/lib/utils';

function timeLabel(value: number | null): string {
  if (!value) return 'No recent update';
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function TransportParentPage() {
  const params = useParams<{ schoolId: string }>();
  const schoolId = (params.schoolId || '').trim().toLowerCase();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<TransportParentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<TransportParentArrivalPreferences>({ email: false, sms: false, whatsapp: false, updatedAt: 0 });
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesSaved, setPreferencesSaved] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!schoolId) return;
    try {
      setStatus(await fetchTransportParentStatus(schoolId));
      setError(null);
    } catch (cause) {
      setStatus(null);
      setError(cause instanceof Error ? cause.message : 'Private bus status is temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!status) return;
    const timer = window.setInterval(() => void loadStatus(), 30_000);
    return () => window.clearInterval(timer);
  }, [loadStatus, status]);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return;
    setSigningIn(true);
    setError(null);
    try {
      await signInTransportParent(schoolId, code);
      setCode('');
      await loadStatus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That bus access code could not be used.');
    } finally {
      setSigningIn(false);
    }
  };

  useEffect(() => {
    if (status?.arrivalPreferences) setPreferences(status.arrivalPreferences);
  }, [status]);

  const savePreferences = async () => {
    setSavingPreferences(true);
    setPreferencesSaved(false);
    setError(null);
    try {
      const result = await updateTransportParentPreferences(schoolId, {
        email: preferences.email,
        sms: preferences.sms,
        whatsapp: preferences.whatsapp,
      });
      setPreferences(result.arrivalPreferences);
      setPreferencesSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save bus message choices.');
    } finally {
      setSavingPreferences(false);
    }
  };

  const signOut = async () => {
    setSigningOut(true);
    try {
      await signOutTransportParent();
      setStatus(null);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign out.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <header className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200">
            <BusFront className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black">Family bus status</h1>
            <p className="mt-1 text-sm text-muted-foreground">A private view of the bus assigned to your family.</p>
          </div>
          {status ? (
            <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={() => void signOut()} disabled={signingOut}>
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </Button>
          ) : null}
        </header>

        <div className="flex items-start gap-2 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-100">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>This page shows the bus and its next stop. It does not show your child, a live map, or your home address.</p>
        </div>

        {loading ? (
          <Card><CardContent className="flex items-center gap-2 py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading bus status…</CardContent></Card>
        ) : status ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Signed in for {status.familyName}</p>
              <Button type="button" variant="ghost" size="sm" className="gap-1.5 rounded-lg" onClick={() => void loadStatus()}>
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
            </div>
            {status.buses.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No bus route is assigned to this family right now.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {status.buses.map((bus) => (
                  <Card key={bus.routeId} className={cn('border-t-4', bus.stale ? 'border-t-amber-500' : 'border-t-teal-600')}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg">{bus.busLabel}</CardTitle>
                          <CardDescription className="mt-1">{bus.run === 'am' ? 'Morning route' : bus.run === 'pm' ? 'Afternoon route' : 'Bus route'}</CardDescription>
                        </div>
                        <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', bus.stale ? 'bg-amber-100 text-amber-900' : 'bg-teal-100 text-teal-900')}>
                          {bus.stale ? 'Update may be old' : 'Bus status'}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm leading-6">{bus.message}</p>
                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                          <p className="text-xs text-muted-foreground">Next stop</p>
                          <p className="mt-1 font-semibold">{bus.nextStopName || 'No next stop listed'}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                          <p className="text-xs text-muted-foreground">Expected</p>
                          <p className="mt-1 font-semibold">{bus.etaMinutes == null ? 'Not available' : `About ${bus.etaMinutes} minutes`}</p>
                        </div>
                      </div>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" aria-hidden /> Last update: {timeLabel(bus.lastUpdateAt)}</p>
                      {bus.stale ? <p className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-200"><TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> The bus update is old. Please call the school office if you need immediate help.</p> : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Arrival messages</CardTitle>
                <CardDescription>These choices are off unless you turn them on. The school must also turn on arrival messages for the route and connect its delivery service.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex cursor-pointer items-center gap-3 text-sm"><Checkbox checked={preferences.email} onCheckedChange={(checked) => setPreferences((current) => ({ ...current, email: checked === true }))} disabled={savingPreferences} /> Email arrival messages</label>
                <label className="flex cursor-pointer items-center gap-3 text-sm"><Checkbox checked={preferences.sms} onCheckedChange={(checked) => setPreferences((current) => ({ ...current, sms: checked === true }))} disabled={savingPreferences} /> Text arrival messages</label>
                <label className="flex cursor-pointer items-center gap-3 text-sm"><Checkbox checked={preferences.whatsapp} onCheckedChange={(checked) => setPreferences((current) => ({ ...current, whatsapp: checked === true }))} disabled={savingPreferences} /> WhatsApp arrival messages</label>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" className="rounded-xl" onClick={() => void savePreferences()} disabled={savingPreferences}>{savingPreferences ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : 'Save message choices'}</Button>
                  {preferencesSaved ? <span className="text-sm text-teal-700 dark:text-teal-300">Choices saved.</span> : null}
                </div>
                <p className="text-xs text-muted-foreground">Messages are about the bus and stop only. They do not report that a child got on or off.</p>
              </CardContent>
            </Card>
            {error ? <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">{error}</p> : null}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Enter your private bus code</CardTitle>
              <CardDescription>The school office gives families this code. It is different from the school sign-in passcode.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={signIn}>
                <div className="space-y-2">
                  <Label htmlFor="transport-parent-code">Private bus access code</Label>
                  <Input id="transport-parent-code" value={code} onChange={(event) => setCode(event.target.value.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 120))} autoComplete="one-time-code" placeholder="Paste the code from the school" required disabled={signingIn} />
                </div>
                {error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}
                <Button type="submit" className="w-full rounded-xl" disabled={signingIn || !code.trim()}>
                  {signingIn ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking code…</> : 'View bus status'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
