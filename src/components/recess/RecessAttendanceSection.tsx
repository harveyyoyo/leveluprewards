'use client';

import { useMemo, useState } from 'react';
import {
  DoorOpen,
  Timer,
  CheckCircle2,
  History,
  Monitor,
  Printer,
  Check,
} from 'lucide-react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { RecessLogEntry, RecessReason } from '@/lib/types';
import { useActiveRecessPasses } from '@/hooks/useActiveRecessPasses';
import { formatBathroomElapsed, isBathroomOverLimit } from '@/lib/bathroom/formatBathroomElapsed';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import {
  StaffPortalSectionCard,
  StaffPortalSectionCardContent,
  StaffPortalSectionCardHeader,
  StaffPortalSectionCardTitle,
} from '@/components/staff/StaffPortalSection';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Switch } from '@/components/ui/switch';
import {
  RECESS_REASONS,
  RECESS_REASON_BY_VALUE,
  recessReasonBadgeClasses,
  type RecessReasonMeta,
} from '@/lib/recess/recessReasons';
import { resolveRecessMaxMinutes } from '@/lib/recess/recessKioskSettings';
import { recessPassScanCodeFor } from '@/lib/recess/recessPassScanCode';
import { PrintBarcode } from '@/components/print/PrintBarcode';
import { IdCardPrintSetupDialog } from '@/components/admin/IdCardPrintSetupDialog';
import { usePrint } from '@/components/providers/PrintProvider';

const LIMIT_OPTIONS = [5, 10, 15] as const;

