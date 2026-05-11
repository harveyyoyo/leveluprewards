'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dices, Gift, Loader2, Ticket } from 'lucide-react';
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

const REEL_ROW_PX = 52;
const REEL_SLOT_COUNT = 38;

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
   const [isSpinning, setIsSpinning] = useState(false);
   const [reelStrip, setReelStrip] = useState<string[]>([]);
   const [reelTranslateY, setReelTranslateY] = useState(0);
   const [reelTransition, setReelTransition] = useState<string>('none');
   const spinEndTimeoutRef = useRef<number | null>(null);

   useEffect(() => {
     return () => {
       if (spinEndTimeoutRef.current != null) {
         window.clearTimeout(spinEndTimeoutRef.current);
         spinEndTimeoutRef.current = null;
       }
     };
   }, []);

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

   const pickWeightedDisplayName = useCallback((): string => {
     const row = pickWeightedWinner();
     return row?.name ?? '???';
   }, [pickWeightedWinner]);

   const spin = () => {
     if (isSpinning) return;
     if (totalTickets <= 0) {
       toast({ variant: 'destructive', title: 'No entries', description: `No students have at least ${pointsPerTicket} points.` });
       return;
     }

     const w = pickWeightedWinner();
     if (!w) return;

     if (spinEndTimeoutRef.current != null) {
       window.clearTimeout(spinEndTimeoutRef.current);
       spinEndTimeoutRef.current = null;
     }

     const reduceMotion =
       typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

     if (reduceMotion) {
       setWinner({ id: w.id, name: w.name });
       return;
     }

     const strip: string[] = [];
     for (let i = 0; i < REEL_SLOT_COUNT - 1; i++) {
       strip.push(pickWeightedDisplayName());
     }
     strip.push(w.name);

     setWinner(null);
     setReelStrip(strip);
     setIsSpinning(true);

     // Start at top of strip (shows early filler), then ease into the final row.
     const startY = 0;
     const finalY = -(strip.length - 1) * REEL_ROW_PX;

     requestAnimationFrame(() => {
       setReelTransition('none');
       setReelTranslateY(startY);
       requestAnimationFrame(() => {
         requestAnimationFrame(() => {
           setReelTransition('transform 3.4s cubic-bezier(0.12, 0.72, 0.12, 1)');
           setReelTranslateY(finalY);
         });
       });
     });

     spinEndTimeoutRef.current = window.setTimeout(() => {
       spinEndTimeoutRef.current = null;
       setWinner({ id: w.id, name: w.name });
       setIsSpinning(false);
       setReelTransition('none');
     }, 3600) as unknown as number;
   };
 
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
     if (spinEndTimeoutRef.current != null) {
       window.clearTimeout(spinEndTimeoutRef.current);
       spinEndTimeoutRef.current = null;
     }
     setIsSpinning(false);
     setReelStrip([]);
     setReelTranslateY(0);
     setReelTransition('none');
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
             Convert points into raffle tickets, then spin a weighted wheel to pick a winner.
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
 
           <div className="flex flex-col sm:flex-row gap-2">
             <Button
               onClick={() => void generateEntriesAndMaybeDeduct()}
               className="h-11 rounded-xl font-black"
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
 
             <Button
               variant="outline"
               onClick={spin}
               className="h-11 rounded-xl font-black"
               disabled={entries.length === 0 || isSpinning}
               title={entries.length === 0 ? 'No eligible students yet' : 'Spin the jackpot reel'}
             >
               <Dices className="mr-2 h-4 w-4" aria-hidden />
               {isSpinning ? 'Spinning…' : 'Spin'}
             </Button>
           </div>

           {/* Jackpot-style single reel */}
           <div
             className={cn(
               'relative overflow-hidden rounded-2xl border-4 border-amber-400/90',
               'bg-gradient-to-b from-amber-950 via-amber-900 to-zinc-950',
               'shadow-[inset_0_2px_0_rgba(255,255,255,0.12),0_18px_40px_rgba(0,0,0,0.45)]',
             )}
             aria-live="polite"
           >
             <div className="absolute inset-x-0 top-2 flex justify-center gap-1.5 z-20 pointer-events-none">
               {Array.from({ length: 7 }).map((_, i) => (
                 <span
                   key={i}
                   className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)] animate-pulse"
                   style={{ animationDelay: `${i * 120}ms` }}
                 />
               ))}
             </div>
             <div className="px-4 pt-7 pb-3 text-center">
               <p className="text-[10px] font-black tracking-[0.35em] text-amber-200/90 uppercase">Jackpot</p>
               <p className="text-xs text-amber-100/70">Weighted by raffle tickets</p>
             </div>

             <div className="relative mx-3 mb-4 rounded-xl border border-black/40 bg-black/35">
               {/* Payline */}
               <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 h-[52px] border-y-2 border-amber-300/80 shadow-[0_0_0_1px_rgba(0,0,0,0.35)] bg-amber-400/10" />
               <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 z-10 h-0 w-0 border-y-[10px] border-y-transparent border-l-[12px] border-l-amber-300" />
               <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 z-10 h-0 w-0 border-y-[10px] border-y-transparent border-r-[12px] border-r-amber-300" />

               <div className="h-[52px] overflow-hidden relative">
                 {reelStrip.length > 0 ? (
                   <div
                     className="will-change-transform"
                     style={{
                       transform: `translateY(${reelTranslateY}px)`,
                       transition: reelTransition,
                     }}
                   >
                     {reelStrip.map((label, idx) => (
                       <div
                         key={`${idx}-${label}`}
                         className="flex h-[52px] items-center justify-center px-4"
                       >
                         <span
                           className={cn(
                             'truncate text-center text-lg sm:text-xl font-black tracking-tight',
                             'bg-gradient-to-b from-amber-100 to-amber-300 bg-clip-text text-transparent',
                             'drop-shadow-[0_2px_0_rgba(0,0,0,0.65)]',
                           )}
                         >
                           {label}
                         </span>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="flex h-[52px] items-center justify-center px-4 text-sm font-semibold text-amber-100/60">
                     Press Spin for a student jackpot roll…
                   </div>
                 )}
               </div>
             </div>
           </div>
 
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
                 Tip: click <span className="font-semibold">Generate tickets</span> first if you want to deduct points.
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

