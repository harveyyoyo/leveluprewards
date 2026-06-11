'use client';

import { useMemo, useState } from 'react';
import {
  DoorOpen,
  Timer,
  CheckCircle2,
  History,
  Monitor,
  Printer,
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
import { useSettings } from '@/components/providers/SettingsProvider';
import { Switch } from '@/components/ui/switch';
import { StaffPortalTabPanel } from '@/components/staff/StaffPortalTabHeader';
import { RECESS_TAB_INFO_SECTIONS } from '@/lib/staffPortal/recessTabInfo';
import {
  RECESS_REASONS,
  KIOSK_RECESS_REASONS,
  RECESS_REASON_BY_VALUE,
  recessReasonBadgeClasses,
} from '@/lib/recess/recessReasons';
import { resolveRecessMaxMinutes } from '@/lib/recess/recessKioskSettings';
import { recessPassScanCodeFor } from '@/lib/recess/recessPassScanCode';
import { RecessPassPrintSheet } from '@/components/recess/RecessPassPrintSheet';

const LIMIT_OPTIONS = [5, 10, 15] as const;

function studentDisplayName(s: Student): string {
  return `${getStudentNickname(s)} ${s.lastName ?? ''}`.trim() || s.id;
}

function formatClock(ts: number): string {
  if (!Number.isFinite(ts)) return '';
  try {
    return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function AdminRecessTab({ schoolId, students }: { schoolId: string; students: Student[] }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { settings, updateSettings } = useSettings();
  const maxMinutes = resolveRecessMaxMinutes(settings);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reason, setReason] = useState<RecessReason>('bathroom');
  const [note, setNote] = useState('');
  const [pickerKey, setPickerKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [printingPasses, setPrintingPasses] = useState(false);

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
        description: `${studentDisplayName(selectedStudent)} is out for ${RECESS_REASON_BY_VALUE.get(reason)?.label.toLowerCase()}.`,
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
    <StaffPortalTabPanel
      tabValue="recess"
      infoSections={RECESS_TAB_INFO_SECTIONS}
      infoAriaLabel="About recess checkout"
      trailing={<TabWalkthroughHeaderAction />}
    >
      <StaffPortalSectionCard className="w-full overflow-hidden">
        <StaffPortalSectionCardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StaffPortalSectionCardTitle className="flex items-center gap-2 text-base">
              <Printer className="h-4 w-4 text-ring" aria-hidden />
              Printable recess passes
            </StaffPortalSectionCardTitle>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl font-bold"
              onClick={() => setPrintingPasses(true)}
            >
              <Printer className="mr-2 h-4 w-4" aria-hidden />
              Print pass cards
            </Button>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Print one laminated card per category. Students sign in with their ID at the kiosk, then scan the
            matching pass at the coupon scanner. Scan the same pass again when they return.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {KIOSK_RECESS_REASONS.map((meta) => {
              const Icon = meta.icon;
              return (
                <div
                  key={meta.value}
                  className={cn(
                    'rounded-xl border-2 p-4',
                    meta.badge,
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" aria-hidden />
                    <span className="font-bold">{meta.label}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed opacity-80">{meta.kioskDescription}</p>
                  <p className="mt-3 font-mono text-sm font-black tracking-wide">
                    {recessPassScanCodeFor(meta.value)}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Nurse and office passes ({recessPassScanCodeFor('nurse')}, {recessPassScanCodeFor('office')}) are
            included when you print — use them from the staff checkout section below.
          </p>
        </StaffPortalSectionCardContent>
      </StaffPortalSectionCard>

      {printingPasses ? (
        <RecessPassPrintSheet
          passes={RECESS_REASONS}
          schoolId={schoolId}
          onReady={() => {
            window.print();
            setPrintingPasses(false);
          }}
        />
      ) : null}

      <StaffPortalSectionCard>
        <StaffPortalSectionCardHeader>
          <StaffPortalSectionCardTitle className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-ring" aria-hidden />
            Student kiosk scanning
          </StaffPortalSectionCardTitle>
        </StaffPortalSectionCardHeader>
        <StaffPortalSectionCardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-xl border bg-muted/30 p-4">
            <div className="space-y-1">
              <Label htmlFor="recess-kiosk-enabled" className="text-sm font-semibold">
                Accept recess pass scans
              </Label>
              <p className="text-sm text-muted-foreground leading-relaxed">
                When enabled, the student kiosk coupon scanner recognizes printed passes (RCBATH, RCBREAK,
                RCWATER). Nothing appears on screen until a pass is scanned — then the student sees an
                &ldquo;out of room&rdquo; timer until they scan the pass again.
              </p>
              <p className="text-xs text-muted-foreground">
                Flow: student ID → recess pass scan (out) → recess pass scan again (back).
              </p>
            </div>
            <Switch
              id="recess-kiosk-enabled"
              checked={settings.recessStudentKioskEnabled !== false}
              onCheckedChange={(checked) =>
                updateSettings({
                  enableRecess: checked ? true : settings.enableRecess,
                  recessStudentKioskEnabled: checked,
                })
              }
            />
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
              {RECESS_REASONS.map((r) => {
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
                        ? 'border-primary bg-ring/10 text-ring'
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
                    onClick={() => updateSettings({ recessMaxMinutes: m })}
                    aria-pressed={maxMinutes === m}
                    className={cn(
                      'flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
                      maxMinutes === m
                        ? 'border-primary bg-ring/10 text-ring'
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
            <Timer className="h-4 w-4 text-ring" aria-hidden />
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
                const meta = RECESS_REASON_BY_VALUE.get(pass.reason);
                const Icon = meta?.icon ?? DoorOpen;
                return (
                  <li
                    key={pass.studentId}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-xl border p-3',
                      over ? 'border-red-500/50 bg-red-500/10' : 'border-border bg-muted/30',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                          recessReasonBadgeClasses(pass.reason),
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
                const meta = RECESS_REASON_BY_VALUE.get(row.reason);
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
                        {formatBathroomElapsed(Number(row.durationMs) || 0)}
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
    </StaffPortalTabPanel>
  );
}

export default AdminRecessTab;
