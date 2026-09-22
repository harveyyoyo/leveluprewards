'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Category, Class as SchoolClass, Goal, GoalType, Prize, Student } from '@/lib/types';
import { addGoal, deleteGoal, updateGoal } from '@/lib/db';
import { computeGoalProgress } from '@/lib/goalsProgress';
import {
  GOAL_TEMPLATES,
  bucketForGoal,
  dateInputFromMs,
  filterStudentsByQuery,
  goalAudienceLabel,
  goalStatusLabel,
  goalTypeLabel,
  isAlmostThere,
  msFromDateInput,
  progressPercent,
  titleForPrizeSavings,
  type GoalListBucket,
} from '@/lib/goals/goalHelpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Archive, Loader2, Pencil, Plus, RotateCcw, Target, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import { StaffPortalTabPanel } from '@/components/staff/StaffPortalTabHeader';
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function studentLabel(s: Student) {
  return `${s.firstName} ${s.lastName}`.trim() || s.id;
}

type GoalFormState = {
  goalType: GoalType;
  title: string;
  description: string;
  targetPoints: string;
  categoryId: string;
  studentId: string;
  classId: string;
  prizeId: string;
  startDate: string;
  endDate: string;
  bonusPoints: string;
};

const emptyForm = (): GoalFormState => ({
  goalType: 'personal',
  title: '',
  description: '',
  targetPoints: '100',
  categoryId: '__none__',
  studentId: '',
  classId: '',
  prizeId: '__none__',
  startDate: '',
  endDate: '',
  bonusPoints: '',
});

function formFromGoal(goal: Goal): GoalFormState {
  return {
    goalType: goal.type,
    title: goal.title || '',
    description: goal.description || '',
    targetPoints: String(goal.targetPoints ?? 100),
    categoryId: goal.categoryId || '__none__',
    studentId: goal.studentId || '',
    classId: goal.classId || '',
    prizeId: goal.prizeId || '__none__',
    startDate: dateInputFromMs(goal.startDate),
    endDate: dateInputFromMs(goal.endDate),
    bonusPoints: goal.bonusPointsReward != null ? String(goal.bonusPointsReward) : '',
  };
}

