'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { AlertTriangle, Loader2, Smile, ThumbsDown } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BehaviorNote, BehaviorNoteKind } from '@/lib/types';
import { cn } from '@/lib/utils';

function kindMeta(kind: BehaviorNoteKind) {
  if (kind === 'positive') {
    return { label: 'Positive', icon: Smile, className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' };
  }
  if (kind === 'incident') {
    return { label: 'Incident', icon: AlertTriangle, className: 'bg-red-500/15 text-red-700 dark:text-red-300' };
  }
  return { label: 'Concern', icon: ThumbsDown, className: 'bg-amber-500/15 text-amber-800 dark:text-amber-200' };
}

export function BehaviorTimelinePanel({ schoolId, className }: { schoolId: string; className?: string }) {
  const firestore = useFirestore();
  const notesQuery = useMemoFirebase(
    () =>
      schoolId
        ? query(collection(firestore, 'schools', schoolId, 'behaviorNotes'), orderBy('createdAt', 'desc'), limit(80))
        : null,
    [firestore, schoolId],
  );
  const { data: notes, isLoading, error } = useCollection<BehaviorNote>(notesQuery, {
    reportPermissionErrors: false,
  });

  const rows = useMemo(() => notes ?? [], [notes]);

  return (
    <Card className={cn('border-t-4 border-violet-500/80 shadow-md', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-black">Behavior timeline</CardTitle>
        <p className="text-sm text-muted-foreground">
          Notes from teachers across classes — for principals and admin review.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[420px] overflow-y-auto">
        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Behavior notes are unavailable until Firestore rules allow this collection.</p>
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
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {n.createdAt ? format(n.createdAt, 'MMM d, h:mm a') : ''}
                  </span>
                </div>
                <p className="text-sm leading-snug">{n.note}</p>
                <p className="text-[11px] text-muted-foreground">
                  {n.teacherName}
                  {n.pointsLabel ? ` · ${n.pointsLabel}${n.pointsAmount != null ? ` (${n.pointsAmount > 0 ? '+' : ''}${n.pointsAmount})` : ''}` : ''}
                </p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
