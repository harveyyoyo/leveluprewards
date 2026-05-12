'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ticket } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Student } from '@/lib/types';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useFirebase } from '@/firebase';
import { collection, doc, runTransaction } from 'firebase/firestore';
import { JackpotMachine } from '@/components/raffle/JackpotMachine';

type EntryRow = {
  id: string;
  name: string;
  points: number;
  tickets: number;
  deductPoints: number;
};

export function AdminRaffleTab({
  schoolId,
  students,
}: {
  schoolId: string;
  students: Student[];
}) {
  const { toast } = useToast();
  const { settings, updateSettings } = useSettings();
  const { firestore } = useFirebase();

  const [isSavingDeduction, setIsSavingDeduction] = useState(false);
  const [winner, setWinner] = useState<{ id: string; name: string } | null>(null);
  const [jackpotResetKey, setJackpotResetKey] = useState(0);

  const pointsPerTicket = Math.max(1, Math.floor(Number(settings.rafflePointsPerTicket || 25)));
  const deductOnPull = !!settings.raffleDeductPoints;

  const entries = useMemo<EntryRow[]>(() => {
    const rows: EntryRow[] = [];
    for (const s of students || []) {
      const pts = Number(s.points || 0);
      const tickets = Math.max(0, Math.floor(pts / pointsPerTicket));
      if (tickets <= 0) continue;
      rows.push({
        id: s.id,
        name: `${s.firstName ?? ''}${s.lastName ? ` ${s.lastName}` : ''}`.trim() || s.id,
        points: pts,
        tickets,
        deductPoints: tickets * pointsPerTicket,
      });
    }
    rows.sort((a, b) => b.tickets - a.tickets || b.points - a.points || a.name.localeCompare(b.name));
    return rows;
  }, [pointsPerTicket, students]);

  useEffect(() => {
    setWinner(null);
    setJackpotResetKey((k) => k + 1);
  }, [pointsPerTicket]);

  const totalTickets = useMemo(() => entries.reduce((sum, r) => sum + r.tickets, 0), [entries]);

  const pickWeightedWinner = useCallback((): EntryRow | null => {
    if (totalTickets <= 0) return null;
    const pick = Math.floor(Math.random() * totalTickets);
    let cursor = 0;
    for (const r of entries) {
      cursor += r.tickets;
      if (pick < cursor) return r;
    }
    return entries[entries.length - 1] ?? null;
  }, [entries, totalTickets]);

  const jackpotPool = useMemo(() => entries.map((e) => ({ id: e.id, name: e.name })), [entries]);

  const handleJackpotPickWinner = useCallback((): { id: string; name: string } | null => {
    if (totalTickets <= 0) {
      toast({
        variant: 'destructive',
        title: 'No entries',
        description: `No students have at least ${pointsPerTicket} points.`,
      });
      return null;
    }
    const row = pickWeightedWinner();
    return row ? { id: row.id, name: row.name } : null;
  }, [pickWeightedWinner, pointsPerTicket, toast, totalTickets]);

  const handleJackpotSpinFinished = useCallback(
    async (w: { id: string; name: string }) => {
      setWinner({ id: w.id, name: w.name });

      if (!deductOnPull || !firestore) return;

      const rows = entries;
      if (rows.length === 0) return;

      setIsSavingDeduction(true);
      try {
        const now = Date.now();
        await runTransaction(firestore, async (tx) => {
          for (const r of rows) {
            const studentRef = doc(firestore, 'schools', schoolId, 'students', r.id);
            const snap = await tx.get(studentRef);
            if (!snap.exists()) continue;
            const current = Number((snap.data() as any)?.points || 0);
            const next = Math.max(0, current - r.deductPoints);
            tx.update(studentRef, { points: next });

            const activityRef = doc(collection(studentRef, 'activities'));
            tx.set(activityRef, {
              desc: `Weekly raffle tickets (${r.tickets} × ${pointsPerTicket})`,
              amount: -r.deductPoints,
              date: now,
            });
          }
        });

        const ticketSum = rows.reduce((sum, r) => sum + r.tickets, 0);
        toast({
          title: 'Points deducted',
          description: `${ticketSum} ticket(s) across ${rows.length} student(s). Each student lost points for all of their tickets (tickets × ${pointsPerTicket}).`,
        });
        setJackpotResetKey((k) => k + 1);
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Could not deduct points',
          description: e?.message || 'Try again.',
        });
      } finally {
        setIsSavingDeduction(false);
      }
    },
    [deductOnPull, entries, firestore, pointsPerTicket, schoolId, toast],
  );

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-muted-foreground" aria-hidden />
            Weekly raffle
          </CardTitle>
          <CardDescription>
            Use <span className="font-semibold">PULL!</span> to spin. Ticket odds come from current points (more points → more
            tickets → better odds). If <span className="font-semibold">Deduct points when you pull</span> is on, everyone in the
            pool loses points for <span className="font-semibold">all</span> of their tickets right after the spin finishes, and
            each student gets a matching activity line.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rafflePointsPerTicket" className="text-xs font-semibold text-muted-foreground">
                Points per ticket
              </Label>
              <Input
                id="rafflePointsPerTicket"
                type="number"
                min={1}
                value={String(pointsPerTicket)}
                onChange={(e) => {
                  const v = Math.max(1, Math.floor(Number(e.target.value || 1)));
                  updateSettings({ rafflePointsPerTicket: v });
                }}
                className="h-11 rounded-xl font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Example: 25 points = 1 ticket. Tickets are \( \lfloor points / {pointsPerTicket} \rfloor \).
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Deduct points when you pull</p>
                  <p className="text-xs text-muted-foreground">
                    After each spin, subtract each eligible student&apos;s full ticket value (all tickets × points per ticket)
                    and record it on their activity. PULL alone never changes points when this is off.
                  </p>
                </div>
                <Switch
                  checked={deductOnPull}
                  onCheckedChange={(checked) => updateSettings({ raffleDeductPoints: !!checked })}
                />
              </div>
            </div>
          </div>

          <JackpotMachine
            embedded
            title="Weekly jackpot"
            pool={jackpotPool}
            pickWinner={handleJackpotPickWinner}
            onSpinFinished={handleJackpotSpinFinished}
            resetKey={jackpotResetKey}
            pullLocked={isSavingDeduction}
          />

          <div className="flex flex-col gap-2 rounded-2xl border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-black">{entries.length}</span>
              <span className="text-muted-foreground">student(s) eligible</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-black">{totalTickets}</span>
              <span className="text-muted-foreground">total ticket(s)</span>
            </div>
            {winner ? (
              <div className="mt-2 rounded-xl border bg-background p-4">
                <p className="text-xs font-semibold text-muted-foreground">Winner</p>
                <p className="text-xl font-black tracking-tight">{winner.name}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Turning on deduct will charge <span className="font-semibold">every ticket</span> each student had at spin time—not
                one ticket each.
              </p>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border">
            <div className="border-b bg-background px-4 py-3">
              <p className="text-sm font-black">Entries preview</p>
              <p className="text-xs text-muted-foreground">Each student is entered as many times as they have tickets.</p>
            </div>
            <div className="divide-y bg-background">
              {entries.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  No students have at least {pointsPerTicket} points yet.
                </div>
              ) : (
                entries.slice(0, 50).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.points} pts → {r.tickets} ticket(s)
                        {deductOnPull ? ` (on pull: −${r.deductPoints} pts)` : ''}
                      </p>
                    </div>
                    <div
                      className={cn(
                        'shrink-0 rounded-xl border px-3 py-1 text-sm font-black tabular-nums',
                        'bg-muted/30',
                      )}
                    >
                      ×{r.tickets}
                    </div>
                  </div>
                ))
              )}
              {entries.length > 50 ? (
                <div className="bg-muted/20 p-3 text-xs text-muted-foreground">Showing first 50 of {entries.length} students.</div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
