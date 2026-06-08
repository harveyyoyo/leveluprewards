'use client';

import { useMemo, useState } from 'react';
import {
  DoorOpen,
  Footprints,
  GlassWater,
  HeartPulse,
  Building2,
  Timer,
  CheckCircle2,
  Clock,
  Info,
  History,
  type LucideIcon,
} from 'lucide-react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { RecessLogEntry, RecessReason, Student } from '@/lib/types';
import { startRecessCheckout, endRecessCheckout } from '@/lib/db/recess';
import { useActiveRecessPasses } from '@/hooks/useActiveRecessPasses';
import { formatBathroomElapsed, isBathroomOverLimit } from '@/lib/bathroom/formatBathroomElapsed';
import { useToast } from '@/hooks/use-toast';
import { cn, getStudentNickname } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { LibraryStudentNamePicker } from '@/components/library/LibraryStudentNamePicker';
import {
  StaffPortalSectionCard,
  StaffPortalSectionCardContent,
  StaffPortalSectionCardHeader,
  StaffPortalSectionCardTitle,
} from '@/components/staff/StaffPortalSection';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';

type ReasonMeta = {
  value: RecessReason;
  label: string;
  icon: LucideIcon;
  /** Static Tailwind classes (full strings so the JIT compiler keeps them). */
  badge: string;
};

const REASONS: ReasonMeta[] = [
  {
    value: 'bathroom',
    label: 'Bathroom',
    icon: DoorOpen,
    badge: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-200',
  },
  {
    value: 'break',
    label: 'Break',
    icon: Footprints,
    badge: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-200',
  },
  {
    value: 'water',
    label: 'Water',
    icon: GlassWater,
    badge: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-200',
  },
  {
    value: 'nurse',
    label: 'Nurse',
    icon: HeartPulse,
    badge: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-200',
  },
  {
    value: 'office',
    label: 'Office',
    icon: Building2,
    badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  },
];

const REASON_BY_VALUE = new Map(REASONS.map((r) => [r.value, r]));

function reasonBadgeClasses(reason: RecessReason): string {
  return REASON_BY_VALUE.get(reason)?.badge ?? 'border-border bg-muted text-muted-foreground';
}

const LIMIT_OPTIONS = [5, 10, 15] as const;

function studentDisplayName(s: Student): string {
  return `${getStudentNickname(s)} ${s.lastName ?? ''}`.trim() || s.id;
}

