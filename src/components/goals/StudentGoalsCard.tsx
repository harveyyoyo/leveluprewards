'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Category, Goal, Student } from '@/lib/types';
import { computeGoalProgress } from '@/lib/goalsProgress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';

type GoalRow = { goal: Goal; progress: number };

export function StudentGoalsCard(props: {
  schoolId: string;
  student: Student;
  enabled: boolean;
  themeForeground?: string;
  themed?: boolean;
}) {
  const { schoolId, student, enabled, themeForeground, themed } = props;
  const firestore = useFirestore();

  const categoriesQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'categories') : null),
    [firestore, schoolId],
  );
  const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);

  const goalsQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'goals') : null),
    [firestore, schoolId],
  );
  const { data: allGoals, isLoading } = useCollection<Goal>(goalsQuery);

  const visible = useMemo(() => {
    if (!allGoals) return [];
    return allGoals
      .filter((g) => g.status === 'active' || g.status === 'completed')
      .filter(
        (g) =>
          g.studentId === student.id ||
          (g.type === 'class' && g.classId && g.classId === student.classId),
      )
      .sort((a, b) => (a.status === 'active' ? -1 : 1) - (b.status === 'active' ? -1 : 1));
  }, [allGoals, student]);

  const [rows, setRows] = useState<GoalRow[]>([]);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    if (!enabled || !firestore || !schoolId || visible.length === 0 || !categories) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setComputing(true);
    (async () => {
      const rosterCache = new Map<string, Student[]>();
      async function rosterFor(classId: string): Promise<Student[]> {
        if (rosterCache.has(classId)) return rosterCache.get(classId)!;
        const q = query(collection(firestore, 'schools', schoolId, 'students'), where('classId', '==', classId));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
        rosterCache.set(classId, list);
        return list;
      }

      const out: GoalRow[] = [];
      for (const goal of visible) {
        let roster: Student[] = [student];
        if (goal.type === 'class' && goal.classId) {
          roster = await rosterFor(goal.classId);
        }
        const progress = await computeGoalProgress(firestore, schoolId, goal, student, roster, categories);
        out.push({ goal, progress });
      }
      if (!cancelled) setRows(out);
      if (!cancelled) setComputing(false);
    })().catch(() => {
      if (!cancelled) setComputing(false);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, firestore, schoolId, visible, student, categories]);

  if (!enabled) return null;

  if (isLoading || categoriesLoading || computing) {
    return (
      <Card
        className={cn('border-none shadow-lg overflow-hidden', !themed && 'bg-white dark:bg-slate-900')}
        style={themed ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-text)' } : undefined}
      >
        <CardHeader className="pb-2 border-b" style={themed ? { borderColor: 'var(--theme-bg)' } : undefined}>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (visible.length === 0) return null;

  return (
    <Card
      className={cn('border-none shadow-lg overflow-hidden border-t-4 border-chart-2', !themed && 'bg-white dark:bg-slate-900')}
      style={themed ? { backgroundColor: 'var(--theme-card)', color: 'var(--theme-text)', borderColor: 'var(--theme-primary)' } : undefined}
    >
      <CardHeader className="pb-2 border-b" style={themed ? { borderColor: 'var(--theme-bg)' } : undefined}>
        <CardTitle
          className={cn('text-sm font-black flex items-center gap-2', !themed && 'text-slate-800 dark:text-white')}
          style={themed ? { color: 'var(--theme-text)' } : undefined}
        >
          <div
            className={cn('w-8 h-8 rounded-lg flex items-center justify-center', !themed && 'bg-slate-100 dark:bg-slate-800')}
            style={themed ? { backgroundColor: 'var(--theme-bg)' } : undefined}
          >
            <Target className="w-4 h-4 text-chart-2" style={themed ? { color: 'var(--theme-primary)' } : undefined} />
          </div>
          Your goals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {rows.map(({ goal, progress }) => {
          const target = Number(goal.targetPoints ?? 0);
          const pct = target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0;
          const label =
            goal.type === 'class'
              ? 'Class goal'
              : goal.type === 'prize_savings'
                ? 'Savings goal'
                : 'Personal goal';
          return (
            <div key={goal.id} className="space-y-2 rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="flex justify-between gap-2 items-start">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                  <p className="font-bold leading-snug">{goal.title}</p>
                  {goal.description ? (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{goal.description}</p>
                  ) : null}
                </div>
                <span
                  className="text-xs font-black whitespace-nowrap shrink-0"
                  style={themeForeground ? { color: themeForeground } : undefined}
                >
                  {progress.toLocaleString()} / {target.toLocaleString()}
                </span>
              </div>
              <Progress value={pct} className="h-2" />
              {goal.status === 'completed' ? (
                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Completed</p>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
