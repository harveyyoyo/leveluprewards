'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BellRing,
  BusFront,
  CheckCircle2,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Navigation,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  exchangeTransportParentLink,
  fetchTransportParentStatus,
  TransportParentClientError,
  signInTransportParent,
  signOutTransportParent,
  updateTransportParentPreferences,
  type TransportParentArrivalPreferences,
  type TransportParentBus,
  type TransportParentStatus,
} from '@/lib/parentPortal/transportParentClient';
import { formatScheduleTime } from '@/lib/office/officeSchedule';
import { cn } from '@/lib/utils';

function timeLabel(value: number | null, timeZone?: string | null): string {
  if (!value) return 'No recent update';
  try {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', ...(timeZone ? { timeZone } : {}) }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
}

function plannedTimeLabel(value: string | null): string {
  return value ? formatScheduleTime(value) : 'Not set';
}

function runLabel(run: TransportParentBus['run']): string {
  return run === 'am' ? 'Morning route' : run === 'pm' ? 'Afternoon route' : 'Bus route';
}

function stateLabel(bus: TransportParentBus): string {
  if (bus.stale) return 'Update may be old';
  if (bus.state === 'on_way') return 'On the way';
  if (bus.state === 'delayed') return 'Running late';
  if (bus.state === 'arrived') return 'Arrived';
  if (bus.state === 'ended') return 'Finished';
  if (bus.state === 'unavailable') return 'Unavailable';
  return 'Not started yet';
}

function MetricCard({ icon: Icon, label, value, detail, tone = 'teal' }: { icon: LucideIcon; label: string; value: string; detail?: string; tone?: 'teal' | 'sky' | 'amber' }) {
  const toneClass = tone === 'amber' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200' : tone === 'sky' ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200' : 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-200';
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-800/50">
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', toneClass)}><Icon className="h-4 w-4" aria-hidden /></div>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p> : null}
    </div>
  );
}

function PreferenceRow({ icon: Icon, label, description, checked, onChange, disabled }: { icon: LucideIcon; label: string; description: string; checked: boolean; onChange: () => void; disabled: boolean }) {
  return (
    <label className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-3 transition hover:border-teal-300 hover:bg-teal-50/50 dark:border-slate-700/80 dark:bg-slate-800/40 dark:hover:border-teal-700 dark:hover:bg-teal-950/20">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-teal-100 group-hover:text-teal-700 dark:bg-slate-700 dark:text-slate-300 dark:group-hover:bg-teal-950 dark:group-hover:text-teal-200"><Icon className="h-4 w-4" aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{description}</span>
      </span>
      <Checkbox checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={label} />
    </label>
  );
}

