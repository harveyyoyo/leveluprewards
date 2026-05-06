'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Category, Class as SchoolClass, Goal, GoalType, Prize, Student } from '@/lib/types';
import { addGoal, deleteGoal } from '@/lib/db';
import { computeGoalProgress } from '@/lib/goalsProgress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Target, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

function studentLabel(s: Student) {
  return `${s.firstName} ${s.lastName}`.trim() || s.id;
}

export function GoalsManager(props: {
  schoolId: string;
  variant: 'teacher' | 'admin';
  teacherId?: string;
  secretaryMode?: boolean;
  students: Student[];
  classes: SchoolClass[];
  categories: Category[];
  prizes: Prize[];
  isGraphic?: boolean;
}) {
  const { schoolId, variant, teacherId, secretaryMode, students, classes, categories, prizes, isGraphic } = props;
  const firestore = useFirestore();
  const { toast } = useToast();

  const goalsQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'goals') : null),
    [firestore, schoolId],
  );
  const { data: goalsLive, isLoading } = useCollection<Goal>(goalsQuery);

  const filteredGoals = useMemo(() => {
    const list = goalsLive ?? [];
    if (variant === 'admin' || secretaryMode) return list.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return list
      .filter((g) => !g.teacherId || g.teacherId === teacherId)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [goalsLive, variant, secretaryMode, teacherId]);

  const [goalType, setGoalType] = useState<GoalType>('personal');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetPoints, setTargetPoints] = useState('100');
  const [categoryId, setCategoryId] = useState<string>('__none__');
  const [studentId, setStudentId] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [prizeId, setPrizeId] = useState<string>('__none__');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bonusPoints, setBonusPoints] = useState('');
  const [saving, setSaving] = useState(false);
  const [progressRows, setProgressRows] = useState<{ goal: Goal; progress: number }[]>([]);

  const rosterForClass = useCallback(
    (classIdInner: string): Student[] => students.filter((s) => s.classId === classIdInner),
    [students],
  );

  useEffect(() => {
    if (!firestore || !schoolId || filteredGoals.length === 0 || !categories?.length) {
      setProgressRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const out: { goal: Goal; progress: number }[] = [];
      for (const goal of filteredGoals) {
        const anchor = goal.studentId ? students.find((s) => s.id === goal.studentId) : students[0];
        if (!anchor && goal.type !== 'class') continue;
        const viewer = anchor || students[0];
        if (!viewer) continue;
        let roster: Student[] = [viewer];
        if (goal.type === 'class' && goal.classId) {
          roster = rosterForClass(goal.classId);
        }
        const progress = await computeGoalProgress(firestore, schoolId, goal, viewer, roster, categories);
        out.push({ goal, progress });
      }
      if (!cancelled) setProgressRows(out);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [firestore, schoolId, filteredGoals, students, categories, rosterForClass]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTargetPoints('100');
    setCategoryId('__none__');
    setStudentId('');
    setClassId('');
    setPrizeId('__none__');
    setStartDate('');
    setEndDate('');
    setBonusPoints('');
    setGoalType('personal');
  };

  const parseOptionalDay = (ymd: string, endOfDay: boolean): number | undefined => {
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return undefined;
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    return dt.getTime();
  };

  const handleCreate = async () => {
    if (!firestore || !schoolId) return;
    const tp = parseInt(targetPoints, 10);
    if (!title.trim() || Number.isNaN(tp) || tp <= 0) {
      toast({ variant: 'destructive', title: 'Check title and target', description: 'Enter a title and a positive target.' });
      return;
    }
    if ((goalType === 'personal' || goalType === 'prize_savings') && !studentId) {
      toast({ variant: 'destructive', title: 'Pick a student', description: 'Choose which student this goal is for.' });
      return;
    }
    if (goalType === 'class' && !classId) {
      toast({ variant: 'destructive', title: 'Pick a class', description: 'Choose a class for this goal.' });
      return;
    }

    const bonus = bonusPoints.trim() ? parseInt(bonusPoints, 10) : undefined;
    if (bonus !== undefined && (Number.isNaN(bonus) || bonus < 0)) {
      toast({ variant: 'destructive', title: 'Bonus points', description: 'Enter a valid non-negative bonus or leave blank.' });
      return;
    }

    setSaving(true);
    try {
      await addGoal(firestore, schoolId, {
        type: goalType,
        title: title.trim(),
        description: description.trim() || undefined,
        targetPoints: tp,
        categoryId: categoryId && categoryId !== '__none__' ? categoryId : undefined,
        studentId:
          goalType === 'personal' || goalType === 'prize_savings'
            ? studentId
            : undefined,
        classId: goalType === 'class' ? classId : undefined,
        teacherId: variant === 'teacher' && teacherId ? teacherId : undefined,
        prizeId:
          goalType === 'prize_savings' && prizeId && prizeId !== '__none__' ? prizeId : undefined,
        startDate: parseOptionalDay(startDate, false),
        endDate: parseOptionalDay(endDate, true),
        bonusPointsReward: bonus !== undefined && bonus > 0 ? bonus : undefined,
      });
      toast({ title: 'Goal created' });
      resetForm();
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not save goal',
        description: e instanceof Error ? e.message : 'Try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !schoolId) return;
    try {
      await deleteGoal(firestore, schoolId, id);
      toast({ title: 'Goal removed' });
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not delete',
        description: e instanceof Error ? e.message : 'Try again.',
      });
    }
  };

  const progressFor = (g: Goal) => progressRows.find((r) => r.goal.id === g.id)?.progress ?? 0;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <Card
        className={cn(
          'border-t-8 transition-all duration-500',
          isGraphic ? 'bg-card/60 backdrop-blur-2xl border-chart-2 shadow-[0_20px_50px_rgba(0,0,0,0.1)]' : 'bg-white border-chart-2 shadow-lg dark:bg-slate-900',
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-chart-2" />
            Add goal
          </CardTitle>
          <CardDescription>
            Personal targets, savings toward shop rewards, or class-wide milestones. Enable under Settings &gt; Extra features &gt; Goals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={goalType} onValueChange={(v) => setGoalType(v as GoalType)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal (one student)</SelectItem>
                <SelectItem value="prize_savings">Savings (balance toward a reward)</SelectItem>
                <SelectItem value="class">Class (whole group)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-title">Title</Label>
            <Input id="goal-title" className="rounded-xl" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 50 kindness points this month" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-desc">Description (optional)</Label>
            <Textarea id="goal-desc" className="rounded-xl min-h-[72px]" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goal-target">Target points</Label>
              <Input id="goal-target" className="rounded-xl" inputMode="numeric" value={targetPoints} onChange={(e) => setTargetPoints(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Bonus on completion (optional)</Label>
              <Input
                className="rounded-xl"
                inputMode="numeric"
                placeholder="0"
                value={bonusPoints}
                onChange={(e) => setBonusPoints(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category filter (optional)</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">All categories (total / lifetime)</SelectItem>
                {(categories || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">When set, only points earned in this category count.</p>
          </div>

          {(goalType === 'personal' || goalType === 'prize_savings') && (
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={studentId || undefined} onValueChange={setStudentId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {studentLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {goalType === 'class' && (
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={classId || undefined} onValueChange={setClassId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {goalType === 'prize_savings' && (
            <div className="space-y-2">
              <Label>Related reward (optional)</Label>
              <Select value={prizeId} onValueChange={setPrizeId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {(prizes || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.points} pts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start date (optional)</Label>
              <Input type="date" className="rounded-xl" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End date (optional)</Label>
              <Input type="date" className="rounded-xl" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            With dates, progress counts points from activity logs in that window. Without dates, totals use lifetime/category totals.
          </p>

          <Button className="w-full rounded-xl font-black uppercase tracking-widest h-12" onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Create goal
          </Button>
        </CardContent>
      </Card>

      <Card className={cn('border-t-8 border-muted shadow-md', isGraphic ? 'bg-card/60 backdrop-blur-xl' : '')}>
        <CardHeader>
          <CardTitle>Active & recent goals</CardTitle>
          <CardDescription>Progress updates after points change.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No goals yet.</p>
          ) : (
            <ScrollArea className="h-[calc(100vh-22rem)] pr-1">
              <ul className="space-y-3">
                {filteredGoals.map((g) => {
                  const p = progressFor(g);
                  const pct = g.targetPoints > 0 ? Math.min(100, Math.round((p / g.targetPoints) * 100)) : 0;
                  return (
                    <li key={g.id} className="rounded-2xl border bg-muted/15 p-4 space-y-2">
                      <div className="flex justify-between gap-2 items-start">
                        <div>
                          <p className="font-bold">{g.title}</p>
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                            {g.type} · {g.status}
                            {g.teacherId ? ` · teacher ${g.teacherId.slice(0, 6)}…` : ''}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0 text-destructive h-8 w-8" onClick={() => handleDelete(g.id)} aria-label="Delete goal">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span>
                          {p.toLocaleString()} / {g.targetPoints.toLocaleString()} pts
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
