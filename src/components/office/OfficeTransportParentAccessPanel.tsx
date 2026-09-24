'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthFetch } from '@/lib/authFetch';
import type { OfficeFamily, OfficeStudent } from '@/lib/office/types';
import { useToast } from '@/hooks/use-toast';

type Props = {
  schoolId: string;
  familyById: Map<string, OfficeFamily>;
  students: OfficeStudent[];
  isLoading?: boolean;
};

type AccessSummary = {
  id: string;
  familyId: string;
  familyName: string | null;
  label: string;
  status: 'active' | 'revoked';
  createdAt: number;
  expiresAt: number;
  lastUsedAt: number | null;
  revokedAt: number | null;
  consentVersion: number;
};

type AccessResponse = { accesses?: AccessSummary[]; access?: AccessSummary; code?: string; error?: string };

function familyHasBusStudent(familyId: string, students: OfficeStudent[]): boolean {
  return students.some((student) => student.familyId === familyId && student.archived !== true && (student.status == null || student.status === 'active') && (student.transportMode == null || student.transportMode === 'bus') && Boolean(student.busRouteId));
}

function dateLabel(value: number | null): string {
  if (!value) return 'Never';
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function OfficeTransportParentAccessPanel({ schoolId, familyById, students, isLoading: parentLoading = false }: Props) {
  const authFetch = useAuthFetch();
  const { toast } = useToast();
  const eligibleFamilies = useMemo(
    () => [...familyById.values()].filter((family) => family.archived !== true && familyHasBusStudent(family.id, students)).sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [familyById, students],
  );
  const [accesses, setAccesses] = useState<AccessSummary[]>([]);
  const [familyId, setFamilyId] = useState('');
  const [days, setDays] = useState('30');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState<{ familyName: string; code: string; expiresAt: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch(`/api/office/transport/parent-access?schoolId=${encodeURIComponent(schoolId)}`);
      const data = (await response.json().catch(() => ({}))) as AccessResponse;
      if (!response.ok) throw new Error(data.error || 'Could not load family bus access.');
      setAccesses(Array.isArray(data.accesses) ? data.accesses : []);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load family bus access.');
    } finally {
      setLoading(false);
    }
  }, [authFetch, schoolId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setFamilyId((current) => current || eligibleFamilies[0]?.id || '');
  }, [eligibleFamilies]);

  const post = async (body: Record<string, unknown>): Promise<AccessResponse> => {
    const response = await authFetch('/api/office/transport/parent-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId, ...body }),
    });
    const data = (await response.json().catch(() => ({}))) as AccessResponse;
    if (!response.ok) throw new Error(data.error || 'Could not update family bus access.');
    return data;
  };

  const create = async () => {
    if (!familyId) return;
    setBusy(true);
    try {
      const result = await post({ action: 'create', familyId, days: Number(days) });
      if (!result.code || !result.access) throw new Error('The access code was not created.');
      const familyName = result.access.familyName || familyById.get(familyId)?.displayName || 'Family';
      setNewCode({ familyName, code: result.code, expiresAt: result.access.expiresAt });
      await load();
      toast({ title: 'Private bus access created', description: 'Share the code privately with the family.' });
    } catch (cause) {
      toast({ variant: 'destructive', title: 'Could not create bus access', description: cause instanceof Error ? cause.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (access: AccessSummary) => {
    if (!window.confirm(`Revoke bus access for ${access.familyName || access.label}? The parent will be signed out.`)) return;
    setBusy(true);
    try {
      await post({ action: 'revoke', accessId: access.id });
      await load();
      toast({ title: 'Family bus access revoked' });
    } catch (cause) {
      toast({ variant: 'destructive', title: 'Could not revoke bus access', description: cause instanceof Error ? cause.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!newCode) return;
    try {
      await navigator.clipboard.writeText(newCode.code);
      toast({ title: 'Private bus code copied' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy the code' });
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="parent-bus-access-title">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200">
          <ShieldCheck className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="parent-bus-access-title" className="font-semibold">Private family bus access</h2>
          <p className="mt-1 text-sm text-muted-foreground">Give a family a private code for the bus-status page. The code expires automatically and never shows a child or home address. Families can use it at <span className="font-mono text-xs">/{schoolId}/parent/bus</span>.</p>
        </div>
      </div>

      {eligibleFamilies.length === 0 ? <p className="text-sm text-muted-foreground">Add a bus rider to a family before creating family access.</p> : (
        <div className="grid gap-3 rounded-xl border bg-slate-50 p-3 sm:grid-cols-[1fr_150px_auto] sm:items-end dark:border-slate-800 dark:bg-slate-800/50">
          <div className="space-y-1.5">
            <Label htmlFor="parent-access-family">Family</Label>
            <Select value={familyId} onValueChange={setFamilyId} disabled={busy || parentLoading}>
              <SelectTrigger id="parent-access-family" className="rounded-lg"><SelectValue placeholder="Choose a family" /></SelectTrigger>
              <SelectContent>{eligibleFamilies.map((family) => <SelectItem key={family.id} value={family.id}>{family.displayName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="parent-access-days">Expires in</Label>
            <Select value={days} onValueChange={setDays} disabled={busy}>
              <SelectTrigger id="parent-access-days" className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="30">30 days</SelectItem><SelectItem value="60">60 days</SelectItem><SelectItem value="90">90 days</SelectItem></SelectContent>
            </Select>
          </div>
          <Button type="button" className="gap-1.5 rounded-lg" onClick={() => void create()} disabled={busy || !familyId}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Create code
          </Button>
        </div>
      )}

      {newCode ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          <p className="font-semibold">Copy this private code for {newCode.familyName}</p>
          <p className="mt-1 break-all font-mono text-xs">{newCode.code}</p>
          <div className="mt-2 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => void copyCode()}><Copy className="h-3.5 w-3.5" /> Copy code</Button><Button type="button" size="sm" variant="ghost" className="rounded-lg" onClick={() => setNewCode(null)}>Hide code</Button></div>
          <p className="mt-2 text-xs">It expires {dateLabel(newCode.expiresAt)}. The app will not show it again.</p>
        </div>
      ) : null}

      {error ? <p role="alert" className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading family access…</p> : null}
      {!loading && accesses.length === 0 ? <p className="text-sm text-muted-foreground">No private family bus codes have been created.</p> : null}
      {accesses.length > 0 ? (
        <ul className="space-y-2">
          {accesses.map((access) => (
            <li key={access.id} className="flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 text-sm dark:border-slate-800">
              <div className="min-w-[180px] flex-1"><p className="font-medium">{access.familyName || access.label}</p><p className="text-xs text-muted-foreground">{access.status === 'revoked' ? `Revoked ${dateLabel(access.revokedAt)}` : `Expires ${dateLabel(access.expiresAt)} · Last used ${dateLabel(access.lastUsedAt)}`}</p></div>
              {access.status === 'active' ? <Button type="button" variant="ghost" size="sm" className="gap-1.5 rounded-lg text-red-700 disabled:opacity-50 dark:text-red-400" disabled={busy} onClick={() => void revoke(access)}><Trash2 className="h-3.5 w-3.5" /> Revoke</Button> : <span className="text-xs text-muted-foreground">No longer active</span>}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
