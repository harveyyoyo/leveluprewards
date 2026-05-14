'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dices, Disc3, Ticket, Trophy, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Helper } from '@/components/ui/helper';
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

  const drawButtonClass = (active: boolean) =>
    cn(
      'flex min-h-[5.25rem] flex-1 flex-row items-center gap-4 rounded-2xl border p-0 text-left transition-all overflow-hidden group',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      active
        ? 'border-primary bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/20'
        : 'border-border bg-card text-muted-foreground hover:border-primary/35 hover:bg-muted/40 hover:text-foreground',
    );

  const poolHint = isGeneralRaffle
    ? 'General raffle: equal odds; at 0 pts per ticket, deduct does not change balances.'
    : deductOnPull
      ? oneEntryPerStudent
        ? `With deduct on, each pull removes ${pointsPerTicket} pts from every eligible student (one ticket each).`
        : `With deduct on, each pull removes each student’s full ticket value in points (slots × ${pointsPerTicket}).`
      : 'Deduct is off: spins never change balances.';

  return (
    <>
      <Card className="w-full border-t-4 border-primary shadow-md overflow-hidden">
        <CardHeader className="flex flex-row justify-between items-center py-6">
          <div>
            <Helper content={
              canEditSettings ? (
                <div className="space-y-2 text-sm">
                  <p>Configure the pool below, then open the jackpot or wheel — same odds, different animation.</p>
                  <p>Set <strong>points per ticket</strong> to <strong>0</strong> for a general raffle. Otherwise use <strong>equal odds</strong> (one entry per qualifying student) or <strong>scaled odds</strong> (more points → more tickets).</p>
                  <p>If <strong>Deduct points when you pull</strong> is on, points are taken after the spin when there is a ticket value.</p>
                </div>
              ) : "Rules are read-only here. Use the draw buttons for your current class scope; edit settings from a teacher or admin session."
            }>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" aria-hidden />
                Weekly raffle
              </CardTitle>
            </Helper>
            <CardDescription>Configure rules and draw the weekly raffle.</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
            {canEditSettings ? (
              <section className="space-y-3">
                <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Pool rules</h2>
                <div className="rounded-2xl border bg-muted/15 p-4 shadow-sm sm:p-5">
                  <div className="grid gap-4 lg:grid-cols-3 items-start">
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
                        className="h-11 w-full max-w-[11rem] rounded-xl font-mono bg-background"
                      />
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {isGeneralRaffle ? (
                          <>
                            <span className="font-medium text-foreground">0</span> = general raffle: one pool entry per student; points are
                            not used for tickets.
                          </>
                        ) : (
                          <>
                            Example: 25 points = 1 ticket. Tickets ={' '}
                            <span className="font-mono text-foreground">⌊points / {pointsPerTicket}⌋</span>.
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex items-start justify-between gap-3 rounded-xl border bg-background/80 p-3.5 shadow-sm">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-semibold leading-snug">One entry per student</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {isGeneralRaffle ? (
                            <>Only applies when points per ticket is 1 or more; general raffle is already one entry each.</>
                          ) : (
                            <>
                              Everyone with at least {pointsPerTicket} pts gets <span className="font-medium text-foreground">one</span>{' '}
                              chance. Off = ticket counts from points (better odds with more tickets).
                            </>
                          )}
                        </p>
                      </div>
                      <Switch
                        className="shrink-0"
                        checked={oneEntryPerStudent}
                        onCheckedChange={(checked) => updateSettings({ raffleOneEntryPerStudent: !!checked })}
                      />
                    </div>

                    <div className="flex items-start justify-between gap-3 rounded-xl border bg-background/80 p-3.5 shadow-sm">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-semibold leading-snug">Deduct on pull</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {isGeneralRaffle ? (
                            <>No ticket value at 0 per ticket — spins do not change balances.</>
                          ) : oneEntryPerStudent ? (
                            <>
                              After each spin, subtract <span className="font-medium text-foreground">{pointsPerTicket} pts</span> per
                              eligible student (one ticket). Scaled mode uses each student&apos;s full ticket value.
                            </>
                          ) : (
                            <>
                              Subtract each student&apos;s full ticket value (slots × {pointsPerTicket} pts). Off = no balance
                              changes.
                            </>
                          )}
                        </p>
                      </div>
                      <Switch
                        className="shrink-0"
                        checked={deductOnPull}
                        onCheckedChange={(checked) => updateSettings({ raffleDeductPoints: !!checked })}
                      />
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <section className="space-y-3">
                <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Current rules</h2>
                <dl className="grid gap-2 rounded-2xl border bg-muted/15 p-4 text-sm shadow-sm sm:grid-cols-2">
                  <div className="rounded-lg bg-background/80 px-3 py-2">
                    <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Points / ticket</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
                      {isGeneralRaffle ? '0 (general)' : pointsPerTicket}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-background/80 px-3 py-2">
                    <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Odds</dt>
                    <dd className="mt-0.5 font-medium leading-snug text-foreground">
                      {isGeneralRaffle
                        ? 'One entry per student'
                        : oneEntryPerStudent
                          ? 'Equal (one entry each)'
                          : 'Scaled from points'}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-background/80 px-3 py-2">
                    <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Deduct on pull</dt>
                    <dd className="mt-0.5 font-semibold text-foreground">{deductOnPull ? 'On' : 'Off'}</dd>
                  </div>
                  <div className="rounded-lg bg-background/80 px-3 py-2">
                    <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Saved display</dt>
                    <dd className="mt-0.5 font-medium text-foreground">
                      {raffleDisplayMode === 'wheel' ? 'Spinning wheel' : 'Jackpot reels'}
                    </dd>
                  </div>
                </dl>
              </section>
            )}

            <section className="space-y-3">
              <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Run draw</h2>
              <p className="text-xs text-muted-foreground">
                Same pool and deduct behavior — only the animation changes. Wheel slices reflect ticket weights.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setDrawDialogMode('jackpot');
                    if (canEditSettings) updateSettings({ raffleDisplayMode: 'jackpot' });
                    setDrawDialogOpen(true);
                  }}
                  className={drawButtonClass(raffleDisplayMode === 'jackpot')}
                >
                  <div className="flex h-full w-28 shrink-0 items-center justify-center bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-3 dark:from-indigo-500/20 dark:to-purple-500/20">
                    <span className="text-[3.5rem] leading-none transition-transform duration-300 group-hover:scale-110 drop-shadow-md">🎰</span>
                  </div>
                  <div className="flex flex-col gap-1.5 py-3 pr-4">
                    <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Dices className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      Jackpot (reels)
                    </span>
                    <span className="text-xs font-normal leading-snug text-muted-foreground">
                      {canEditSettings
                        ? 'Three-reel pull — also saves as your preferred display.'
                        : 'Three-reel pull using saved settings.'}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrawDialogMode('wheel');
                    if (canEditSettings) updateSettings({ raffleDisplayMode: 'wheel' });
                    setDrawDialogOpen(true);
                  }}
                  className={drawButtonClass(raffleDisplayMode === 'wheel')}
                >
                  <div className="flex h-full w-28 shrink-0 items-center justify-center bg-gradient-to-br from-pink-500/10 to-orange-500/10 p-3 dark:from-pink-500/20 dark:to-orange-500/20">
                    <span className="text-[3.5rem] leading-none transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 drop-shadow-md">🎡</span>
                  </div>
                  <div className="flex flex-col gap-1.5 py-3 pr-4">
                    <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Disc3 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      Spinning wheel
                    </span>
                    <span className="text-xs font-normal leading-snug text-muted-foreground">
                      {canEditSettings
                        ? 'Weighted wheel — also saves as your preferred display.'
                        : 'Weighted wheel using saved settings.'}
                    </span>
                  </div>
                </button>
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Pool &amp; result</h2>
              <div className="flex flex-col gap-4 rounded-2xl border bg-muted/20 p-4 shadow-inner sm:flex-row sm:items-stretch sm:gap-4">
                <div className="flex flex-1 flex-wrap gap-2.5">
                  <div className="flex min-w-[7.5rem] flex-1 items-center gap-2 rounded-xl border bg-background px-3 py-2.5 shadow-sm">
                    <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <div>
                      <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Eligible</p>
                      <p className="text-lg font-black tabular-nums leading-none text-foreground">{entries.length}</p>
                    </div>
                  </div>
                  <div className="flex min-w-[7.5rem] flex-1 items-center gap-2 rounded-xl border bg-background px-3 py-2.5 shadow-sm">
                    <Ticket className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <div>
                      <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">In pool</p>
                      <p className="text-lg font-black tabular-nums leading-none text-foreground">{totalTickets}</p>
                      <p className="mt-0.5 text-[0.65rem] leading-tight text-muted-foreground">
                        {isGeneralRaffle ? 'general' : oneEntryPerStudent ? 'equal odds' : 'ticket slots'}
                      </p>
                    </div>
                  </div>
                </div>

                {winner ? (
                  <div className="flex flex-1 items-center gap-3 rounded-xl border-2 border-primary/35 bg-primary/8 px-4 py-3 shadow-sm sm:min-w-[12rem] sm:max-w-sm">
                    <Trophy className="h-8 w-8 shrink-0 text-primary" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-[0.65rem] font-bold uppercase tracking-wider text-primary">Last winner</p>
                      <p className="truncate text-lg font-black tracking-tight text-foreground">{winner.name}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 items-center rounded-xl border border-dashed bg-background/50 px-3 py-2.5 sm:max-w-2xl">
                    <p className="text-xs leading-relaxed text-muted-foreground">{poolHint}</p>
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">Entries preview</h2>
                <p className="text-xs text-muted-foreground sm:max-w-[min(42rem,72%)] sm:text-right">
                  {isGeneralRaffle
                    ? 'One pool entry each; balances shown for reference.'
                    : oneEntryPerStudent
                      ? 'One entry each if qualified; full tickets from points for reference.'
                      : 'Rows weighted by ticket count from points.'}
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
                <div className="max-h-[min(22rem,45vh)] divide-y overflow-y-auto overscroll-contain">
                  {entries.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {isGeneralRaffle ? 'No students in this list yet.' : `No students with at least ${pointsPerTicket} points yet.`}
                    </div>
                  ) : (
                    entries.slice(0, 50).map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{r.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {isGeneralRaffle ? (
                              <>
                                {r.points} pts · one entry
                                {deductOnPull && r.deductPoints > 0 ? ` · on pull −${r.deductPoints} pts` : ''}
                              </>
                            ) : (
                              <>
                                {r.points} pts → {r.fullTickets} ticket(s)
                                {oneEntryPerStudent ? ` → ${r.tickets} pool entr${r.tickets === 1 ? 'y' : 'ies'}` : ''}
                                {deductOnPull ? ` · on pull −${r.deductPoints} pts` : ''}
                              </>
                            )}
                          </p>
                        </div>
                        <div
                          className={cn(
                            'shrink-0 rounded-lg border bg-muted/40 px-2.5 py-1 text-xs font-black tabular-nums text-foreground',
                          )}
                        >
                          ×{r.tickets}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {entries.length > 50 ? (
                  <div className="border-t bg-muted/25 px-4 py-2 text-center text-xs text-muted-foreground">
                    Showing first 50 of {entries.length} students.
                  </div>
                ) : null}
              </div>
            </section>
        </CardContent>
      </Card>

      <Dialog open={drawDialogOpen} onOpenChange={setDrawDialogOpen}>
        <DialogContent size="xl" className="gap-0 p-0 sm:p-0 max-h-[95vh] overflow-y-auto overflow-x-hidden">
          <DialogTitle className="sr-only">{drawDialogMode === 'wheel' ? 'Prize wheel' : 'Jackpot'}</DialogTitle>
          <div className="p-2 sm:p-4">
            {drawDialogOpen &&
              (drawDialogMode === 'wheel' ? (
                <RaffleSpinWheel
                  embedded
                  title="Prize wheel"
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
                  title="Jackpot"
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
    </>
  );
}
