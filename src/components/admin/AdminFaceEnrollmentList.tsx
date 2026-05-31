'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { AlertTriangle, ChevronDown, Loader2, RefreshCw, ScanFace, Trash2 } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useFirebase } from '@/firebase';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { useToast } from '@/hooks/use-toast';
import { callableToastDescription } from '@/firebase/emulatorHints';
import {
  fetchSchoolFaceEnrollments,
  isActiveFaceEnrollment,
  notifyFaceEnrollmentChanged,
  type FaceEnrollmentRow,
} from '@/lib/faceEnrollment';
import type { Student } from '@/lib/types';
import { cn, getStudentNickname } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

type AdminFaceEnrollmentListProps = {
  students?: Student[] | null;
  onOpenFaceTraining?: (student: Student) => void;
  className?: string;
  /** When true, starts collapsed unless there are multiple active enrollments or orphans. */
  collapsible?: boolean;
};

function studentLabel(student: Student | undefined, studentId: string): string {
  if (!student) return studentId;
  const nick = getStudentNickname(student);
  const name = [nick, student.lastName].filter(Boolean).join(' ').trim();
  return name || studentId;
}

export function AdminFaceEnrollmentList({
  students,
  onOpenFaceTraining,
  className,
  collapsible = true,
}: AdminFaceEnrollmentListProps) {
  const { schoolId } = useAppContext();
  const { functions } = useFirebase();
  const confirm = useConfirm();
  const { toast } = useToast();

  const [rows, setRows] = useState<FaceEnrollmentRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [rosterOnly, setRosterOnly] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const studentById = useMemo(() => {
    const map = new Map<string, Student>();
    for (const s of students ?? []) map.set(s.id, s);
    return map;
  }, [students]);

  const refresh = useCallback(async () => {
    if (!schoolId || !functions) return;
    setBusy(true);
    setLoadError(null);
    setRosterOnly(false);
    try {
      const result = await fetchSchoolFaceEnrollments(schoolId, functions, students);
      setRows(result.rows);
      setRosterOnly(result.rosterOnly);
    } catch (listErr: unknown) {
      setRows(null);
      const message = callableToastDescription(
        listErr,
        'Deploy listSchoolFaceEnrollments or try again.',
      );
      setLoadError(message);
      toast({
        variant: 'destructive',
        title: 'Could not load face enrollments',
        description: message,
      });
    } finally {
      setBusy(false);
    }
  }, [schoolId, functions, students, toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeRows = useMemo(
    () => (rows ?? []).filter(isActiveFaceEnrollment),
    [rows],
  );
  const orphanRows = useMemo(
    () =>
      (rows ?? []).filter(
        (r) => r.enabled && r.scanCount > 0 && !studentById.has(r.studentId),
      ),
    [rows, studentById],
  );

  useEffect(() => {
    if (!collapsible) {
      setOpen(true);
      return;
    }
    if (activeRows.length > 1 || orphanRows.length > 0 || rosterOnly || loadError) setOpen(true);
  }, [collapsible, activeRows.length, orphanRows.length, rosterOnly, loadError]);

  const handleRemove = async (studentId: string, label: string) => {
    if (!schoolId || !functions || removingId) return;
    const ok = await confirm({
      title: 'Remove face login?',
      description: `Remove face enrollment for ${label}? They can be retrained later.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;

    setRemovingId(studentId);
    try {
      const del = httpsCallable(functions, 'deleteStudentFace');
      await del({ schoolId, studentId });
      toast({ title: 'Face login removed', description: label });
      notifyFaceEnrollmentChanged();
      await refresh();
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not remove face login',
        description: callableToastDescription(e, 'Please try again.'),
      });
    } finally {
      setRemovingId(null);
    }
  };

  const showAmbiguousHint = activeRows.length > 1;

  const body = (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Face data is stored per student ID in Firestore. The student list only shows enrollment when you
        open each student — this panel lists every trained face for the school.{' '}
        <span className="font-medium text-foreground">
          &quot;Unclear match&quot; on the kiosk means two or more enrollments scored nearly the same.
        </span>
      </p>

      {loadError ? (
        <div className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {loadError}
        </div>
      ) : null}

      {rosterOnly ? (
        <div className="flex gap-2 rounded-lg border border-sky-500/30 bg-sky-50/90 px-3 py-2 text-xs text-sky-950 dark:bg-sky-950/35 dark:text-sky-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            Showing enrolled students from your roster only. Orphan enrollments (IDs not on the student
            list) are hidden until{' '}
            <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">listSchoolFaceEnrollments</code>{' '}
            is deployed — run{' '}
            <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">
              firebase deploy --only functions
            </code>
            .
          </p>
        </div>
      ) : null}

      {showAmbiguousHint ? (
        <div className="flex gap-2 rounded-lg border border-amber-500/35 bg-amber-50/90 px-3 py-2 text-xs text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            {activeRows.length} students have active face login. Remove extras or stale enrollments
            (especially IDs not on your roster) if sign-in keeps saying unclear match.
          </p>
        </div>
      ) : null}

      {busy && !rows ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading face enrollments…
        </div>
      ) : null}

      {rows && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No face enrollments yet.</p>
      ) : null}

      {rows && rows.length > 0 ? (
        <ul className="divide-y rounded-lg border bg-muted/20">
          {rows.map((row) => {
            const student = studentById.get(row.studentId);
            const label = studentLabel(student, row.studentId);
            const isOrphan = row.enabled && row.scanCount > 0 && !student;
            const isActive = row.enabled && row.scanCount > 0;

            return (
              <li
                key={row.studentId}
                className={cn(
                  'flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between',
                  isOrphan && 'bg-amber-50/80 dark:bg-amber-950/25',
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {label}
                    {student ? (
                      <span className="ml-1 font-normal text-muted-foreground">({row.studentId})</span>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isActive ? 'Active' : row.scanCount > 0 ? 'Disabled' : 'Empty'}
                    {' · '}
                    {row.scanCount} scan{row.scanCount === 1 ? '' : 's'}
                    {isOrphan ? ' · Not on roster' : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  {student && onOpenFaceTraining && isActive ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-xs"
                      onClick={() => onOpenFaceTraining(student)}
                    >
                      <ScanFace className="mr-1 h-3.5 w-3.5" aria-hidden />
                      Retrain
                    </Button>
                  ) : null}
                  {row.scanCount > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-xs text-destructive hover:text-destructive"
                      disabled={removingId === row.studentId}
                      onClick={() => void handleRemove(row.studentId, label)}
                    >
                      {removingId === row.studentId ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                      )}
                      Remove
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );

  if (!collapsible) {
    return (
      <div className={cn('rounded-xl border bg-card/60 p-4', className)}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ScanFace className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
            <h3 className="text-sm font-bold">Face login enrollments</h3>
            {rows ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                {activeRows.length} active
              </span>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-lg"
            disabled={busy}
            onClick={() => void refresh()}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} aria-hidden />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
        {body}
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <div className="rounded-xl border bg-card/60">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <ScanFace className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
              <span className="truncate text-sm font-bold">Face login enrollments</span>
              {rows ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                  {activeRows.length} active
                </span>
              ) : null}
              <ChevronDown
                className={cn(
                  'ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                  open && 'rotate-180',
                )}
                aria-hidden
              />
            </button>
          </CollapsibleTrigger>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg"
            disabled={busy}
            onClick={() => void refresh()}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} aria-hidden />
            <span className="sr-only">Refresh face enrollments</span>
          </Button>
        </div>
        <CollapsibleContent className="border-t px-3 pb-3 pt-2">{body}</CollapsibleContent>
      </div>
    </Collapsible>
  );
}