function formatClock(ts: number): string {
  if (!Number.isFinite(ts)) return '';
  try {
    return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function RecessAttendanceSection({
  schoolId,
  variant = 'admin',
}: {
  schoolId: string;
  variant?: 'admin' | 'teacher';
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { settings, updateSettings } = useSettings();
  const { setRecessPassesToPrint } = usePrint();
  const maxMinutes = resolveRecessMaxMinutes(settings);

  const [passPrintJob, setPassPrintJob] = useState<RecessReasonMeta[] | null>(null);
  const [selectedPassReasons, setSelectedPassReasons] = useState<Set<RecessReason>>(
    () => new Set(RECESS_REASONS.map((r) => r.value)),
  );

  const passesToPrint = useMemo(
    () => RECESS_REASONS.filter((r) => selectedPassReasons.has(r.value)),
    [selectedPassReasons],
  );

  const togglePassSelection = (reason: RecessReason) => {
    setSelectedPassReasons((prev) => {
      const next = new Set(prev);
      if (next.has(reason)) next.delete(reason);
      else next.add(reason);
      return next;
    });
  };

  const selectAllPasses = () => {
    setSelectedPassReasons(new Set(RECESS_REASONS.map((r) => r.value)));
  };

  const clearPassSelection = () => {
    setSelectedPassReasons(new Set());
  };

  const handlePrintPasses = () => {
    if (passesToPrint.length === 0) {
      toast({
        title: 'Pick passes to print',
        description: 'Tap one or more pass cards below, then print.',
      });
      return;
    }
    setPassPrintJob(passesToPrint);
  };

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
            limit(25),
          )
        : null,
    [firestore, schoolId],
  );
  const { data: logRows } = useCollection<RecessLogEntry>(logQuery);

  const now = Date.now();

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <StaffPortalSectionCard>
        <StaffPortalSectionCardHeader>
          <StaffPortalSectionCardTitle className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-ring" aria-hidden />
            Checked out now
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
              description="Students scan their ID at the kiosk, then scan a recess pass to check out. They scan the same pass again to return."
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
                          {pass.note ? ` · ${pass.note}` : ''} · out since {formatClock(pass.startedAt)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 font-mono text-sm font-bold tabular-nums',
                        over ? 'text-red-600 dark:text-red-300' : 'text-foreground',
                      )}
                    >
                      {formatBathroomElapsed(elapsed)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </StaffPortalSectionCardContent>
      </StaffPortalSectionCard>

      <StaffPortalSectionCard className="w-full overflow-hidden">
        <StaffPortalSectionCardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StaffPortalSectionCardTitle className="flex items-center gap-2 text-base">
              <Printer className="h-4 w-4 text-ring" aria-hidden />
              Printable recess passes
            </StaffPortalSectionCardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl text-xs font-bold text-muted-foreground"
                onClick={selectAllPasses}
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl text-xs font-bold text-muted-foreground"
                onClick={clearPassSelection}
                disabled={selectedPassReasons.size === 0}
              >
                Clear
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl font-bold"
                onClick={handlePrintPasses}
                disabled={passesToPrint.length === 0}
              >
                <Printer className="mr-2 h-4 w-4" aria-hidden />
                Print selected ({passesToPrint.length})
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Students sign in with their ID at the kiosk, then scan a pass at the coupon scanner. Scan the same
            pass again when they return.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {RECESS_REASONS.map((meta) => {
              const Icon = meta.icon;
              const selected = selectedPassReasons.has(meta.value);
              return (
                <button
                  key={meta.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => togglePassSelection(meta.value)}
                  className={cn(
                    'relative rounded-xl border-2 p-4 text-left transition-all',
                    meta.badge,
                    selected
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-sm'
                      : 'opacity-55 hover:opacity-90',
                  )}
                >
                  <span
                    className={cn(
                      'absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border-2',
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border/60 bg-background/80 text-transparent',
                    )}
                    aria-hidden
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <div className="flex items-center gap-2 pr-6">
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                    <span className="font-bold">{meta.label}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed opacity-80">{meta.kioskDescription}</p>
                  <div className="mt-3 rounded-lg border border-border/50 bg-white px-2 py-2">
                    <PrintBarcode value={recessPassScanCodeFor(meta.value)} variant="prize-id" />
                  </div>
                </button>
              );
            })}
          </div>
        </StaffPortalSectionCardContent>
      </StaffPortalSectionCard>

      {passPrintJob ? (
        <IdCardPrintSetupDialog
          variant="recess-pass"
          open
          onOpenChange={(open) => {
            if (!open) setPassPrintJob(null);
          }}
          passes={passPrintJob}
          onConfirm={(args) => {
            setRecessPassesToPrint({ ...args, schoolId });
            setPassPrintJob(null);
            toast({
              title: args.passes.length === 1 ? 'Printing recess pass' : 'Printing recess passes',
              description: `${args.passes.length} pass card(s) sent to the printer.`,
            });
          }}
        />
      ) : null}

      {variant === 'admin' ? (
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
                  When enabled, the student kiosk coupon scanner recognizes printed passes. Students scan their ID,
                  then scan a pass to leave and scan the same pass again to return.
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
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Time limit before over-limit alert</Label>
              <div className="flex gap-2">
                {LIMIT_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => updateSettings({ recessMaxMinutes: m })}
                    aria-pressed={maxMinutes === m}
                    className={cn(
                      'flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors sm:max-w-[6rem]',
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
          </StaffPortalSectionCardContent>
        </StaffPortalSectionCard>
      ) : (
        <p className="rounded-xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground leading-relaxed">
          Kiosk scanning and the {maxMinutes}-minute over-limit alert are school-wide settings. Your school admin
          can change them under Attendance → Room passes.
        </p>
      )}

      <StaffPortalSectionCard>
        <StaffPortalSectionCardHeader>
          <StaffPortalSectionCardTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" aria-hidden />
            Recent activity
          </StaffPortalSectionCardTitle>
        </StaffPortalSectionCardHeader>
        <StaffPortalSectionCardContent>
          {!logRows || logRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recess trips logged yet today.</p>
          ) : (
            <ul className="divide-y divide-border">
              {logRows.map((row) => {
                const meta = RECESS_REASON_BY_VALUE.get(row.reason);
                return (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <span className="font-medium text-foreground">{row.studentName || row.studentId}</span>
                      <span className="ml-2 text-muted-foreground">
                        {meta?.label ?? row.reason}
                        {row.note ? ` · ${row.note}` : ''}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Out {formatClock(row.startedAt)} → back {formatClock(row.returnedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span
                        className={cn(
                          'font-mono text-sm tabular-nums font-semibold',
                          row.overLimit ? 'text-red-600 dark:text-red-300' : 'text-muted-foreground',
                        )}
                      >
                        {formatBathroomElapsed(Number(row.durationMs) || 0)}
                      </span>
                      {row.overLimit ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-red-600 dark:text-red-300">
                          Over limit
                        </span>
                      ) : null}
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
