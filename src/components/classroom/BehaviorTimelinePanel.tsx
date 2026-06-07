'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Calendar, Clock, Loader2, RefreshCw, Smile, ThumbsDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BehaviorNote, BehaviorNoteKind } from '@/lib/types';
import { BEHAVIOR_NOTE_SAVED_EVENT } from '@/lib/classroom/behaviorNoteEvents';
import { useFirestore } from '@/firebase';
import { fetchBehaviorNotes } from '@/lib/classroom/behaviorNotesClient';
import { ensureDeveloperSchoolAccess } from '@/lib/classroom/ensureDeveloperSchoolAccess';
import { useFirebase } from '@/firebase';
import { isAllowedDeveloperGoogleUser } from '@/lib/developerAccess';
import { CLASSROOM_SEATING_SECTION_LABEL } from '@/lib/classroom/classroomTabSections';
import {
  formatBehaviorNoteDate,
  formatBehaviorNoteDateTime,
  formatBehaviorNoteTime,
} from '@/lib/classroom/behaviorNoteTime';
import { cn } from '@/lib/utils';

export type BehaviorTimelineMode = 'behavior' | 'principal';

function kindMeta(kind: BehaviorNoteKind) {
  if (kind === 'positive') {
    return { label: 'Positive', icon: Smile, className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' };
  }
  if (kind === 'incident') {
    return { label: 'Incident', icon: AlertTriangle, className: 'bg-red-500/15 text-red-700 dark:text-red-300' };
  }
  return { label: 'Concern', icon: ThumbsDown, className: 'bg-amber-500/15 text-amber-800 dark:text-amber-200' };
}

function errorHint(status?: number, message?: string): string {
  const m = (message || '').toLowerCase();
  if (m.includes('permission') || m.includes('passcode') || m.includes('staff sign-in')) {
    return 'Sign out, return to your school portal, and sign in as Admin or Teacher with your role passcode. The school lobby passcode alone is not enough.';
  }
  if (m.includes('firebase_service_account') || m.includes('firebase admin is not configured')) {
    return 'Add FIREBASE_SERVICE_ACCOUNT_KEY to .env.local and restart npm run dev.';
  }
  if (status === 403 || m.includes('staff access')) {
    return 'Sign in as school staff (Admin or Teacher portal) for this school.';
  }
  if (status === 503 && !m.includes('could not load behavior notes:')) {
    return 'Restart npm run dev after checking .env.local. If this persists, sign in again as Admin or Teacher.';
  }
  return 'Check the server message above, then sign in again as Admin or Teacher for this school.';
}

export function BehaviorTimelinePanel({
  schoolId,
  className,
  refreshToken = 0,
  embedded = false,
  mode = 'principal',
}: {
  schoolId: string;
  className?: string;
  /** Increment to reload after a new note is saved elsewhere. */
  refreshToken?: number;
  /** When true, render inside Classroom Management without a nested card. */
  embedded?: boolean;
  /** Behavior tab vs Principal school-wide tab (same data, different heading). */
  mode?: BehaviorTimelineMode;
}) {
  const firestore = useFirestore();
  const { user } = useFirebase();
  const [rows, setRows] = useState<BehaviorNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean; afterProvision?: boolean }) => {
      if (!schoolId) return;
      if (!opts?.silent) setIsLoading(true);
      setError(null);

      let result = await fetchBehaviorNotes(schoolId, firestore);
      if (
        result.error &&
        !opts?.afterProvision &&
        user &&
        isAllowedDeveloperGoogleUser(user) &&
        (result.error.toLowerCase().includes('permission') ||
          result.status === 403 ||
          result.error.toLowerCase().includes('staff'))
      ) {
        try {
          await ensureDeveloperSchoolAccess(schoolId);
          result = await fetchBehaviorNotes(schoolId, firestore);
        } catch {
          /* keep first error */
        }
      }

      if (result.error) {
        setError({ message: result.error, status: result.status });
        if (!opts?.silent) setRows([]);
      } else {
        setRows(result.notes);
      }
      if (!opts?.silent) setIsLoading(false);
    },
    [schoolId, firestore, user],
  );

  useEffect(() => {
    void load(refreshToken === 0 ? undefined : { silent: true });
  }, [load, refreshToken]);

  useEffect(() => {
    const onNoteSaved = (event: Event) => {
      const note = (event as CustomEvent<BehaviorNote>).detail;
      if (!note?.id || !note.note?.trim()) return;
      setRows((prev) => {
        const rest = prev.filter((r) => r.id !== note.id);
        return [note, ...rest].sort((a, b) => b.createdAt - a.createdAt);
      });
      setError(null);
      window.setTimeout(() => void load({ silent: true }), 400);
    };
    window.addEventListener(BEHAVIOR_NOTE_SAVED_EVENT, onNoteSaved);
    return () => window.removeEventListener(BEHAVIOR_NOTE_SAVED_EVENT, onNoteSaved);
  }, [load]);

  const title = mode === 'behavior' ? 'Behavior notes' : 'Principal';
  const description =
    mode === 'behavior'
      ? `Notes you add from ${CLASSROOM_SEATING_SECTION_LABEL} (hold P, C, I, W, or H and click a student, or use the award menu). New entries appear here after you save.`
      : 'School-wide log of behavior notes from all classes. Review positives, concerns, and incidents — separate from quick point awards.';

  const header = (
    <div className="flex items-start justify-between gap-2">
      <div className="space-y-2">
        {embedded ? (
          <h3 className="text-lg font-black tracking-tight">{title}</h3>
        ) : (
          <CardTitle className="text-lg font-black">{title}</CardTitle>
        )}
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={() => void load()}
        disabled={isLoading}
        aria-label="Refresh timeline"
      >
        <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
      </Button>
    </div>
  );

  const body = (
    <div className="space-y-3">
        <div className="rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <p className="font-bold text-foreground">How teachers add a note</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-4">
            <li>
              On <span className="font-semibold text-foreground">{CLASSROOM_SEATING_SECTION_LABEL}</span>,
              hold <span className="font-semibold text-foreground">P</span>,{' '}
              <span className="font-semibold text-foreground">C</span>,{' '}
              <span className="font-semibold text-foreground">I</span>,{' '}
              <span className="font-semibold text-foreground">W</span>, or{' '}
              <span className="font-semibold text-foreground">H</span> and click a student — each letter opens
              its own note popup (positive, comment, incident, warning, highlight). Or use the{' '}
              <span className="font-semibold text-foreground">Quick</span> /{' '}
              <span className="font-semibold text-foreground">Awards</span> tabs in the toolbar and pick a note
              from the menu.
            </li>
            <li>Pick a quick option or write your note, then save — the type is set by the shortcut you used.</li>
            <li>
              Notes marked for families can appear in the{' '}
              <span className="font-semibold text-foreground">Parent portal</span> when that is enabled.
            </li>
          </ol>
          <p className="mt-2 text-[11px]">New notes appear here automatically after a teacher saves one.</p>
        </div>

        <div className="max-h-[360px] space-y-3 overflow-y-auto">
        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p>{error.message}</p>
              <p className="text-xs opacity-90">{errorHint(error.status, error.message)}</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading notes…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No behavior notes yet.</p>
        ) : (
          rows.map((n) => {
            const meta = kindMeta(n.kind);
            const Icon = meta.icon;
            return (
              <div key={n.id} className="rounded-xl border bg-muted/20 p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn('gap-1 font-semibold', meta.className)}>
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </Badge>
                  <span className="text-sm font-bold">{n.studentName}</span>
                  {n.className ? (
                    <span className="text-xs text-muted-foreground">· {n.className}</span>
                  ) : null}
                  {!n.visibleToParent ? (
                    <Badge variant="secondary" className="text-[10px]">
                      Staff only
                    </Badge>
                  ) : null}
                </div>
                {n.createdAt ? (
                  <div
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
                    title={formatBehaviorNoteDateTime(n.createdAt)}
                  >
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                      {formatBehaviorNoteDate(n.createdAt)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 tabular-nums font-medium text-foreground/80">
                      <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                      {formatBehaviorNoteTime(n.createdAt)}
                    </span>
                  </div>
                ) : null}
                <p className="text-sm leading-snug">{n.note}</p>
                <p className="text-[11px] text-muted-foreground">
                  {n.teacherName}
                  {n.pointsLabel ? ` · ${n.pointsLabel}${n.pointsAmount != null ? ` (${n.pointsAmount > 0 ? '+' : ''}${n.pointsAmount})` : ''}` : ''}
                </p>
              </div>
            );
          })
        )}
        </div>
    </div>
  );

  if (embedded) {
    return (
      <section className={cn('space-y-4', className)}>
        <div className="border-b border-border/40 pb-4">{header}</div>
        {body}
      </section>
    );
  }

  return (
    <Card className={cn('border-t-4 border-violet-500/80 shadow-md', className)}>
      <CardHeader className="pb-3">{header}</CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
