'use client';

import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Class, Student } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { UsersRound } from 'lucide-react';

export function ClassAccumulationsCard(props: {
  schoolId: string;
  classes: Class[] | undefined;
  studentClassId?: string | null;
  enabled: boolean;
  themed?: boolean;
  themeForeground?: string;
}) {
  const { schoolId, classes, studentClassId, enabled, themed, themeForeground } = props;
  const firestore = useFirestore();

  const studentsQuery = useMemoFirebase(() => {
    if (!enabled || !schoolId) return null;
    return collection(firestore, 'schools', schoolId, 'students');
  }, [enabled, firestore, schoolId]);

  const { data: students, isLoading } = useCollection<Student>(studentsQuery);

  const standings = useMemo(() => {
    if (!students?.length) return [];
    const nameById = new Map((classes ?? []).map((c) => [c.id, c.name.trim() || c.id]));
    const totals = new Map<string, number>();
    for (const s of students) {
      const cid = s.classId;
      if (!cid) continue;
      totals.set(cid, (totals.get(cid) ?? 0) + (s.points ?? 0));
    }
    const rows = [...totals.entries()].map(([classId, points]) => ({
      classId,
      name: nameById.get(classId) ?? 'Class',
      points,
    }));
    rows.sort((a, b) => b.points - a.points);
    return rows;
  }, [students, classes]);

  const rankByClassId = useMemo(() => {
    const m = new Map<string, number>();
    standings.forEach((r, i) => m.set(r.classId, i + 1));
    return m;
  }, [standings]);

  const displayRows = useMemo(() => {
    if (!standings.length) return [];
    const limit = 8;
    const top = standings.slice(0, limit);
    const ids = new Set(top.map((r) => r.classId));
    if (studentClassId && !ids.has(studentClassId)) {
      const mine = standings.find((r) => r.classId === studentClassId);
      if (mine) top.push(mine);
    }
    return top;
  }, [standings, studentClassId]);

  if (!enabled) return null;

  return (
    <Card
      className={cn('border-none shadow-lg overflow-hidden', !themed && 'bg-white dark:bg-slate-900')}
      style={themed ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-text)' } : undefined}
    >
      <CardHeader className="pb-3 border-b" style={themed ? { borderColor: 'var(--theme-bg)' } : undefined}>
        <CardTitle className="text-sm font-black flex items-center gap-2">
          <div
            className={cn('w-8 h-8 rounded-lg flex items-center justify-center', !themed && 'bg-slate-100 dark:bg-slate-800')}
            style={themed ? { backgroundColor: 'var(--theme-bg)' } : undefined}
          >
            <UsersRound className="w-4 h-4" style={themed ? { color: themeForeground ?? 'var(--theme-primary)' } : undefined} />
          </div>
          Class standings
        </CardTitle>
        <p className="text-[11px] text-muted-foreground leading-snug font-medium mt-1 pl-10" style={themed ? { color: 'var(--theme-text)', opacity: 0.72 } : undefined}>
          Each class or group is ranked by the sum of its students&apos; current point balances.
        </p>
      </CardHeader>
      <CardContent className="pt-4 space-y-2">
        {isLoading ? (
          <div className="space-y-2" role="status" aria-label="Loading class standings">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-xl" />
            ))}
          </div>
        ) : displayRows.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6" style={themed ? { color: 'var(--theme-text)', opacity: 0.65 } : undefined}>
            Assign students to classes to see group totals here.
          </p>
        ) : (
          <ul className="space-y-2">
            {displayRows.map((row) => {
              const rank = rankByClassId.get(row.classId) ?? 0;
              const isYours = !!studentClassId && row.classId === studentClassId;
              const medal =
                rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
              return (
                <li
                  key={row.classId}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm',
                    !themed && 'border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40',
                    isYours && !themed && 'ring-2 ring-primary/40 border-primary/30 bg-primary/5',
                  )}
                  style={
                    themed
                      ? {
                          borderColor: isYours ? 'var(--theme-primary)' : 'var(--theme-bg)',
                          backgroundColor: isYours ? 'color-mix(in srgb, var(--theme-primary) 12%, transparent)' : 'color-mix(in srgb, var(--theme-bg) 55%, transparent)',
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-black tabular-nums w-8 shrink-0 text-xs text-muted-foreground" style={themed ? { color: 'var(--theme-text)', opacity: 0.55 } : undefined}>
                      {medal ?? `#${rank}`}
                    </span>
                    <span className="font-bold truncate">{row.name}</span>
                    {isYours ? (
                      <span
                        className={cn(
                          'text-[9px] font-black uppercase tracking-widest shrink-0 px-1.5 py-0.5 rounded-md',
                          !themed && 'bg-primary/15 text-primary border border-transparent',
                        )}
                        style={themed ? { border: '1px solid var(--theme-primary)', color: 'var(--theme-primary)' } : undefined}
                      >
                        Your class
                      </span>
                    ) : null}
                  </div>
                  <span className="font-black tabular-nums shrink-0" style={themed ? { color: themeForeground ?? 'var(--theme-primary)' } : undefined}>
                    {row.points.toLocaleString()} pts
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
