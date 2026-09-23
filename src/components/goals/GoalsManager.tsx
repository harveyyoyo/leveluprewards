'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Category, Class as SchoolClass, Goal, GoalType, Prize, Student } from '@/lib/types';
import { addGoal, deleteGoal, updateGoal } from '@/lib/db';
import { computeGoalProgress } from '@/lib/goalsProgress';
import {
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
import {
  extendedEndDate,
  isGoalCrushed,
  resolveGoalsOptions,
} from '@/lib/goals/goalsOptions';
import { GoalsOptionsPanel } from '@/components/goals/GoalsOptionsPanel';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { canManageGoal, canSeeStaffGoal, goalStaffVisibility } from '@/lib/goals/goalStaffVisibility';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Archive, CalendarPlus, Check, ChevronsUpDown, Loader2, Pencil, Plus, RotateCcw, Target, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import { StaffPortalTabPanel } from '@/components/staff/StaffPortalTabHeader';
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
  staffVisibility: 'creator' | 'all';
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
  staffVisibility: 'creator',
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
    staffVisibility: goalStaffVisibility(goal),
  };
}

type SectionId = 'create' | 'options' | GoalListBucket;

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
  const { userId, userName, teacherDocId, isAdmin } = useAuth();
  const assignedRole = variant === 'admin' || isAdmin ? 'admin' : teacherId || teacherDocId ? 'teacher' : 'staff';
  const ownerTeacherId = assignedRole === 'teacher' ? teacherId || teacherDocId || undefined : undefined;
  const staffId = ownerTeacherId ? `teacher:${ownerTeacherId}` : userId ? `${assignedRole}:${userId}` : undefined;
  const staffViewer = useMemo(
    () => ({ staffId, teacherId: ownerTeacherId, isAdmin: assignedRole === 'admin', seeAll: !!secretaryMode }),
    [staffId, ownerTeacherId, assignedRole, secretaryMode],
  );
  const firestore = useFirestore();
  const { toast } = useToast();
  const { settings, updateSettings } = useSettings();
  const goalsOpts = resolveGoalsOptions(settings.goalsOptions);

  const goalsQuery = useMemoFirebase(
    () => (schoolId ? collection(firestore, 'schools', schoolId, 'goals') : null),
    [firestore, schoolId],
  );
  const { data: goalsLive, isLoading } = useCollection<Goal>(goalsQuery);

  const filteredGoals = useMemo(() => {
    const list = goalsLive ?? [];
    return list
      .filter((g) => canSeeStaffGoal(g, staffViewer))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [goalsLive, staffViewer]);

  // A shared goal (or the office's school-wide view) can involve students outside this roster.
  const hasSharedGoals = !!secretaryMode || filteredGoals.some((goal) => goal.staffVisibility === 'all');
  const sharedStudentsQuery = useMemoFirebase(
    () => hasSharedGoals && schoolId ? collection(firestore, 'schools', schoolId, 'students') : null,
    [hasSharedGoals, schoolId, firestore],
  );
  const sharedClassesQuery = useMemoFirebase(
    () => hasSharedGoals && schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null,
    [hasSharedGoals, schoolId, firestore],
  );
  const { data: sharedStudents } = useCollection<Student>(sharedStudentsQuery);
  const { data: sharedClasses } = useCollection<SchoolClass>(sharedClassesQuery);
  const listStudents = sharedStudentsQuery && sharedStudents ? sharedStudents : students;
  const listClasses = sharedClassesQuery && sharedClasses ? sharedClasses : classes;

  const [createStep, setCreateStep] = useState(1);
  const [section, setSection] = useState<SectionId>('active');
  const [form, setForm] = useState<GoalFormState>(emptyForm);
  const [studentSearch, setStudentSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [progressRows, setProgressRows] = useState<{ goal: Goal; progress: number }[]>([]);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editForm, setEditForm] = useState<GoalFormState>(emptyForm);
  const [editStudentSearch, setEditStudentSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [studentPickerOpen, setStudentPickerOpen] = useState<'create' | 'edit' | null>(null);
  const [celebratedIds, setCelebratedIds] = useState<Set<string>>(() => new Set());
  const [alertedAlmostIds, setAlertedAlmostIds] = useState<Set<string>>(() => new Set());
  const [baselineReady, setBaselineReady] = useState(false);

  const rosterForClass = useCallback(
    (classIdInner: string): Student[] => listStudents.filter((s) => s.classId === classIdInner),
    [listStudents],
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
    if (!firestore || !schoolId || filteredGoals.length === 0 ) {
      setProgressRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const out: { goal: Goal; progress: number }[] = [];
      for (const goal of filteredGoals) {
        const anchor = goal.studentId ? listStudents.find((s) => s.id === goal.studentId) : listStudents[0];
        if (!anchor && goal.type !== 'class') continue;
        const viewer = anchor || listStudents[0];
        if (!viewer) continue;
        let roster: Student[] = [viewer];
        if (goal.type === 'class' && goal.classId) {
          roster = rosterForClass(goal.classId);
        }
        const progress = await computeGoalProgress(firestore, schoolId, goal, viewer, roster, categories);
        out.push({ goal, progress });
        // Catch goals that already meet the target (e.g. created after points were earned).
        if (goal.status === 'active' && progress >= Number(goal.targetPoints || 0) && Number(goal.targetPoints || 0) > 0) {
          const syncId = goal.studentId || roster[0]?.id;
          if (syncId) {
            void import('@/lib/goalsProgress').then((m) =>
              m.syncGoalsForStudent(firestore, schoolId, syncId).catch(() => {}),
            );
          }
        }
      }
      if (!cancelled) setProgressRows(out);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [firestore, schoolId, filteredGoals, listStudents, categories, rosterForClass]);

  // Celebrate newly finished goals and ping “almost there” once per session.
  useEffect(() => {
    if (!baselineReady) return;
    for (const { goal, progress } of progressRows) {
      if (goal.status === 'completed' && !celebratedIds.has(goal.id) && goalsOpts.celebrateOnAward) {
        setCelebratedIds((prev) => new Set(prev).add(goal.id));
        const party = goal.type === 'class' && goalsOpts.classPartyMode;
        confetti({ particleCount: party ? 160 : 90, spread: party ? 100 : 70, origin: { y: 0.65 } });
        toast({
          title: party ? 'Class goal party!' : 'Goal finished!',
          description: `"${goal.title}" — ${goalAudienceLabel(goal, students, classes)} made it.`,
        });
      }
      if (
        goal.status === 'active' &&
        isAlmostThere(progress, goal.targetPoints) &&
        !alertedAlmostIds.has(goal.id) &&
        goalsOpts.teacherAlmostThereNudge
      ) {
        setAlertedAlmostIds((prev) => new Set(prev).add(goal.id));
        toast({
          title: 'Almost there!',
          description: `"${goal.title}" for ${goalAudienceLabel(goal, students, classes)} is getting close.`,
        });
      }
    }
  }, [
    progressRows,
    celebratedIds,
    alertedAlmostIds,
    toast,
    students,
    classes,
    baselineReady,
    goalsOpts.celebrateOnAward,
    goalsOpts.classPartyMode,
    goalsOpts.teacherAlmostThereNudge,
  ]);

  const counts = useMemo(() => {
    const c = { active: 0, finished: 0, past_due: 0, archived: 0 };
    for (const g of filteredGoals) {
      c[bucketForGoal(g)] += 1;
    }
    return c;
  }, [filteredGoals]);

  const sectionItems: { id: SectionId; label: string; badge?: number }[] = [
    { id: 'active', label: 'Current', badge: counts.active },
    { id: 'finished', label: 'Finished', badge: counts.finished },
    { id: 'past_due', label: 'Past due', badge: counts.past_due },
    { id: 'archived', label: 'Archived', badge: counts.archived },
  ];

  const listedGoals = useMemo(() => {
    if (section === 'create' || section === 'options') return [];
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

  const handleExtendWeek = async (goal: Goal) => {
    if (!firestore || !schoolId || !canManageGoal(goal, staffViewer)) return;
    try {
      await updateGoal(firestore, schoolId, goal.id, {
        status: 'active',
        endDate: extendedEndDate(goal),
        clearFields: goal.archived ? ['archived'] : undefined,
      });
      toast({ title: 'Extended one week', description: `"${goal.title}" is active again.` });
      setSection('active');
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not extend',
        description: e instanceof Error ? e.message : 'Try again.',
      });
    }
  };

  const validateForm = (state: GoalFormState): string | null => {
    const tp = Number(state.targetPoints);
    if (!state.title.trim() || !Number.isSafeInteger(tp) || tp <= 0) {
      return 'Enter a title and a positive target.';
    }
    if ((state.goalType === 'personal' || state.goalType === 'prize_savings') && !state.studentId) {
      return 'Choose which student this goal is for.';
    }
    if (state.goalType === 'class' && !state.classId) {
      return 'Choose a class for this goal.';
    }
    const bonus = state.bonusPoints.trim() ? Number(state.bonusPoints) : undefined;
    if (bonus !== undefined && (!Number.isSafeInteger(bonus) || bonus < 0)) {
      return 'Enter a valid bonus (0 or more) or leave blank.';
    }
    if (state.goalType !== 'prize_savings' && state.startDate && state.endDate && state.startDate > state.endDate) return 'The end date must be on or after the start date.';
    return null;
  };

  const toGoalPayload = (state: GoalFormState) => {
    const tp = Number(state.targetPoints);
    const bonus = state.bonusPoints.trim() ? Number(state.bonusPoints) : undefined;
    return {
      type: state.goalType,
      title: state.title.trim(),
      description: state.description.trim() || undefined,
      targetPoints: tp,
      categoryId: state.goalType !== 'prize_savings' && state.categoryId && state.categoryId !== '__none__' ? state.categoryId : undefined,
      studentId:
        state.goalType === 'personal' || state.goalType === 'prize_savings' ? state.studentId : undefined,
      classId: state.goalType === 'class' ? state.classId : undefined,
      teacherId: variant === 'teacher' && teacherId ? teacherId : undefined,
      prizeId:
        state.goalType === 'prize_savings' && state.prizeId && state.prizeId !== '__none__'
          ? state.prizeId
          : undefined,
      startDate: state.goalType === 'prize_savings' ? undefined : msFromDateInput(state.startDate, false),
      endDate: msFromDateInput(state.endDate, true),
      bonusPointsReward: bonus !== undefined && bonus > 0 ? bonus : undefined,
      staffVisibility: state.staffVisibility,
    };
  };

  const handleCreate = async () => {
    if (!firestore || !schoolId) return;
    const err = validateForm(form);
    if (err) {
      toast({ variant: 'destructive', title: 'Check the form', description: err });
      return;
    }
    if (!staffId) {
      toast({ variant: 'destructive', title: 'Please sign in again', description: 'We need your staff name before assigning a goal.' });
      return;
    }
    setSaving(true);
    try {
      await addGoal(firestore, schoolId, { ...toGoalPayload(form), assignedByStaffId: staffId, assignedByName: userName || (assignedRole === 'admin' ? 'Admin' : 'Staff'), assignedByRole: assignedRole });
      const payload = toGoalPayload(form);
      if (payload.studentId) {
        void import('@/lib/goalsProgress').then((m) =>
          m.syncGoalsForStudent(firestore, schoolId, payload.studentId!).catch(() => {}),
        );
      } else if (payload.type === 'school' && students[0]) {
        void import('@/lib/goalsProgress').then((m) => m.syncGoalsForStudent(firestore, schoolId, students[0].id).catch(() => {}));
      } else if (payload.type === 'class' && payload.classId) {
        const roster = rosterForClass(payload.classId);
        if (roster[0]) {
          void import('@/lib/goalsProgress').then((m) =>
            m.syncGoalsForStudent(firestore, schoolId, roster[0]!.id).catch(() => {}),
          );
        }
      }
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
    if (!canManageGoal(goal, staffViewer)) return;
    setEditingGoal(goal);
    setEditForm(formFromGoal(goal));
    setEditStudentSearch('');
  };

  const handleSaveEdit = async () => {
    if (!firestore || !schoolId || !editingGoal) return;
    if (!canManageGoal(editingGoal, staffViewer) || !staffId) return;
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
        teacherId: editingGoal.teacherId,
        assignedByStaffId: editingGoal.assignedByStaffId || (editingGoal.teacherId ? `teacher:${editingGoal.teacherId}` : staffId),
        assignedByName: editingGoal.assignedByName || userName || 'Staff',
        assignedByRole: editingGoal.assignedByRole || assignedRole,
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
    if (!firestore || !schoolId || !deleteTarget || !canManageGoal(deleteTarget, staffViewer)) return;
    setDeleting(true);
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
    } finally {
      setDeleting(false);
    }
  };

  const handleArchive = async (goal: Goal, archived: boolean) => {
    if (!firestore || !schoolId || !canManageGoal(goal, staffViewer)) return;
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

  const progressFor = (g: Goal) => g.status === 'completed' ? Math.max(g.targetPoints, progressRows.find((r) => r.goal.id === g.id)?.progress ?? 0) : progressRows.find((r) => r.goal.id === g.id)?.progress ?? 0;

  const renderFormFields = (
    state: GoalFormState,
    target: 'create' | 'edit',
    studentOptions: Student[],
    searchValue: string,
    onSearch: (v: string) => void,
  ) => (
    <div className="space-y-5">
      {(target === 'edit' || createStep === 1) && <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`goal-audience-${target}`}>Who is this for?</Label>
        <Select value={state.goalType === 'school' ? 'school' : state.goalType === 'class' ? 'class' : 'student'} onValueChange={(v) => patchForm({ goalType: v === 'school' ? 'school' : v === 'class' ? 'class' : 'personal', prizeId: '__none__' }, target)}>
          <SelectTrigger id={`goal-audience-${target}`} className="rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="student">One student</SelectItem>
            <SelectItem value="class">Whole class</SelectItem>
            <SelectItem value="school">Whole school</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(state.goalType === 'personal' || state.goalType === 'prize_savings') && (
        <div className="space-y-2">
          <Label htmlFor={`goal-student-${target}`}>Student</Label>
          <Popover
            open={studentPickerOpen === target}
            onOpenChange={(open) => {
              setStudentPickerOpen(open ? target : null);
              if (!open) onSearch('');
            }}
          >
            <PopoverTrigger asChild>
              <Button
                id={`goal-student-${target}`}
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={studentPickerOpen === target}
                className="w-full justify-between rounded-xl font-normal"
              >
                <span className={cn('truncate', !state.studentId && 'text-muted-foreground')}>
                  {state.studentId
                    ? (() => {
                        const picked = students.find((s) => s.id === state.studentId);
                        return picked ? studentLabel(picked) : 'Unknown student (removed)';
                      })()
                    : 'Type or choose a student…'}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput placeholder="Search by name…" value={searchValue} onValueChange={onSearch} />
                <CommandList className="max-h-[280px]">
                  <CommandEmpty>No students match that name.</CommandEmpty>
                  {studentOptions.map((s) => (
                    <CommandItem
                      key={s.id}
                      value={s.id}
                      onSelect={() => {
                        patchForm({ studentId: s.id }, target);
                        setStudentPickerOpen(null);
                        onSearch('');
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', state.studentId === s.id ? 'opacity-100' : 'opacity-0')} />
                      {studentLabel(s)}
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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

      </div>}
      {(target === 'edit' || createStep === 2) && <div className="space-y-4">
      {(state.goalType === 'personal' || state.goalType === 'prize_savings') && <div className="space-y-2">
        <Label htmlFor={`goal-purpose-${target}`}>What are they working toward?</Label>
        <Select value={state.goalType} onValueChange={(v) => patchForm({ goalType: v as GoalType, prizeId: '__none__', ...(v === 'prize_savings' ? { categoryId: '__none__', startDate: '' } : {}) }, target)}>
          <SelectTrigger id={`goal-purpose-${target}`} className="rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="personal">Earn points toward a target</SelectItem>
            <SelectItem value="prize_savings">Save points for a prize</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{state.goalType === 'prize_savings' ? 'Build up enough points to afford a prize. Spending points lowers the amount saved.' : 'Reach a points target, such as earning 50 kindness points.'}</p>
      </div>}
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
          <Label htmlFor={`goal-target-${target}`}>Target points</Label>
          <Input
            id={`goal-target-${target}`}
            className="rounded-xl"
            inputMode="numeric"
            value={state.targetPoints}
            onChange={(e) => patchForm({ targetPoints: e.target.value }, target)}
          />
        </div>

      </div>

      {state.goalType === 'prize_savings' ? (
        <p className="rounded-xl bg-muted p-3 text-sm">Savings use the student’s current balance. Spending points can reduce progress until the goal is finished.</p>
      ) : (
        <div className="space-y-2">
          <Label htmlFor={`goal-start-${target}`}>Start date (optional)</Label>
          <Input
            type="date"
            className="rounded-xl"
            id={`goal-start-${target}`} value={state.startDate}
            onChange={(e) => patchForm({ startDate: e.target.value }, target)}
          />
          <p className="text-sm text-muted-foreground">Only points earned from this date count. Leave blank to include earlier points; the goal may already be reached.</p>
        </div>
      )}
      {state.goalType !== 'prize_savings' && <div className="space-y-2">
        <Label htmlFor={`goal-category-${target}`}>Which category counts?</Label>
        <Select value={state.categoryId} onValueChange={(v) => patchForm({ categoryId: v }, target)}>
          <SelectTrigger id={`goal-category-${target}`} className="rounded-xl">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">All categories</SelectItem>
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
        <p className="text-sm text-muted-foreground">Choose one category, such as Kindness, or count points from all categories.</p>
      </div>

}
      </div>}
      {(target === 'edit' || createStep === 3) && <div className="space-y-4">
        <div className="space-y-2 rounded-xl border p-4">
          <Label htmlFor={`goal-sharing-${target}`}>Who can see this in their staff Goals list?</Label>
          <Select value={state.staffVisibility} onValueChange={(value) => patchForm({ staffVisibility: value as 'creator' | 'all' }, target)}>
            <SelectTrigger id={`goal-sharing-${target}`} className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="creator">Only me and admins</SelectItem>
              <SelectItem value="all">Show for all staff</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">{state.staffVisibility === 'all' ? 'All teachers and staff can see this goal. You remain the person who manages it.' : 'Only you and admins see this goal in the staff Goals list.'} The students taking part can still see their goal.</p>
          <p className="text-sm">Assigned by: {target === 'edit' ? editingGoal?.assignedByName || userName || 'You' : userName || 'You'}</p>
          {target === 'edit' && !editingGoal?.assignedByStaffId && <p className="text-sm text-muted-foreground">This older goal has no recorded assigner name. Saving it will record you as the person managing it.</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`goal-bonus-${target}`}>
            {(state.goalType === 'class' || state.goalType === 'school') ? 'Bonus each student gets (optional)' : 'Bonus on completion (optional)'}
          </Label>
          <Input
            className="rounded-xl"
            inputMode="numeric"
            placeholder="0"
            id={`goal-bonus-${target}`} value={state.bonusPoints}
            onChange={(e) => patchForm({ bonusPoints: e.target.value }, target)}
          />
        </div>
        <p className="text-sm text-muted-foreground">{state.goalType === 'school' ? 'Every student in the school receives this many extra points when the shared target is reached.' : state.goalType === 'class' ? 'Each student in the class receives this many extra points when the shared target is reached.' : 'These extra points are added after the goal is completed. Leave blank for no extra points.'}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <div className="space-y-2">
          <Label htmlFor={`goal-end-${target}`}>End date (optional)</Label>
          <Input
            type="date"
            className="rounded-xl"
            id={`goal-end-${target}`} value={state.endDate}
            onChange={(e) => patchForm({ endDate: e.target.value }, target)}
          />
          <p className="text-sm text-muted-foreground">Leave blank for no deadline. Unfinished goals move to Past due after this date.</p>
        </div>
      </div>
      <details open={target === 'edit'} className="rounded-xl border p-3"><summary className="cursor-pointer font-medium">More options: description</summary><div className="pt-3">      <div className="space-y-2">
        <Label htmlFor={`goal-desc-${target}`}>Description (optional)</Label>
        <Textarea
          id={`goal-desc-${target}`}
          className="rounded-xl min-h-[72px]"
          value={state.description}
          onChange={(e) => patchForm({ description: e.target.value }, target)}
        />
      </div>

</div></details>
        {target === 'create' && <div className="rounded-xl bg-muted p-4 space-y-2" aria-label="Goal summary">
          <p className="font-semibold">Ready to start?</p>
          <p className="text-sm">Staff visibility: {state.staffVisibility === 'all' ? 'Show for all staff' : 'Only me and admins'}</p>
          <p>{state.title || 'Your goal'} · {state.targetPoints} points</p>
          {state.goalType === 'prize_savings' ? <>
            <p className="text-sm">Save points for: {prizes.find((prize) => prize.id === state.prizeId)?.name ?? 'A prize to choose later'}</p>
            <p className="text-sm">Uses the student’s available points. Spending points reduces progress until the goal is finished.</p>
          </> : <>
            <p className="text-sm">Category: {state.categoryId !== '__none__' ? categories?.find((category) => category.id === state.categoryId)?.name ?? 'Category no longer available' : 'All categories'}</p>
            <p className="text-sm">{state.startDate ? `Counts points earned from ${state.startDate}.` : 'Includes points already earned.'} {state.goalType === 'school' ? 'The whole school works toward one shared total.' : state.goalType === 'class' ? 'The class works toward one shared total.' : ''}</p>
          </>}
          <p className="text-sm">{state.goalType === 'school' ? 'Whole school' : state.goalType === 'class' ? classes.find((c) => c.id === state.classId)?.name : studentLabel(students.find((student) => student.id === state.studentId) || { id: '', firstName: '', lastName: '' } as Student)}</p>
          <p className="text-sm">{state.endDate ? `Due ${state.endDate}` : 'No deadline'} · {Number(state.bonusPoints) > 0 ? `${state.bonusPoints} bonus points${(state.goalType === 'class' || state.goalType === 'school') ? ' for each student' : ''}` : 'No bonus points'}</p>
        </div>}
      </div>}
    </div>
  );

  return (
    <StaffPortalTabPanel tabValue="goals" trailing={<TabWalkthroughHeaderAction />}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-muted-foreground">See who is working toward a goal and what comes next.</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSection('options')}>Settings</Button>
          <Button onClick={() => { setCreateStep(1); setSection('create'); }}><Plus className="w-4 h-4 mr-2" />Add goal</Button>
        </div>
      </div>
      {section === 'options' ? (
        <div className="space-y-3">
          <Button variant="link" className="h-auto px-0 text-sm" onClick={() => setSection('active')}>
            ← Back to goals
          </Button>
          <GoalsOptionsPanel
            value={settings.goalsOptions}
            onChange={(next) => updateSettings({ goalsOptions: next })}
          />
        </div>
      ) : section === 'create' ? (
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
              {createStep === 1 ? '1. Who is this for?' : createStep === 2 ? '2. What are they working toward?' : '3. When and what happens next?'}
            </CardTitle>
            <CardDescription>
              {createStep === 1 ? 'Choose one student, a class, or the whole school working together.' : createStep === 2 ? 'Choose the target and the points that count toward it.' : 'Set an optional deadline and bonus, then check the details.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderFormFields(form, 'create', visibleStudents, studentSearch, setStudentSearch)}

            <Button
              className="w-full rounded-xl font-black uppercase tracking-widest h-12"
              onClick={() => {
                if (createStep === 1 && form.goalType !== 'school' && !(form.goalType === 'class' ? form.classId : form.studentId)) {
                  toast({ variant: 'destructive', title: form.goalType === 'class' ? 'Choose a class' : 'Choose a student' }); return;
                }
                if (createStep === 2) { const error = validateForm(form); if (error) { toast({ variant: 'destructive', title: 'Check the details', description: error }); return; } }
                if (createStep < 3) setCreateStep((step) => step + 1); else void handleCreate();
              }}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              {createStep < 3 ? 'Continue' : 'Create goal'}
            </Button>
            {createStep > 1 && <Button variant="outline" disabled={saving} onClick={() => setCreateStep((step) => step - 1)}>Back</Button>}
            <Button variant="ghost" disabled={saving} onClick={() => setSection('active')}>Cancel</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className={cn('border-t-8 border-muted shadow-md', isGraphic ? 'bg-card/60 backdrop-blur-xl' : '')}>
          <CardHeader>
            <CardTitle>
              {section === 'active'
                ? 'Current goals'
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
            <nav aria-label="Goal lists" className="flex flex-wrap gap-1 pt-2">
              {sectionItems.map((item) => {
                const selected = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSection(item.id)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      selected
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    {item.label}
                    {item.badge ? <span className="ml-1 opacity-70">{item.badge}</span> : null}
                  </button>
                );
              })}
            </nav>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : listedGoals.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{goalsOpts.hideEmptySections ? 'No goals in this list yet.' : 'No goals in this list yet. Choose Add goal to get started, or look in another list above.'}</p>
            ) : (
              <ScrollArea className="h-[calc(100vh-22rem)] pr-1">
                <ul className="space-y-3">
                  {listedGoals.map((g) => {
                    const p = progressFor(g);
                    const pct = progressPercent(p, g.targetPoints);
                    const almost = g.status === 'active' && isAlmostThere(p, g.targetPoints);
                    const crushed = isGoalCrushed(p, g.targetPoints);
                    return (
                      <li key={g.id} className="rounded-2xl border bg-muted/15 p-4 space-y-2">
                        <div className="flex flex-col sm:flex-row justify-between gap-3 items-start">
                          <div className="min-w-0">
                            <p className="font-bold break-words">{g.title}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {goalTypeLabel(g.type)} · {goalAudienceLabel(g, listStudents, listClasses)} ·{' '}
                              {goalStatusLabel(g.status)}
                              {g.createdByStudent ? ' · Student wishlist' : ''}
                            </p>
                            {g.description && <p className="text-sm text-muted-foreground mt-1">{g.description}</p>}
                            <p className="text-sm text-muted-foreground">Assigned by: {g.assignedByName || (g.teacherId ? 'Teacher (older goal)' : g.createdByStudent ? 'Student' : 'Not recorded (older goal)')} · {g.staffVisibility === 'all' ? 'Shown to all staff' : g.assignedByStaffId || g.teacherId ? 'Only the assigner and admins' : 'Older goal'}</p>
                            {g.type === 'prize_savings' ? <p className="text-sm text-muted-foreground">Counts available points to spend.</p> : <>
                              <p className="text-sm text-muted-foreground">Category: {g.categoryId ? categories?.find((category) => category.id === g.categoryId)?.name ?? 'Category no longer available' : 'All categories'}</p>
                              <p className="text-sm text-muted-foreground">{g.startDate ? `Counts points earned from ${new Date(g.startDate).toLocaleDateString()}.` : 'Includes points already earned.'} {g.type === 'school' ? 'One shared school total.' : g.type === 'class' ? 'One shared class total.' : ''}</p>
                            </>}
                            <p className="text-sm text-muted-foreground">{g.endDate ? `Due ${new Date(g.endDate).toLocaleDateString()}` : 'No deadline'}</p>
                            {g.prizeId && <p className="text-sm">Saving for: {prizes.find((p) => p.id === g.prizeId)?.name ?? 'Reward no longer available'}</p>}
                            {!!g.bonusPointsReward && <p className="text-sm">{(g.type === 'class' || g.type === 'school') ? 'Bonus for each student' : 'Completion bonus'}: {g.bonusPointsReward} points</p>}
                            {crushed && g.status !== 'expired' ? (
                              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                Goal crushed!
                              </p>
                            ) : almost ? (
                              <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-1">
                                Almost there!
                              </p>
                            ) : null}
                          </div>
                          {canManageGoal(g, staffViewer) && <div className="flex flex-wrap justify-end gap-1">
                            {section === 'past_due' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 px-2"
                                onClick={() => void handleExtendWeek(g)}
                                aria-label="Extend one week"
                                title="Extend one week"
                              >
                                <CalendarPlus className="w-4 h-4" />Extend deadline
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 px-2"
                              onClick={() => openEdit(g)}
                              aria-label="Edit goal"
                            >
                              <Pencil className="w-4 h-4" />Edit
                            </Button>
                            {section !== 'archived' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 px-2"
                                onClick={() => handleArchive(g, true)}
                                aria-label="Archive goal"
                              >
                                <Archive className="w-4 h-4" />Archive
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 px-2"
                                onClick={() => handleArchive(g, false)}
                                aria-label="Restore goal"
                              >
                                <RotateCcw className="w-4 h-4" />Restore
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive h-8 gap-1 px-2"
                              onClick={() => setDeleteTarget(g)}
                              aria-label="Delete goal"
                            >
                              <Trash2 className="w-4 h-4" />Delete
                            </Button>
                          </div>}
                        </div>
                        <div className="flex justify-between text-xs font-bold">
                          <span>
                            {p.toLocaleString()} / {Number(g.targetPoints ?? 0).toLocaleString()} pts
                          </span>
                          <span>{pct}%</span>
                        </div>
                        <Progress value={Math.min(100, pct)} className="h-3" />
                        <p className="text-sm font-medium">{g.status === 'completed' ? 'Finished — well done!' : `${Math.max(0, Number(g.targetPoints) - p).toLocaleString()} more points to go`}</p>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editingGoal} onOpenChange={(open) => !open && !saving && setEditingGoal(null)}>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this goal?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.title}” will be deleted for good. Prefer Archive if you might want it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(event) => { event.preventDefault(); void handleDelete(); }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StaffPortalTabPanel>
  );
}