function formatClock(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function AdminRecessTab({ schoolId, students }: { schoolId: string; students: Student[] }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reason, setReason] = useState<RecessReason>('bathroom');
  const [note, setNote] = useState('');
  const [maxMinutes, setMaxMinutes] = useState<number>(10);
  const [pickerKey, setPickerKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const activePasses = useActiveRecessPasses(schoolId, true);

  const outNow = useMemo(() => {
    return Array.from(activePasses.values()).sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0));
  }, [activePasses]);

  const logQuery = useMemoFirebase(
    () =>
      schoolId
        ? query(
            collection(firestore, 'schools', schoolId, 'recessLog'),
            orderBy('returnedAt', 'desc'),
            limit(15),
          )
        : null,
    [firestore, schoolId],
  );
  const { data: logRows } = useCollection<RecessLogEntry>(logQuery);

  const selectedAlreadyOut = selectedStudent ? activePasses.has(selectedStudent.id) : false;

  const resetSelection = () => {
    setSelectedStudent(null);
    setNote('');
    setPickerKey((k) => k + 1);
  };

  const handleCheckout = async () => {
    if (!selectedStudent) {
      toast({ title: 'Pick a student first', description: 'Search by name, then tap Check out.' });
      return;
    }
    if (selectedAlreadyOut) {
      toast({ title: 'Already out', description: `${studentDisplayName(selectedStudent)} is already checked out.` });
      return;
    }
    setBusy(true);
    try {
      await startRecessCheckout(firestore, schoolId, selectedStudent, {
        reason,
        note,
        classId: selectedStudent.classId,
      });
      toast({
        title: 'Checked out',
        description: `${studentDisplayName(selectedStudent)} is out for ${REASON_BY_VALUE.get(reason)?.label.toLowerCase()}.`,
      });
      resetSelection();
    } catch {
      toast({ title: 'Could not check out', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleCheckin = async (studentId: string, studentName?: string) => {
    try {
      await endRecessCheckout(firestore, schoolId, studentId, maxMinutes);
      toast({ title: 'Welcome back', description: `${studentName || 'Student'} checked in.` });
    } catch {
      toast({ title: 'Could not check in', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const now = Date.now();

  return (
    <div className="space-y-4">
      {/* What this is + when to use it */}
      <StaffPortalSectionCard>
        <StaffPortalSectionCardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <DoorOpen className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <StaffPortalSectionCardTitle>Recess &amp; bathroom checkout</StaffPortalSectionCardTitle>
                <p className="text-sm text-muted-foreground">
                  Know exactly who is out of the room — and for how long.
                </p>
              </div>
            </div>
            <TabWalkthroughHeaderAction />
          </div>
        </StaffPortalSectionCardHeader>
        <StaffPortalSectionCardContent className="space-y-4">
          <div className="rounded-xl border bg-muted/40 p-4 text-sm leading-relaxed">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              <Info className="h-4 w-4 text-primary" aria-hidden />
              What is this for?
            </p>
            <p className="mt-1 text-muted-foreground">
              Recess is a simple sign-out sheet for short trips away from the room. When a student leaves for
              the bathroom, a water break, a quick stretch, the nurse, or the office, you check them out here.
              A live timer starts so any adult can see who is currently out and how long they have been gone —
              then you check them back in when they return. Every trip is saved to a return log for safety,
              accountability, and patterns over time.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Use it when…
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                <li>• A student asks to use the bathroom or get water.</li>
                <li>• Someone needs a short movement or calm-down break.</li>
                <li>• A student is sent to the nurse or front office.</li>
                <li>• You want one shared answer to “who is out right now?”</li>
              </ul>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                <Clock className="h-4 w-4" aria-hidden />
                Keep in mind…
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                <li>• It tracks location, not points — nothing is added or deducted.</li>
                <li>• Cards turn red past the time limit so long trips stand out.</li>
                <li>• Remember to check students back in so the log stays accurate.</li>
                <li>• For full-day attendance, use the Attendance tab instead.</li>
              </ul>
            </div>
          </div>
        </StaffPortalSectionCardContent>
      </StaffPortalSectionCard>

      {/* Check a student out */}
      <StaffPortalSectionCard>
        <StaffPortalSectionCardHeader>
          <StaffPortalSectionCardTitle>Check a student out</StaffPortalSectionCardTitle>
        </StaffPortalSectionCardHeader>
        <StaffPortalSectionCardContent className="space-y-4">
          <LibraryStudentNamePicker
            key={pickerKey}
            students={students}
            disabled={busy}
            onSelect={(s) => setSelectedStudent(s)}
          />

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Reason</Label>
            <div className="flex flex-wrap gap-2">
              {REASONS.map((r) => {
                const Icon = r.icon;
                const active = reason === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(r.value)}
                    aria-pressed={active}
                    className={cn(
                      'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recess-note" className="text-xs font-semibold">
                Note <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="recess-note"
                value={note}
                disabled={busy}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. with the counselor"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Time limit</Label>
              <div className="flex gap-2">
                {LIMIT_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMaxMinutes(m)}
                    aria-pressed={maxMinutes === m}
                    className={cn(
                      'flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
                      maxMinutes === m
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedAlreadyOut ? (
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {selectedStudent ? studentDisplayName(selectedStudent) : 'This student'} is already checked out.
            </p>
          ) : null}

          <Button
            onClick={handleCheckout}
            disabled={busy || !selectedStudent || selectedAlreadyOut}
            className="w-full rounded-xl font-bold sm:w-auto"
          >
            <DoorOpen className="mr-2 h-4 w-4" aria-hidden />
            Check out{selectedStudent ? ` ${studentDisplayName(selectedStudent)}` : ''}
          </Button>
        </StaffPortalSectionCardContent>
      </StaffPortalSectionCard>

      {/* Out now */}
      <StaffPortalSectionCard>
        <StaffPortalSectionCardHeader>
          <StaffPortalSectionCardTitle className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" aria-hidden />
            Out now
            {outNow.length > 0 ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                {outNow.length}
              </span>
            ) : null}
          </StaffPortalSectionCardTitle>
        </StaffPortalSectionCardHeader>
        <StaffPortalSectionCardContent>
          {outNow.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              compact
              title="Everyone is in the room"
              description="When you check a student out, they’ll appear here with a live timer until they return."
            />
          ) : (
            <ul className="space-y-2">
              {outNow.map((pass) => {
                const elapsed = now - (pass.startedAt || now);
                const over = isBathroomOverLimit(elapsed, maxMinutes);
                const meta = REASON_BY_VALUE.get(pass.reason);
                const Icon = meta?.icon ?? DoorOpen;
                return (
                  <li
                    key={pass.studentId}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors',
                      over ? 'border-red-500/50 bg-red-500/10' : 'border-border bg-muted/30',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                          reasonBadgeClasses(pass.reason),
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {pass.studentName || pass.studentId}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {meta?.label ?? pass.reason}
                          {pass.note ? ` · ${pass.note}` : ''} · since {formatClock(pass.startedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={cn(
                          'font-mono text-sm font-bold tabular-nums',
                          over ? 'text-red-600 dark:text-red-300' : 'text-foreground',
                        )}
                      >
                        {formatBathroomElapsed(elapsed)}
                      </span>
                      <Button
                        size="sm"
                        variant={over ? 'destructive' : 'default'}
                        className="rounded-lg font-bold"
                        onClick={() => handleCheckin(pass.studentId, pass.studentName)}
                      >
                        Check in
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </StaffPortalSectionCardContent>
      </StaffPortalSectionCard>

      {/* Recent returns */}
      <StaffPortalSectionCard>
        <StaffPortalSectionCardHeader>
          <StaffPortalSectionCardTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" aria-hidden />
            Recent returns
          </StaffPortalSectionCardTitle>
        </StaffPortalSectionCardHeader>
        <StaffPortalSectionCardContent>
          {!logRows || logRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed trips yet today.</p>
          ) : (
            <ul className="divide-y divide-border">
              {logRows.map((row) => {
                const meta = REASON_BY_VALUE.get(row.reason);
                return (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <span className="font-medium text-foreground">{row.studentName || row.studentId}</span>
                      <span className="ml-2 text-muted-foreground">
                        {meta?.label ?? row.reason}
                        {row.note ? ` · ${row.note}` : ''}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={cn(
                          'font-mono tabular-nums',
                          row.overLimit ? 'text-red-600 dark:text-red-300' : 'text-muted-foreground',
                        )}
                      >
                        {formatBathroomElapsed(row.durationMs)}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatClock(row.returnedAt)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </StaffPortalSectionCardContent>
      </StaffPortalSectionCard>
    </div>
  );
}

export default AdminRecessTab;