export default function TransportParentPage() {
  const params = useParams<{ schoolId: string }>();
  const schoolId = (params.schoolId || '').trim().toLowerCase();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<TransportParentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [linkPending, setLinkPending] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<TransportParentArrivalPreferences>({ email: false, sms: false, whatsapp: false, updatedAt: 0 });
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesSaved, setPreferencesSaved] = useState(false);
  const [preferencesDirty, setPreferencesDirty] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!schoolId) return;
    try {
      setStatus(await fetchTransportParentStatus(schoolId));
      setError(null);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Private bus status is temporarily unavailable.';
      if (cause instanceof TransportParentClientError && cause.status === 401) {
        setStatus(null);
        setPreferencesDirty(false);
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    const linkToken = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('link');
    if (!linkToken) {
      void loadStatus();
      return;
    }
    let active = true;
    setLinkPending(true);
    setError(null);
    void exchangeTransportParentLink(schoolId, linkToken)
      .then(() => {
        if (!active) return;
        window.history.replaceState(null, '', `/${schoolId}/parent/bus`);
        return loadStatus();
      })
      .catch((cause) => {
        if (!active) return;
        setStatus(null);
        setPreferencesDirty(false);
        setError(cause instanceof Error ? cause.message : 'That private bus link is no longer active.');
        setLoading(false);
      })
      .finally(() => {
        if (active) setLinkPending(false);
      });
    return () => {
      active = false;
    };
  }, [loadStatus, schoolId]);

  useEffect(() => {
    if (!status) return;
    const timer = window.setInterval(() => void loadStatus(), 30_000);
    return () => window.clearInterval(timer);
  }, [loadStatus, status]);

  const refresh = async () => {
    setRefreshing(true);
    await loadStatus();
    setRefreshing(false);
  };

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
    if (status?.arrivalPreferences && !preferencesDirty) setPreferences(status.arrivalPreferences);
  }, [status, preferencesDirty]);

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
      setStatus((current) => current ? { ...current, arrivalPreferences: result.arrivalPreferences } : current);
      setPreferencesDirty(false);
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
      setPreferencesDirty(false);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign out.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(20,184,166,0.18),_transparent_42%),radial-gradient(ellipse_at_bottom_right,_rgba(14,165,233,0.12),_transparent_38%)] px-4 py-6 text-slate-900 dark:bg-[#07161c] dark:text-slate-100 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-600/25">
              <span className="absolute inset-0 animate-ping rounded-2xl bg-teal-400/20 motion-reduce:hidden" aria-hidden />
              <BusFront className="relative h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-teal-700 dark:text-teal-300">Family ride</p>
              <h1 className="truncate text-2xl font-black tracking-tight sm:text-3xl">Your bus, at a glance</h1>
              <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">A calm, clear view for your family.</p>
            </div>
          </div>
          {status ? (
            <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5 rounded-xl bg-white/70" onClick={() => void signOut()} disabled={signingOut}>
              <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          ) : null}
        </header>

        <div className="flex items-start gap-3 rounded-2xl border border-teal-200/80 bg-white/75 p-4 text-sm shadow-sm backdrop-blur dark:border-teal-900/80 dark:bg-teal-950/20">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-200"><ShieldCheck className="h-4 w-4" aria-hidden /></span>
          <div>
            <p className="font-bold text-teal-950 dark:text-teal-100">Private by design</p>
            <p className="mt-0.5 leading-5 text-teal-900/80 dark:text-teal-100/75">This page shows the bus and its next stop. It never shows your child, a live map, or your home address.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-[2rem] border border-white/70 bg-white/80 p-8 text-center shadow-2xl shadow-teal-950/5 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/80">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-600/25"><Loader2 className="h-8 w-8 animate-spin" aria-hidden /></div>
            <div><p className="text-lg font-black">{linkPending ? 'Opening your private bus status…' : 'Loading your bus…'}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Just a moment.</p></div>
          </div>
        ) : status ? (
          <div className="space-y-5">
            <section className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-700 dark:text-teal-300">Private family view</p>
                <p className="mt-1 truncate text-2xl font-black tracking-tight">Welcome back, {status.familyName}</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5 rounded-xl bg-white/70" onClick={() => void refresh()} disabled={refreshing}>
                <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} /> <span className="hidden sm:inline">Refresh</span>
              </Button>
            </section>

            {status.buses.length === 0 ? (
              <div className="rounded-[2rem] border border-white/70 bg-white/80 p-8 text-center shadow-2xl shadow-teal-950/5 dark:border-slate-700/70 dark:bg-slate-900/80">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><BusFront className="h-7 w-7" aria-hidden /></div>
                <p className="mt-4 text-lg font-black">No bus route is assigned yet</p>
                <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">When the school assigns a bus route to your family, it will appear here.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {status.buses.map((bus) => {
                  const progress = bus.routeProgress;
                  const progressPercent = bus.state === 'arrived' || bus.state === 'ended' ? 100 : progress?.percent ?? 0;
                  // 'on_way'/default previously used bg-white/20 text-white — a
                  // translucent white pill read as low as ~2.3:1 against the
                  // teal/cyan/sky gradient header behind it. A near-solid white
                  // pill with dark teal text keeps ~8:1+ on every gradient stop.
                  const statusTone = bus.stale ? 'bg-amber-100 text-amber-900' : bus.state === 'delayed' ? 'bg-amber-100 text-amber-900' : bus.state === 'on_way' ? 'bg-white/90 text-teal-900' : 'bg-white/90 text-teal-900';
                  return (
                    <article key={bus.routeId} className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-2xl shadow-teal-950/10 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/85">
                      <div className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-cyan-600 to-sky-500 p-5 text-white sm:p-6">
                        <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-white/10" aria-hidden />
                        <div className="absolute -bottom-20 left-20 h-36 w-36 rounded-full bg-sky-300/10" aria-hidden />
                        <div className="relative flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            {/* Header gradient runs teal-700 -> cyan-600 -> sky-500; near
                                the sky-500 end, white text below full opacity drops under
                                3:1, so these two labels stay close to full white. */}
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/90">{runLabel(bus.run)}</p>
                            <h2 className="mt-1 truncate text-3xl font-black tracking-tight">{bus.busLabel}</h2>
                            <p className="mt-1 text-sm text-white/90">Here is the latest from your school.</p>
                          </div>
                          <span className={cn('flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black shadow-sm', statusTone)}>
                            <span className={cn('h-2 w-2 rounded-full', bus.stale || bus.state === 'delayed' ? 'bg-amber-500' : 'bg-emerald-300 motion-safe:animate-pulse')} />
                            {stateLabel(bus)}
                          </span>
                        </div>
                        <p className="relative mt-5 max-w-lg text-lg font-semibold leading-snug">{bus.message}</p>
                      </div>

                      <div className="space-y-4 p-5 sm:p-6">
                        <div className="grid grid-cols-2 gap-3">
                          <MetricCard icon={MapPin} label="Next stop" value={bus.nextStopName || 'Not listed'} detail={bus.nextStopName ? 'The next stop on the route' : 'Waiting for the driver to start'} />
                          <MetricCard icon={Navigation} label="Estimated arrival" value={bus.etaMinutes == null ? 'Not available' : `About ${bus.etaMinutes} min`} detail="Based on the last update" tone="sky" />
                        </div>

                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-700/80 dark:bg-slate-800/40">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Route pulse</p>
                              <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{progress ? `${progress.completed} of ${progress.total} stops reached` : 'Waiting for the first route update'}</p>
                            </div>
                            <span className="text-2xl font-black tracking-tight text-teal-600 dark:text-teal-300">{progressPercent}%</span>
                          </div>
                          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" role="progressbar" aria-label="Route progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
                            <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }} />
                          </div>
                          <div className="mt-2 flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400"><span>Start of route</span><span>{bus.nextStopName ? `Next: ${bus.nextStopName}` : 'Waiting for update'}</span></div>
                        </div>

                        <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4 dark:border-teal-900/70 dark:bg-teal-950/20">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-900/70 dark:text-teal-200"><MapPin className="h-4 w-4" aria-hidden /></span>
                            <div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-teal-800 dark:text-teal-200">Your stop</p><p className="text-xs text-teal-900/70 dark:text-teal-100/70">Planned times for your family</p></div>
                          </div>
                          {bus.familyStops?.length ? (
                            <div className="mt-3 space-y-2">
                              {bus.familyStops.map((stop) => (
                                <div key={`${stop.name}-${stop.morningTime}-${stop.afternoonTime}`} className="rounded-xl border border-teal-200/70 bg-white/75 p-3 dark:border-teal-900/70 dark:bg-slate-900/40">
                                  <p className="font-black text-slate-900 dark:text-white">{stop.name}</p>
                                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                                    <span className="rounded-lg bg-amber-100 px-2.5 py-1.5 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">AM · {plannedTimeLabel(stop.morningTime)}</span>
                                    <span className="rounded-lg bg-sky-100 px-2.5 py-1.5 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200">PM · {plannedTimeLabel(stop.afternoonTime)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : <p className="mt-3 text-sm text-teal-900/75 dark:text-teal-100/75">The school has not assigned a family stop yet.</p>}
                          <p className="mt-3 text-xs leading-5 text-teal-900/65 dark:text-teal-100/60">Planned times are helpful, but they are not live confirmations. Please call the school if you need immediate help.</p>
                        </div>

                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-xs dark:border-slate-700/80 dark:bg-slate-800/40">
                          <span className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300"><span className={cn('h-2 w-2 rounded-full', bus.stale ? 'bg-amber-500' : 'bg-emerald-500')} /> Last update</span>
                          <span className="text-slate-500 dark:text-slate-400">{timeLabel(bus.lastUpdateAt, status.timeZone)}</span>
                        </div>
                        {bus.stale ? <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>The bus update is old. Please call the school office if you need immediate help.</span></div> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <Card className="rounded-[2rem] border-0 bg-white/85 shadow-2xl shadow-teal-950/5 backdrop-blur dark:bg-slate-900/85">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20"><BellRing className="h-5 w-5" aria-hidden /></div>
                  <div><CardTitle className="text-lg">Stay in the loop</CardTitle><CardDescription className="mt-1 leading-5">Turn on only the messages you want. They are about the bus and stop—not about a child getting on or off.</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <PreferenceRow icon={Mail} label="Email updates" description="Arrival information by email" checked={preferences.email} disabled={savingPreferences} onChange={() => { setPreferencesDirty(true); setPreferencesSaved(false); setPreferences((current) => ({ ...current, email: !current.email })); }} />
                <PreferenceRow icon={Smartphone} label="Text updates" description="Arrival information by text message" checked={preferences.sms} disabled={savingPreferences} onChange={() => { setPreferencesDirty(true); setPreferencesSaved(false); setPreferences((current) => ({ ...current, sms: !current.sms })); }} />
                <PreferenceRow icon={MessageSquare} label="WhatsApp updates" description="Arrival information on WhatsApp" checked={preferences.whatsapp} disabled={savingPreferences} onChange={() => { setPreferencesDirty(true); setPreferencesSaved(false); setPreferences((current) => ({ ...current, whatsapp: !current.whatsapp })); }} />
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button type="button" className="h-12 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-500 px-5 font-bold text-white shadow-lg shadow-teal-600/20 hover:from-teal-700 hover:to-cyan-600" onClick={() => void savePreferences()} disabled={savingPreferences || !preferencesDirty}>
                    {savingPreferences ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : preferencesSaved ? <><CheckCircle2 className="mr-2 h-4 w-4" /> Saved</> : 'Save message choices'}
                  </Button>
                  {preferencesDirty ? <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Choices not saved yet.</span> : null}
                </div>
                <p className="flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-300" aria-hidden /> Messages stay private and never report that a child got on or off the bus.</p>
              </CardContent>
            </Card>

            <div className="flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/20 dark:text-amber-100">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200"><TriangleAlert className="h-4 w-4" aria-hidden /></span>
              <div><p className="font-bold">Need immediate help?</p><p className="mt-0.5 leading-5">Please call the school office. This page is for quick bus information, not emergency help.</p></div>
            </div>

            {error ? <p role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">{error}</p> : null}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-2xl shadow-teal-950/10 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/90">
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-teal-900 to-cyan-800 p-7 text-center text-white sm:p-9">
              <div className="absolute -left-10 -top-12 h-36 w-36 rounded-full bg-teal-300/10" aria-hidden />
              <div className="absolute -bottom-16 -right-10 h-44 w-44 rounded-full bg-cyan-300/10" aria-hidden />
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15 shadow-inner ring-1 ring-white/20"><BusFront className="h-8 w-8" aria-hidden /></div>
              <p className="relative mt-5 text-[10px] font-black uppercase tracking-[0.28em] text-teal-200">Family ride</p>
              <h2 className="relative mx-auto mt-2 max-w-md text-3xl font-black leading-tight tracking-tight sm:text-4xl">Your family&apos;s bus, in your pocket.</h2>
              <p className="relative mx-auto mt-3 max-w-md text-sm leading-6 text-white/75">Use the private link from the school office, or enter your family code below.</p>
            </div>
            <CardContent className="p-6 sm:p-8">
              <form className="space-y-4" onSubmit={signIn}>
                <div className="space-y-2">
                  <Label htmlFor="transport-parent-code" className="text-sm font-bold">Private family code</Label>
                  <Input id="transport-parent-code" value={code} onChange={(event) => setCode(event.target.value.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 120))} autoComplete="one-time-code" placeholder="Enter your private code" required disabled={signingIn} className="h-14 rounded-2xl border-slate-200 bg-slate-50 text-center font-mono text-lg tracking-[0.2em] shadow-sm placeholder:tracking-normal placeholder:font-sans dark:border-slate-700 dark:bg-slate-800/60" />
                </div>
                {error ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">{error}</p> : null}
                <Button type="submit" className="h-14 w-full rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-500 text-base font-black text-white shadow-lg shadow-teal-600/20 hover:from-teal-700 hover:to-cyan-600" disabled={signingIn || !code.trim()}>
                  {signingIn ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking your code…</> : <>View my bus <Sparkles className="ml-2 h-4 w-4" /></>}
                </Button>
              </form>
              <div className="mt-6 flex items-start gap-2 rounded-2xl bg-teal-50 p-3 text-xs leading-5 text-teal-900 dark:bg-teal-950/30 dark:text-teal-100"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>Your code is different from the school sign-in passcode. No child location or live map is shown here.</span></div>
            </CardContent>
          </div>
        )}
      </div>
    </main>
  );
}
