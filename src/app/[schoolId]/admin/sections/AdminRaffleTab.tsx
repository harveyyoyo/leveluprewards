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
import { RaffleSpinWheel } from '@/components/raffle/RaffleSpinWheel';
import { parseRafflePointsPerTicket } from '@/lib/raffleTickets';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type EntryRow = {
  id: string;
  name: string;
  points: number;
  /** Weight in the raffle pool (1 in equal-odds mode, or full ticket count). */
  tickets: number;
  /** floor(points / pointsPerTicket) when pointsPerTicket ≥ 1; in general raffle (0) shown as 1 for display. */
  fullTickets: number;
  deductPoints: number;
};

export function AdminRaffleTab({
  schoolId,
  students,
  /** When false, raffle rules are read-only (e.g. secretary coupon-only mode). */
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
  const [drawDialogOpen, setDrawDialogOpen] = useState(false);
  const [drawDialogMode, setDrawDialogMode] = useState<'jackpot' | 'wheel'>('jackpot');

  const storedPpt = Number(settings.rafflePointsPerTicket);
  const { isGeneralRaffle, pointsPerTicket } = parseRafflePointsPerTicket(settings.rafflePointsPerTicket);
  const deductOnPull = !!settings.raffleDeductPoints;
  const oneEntryPerStudent = !!settings.raffleOneEntryPerStudent;
  const raffleDisplayMode = settings.raffleDisplayMode === 'wheel' ? 'wheel' : 'jackpot';

  const entries = useMemo<EntryRow[]>(() => {
    const rows: EntryRow[] = [];
    if (isGeneralRaffle) {
      for (const s of students || []) {
        const pts = Number(s.points || 0);
        rows.push({
          id: s.id,
          name: `${s.firstName ?? ''}${s.lastName ? ` ${s.lastName}` : ''}`.trim() || s.id,
          points: pts,
          tickets: 1,
          fullTickets: 1,
          deductPoints: 0,
        });
      }
      rows.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
      return rows;
    }
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
  }, [isGeneralRaffle, oneEntryPerStudent, pointsPerTicket, students]);

  useEffect(() => {
    setWinner(null);
    setJackpotResetKey((k) => k + 1);
  }, [isGeneralRaffle, oneEntryPerStudent, pointsPerTicket, raffleDisplayMode]);

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

  const wheelSlices = useMemo(
    () => entries.map((e) => ({ id: e.id, name: e.name, weight: Math.max(1, e.tickets) })),
    [entries],
  );

  const handleJackpotPickWinner = useCallback((): { id: string; name: string } | null => {
    if (totalTickets <= 0) {
      toast({
        variant: 'destructive',
        title: 'No entries',
        description: isGeneralRaffle
          ? 'No students in this list yet.'
          : `No students have at least ${pointsPerTicket} points.`,
      });
      return null;
    }
    const row = pickWeightedWinner();
    return row ? { id: row.id, name: row.name } : null;
  }, [isGeneralRaffle, pickWeightedWinner, pointsPerTicket, toast, totalTickets]);

  const handleJackpotSpinFinished = useCallback(
    async (w: { id: string; name: string }) => {
      setWinner({ id: w.id, name: w.name });

      if (!deductOnPull || !firestore) return;

      const rows = entries;
      if (rows.length === 0) return;

      const anyDeduct = rows.some((r) => r.deductPoints > 0);
      if (!anyDeduct) {
        toast({
          title: isGeneralRaffle ? 'General raffle' : 'No points deducted',
          description: isGeneralRaffle
            ? 'Points per ticket is 0 — everyone had one entry; balances were not changed.'
            : 'Ticket value for this setup is 0 — nothing to subtract.',
        });
        setJackpotResetKey((k) => k + 1);
        return;
      }

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
            if (!snap.exists() || r.deductPoints <= 0) continue;
            const current = Number((snap.data() as Record<string, unknown>)?.points || 0);
            const next = Math.max(0, current - r.deductPoints);
            tx.update(studentRef, { points: next });

            const activityRef = doc(collection(studentRef, 'activities'));
            tx.set(activityRef, {
              desc: isGeneralRaffle
                ? 'Weekly raffle (general)'
                : oneEntryPerStudent
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
    [deductOnPull, entries, firestore, isGeneralRaffle, oneEntryPerStudent, pointsPerTicket, schoolId, toast],
  );

  const displayRafflePointsPerTicket = Number.isFinite(storedPpt) ? Math.max(0, Math.floor(storedPpt)) : 25;

  const jackpotEmbeddedFooter = useMemo(() => {
    if (isGeneralRaffle) {
      if (deductOnPull) {
        return `General raffle: one reel entry per student in the list. At 0 points per ticket there is nothing to subtract, so balances stay the same.`;
      }
      return `General raffle: one entry per student in the list; equal odds. PULL does not change points while deduct is off.`;
    }
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
  }, [deductOnPull, isGeneralRaffle, oneEntryPerStudent, pointsPerTicket]);

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
                Pick <span className="font-semibold">Jackpot</span> or <span className="font-semibold">Spinning wheel</span> to open
                the draw in a popup (same odds). Set <span className="font-semibold">points per ticket</span> to{' '}
                <span className="font-semibold">0</span> for a general raffle (everyone in the list gets one entry; no point
                threshold). Otherwise choose <span className="font-semibold">equal odds</span> (one entry per qualifying student) or{' '}
                <span className="font-semibold">scaled odds</span> (more points → more tickets). If{' '}
                <span className="font-semibold">Deduct points when you pull</span> is on, points are taken after the spin when there
                is a ticket value (not in general raffle).
              </>
            ) : (
              <>
                Open the jackpot or wheel draw from the buttons below (your portal scope). Raffle rules are read-only in this mode;
                switch to a teacher or admin session to edit them.
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
                    min={0}
                    value={String(displayRafflePointsPerTicket)}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      const v = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 25;
                      updateSettings({ rafflePointsPerTicket: v });
                    }}
                    className="h-11 rounded-xl font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    {isGeneralRaffle ? (
                      <>
                        <span className="font-semibold">0</span> = general raffle: every student in the list has one pool entry;
                        points are not used for tickets.
                      </>
                    ) : (
                      <>
                        Example: 25 points = 1 ticket. Tickets are \( \lfloor points / {pointsPerTicket} \rfloor \).
                      </>
                    )}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">One entry per student (equal odds)</p>
                      <p className="text-xs text-muted-foreground">
                        {isGeneralRaffle ? (
                          <>General raffle already uses one entry per student; this toggle only applies when points per ticket is 1 or more.</>
                        ) : (
                          <>
                            Everyone with at least {pointsPerTicket} pts gets <span className="font-semibold">one</span> chance, even if
                            they could “buy” more tickets from points. Turn off to use ticket counts from points (more tickets → better
                            odds).
                          </>
                        )}
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
                      {isGeneralRaffle ? (
                        <>At 0 points per ticket there is no ticket value to subtract; spins do not change balances.</>
                      ) : oneEntryPerStudent ? (
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

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Raffle display</Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDrawDialogMode('jackpot');
                      updateSettings({ raffleDisplayMode: 'jackpot' });
                      setDrawDialogOpen(true);
                    }}
                    className={cn(
                      'rounded-xl border px-4 py-2.5 text-sm font-semibold transition',
                      raffleDisplayMode === 'jackpot'
                        ? 'border-primary bg-primary/15 text-foreground shadow-sm'
                        : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted/60',
                    )}
                  >
                    Jackpot (reels)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDrawDialogMode('wheel');
                      updateSettings({ raffleDisplayMode: 'wheel' });
                      setDrawDialogOpen(true);
                    }}
                    className={cn(
                      'rounded-xl border px-4 py-2.5 text-sm font-semibold transition',
                      raffleDisplayMode === 'wheel'
                        ? 'border-primary bg-primary/15 text-foreground shadow-sm'
                        : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted/60',
                    )}
                  >
                    Spinning wheel
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Same odds and deduct rules — only the animation changes. Wheel slice size matches ticket weight. Each choice opens the
                  draw in a popup.
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground space-y-2">
              <p>
                <span className="font-semibold text-foreground">Points per ticket:</span>{' '}
                {isGeneralRaffle ? '0 (general raffle)' : pointsPerTicket}
              </p>
              <p>
                <span className="font-semibold text-foreground">Odds:</span>{' '}
                {isGeneralRaffle
                  ? 'One pool entry per student in the list.'
                  : oneEntryPerStudent
                    ? 'One pool entry per qualifying student (equal odds).'
                    : 'Scaled — ticket count from points.'}
              </p>
              <p>
                <span className="font-semibold text-foreground">Deduct on pull:</span> {deductOnPull ? 'On' : 'Off'}
              </p>
              <p>
                <span className="font-semibold text-foreground">Saved display preference:</span>{' '}
                {raffleDisplayMode === 'wheel' ? 'Spinning wheel' : 'Jackpot (reels)'}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDrawDialogMode('jackpot');
                    setDrawDialogOpen(true);
                  }}
                  className={cn(
                    'rounded-xl border px-4 py-2.5 text-sm font-semibold transition',
                    'border-border bg-background text-foreground shadow-sm hover:bg-muted/60',
                  )}
                >
                  Open jackpot draw
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrawDialogMode('wheel');
                    setDrawDialogOpen(true);
                  }}
                  className={cn(
                    'rounded-xl border px-4 py-2.5 text-sm font-semibold transition',
                    'border-border bg-background text-foreground shadow-sm hover:bg-muted/60',
                  )}
                >
                  Open wheel draw
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 rounded-2xl border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-black">{entries.length}</span>
              <span className="text-muted-foreground">student(s) eligible</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-black">{totalTickets}</span>
              <span className="text-muted-foreground">
                {isGeneralRaffle ? 'pool entries (general)' : oneEntryPerStudent ? 'pool entries (equal odds)' : 'ticket slots in pool'}
              </span>
            </div>
            {winner ? (
              <div className="mt-2 rounded-xl border bg-background p-4">
                <p className="text-xs font-semibold text-muted-foreground">Winner</p>
                <p className="text-xl tracking-tight" style={{ fontWeight: 900, color: 'hsl(var(--foreground))' }}>
                  {winner.name}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {isGeneralRaffle ? (
                  <>General raffle: equal odds; deduct does not change balances at 0 pts per ticket.</>
                ) : deductOnPull ? (
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

          <Dialog open={drawDialogOpen} onOpenChange={setDrawDialogOpen}>
            <DialogContent size="xl" className="gap-0 p-0 sm:p-0">
              <div className="border-b bg-muted/20 px-4 pb-4 pt-10 sm:px-6 sm:pt-12">
                <DialogHeader className="text-left">
                  <DialogTitle>{drawDialogMode === 'wheel' ? 'Weekly wheel' : 'Weekly jackpot'}</DialogTitle>
                  <DialogDescription className="text-left">
                    Same pool as the entries list. Close when you are done; your winner banner stays on this tab.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="px-2 pb-4 pt-2 sm:px-4 sm:pb-6">
                {drawDialogOpen &&
                  (drawDialogMode === 'wheel' ? (
                    <RaffleSpinWheel
                      embedded
                      title="Weekly wheel"
                      slices={wheelSlices}
                      pickWinner={handleJackpotPickWinner}
                      onSpinFinished={handleJackpotSpinFinished}
                      resetKey={jackpotResetKey}
                      pullLocked={isSavingDeduction}
                      embeddedFooter={jackpotEmbeddedFooter}
                    />
                  ) : (
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
                  ))}
              </div>
            </DialogContent>
          </Dialog>

          <div className="overflow-hidden rounded-2xl border">
            <div className="border-b bg-background px-4 py-3">
              <p className="text-sm font-black">Entries preview</p>
              <p className="text-xs text-muted-foreground">
                {isGeneralRaffle
                  ? 'Each student in the list has one pool entry; point balances are shown for reference only.'
                  : oneEntryPerStudent
                    ? 'Each qualifying student has one pool entry; full tickets from points are shown for reference.'
                    : 'Each student is entered as many times as they have tickets from points.'}
              </p>
            </div>
            <div className="divide-y bg-background">
              {entries.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  {isGeneralRaffle ? 'No students in this list yet.' : `No students have at least ${pointsPerTicket} points yet.`}
                </div>
              ) : (
                entries.slice(0, 50).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {isGeneralRaffle ? (
                          <>
                            {r.points} pts • one pool entry (general raffle)
                            {deductOnPull && r.deductPoints > 0 ? ` (on pull: −${r.deductPoints} pts)` : ''}
                          </>
                        ) : (
                          <>
                            {r.points} pts → {r.fullTickets} full ticket(s) from points
                            {oneEntryPerStudent ? ` → ${r.tickets} pool entr${r.tickets === 1 ? 'y' : 'ies'}` : ''}
                            {deductOnPull ? ` (on pull: −${r.deductPoints} pts)` : ''}
                          </>
                        )}
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
