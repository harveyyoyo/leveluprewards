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
import { collection, doc, runTransaction, type DocumentSnapshot } from 'firebase/firestore';
import { JackpotMachine } from '@/components/raffle/JackpotMachine';

type EntryRow = {
  id: string;
  name: string;
  points: number;
  /** Weight in the raffle pool (1 in equal-odds mode, or full ticket count). */
  tickets: number;
  /** floor(points / pointsPerTicket) — always the “full” tickets from points (for display / proportional deduct). */
  fullTickets: number;
  deductPoints: number;
};

export function AdminRaffleTab({
  schoolId,
  students,
  /** When false, raffle rules are read-only (configure under Admin → Settings → Features). */
  canEditSettings = true,
}: {
  schoolId: string;
  students: Student[];
  canEditSettings?: boolean;
}) {
  const { toast } = useToast();
  const { settings, updateSettings } = useSettings();
  const { firestore } = useFirebase();

  const [isSavingDeduction, setIsSavingDeduction] = useState(false);
  const [winner, setWinner] = useState<{ id: string; name: string } | null>(null);
  const [jackpotResetKey, setJackpotResetKey] = useState(0);

  const pointsPerTicket = Math.max(1, Math.floor(Number(settings.rafflePointsPerTicket || 25)));
  const deductOnPull = !!settings.raffleDeductPoints;
  const oneEntryPerStudent = !!settings.raffleOneEntryPerStudent;

  const entries = useMemo<EntryRow[]>(() => {
    const rows: EntryRow[] = [];
    for (const s of students || []) {
      const pts = Number(s.points || 0);
      const fullTickets = Math.max(0, Math.floor(pts / pointsPerTicket));
      if (fullTickets <= 0) continue;
      const tickets = oneEntryPerStudent ? 1 : fullTickets;
      const deductPoints = oneEntryPerStudent ? pointsPerTicket : fullTickets * pointsPerTicket;
      rows.push({
        id: s.id,
        name: `${s.firstName ?? ''}${s.lastName ? ` ${s.lastName}` : ''}`.trim() || s.id,
        points: pts,
        tickets,
        fullTickets,
        deductPoints,
      });
    }
    rows.sort((a, b) =>
      oneEntryPerStudent
        ? b.fullTickets - a.fullTickets || b.points - a.points || a.name.localeCompare(b.name)
        : b.tickets - a.tickets || b.points - a.points || a.name.localeCompare(b.name),
    );
    return rows;
  }, [oneEntryPerStudent, pointsPerTicket, students]);

  useEffect(() => {
    setWinner(null);
    setJackpotResetKey((k) => k + 1);
  }, [oneEntryPerStudent, pointsPerTicket]);

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
          // Firestore requires every read before any write in a transaction.
          const readResults: {
            r: EntryRow;
            studentRef: ReturnType<typeof doc>;
            snap: DocumentSnapshot;
          }[] = [];

          for (const r of rows) {
            const studentRef = doc(firestore, 'schools', schoolId, 'students', r.id);
            const snap = await tx.get(studentRef);
            readResults.push({ r, studentRef, snap });
          }

          for (const { r, studentRef, snap } of readResults) {
            if (!snap.exists()) continue;
            const current = Number((snap.data() as Record<string, unknown>)?.points || 0);
            const next = Math.max(0, current - r.deductPoints);
            tx.update(studentRef, { points: next });

            const activityRef = doc(collection(studentRef, 'activities'));
            tx.set(activityRef, {
              desc: oneEntryPerStudent
                ? `Weekly raffle (equal odds): 1 × ${pointsPerTicket} pts`
                : `Weekly raffle tickets (${r.fullTickets} × ${pointsPerTicket})`,
              amount: -r.deductPoints,
              date: now,
            });
          }
        });

        const fullTicketSum = rows.reduce((sum, r) => sum + r.fullTickets, 0);
        toast({
          title: 'Points deducted',
          description: oneEntryPerStudent
            ? `${rows.length} student(s): ${pointsPerTicket} pts each (one pool entry per person; equal odds).`
            : `${rows.length} student(s): ${fullTicketSum} ticket slot(s) removed at ${pointsPerTicket} pts per slot.`,
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
    [deductOnPull, entries, firestore, oneEntryPerStudent, pointsPerTicket, schoolId, toast],
  );

  const jackpotEmbeddedFooter = useMemo(() => {
    if (deductOnPull && oneEntryPerStudent) {
      return `Equal odds: one reel entry per qualifying student. After each pull, each student loses ${pointsPerTicket} pts (one ticket’s worth) and gets an activity line.`;
    }
    if (deductOnPull) {
      return `Scaled odds: pool entries match ticket counts from points. After each pull, each student loses (their tickets × ${pointsPerTicket}) points and gets an activity line.`;
    }
    if (oneEntryPerStudent) {
      return `Equal odds: one entry per qualifying student; extra points do not add extra chances. PULL does not change points while deduct is off.`;
    }
    return `Scaled odds: more points earn more tickets and better chances. PULL does not change points while deduct is off.`;
  }, [deductOnPull, oneEntryPerStudent, pointsPerTicket]);

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-muted-foreground" aria-hidden />
            Weekly raffle
          </CardTitle>
          <CardDescription>
            {canEditSettings ? (
              <>
                Use <span className="font-semibold">PULL!</span> to spin. Choose <span className="font-semibold">equal odds</span>{' '}
                (one entry per qualifying student) or <span className="font-semibold">scaled odds</span> (more points → more tickets
                in the pool). If <span className="font-semibold">Deduct points when you pull</span> is on, points are taken after the
                spin: <span className="font-semibold">one ticket’s worth each</span> in equal-odds mode, or{' '}
                <span className="font-semibold">all ticket slots</span> in scaled mode.
              </>
            ) : (
              <>
                Use <span className="font-semibold">PULL!</span> to spin for students shown below (your portal scope). Raffle rules
                are configured under <span className="font-semibold">Admin → Settings → Features</span> (Weekly Raffle Wheel).
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          {canEditSettings ? (
            <>
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
                      <p className="text-sm font-semibold">One entry per student (equal odds)</p>
                      <p className="text-xs text-muted-foreground">
                        Everyone with at least {pointsPerTicket} pts gets <span className="font-semibold">one</span> chance, even if
                        they could “buy” more tickets from points. Turn off to use ticket counts from points (more tickets → better
                        odds).
                      </p>
                    </div>
                    <Switch
                      checked={oneEntryPerStudent}
                      onCheckedChange={(checked) => updateSettings({ raffleOneEntryPerStudent: !!checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Deduct points when you pull</p>
                    <p className="text-xs text-muted-foreground">
                      {oneEntryPerStudent ? (
                        <>
                          After each spin, subtract <span className="font-semibold">{pointsPerTicket} pts</span> (one ticket) from
                          each eligible student and record it. Scaled mode instead subtracts each student&apos;s full ticket value.
                        </>
                      ) : (
                        <>
                          After each spin, subtract each student&apos;s full ticket value (their ticket slots × {pointsPerTicket}{' '}
                          pts) and record it. PULL never changes points when this is off.
                        </>
                      )}
                    </p>
                  </div>
                  <Switch checked={deductOnPull} onCheckedChange={(checked) => updateSettings({ raffleDeductPoints: !!checked })} />
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground space-y-2">
              <p>
                <span className="font-semibold text-foreground">Points per ticket:</span> {pointsPerTicket}
              </p>
              <p>
                <span className="font-semibold text-foreground">Odds:</span>{' '}
                {oneEntryPerStudent ? 'One pool entry per qualifying student (equal odds).' : 'Scaled — ticket count from points.'}
              </p>
              <p>
                <span className="font-semibold text-foreground">Deduct on pull:</span> {deductOnPull ? 'On' : 'Off'}
              </p>
            </div>
          )}

          <JackpotMachine
            embedded
            title="Weekly jackpot"
            pool={jackpotPool}
            pickWinner={handleJackpotPickWinner}
            onSpinFinished={handleJackpotSpinFinished}
            resetKey={jackpotResetKey}
            pullLocked={isSavingDeduction}
            embeddedFooter={jackpotEmbeddedFooter}
          />

          <div className="flex flex-col gap-2 rounded-2xl border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-black">{entries.length}</span>
              <span className="text-muted-foreground">student(s) eligible</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-black">{totalTickets}</span>
              <span className="text-muted-foreground">
                {oneEntryPerStudent ? 'pool entries (equal odds)' : 'ticket slots in pool'}
              </span>
            </div>
            {winner ? (
              <div className="mt-2 rounded-xl border bg-background p-4">
                <p className="text-xs font-semibold text-muted-foreground">Winner</p>
                <p className="text-xl font-black tracking-tight">{winner.name}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {deductOnPull ? (
                  oneEntryPerStudent ? (
                    <>
                      With deduct on, each pull removes <span className="font-semibold">{pointsPerTicket} pts</span> from every
                      eligible student (one ticket each).
                    </>
                  ) : (
                    <>
                      With deduct on, each pull removes <span className="font-semibold">all</span> of each student&apos;s ticket
                      slots in points (slots × {pointsPerTicket}).
                    </>
                  )
                ) : (
                  <>Deduct is off: PULL never changes balances.</>
                )}
              </p>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border">
            <div className="border-b bg-background px-4 py-3">
              <p className="text-sm font-black">Entries preview</p>
              <p className="text-xs text-muted-foreground">
                {oneEntryPerStudent
                  ? 'Each qualifying student has one pool entry; full tickets from points are shown for reference.'
                  : 'Each student is entered as many times as they have tickets from points.'}
              </p>
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
                        {r.points} pts → {r.fullTickets} full ticket(s) from points
                        {oneEntryPerStudent ? ` → ${r.tickets} pool entr${r.tickets === 1 ? 'y' : 'ies'}` : ''}
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
