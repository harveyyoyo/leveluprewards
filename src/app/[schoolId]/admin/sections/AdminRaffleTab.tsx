'use client';

import { useCallback, useMemo, useState } from 'react';
import { Gift, Loader2, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
 
   const [isGenerating, setIsGenerating] = useState(false);
   const [lastGeneratedAt, setLastGeneratedAt] = useState<number | null>(null);
   const [winner, setWinner] = useState<{ id: string; name: string } | null>(null);
   const [jackpotResetKey, setJackpotResetKey] = useState(0);

   const pointsPerTicket = Math.max(1, Math.floor(Number(settings.rafflePointsPerTicket || 25)));
   const deductOnGenerate = !!settings.raffleDeductPoints;
 
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

   const jackpotPool = useMemo(
     () => entries.map((e) => ({ id: e.id, name: e.name })),
     [entries],
   );

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

   const handleJackpotSpinFinished = useCallback((w: { id: string; name: string }) => {
     setWinner({ id: w.id, name: w.name });
   }, []);

   const generateEntriesAndMaybeDeduct = async () => {
     if (!firestore) {
       toast({ variant: 'destructive', title: 'Firestore not ready', description: 'Try again in a moment.' });
       return;
     }
     if (entries.length === 0) {
       toast({ variant: 'destructive', title: 'No entries', description: `No students have at least ${pointsPerTicket} points.` });
       return;
     }
 
     setIsGenerating(true);
     setWinner(null);
     setJackpotResetKey((k) => k + 1);
     try {
       if (deductOnGenerate) {
         // Variable deductions require per-student amounts; do it in one transaction.
         const now = Date.now();
         await runTransaction(firestore, async (tx) => {
           for (const r of entries) {
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
 
         toast({
           title: 'Tickets generated',
           description: `Created ${totalTickets} ticket(s) and deducted points from ${entries.length} student(s).`,
         });
       } else {
         toast({
           title: 'Tickets generated',
           description: `Created ${totalTickets} ticket(s). (No points deducted.)`,
         });
       }
 
       setLastGeneratedAt(Date.now());
     } catch (e: any) {
       toast({ variant: 'destructive', title: 'Could not generate tickets', description: e?.message || 'Try again.' });
     } finally {
       setIsGenerating(false);
     }
   };
 
   return (
     <div className="space-y-6">
       <Card className="border shadow-sm">
         <CardHeader className="border-b bg-muted/20">
           <CardTitle className="flex items-center gap-2">
             <Ticket className="h-5 w-5 text-muted-foreground" aria-hidden />
             Weekly raffle
           </CardTitle>
           <CardDescription>
             Eligible students are listed from current points. Use <span className="font-semibold">Generate tickets</span> only
             if you want to deduct those points and record a raffle activity; the wheel uses the same ticket weights either way.
           </CardDescription>
         </CardHeader>
         <CardContent className="pt-6 space-y-5">
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
               <div className="flex items-center justify-between gap-3 rounded-xl border p-3 bg-background">
                 <div className="min-w-0">
                   <p className="text-sm font-semibold">Deduct points when generating tickets</p>
                   <p className="text-xs text-muted-foreground">
                     If on, points are deducted immediately and a negative activity is recorded.
                   </p>
                 </div>
                 <Switch
                   checked={deductOnGenerate}
                   onCheckedChange={(checked) => updateSettings({ raffleDeductPoints: !!checked })}
                 />
               </div>
             </div>
           </div>
 
           <Button
             onClick={() => void generateEntriesAndMaybeDeduct()}
             className="h-11 rounded-xl font-black w-full sm:w-auto"
             disabled={isGenerating}
           >
             {isGenerating ? (
               <>
                 <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                 Generating…
               </>
             ) : (
               <>
                 <Gift className="mr-2 h-4 w-4" aria-hidden />
                 Generate tickets
               </>
             )}
           </Button>
           <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
             <span className="font-semibold text-foreground">Generate tickets</span> does not create a separate ticket list—it
             optionally <span className="font-semibold">subtracts points</span> from each eligible student (tickets × points per
             ticket) and writes a matching negative line to their activity log, so the ledger matches a live raffle draw. If
             &quot;Deduct points when generating tickets&quot; is off, the button only shows a summary toast (no Firestore changes);
             spins still use ticket counts from current points.
           </p>

           <JackpotMachine
             embedded
             title="Weekly jackpot"
             pool={jackpotPool}
             pickWinner={handleJackpotPickWinner}
             onSpinFinished={handleJackpotSpinFinished}
             resetKey={jackpotResetKey}
           />

           <div className="rounded-2xl border bg-muted/20 p-4 flex flex-col gap-2">
             <div className="flex flex-wrap items-center gap-2 text-sm">
               <span className="font-black">{entries.length}</span>
               <span className="text-muted-foreground">student(s) eligible</span>
               <span className="text-muted-foreground">•</span>
               <span className="font-black">{totalTickets}</span>
               <span className="text-muted-foreground">total ticket(s)</span>
               {lastGeneratedAt ? (
                 <>
                   <span className="text-muted-foreground">•</span>
                   <span className="text-xs text-muted-foreground">
                     Generated {new Date(lastGeneratedAt).toLocaleString()}
                   </span>
                 </>
               ) : null}
             </div>
             {winner ? (
               <div className="mt-2 rounded-xl bg-background border p-4">
                 <p className="text-xs font-semibold text-muted-foreground">Winner</p>
                 <p className="text-xl font-black tracking-tight">{winner.name}</p>
               </div>
             ) : (
               <p className="text-xs text-muted-foreground">
                 Tip: use <span className="font-semibold">Generate tickets</span> first if you want to deduct points, then{' '}
                 <span className="font-semibold">PULL!</span> on the machine.
               </p>
             )}
           </div>
 
           <div className="overflow-hidden rounded-2xl border">
             <div className="bg-background px-4 py-3 border-b">
               <p className="text-sm font-black">Entries preview</p>
               <p className="text-xs text-muted-foreground">
                 Each student is entered as many times as they have tickets.
               </p>
             </div>
             <div className="divide-y bg-background">
               {entries.length === 0 ? (
                 <div className="p-4 text-sm text-muted-foreground">
                   No students have at least {pointsPerTicket} points yet.
                 </div>
               ) : (
                 entries.slice(0, 50).map((r) => (
                   <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                     <div className="min-w-0 flex-1">
                       <p className="truncate font-semibold">{r.name}</p>
                       <p className="text-xs text-muted-foreground">
                         {r.points} pts → {r.tickets} ticket(s)
                         {deductOnGenerate ? ` (deduct ${r.deductPoints})` : ''}
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
                 <div className="p-3 text-xs text-muted-foreground bg-muted/20">
                   Showing first 50 of {entries.length} students.
                 </div>
               ) : null}
             </div>
           </div>
         </CardContent>
       </Card>
     </div>
   );
 }