type SectionId = 'create' | GoalListBucket;

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

  const [section, setSection] = useState<SectionId>('create');
  const [form, setForm] = useState<GoalFormState>(emptyForm);
  const [studentSearch, setStudentSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [progressRows, setProgressRows] = useState<{ goal: Goal; progress: number }[]>([]);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editForm, setEditForm] = useState<GoalFormState>(emptyForm);
  const [editStudentSearch, setEditStudentSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);
  const [celebratedIds, setCelebratedIds] = useState<Set<string>>(() => new Set());
  const [alertedAlmostIds, setAlertedAlmostIds] = useState<Set<string>>(() => new Set());
  const [baselineReady, setBaselineReady] = useState(false);

  const rosterForClass = useCallback(
    (classIdInner: string): Student[] => students.filter((s) => s.classId === classIdInner),
    [students],
  );

  // Seed celebration/alert baselines once goals first load so we don't cheer old finishes.
  useEffect(() => {
    if (baselineReady || isLoading || goalsLive == null) return;
    const done = new Set<string>();
    const almost = new Set<string>();
    for (const g of goalsLive) {
      if (g.status === 'completed') done.add(g.id);
      if (g.almostThereNotifiedAt) almost.add(g.id);
    }
    setCelebratedIds(done);
    setAlertedAlmostIds(almost);
    setBaselineReady(true);
  }, [baselineReady, isLoading, goalsLive]);

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

  // Celebrate newly finished goals and ping “almost there” once per session.
  useEffect(() => {
    if (!baselineReady) return;
    for (const { goal, progress } of progressRows) {
      if (goal.status === 'completed' && !celebratedIds.has(goal.id)) {
        setCelebratedIds((prev) => new Set(prev).add(goal.id));
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.65 } });
        toast({
          title: 'Goal finished!',
          description: `"${goal.title}" — ${goalAudienceLabel(goal, students, classes)} made it.`,
        });
      }
      if (
        goal.status === 'active' &&
        isAlmostThere(progress, goal.targetPoints) &&
        !alertedAlmostIds.has(goal.id)
      ) {
        setAlertedAlmostIds((prev) => new Set(prev).add(goal.id));
        toast({
          title: 'Almost there!',
          description: `"${goal.title}" for ${goalAudienceLabel(goal, students, classes)} is getting close.`,
        });
      }
    }
  }, [progressRows, celebratedIds, alertedAlmostIds, toast, students, classes, baselineReady]);

  const counts = useMemo(() => {
    const c = { active: 0, finished: 0, past_due: 0, archived: 0 };
    for (const g of filteredGoals) {
      c[bucketForGoal(g)] += 1;
    }
    return c;
  }, [filteredGoals]);

  const sectionItems = useMemo(
    () => [
      { id: 'create', label: 'Create' },
      { id: 'active', label: 'Active', badge: counts.active },
      { id: 'finished', label: 'Finished', badge: counts.finished },
      { id: 'past_due', label: 'Past due', badge: counts.past_due },
      { id: 'archived', label: 'Archived', badge: counts.archived },
    ],
    [counts],
  );

  const listedGoals = useMemo(() => {
    if (section === 'create') return [];
    return filteredGoals.filter((g) => bucketForGoal(g) === section);
  }, [filteredGoals, section]);

  const visibleStudents = useMemo(
    () => filterStudentsByQuery(students, studentSearch),
    [students, studentSearch],
  );
  const editVisibleStudents = useMemo(
    () => filterStudentsByQuery(students, editStudentSearch),
    [students, editStudentSearch],
  );

  const patchForm = (patch: Partial<GoalFormState>, target: 'create' | 'edit' = 'create') => {
    if (target === 'edit') setEditForm((f) => ({ ...f, ...patch }));
    else setForm((f) => ({ ...f, ...patch }));
  };

  const applyPrizeAutofill = (prizeId: string, target: 'create' | 'edit') => {
    const current = target === 'edit' ? editForm : form;
    const patch: Partial<GoalFormState> = { prizeId };
    if (prizeId && prizeId !== '__none__') {
      const prize = prizes.find((p) => p.id === prizeId);
      if (prize) {
        const cost = Number(prize.points ?? 0);
        if (cost > 0) patch.targetPoints = String(cost);
        if (!current.title.trim() || current.title.startsWith('Save for ')) {
          patch.title = titleForPrizeSavings(prize);
        }
      }
    }
    patchForm(patch, target);
  };

  const applyTemplate = (templateId: string) => {
    const t = GOAL_TEMPLATES.find((x) => x.id === templateId);
    if (!t) return;
    setForm((f) => ({
      ...f,
      goalType: t.type,
      title: t.title,
      description: t.description || '',
      targetPoints: String(t.targetPoints),
      prizeId: t.type === 'prize_savings' ? f.prizeId : '__none__',
    }));
    setSection('create');
    toast({ title: 'Template applied', description: 'Adjust the details, then create the goal.' });
  };

  const validateForm = (state: GoalFormState): string | null => {
    const tp = parseInt(state.targetPoints, 10);
    if (!state.title.trim() || Number.isNaN(tp) || tp <= 0) {
      return 'Enter a title and a positive target.';
    }
    if ((state.goalType === 'personal' || state.goalType === 'prize_savings') && !state.studentId) {
      return 'Choose which student this goal is for.';
    }
    if (state.goalType === 'class' && !state.classId) {
      return 'Choose a class for this goal.';
    }
    const bonus = state.bonusPoints.trim() ? parseInt(state.bonusPoints, 10) : undefined;
    if (bonus !== undefined && (Number.isNaN(bonus) || bonus < 0)) {
      return 'Enter a valid bonus (0 or more) or leave blank.';
    }
    return null;
  };

  const toGoalPayload = (state: GoalFormState) => {
    const tp = parseInt(state.targetPoints, 10);
    const bonus = state.bonusPoints.trim() ? parseInt(state.bonusPoints, 10) : undefined;
    return {
      type: state.goalType,
      title: state.title.trim(),
      description: state.description.trim() || undefined,
      targetPoints: tp,
      categoryId: state.categoryId && state.categoryId !== '__none__' ? state.categoryId : undefined,
      studentId:
        state.goalType === 'personal' || state.goalType === 'prize_savings' ? state.studentId : undefined,
      classId: state.goalType === 'class' ? state.classId : undefined,
      teacherId: variant === 'teacher' && teacherId ? teacherId : undefined,
      prizeId:
        state.goalType === 'prize_savings' && state.prizeId && state.prizeId !== '__none__'
          ? state.prizeId
          : undefined,
      startDate: msFromDateInput(state.startDate, false),
      endDate: msFromDateInput(state.endDate, true),
      bonusPointsReward: bonus !== undefined && bonus > 0 ? bonus : undefined,
    };
  };

  const handleCreate = async () => {
    if (!firestore || !schoolId) return;
    const err = validateForm(form);
    if (err) {
      toast({ variant: 'destructive', title: 'Check the form', description: err });
      return;
    }
    setSaving(true);
    try {
      await addGoal(firestore, schoolId, toGoalPayload(form));
      toast({ title: 'Goal created' });
      setForm(emptyForm());
      setStudentSearch('');
      setSection('active');
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

  const openEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setEditForm(formFromGoal(goal));
    setEditStudentSearch('');
  };

  const handleSaveEdit = async () => {
    if (!firestore || !schoolId || !editingGoal) return;
    const err = validateForm(editForm);
    if (err) {
      toast({ variant: 'destructive', title: 'Check the form', description: err });
      return;
    }
    setSaving(true);
    try {
      const payload = toGoalPayload(editForm);
      const clearFields: Array<keyof Goal> = [];
      if (!payload.studentId) clearFields.push('studentId');
      if (!payload.classId) clearFields.push('classId');
      if (!payload.prizeId) clearFields.push('prizeId');
      if (!payload.categoryId) clearFields.push('categoryId');
      if (!payload.description) clearFields.push('description');
      if (!payload.bonusPointsReward) clearFields.push('bonusPointsReward');
      if (!payload.startDate) clearFields.push('startDate');
      if (!payload.endDate) clearFields.push('endDate');
      await updateGoal(firestore, schoolId, editingGoal.id, {
        ...payload,
        clearFields,
      });
      toast({ title: 'Goal updated' });
      setEditingGoal(null);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not update',
        description: e instanceof Error ? e.message : 'Try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!firestore || !schoolId || !deleteTarget) return;
    try {
      await deleteGoal(firestore, schoolId, deleteTarget.id);
      toast({ title: 'Goal removed' });
      setDeleteTarget(null);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not delete',
        description: e instanceof Error ? e.message : 'Try again.',
      });
    }
  };

  const handleArchive = async (goal: Goal, archived: boolean) => {
    if (!firestore || !schoolId) return;
    try {
      await updateGoal(firestore, schoolId, goal.id, { archived });
      toast({ title: archived ? 'Moved to archived' : 'Restored from archive' });
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not update',
        description: e instanceof Error ? e.message : 'Try again.',
      });
    }
  };

  const progressFor = (g: Goal) => progressRows.find((r) => r.goal.id === g.id)?.progress ?? 0;

  const renderFormFields = (
    state: GoalFormState,
    target: 'create' | 'edit',
    studentOptions: Student[],
    searchValue: string,
    onSearch: (v: string) => void,
  ) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={state.goalType} onValueChange={(v) => patchForm({ goalType: v as GoalType }, target)}>
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
        <Label htmlFor={`goal-title-${target}`}>Title</Label>
        <Input
          id={`goal-title-${target}`}
          className="rounded-xl"
          value={state.title}
          onChange={(e) => patchForm({ title: e.target.value }, target)}
          placeholder="e.g. 50 kindness points this month"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`goal-desc-${target}`}>Description (optional)</Label>
        <Textarea
          id={`goal-desc-${target}`}
          className="rounded-xl min-h-[72px]"
          value={state.description}
          onChange={(e) => patchForm({ description: e.target.value }, target)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`goal-target-${target}`}>Target points</Label>
          <Input
            id={`goal-target-${target}`}
            className="rounded-xl"
            inputMode="numeric"
            value={state.targetPoints}
            onChange={(e) => patchForm({ targetPoints: e.target.value }, target)}
          />
        </div>
        <div className="space-y-2">
          <Label>
            {state.goalType === 'class' ? 'Bonus each student gets (optional)' : 'Bonus on completion (optional)'}
          </Label>
          <Input
            className="rounded-xl"
            inputMode="numeric"
            placeholder="0"
            value={state.bonusPoints}
            onChange={(e) => patchForm({ bonusPoints: e.target.value }, target)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Category filter (optional)</Label>
        <Select value={state.categoryId} onValueChange={(v) => patchForm({ categoryId: v }, target)}>
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
            {state.categoryId !== '__none__' &&
            (categories?.length ?? 0) > 0 &&
            !(categories || []).some((c) => c.id === state.categoryId) ? (
              <SelectItem value={state.categoryId}>Unknown category (deleted)</SelectItem>
            ) : null}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">When set, only points earned in this category count.</p>
      </div>

      {(state.goalType === 'personal' || state.goalType === 'prize_savings') && (
        <div className="space-y-2">
          <Label>Student</Label>
          <Input
            className="rounded-xl"
            placeholder="Search by name…"
            value={searchValue}
            onChange={(e) => onSearch(e.target.value)}
          />
          <Select value={state.studentId || undefined} onValueChange={(v) => patchForm({ studentId: v }, target)}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Select student" />
            </SelectTrigger>
            <SelectContent className="max-h-[280px]">
              {studentOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {studentLabel(s)}
                </SelectItem>
              ))}
              {state.studentId && students.length > 0 && !students.some((s) => s.id === state.studentId) ? (
                <SelectItem value={state.studentId}>Unknown student (removed)</SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>
      )}

      {state.goalType === 'class' && (
        <div className="space-y-2">
          <Label>Class</Label>
          <Select value={state.classId || undefined} onValueChange={(v) => patchForm({ classId: v }, target)}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
              {state.classId && classes.length > 0 && !classes.some((c) => c.id === state.classId) ? (
                <SelectItem value={state.classId}>Unknown class (deleted)</SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>
      )}

      {state.goalType === 'prize_savings' && (
        <div className="space-y-2">
          <Label>Related reward (optional)</Label>
          <Select value={state.prizeId} onValueChange={(v) => applyPrizeAutofill(v, target)}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {(prizes || []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({Number(p.points ?? 0)} pts)
                </SelectItem>
              ))}
              {state.prizeId !== '__none__' &&
              (prizes?.length ?? 0) > 0 &&
              !(prizes || []).some((p) => p.id === state.prizeId) ? (
                <SelectItem value={state.prizeId}>Unknown reward (deleted)</SelectItem>
              ) : null}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Picking a reward fills in the target from its cost when helpful.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start date (optional)</Label>
          <Input
            type="date"
            className="rounded-xl"
            value={state.startDate}
            onChange={(e) => patchForm({ startDate: e.target.value }, target)}
          />
        </div>
        <div className="space-y-2">
          <Label>End date (optional)</Label>
          <Input
            type="date"
            className="rounded-xl"
            value={state.endDate}
            onChange={(e) => patchForm({ endDate: e.target.value }, target)}
          />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        With dates, progress counts points from activity logs in that window. Without dates, totals use
        lifetime/category totals.
      </p>
    </div>
  );

  return (
    <StaffPortalTabPanel tabValue="goals" trailing={<TabWalkthroughHeaderAction />}>
      <ContentSectionTreeNav
        branchLabel="Goals"
        items={sectionItems}
        value={section}
        onValueChange={(id) => setSection(id as SectionId)}
        className="mb-6"
      />

      {section === 'create' ? (
        <Card
          className={cn(
            'border-t-8 transition-all duration-500 max-w-2xl',
            isGraphic
              ? 'bg-card/60 backdrop-blur-2xl border-chart-2 shadow-[0_20px_50px_rgba(0,0,0,0.1)]'
              : 'bg-white border-chart-2 shadow-lg dark:bg-slate-900',
          )}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-chart-2" />
              Add goal
            </CardTitle>
            <CardDescription>
              Personal targets, savings toward shop rewards, or class-wide milestones. Enable from Admin → Add
              more.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Quick start</Label>
              <div className="flex flex-wrap gap-2">
                {GOAL_TEMPLATES.map((t) => (
                  <Button
                    key={t.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => applyTemplate(t.id)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>

            {renderFormFields(form, 'create', visibleStudents, studentSearch, setStudentSearch)}

            <Button
              className="w-full rounded-xl font-black uppercase tracking-widest h-12"
              onClick={handleCreate}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className={cn('border-t-8 border-muted shadow-md', isGraphic ? 'bg-card/60 backdrop-blur-xl' : '')}>
          <CardHeader>
            <CardTitle>
              {section === 'active'
                ? 'Active goals'
                : section === 'finished'
                  ? 'Finished goals'
                  : section === 'past_due'
                    ? 'Past due'
                    : 'Archived'}
            </CardTitle>
            <CardDescription>
              {section === 'active'
                ? 'Progress updates after points change. Goals near the finish line show “Almost there.”'
                : section === 'finished'
                  ? 'Archive finished goals to keep this list tidy, or delete them for good.'
                  : section === 'past_due'
                    ? 'These ran out of time before the target was hit.'
                    : 'Hidden from the main lists. Restore anytime.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : listedGoals.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nothing here yet.</p>
            ) : (
              <ScrollArea className="h-[calc(100vh-22rem)] pr-1">
                <ul className="space-y-3">
                  {listedGoals.map((g) => {
                    const p = progressFor(g);
                    const pct = progressPercent(p, g.targetPoints);
                    const almost = g.status === 'active' && isAlmostThere(p, g.targetPoints);
                    return (
                      <li key={g.id} className="rounded-2xl border bg-muted/15 p-4 space-y-2">
                        <div className="flex justify-between gap-2 items-start">
                          <div className="min-w-0">
                            <p className="font-bold truncate">{g.title}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {goalTypeLabel(g.type)} · {goalAudienceLabel(g, students, classes)} ·{' '}
                              {goalStatusLabel(g.status)}
                              {g.createdByStudent ? ' · Student wishlist' : ''}
                            </p>
                            {almost ? (
                              <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-1">
                                Almost there!
                              </p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(g)}
                              aria-label="Edit goal"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {section !== 'archived' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleArchive(g, true)}
                                aria-label="Archive goal"
                              >
                                <Archive className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleArchive(g, false)}
                                aria-label="Restore goal"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 text-destructive h-8 w-8"
                              onClick={() => setDeleteTarget(g)}
                              aria-label="Delete goal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs font-bold">
                          <span>
                            {p.toLocaleString()} / {Number(g.targetPoints ?? 0).toLocaleString()} pts
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
      )}

      <Dialog open={!!editingGoal} onOpenChange={(open) => !open && setEditingGoal(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit goal</DialogTitle>
            <DialogDescription>Change the target, dates, or who this goal is for.</DialogDescription>
          </DialogHeader>
          {renderFormFields(editForm, 'edit', editVisibleStudents, editStudentSearch, setEditStudentSearch)}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingGoal(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this goal?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.title}” will be deleted for good. Prefer Archive if you might want it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StaffPortalTabPanel>
  );
}
