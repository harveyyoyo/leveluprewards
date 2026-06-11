'use client';

import { useEffect, useMemo, useState } from 'react';
import { Award, Search, Undo2 } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import type { Category, Class, Student, Teacher } from '@/lib/types';
import {
  remainingTeacherBudgetPoints,
  resolveTeacherBudgetPeriod,
  teacherBudgetRemainingPhrase,
  teacherWithBudgetAfterSpend,
} from '@/lib/teacherBudget';
import { cn, getStudentNickname } from '@/lib/utils';

type LastManualAction = {
  mode: 'award' | 'deduct';
  studentIds: string[];
  points: number;
  description: string;
  budgetSpent?: number;
};

type ManualPointsAwardDialogProps = {
  students: Student[];
  classes: Class[];
  categories: Category[] | null | undefined;
  accentColor?: string;
  isGraphic?: boolean;
  className?: string;
  description?: string;
  variant?: 'dialog' | 'inline';
  budgetOptions?: {
    isAdmin: boolean;
    currentTeacher: Teacher | null;
    onBudgetSpend: (totalCost: number) => Promise<void>;
  };
};

export function ManualPointsAwardDialog({
  students,
  classes,
  categories,
  accentColor = 'hsl(var(--primary))',
  isGraphic = false,
  className,
  description = 'Select students and apply points instantly—no printed coupon required.',
  variant = 'dialog',
  budgetOptions,
}: ManualPointsAwardDialogProps) {
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const { settings } = useSettings();
  const { awardPointsToMultipleStudents, deductPointsFromMultipleStudents } = useAppContext();

  const [open, setOpen] = useState(false);
  const [awardMode, setAwardMode] = useState<'award' | 'deduct'>('award');
  const [studentSearch, setStudentSearch] = useState('');
  const [filterClassId, setFilterClassId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('defaultClassId') || 'all';
    }
    return 'all';
  });
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [awardCategoryId, setAwardCategoryId] = useState('');
  const [awardValue, setAwardValue] = useState('10');
  const [awardReason, setAwardReason] = useState('');
  const [minPoints, setMinPoints] = useState('');
  const [maxPoints, setMaxPoints] = useState('');
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'has_nfc' | 'no_nfc'>('all');
  const [lastAction, setLastAction] = useState<LastManualAction | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryList = useMemo(() => categories ?? [], [categories]);

  useEffect(() => {
    if (categoryList.length > 0 && !awardCategoryId) {
      setAwardCategoryId(categoryList[0].id);
    }
  }, [categoryList, awardCategoryId]);

  useEffect(() => {
    const category = categoryList.find((c) => c.id === awardCategoryId);
    if (category) {
      setAwardValue(category.points.toString());
    }
  }, [awardCategoryId, categoryList]);

  useEffect(() => {
    if (filterClassId === 'all') return;
    if (!classes.some((c) => c.id === filterClassId)) {
      setFilterClassId('all');
    }
  }, [filterClassId, classes]);

  useEffect(() => {
    if (!awardCategoryId) return;
    if (!categoryList.some((c) => c.id === awardCategoryId)) {
      setAwardCategoryId(categoryList[0]?.id ?? '');
    }
  }, [awardCategoryId, categoryList]);

  useEffect(() => {
    const allowed = new Set(students.map((s) => s.id));
    setSelectedStudentIds((prev) => prev.filter((id) => allowed.has(id)));
  }, [students]);

  const selectedCategoryForAward = useMemo(
    () => categoryList.find((c) => c.id === awardCategoryId),
    [categoryList, awardCategoryId],
  );

  const filteredStudents = useMemo(() => {
    const normalizedSearch = studentSearch.trim().toLowerCase();
    const minVal = minPoints.trim() === '' ? -Infinity : Number(minPoints);
    const maxVal = maxPoints.trim() === '' ? Infinity : Number(maxPoints);

    return students
      .filter((s) => {
        const classMatch = filterClassId === 'all' || s.classId === filterClassId;
        if (!classMatch) return false;

        const currentPts = s.points || 0;
        if (currentPts < minVal || currentPts > maxVal) return false;

        if (badgeFilter === 'has_nfc' && !s.nfcId) return false;
        if (badgeFilter === 'no_nfc' && s.nfcId) return false;

        if (!normalizedSearch) return true;

        const computedName = `${getStudentNickname(s)} ${s.lastName}`.toLowerCase();
        return (
          computedName.includes(normalizedSearch) ||
          s.id.toLowerCase().includes(normalizedSearch) ||
          (s.nfcId && s.nfcId.toLowerCase().includes(normalizedSearch))
        );
      })
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [students, studentSearch, filterClassId, minPoints, maxPoints, badgeFilter]);

  useEffect(() => {
    if (filteredStudents.length === 1) {
      setSelectedStudentIds([filteredStudents[0].id]);
    }
  }, [filteredStudents]);

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleStudentSelect = (studentId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedStudentIds((prev) => [...prev, studentId]);
    } else {
      setSelectedStudentIds((prev) => prev.filter((id) => id !== studentId));
    }
  };

  const handleAwardPoints = async () => {
    const points = parseInt(awardValue, 10);
    if (selectedStudentIds.length === 0) {
      playSound('error');
      toast({ variant: 'destructive', title: 'No students selected.' });
      return;
    }
    const selectedCategory = categoryList.find((c) => c.id === awardCategoryId);
    if (!selectedCategory) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Please select a category.' });
      return;
    }
    if (isNaN(points) || points <= 0) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Points must be a positive number.' });
      return;
    }

    const totalCost = points * selectedStudentIds.length;
    const teacher = budgetOptions?.currentTeacher ?? null;
    const skipBudget = !budgetOptions || budgetOptions.isAdmin;
    if (
      !skipBudget &&
      settings.enableTeacherBudgets &&
      teacher &&
      teacher.monthlyBudget !== undefined
    ) {
      const remainingPts = remainingTeacherBudgetPoints(teacher);
      if (remainingPts !== null && totalCost > remainingPts) {
        const phrase = teacherBudgetRemainingPhrase(resolveTeacherBudgetPeriod(teacher));
        playSound('error');
        toast({
          variant: 'destructive',
          title: 'Budget Exceeded',
          description: `Awarding requires ${totalCost} pts, but you only have ${remainingPts.toLocaleString()} pts remaining ${phrase}.`,
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const result = await awardPointsToMultipleStudents(
        selectedStudentIds,
        points,
        selectedCategory.name,
      );

      if (result.success) {
        if (
          !skipBudget &&
          settings.enableTeacherBudgets &&
          teacher &&
          !(result as { queued?: boolean }).queued &&
          budgetOptions?.onBudgetSpend
        ) {
          await budgetOptions.onBudgetSpend(totalCost);
        }
        playSound('success');
        const queued = !!(result as { queued?: boolean }).queued;
        toast({
          title: queued ? 'Saved for later' : 'Points Awarded!',
          description: queued
            ? result.message
            : `Awarded ${points} points to ${result.count} student(s).`,
        });
        if (!queued) {
          setLastAction({
            mode: 'award',
            studentIds: [...selectedStudentIds],
            points,
            description: selectedCategory.name,
            budgetSpent: !skipBudget && settings.enableTeacherBudgets && teacher ? totalCost : undefined,
          });
          setSelectedStudentIds([]);
          if (categoryList.length > 0) {
            setAwardValue(categoryList[0].points.toString());
          }
        }
      } else {
        playSound('error');
        toast({ variant: 'destructive', title: 'Failed to award points', description: result.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeductPoints = async () => {
    const points = parseInt(awardValue, 10);
    if (selectedStudentIds.length === 0) {
      playSound('error');
      toast({ variant: 'destructive', title: 'No students selected.' });
      return;
    }
    if (!awardReason.trim()) {
      playSound('error');
      toast({ variant: 'destructive', title: 'A reason is required for deductions.' });
      return;
    }
    if (isNaN(points) || points <= 0) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Points to deduct must be a positive number.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await deductPointsFromMultipleStudents(selectedStudentIds, points, awardReason);

      if (result.success) {
        playSound('swoosh');
        toast({
          title: 'Points Deducted!',
          description: `Deducted ${points} points from ${result.count} student(s).`,
        });
        setLastAction({
          mode: 'deduct',
          studentIds: [...selectedStudentIds],
          points,
          description: awardReason.trim(),
        });
        setSelectedStudentIds([]);
        setAwardReason('');
      } else {
        playSound('error');
        toast({ variant: 'destructive', title: 'Failed to deduct points', description: result.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUndo = async () => {
    if (!lastAction || isUndoing) return;

    setIsUndoing(true);
    const undoLabel = `Undo: ${lastAction.description}`;
    const teacher = budgetOptions?.currentTeacher ?? null;
    const skipBudget = !budgetOptions || budgetOptions.isAdmin;

    try {
      if (lastAction.mode === 'award') {
        const result = await deductPointsFromMultipleStudents(
          lastAction.studentIds,
          lastAction.points,
          undoLabel,
        );
        if (!result.success) {
          playSound('error');
          toast({
            variant: 'destructive',
            title: 'Undo failed',
            description: result.message,
          });
          return;
        }
        if (
          !skipBudget &&
          settings.enableTeacherBudgets &&
          teacher &&
          lastAction.budgetSpent &&
          budgetOptions?.onBudgetSpend
        ) {
          await budgetOptions.onBudgetSpend(-lastAction.budgetSpent);
        }
        playSound('swoosh');
        toast({
          title: 'Award undone',
          description: `Removed ${lastAction.points} points from ${result.count} student(s).`,
        });
      } else {
        const result = await awardPointsToMultipleStudents(
          lastAction.studentIds,
          lastAction.points,
          undoLabel,
        );
        if (!result.success) {
          playSound('error');
          toast({
            variant: 'destructive',
            title: 'Undo failed',
            description: result.message,
          });
          return;
        }
        playSound('success');
        toast({
          title: 'Deduction undone',
          description: `Restored ${lastAction.points} points to ${result.count} student(s).`,
        });
      }
      setLastAction(null);
    } finally {
      setIsUndoing(false);
    }
  };

  const undoSummary = lastAction
    ? lastAction.mode === 'award'
      ? `Last: +${lastAction.points} pts × ${lastAction.studentIds.length}`
      : `Last: −${lastAction.points} pts × ${lastAction.studentIds.length}`
    : null;

  const formContent = (
    <div className={cn('space-y-6', variant === 'inline' ? 'p-0' : 'flex-1 min-h-0 overflow-y-auto px-6 pb-6')}>
            <div className="flex items-center justify-between gap-3">
              <div className="grid w-full max-w-[260px] grid-cols-2 rounded-xl border bg-muted/20 p-1">
                <Button
                  type="button"
                  variant={awardMode === 'award' ? 'default' : 'ghost'}
                  className="h-9 rounded-lg text-xs font-black uppercase tracking-widest"
                  onClick={() => setAwardMode('award')}
                  style={awardMode === 'award' ? { backgroundColor: accentColor, color: '#fff' } : undefined}
                >
                  Award
                </Button>
                <Button
                  type="button"
                  variant={awardMode === 'deduct' ? 'default' : 'ghost'}
                  className="h-9 rounded-lg text-xs font-black uppercase tracking-widest"
                  onClick={() => setAwardMode('deduct')}
                  style={awardMode === 'deduct' ? { backgroundColor: accentColor, color: '#fff' } : undefined}
                >
                  Deduct
                </Button>
              </div>
              <Button variant="outline" onClick={toggleSelectAll} className="rounded-xl">
                {selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0
                  ? 'Deselect All'
                  : 'Select All'}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-muted/10 p-3 rounded-2xl border border-dashed">
              <div className="relative group col-span-1 sm:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search name, ID, or NFC..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className={cn(
                    'h-11 rounded-xl pl-9 transition-all bg-background/50 backdrop-blur-sm focus-visible:ring-primary/20',
                    isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-slate-50',
                  )}
                />
              </div>
              <Select
                value={filterClassId}
                onValueChange={(val) => {
                  setFilterClassId(val);
                  localStorage.setItem('defaultClassId', val);
                }}
              >
                <SelectTrigger
                  className={cn(
                    'h-11 rounded-xl transition-all',
                    isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-slate-50',
                  )}
                >
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={badgeFilter} onValueChange={(v: 'all' | 'has_nfc' | 'no_nfc') => setBadgeFilter(v)}>
                <SelectTrigger
                  className={cn(
                    'h-11 rounded-xl transition-all',
                    isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-slate-50',
                  )}
                >
                  <SelectValue placeholder="Badge filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All NFC Statuses</SelectItem>
                  <SelectItem value="has_nfc">Has NFC tag</SelectItem>
                  <SelectItem value="no_nfc">No NFC tag</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input
                type="number"
                placeholder="Min Points"
                value={minPoints}
                onChange={(e) => setMinPoints(e.target.value)}
                className={cn('h-11 rounded-xl font-medium', isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-slate-50')}
              />
              <Input
                type="number"
                placeholder="Max Points"
                value={maxPoints}
                onChange={(e) => setMaxPoints(e.target.value)}
                className={cn('h-11 rounded-xl font-medium', isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-slate-50')}
              />
              <div className="col-span-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMinPoints('');
                    setMaxPoints('');
                    setBadgeFilter('all');
                  }}
                  className="h-11 px-3 rounded-xl text-xs font-bold w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t">
              <Select value={awardCategoryId} onValueChange={setAwardCategoryId}>
                <SelectTrigger
                  className={cn('h-11 rounded-xl', isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-slate-50')}
                >
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-1">
                <Input
                  type="number"
                  value={awardValue}
                  onChange={(e) => setAwardValue(e.target.value)}
                  className={cn('h-11 rounded-xl font-black', isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-slate-50')}
                  placeholder="Points"
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {[5, 10, 20, 50, 100].map((v) => (
                    <Button
                      key={v}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAwardValue(v.toString())}
                      className="h-6 px-1.5 text-[10px] rounded-md font-bold"
                    >
                      +{v}
                    </Button>
                  ))}
                </div>
                {awardMode === 'award' &&
                selectedCategoryForAward?.rubricLevels &&
                selectedCategoryForAward.rubricLevels.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/60">
                    {selectedCategoryForAward.rubricLevels.map((r) => (
                      <Button
                        key={r.id}
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setAwardValue(String(r.points))}
                        className="h-7 px-2 text-[10px] rounded-md font-bold"
                        title={r.label}
                      >
                        {r.label}: {r.points}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
              {awardMode === 'deduct' ? (
                <Input
                  value={awardReason}
                  onChange={(e) => setAwardReason(e.target.value)}
                  className={cn('h-11 rounded-xl', isGraphic ? 'bg-foreground/5 border-white/10' : 'bg-slate-50')}
                  placeholder="Reason"
                />
              ) : (
                <div className="h-11" />
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <Button
                onClick={awardMode === 'award' ? handleAwardPoints : handleDeductPoints}
                disabled={isSubmitting}
                className="h-14 flex-1 rounded-2xl font-black uppercase tracking-widest text-white disabled:opacity-80"
                style={{ backgroundColor: accentColor }}
              >
                {isSubmitting
                  ? awardMode === 'award'
                    ? 'Awarding…'
                    : 'Deducting…'
                  : awardMode === 'award'
                    ? 'Award Points'
                    : 'Deduct Points'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleUndo}
                disabled={!lastAction || isUndoing}
                className="h-14 shrink-0 rounded-2xl font-bold gap-2 px-5 sm:min-w-[9.5rem]"
                title={undoSummary ?? 'Undo the last manual award or deduction'}
              >
                <Undo2 className="h-4 w-4 shrink-0" />
                {isUndoing ? 'Undoing…' : 'Undo'}
              </Button>
            </div>
            {undoSummary ? (
              <p className="text-center text-xs font-medium text-muted-foreground">{undoSummary}</p>
            ) : null}

            <div className="rounded-2xl border bg-muted/20">
              <ScrollArea className="h-[min(42vh,360px)] min-h-[200px] w-full">
                <ul className="p-3 space-y-2">
                  {filteredStudents.map((s) => {
                    const checked = selectedStudentIds.includes(s.id);
                    return (
                      <li
                        key={s.id}
                        className={cn(
                          'flex items-center justify-between gap-3 p-3 rounded-xl border bg-background/60',
                          checked && 'border-primary/30',
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => handleStudentSelect(s.id, !!v)}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <div>
                            <p className="font-bold">
                              {getStudentNickname(s)} {s.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {s.classId
                                ? classes.find((c) => c.id === s.classId)?.name || 'Unassigned'
                                : 'Unassigned'}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-muted-foreground">
                          {(s.points || 0).toLocaleString()} pts
                        </span>
                      </li>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <li className="text-center text-sm text-muted-foreground py-10">No students found.</li>
                  )}
                </ul>
              </ScrollArea>
            </div>
    </div>
  );

  if (variant === 'inline') {
    return (
      <Card
        className={cn(
          'w-full border-t-4 border-primary shadow-md overflow-hidden',
          isGraphic && 'bg-card/60 backdrop-blur-2xl border-chart-1',
          className,
        )}
      >
        <CardHeader className="p-4 md:p-6">
          <Helper content={description}>
            <CardTitle className="flex items-center gap-3 text-xl font-black">
              <div
                className={cn(
                  'p-2 rounded-xl',
                  isGraphic ? 'bg-chart-2/20 text-chart-2' : 'bg-ring/10 text-ring',
                )}
              >
                <Award className="w-5 h-5" />
              </div>
              Manually Add or Deduct
            </CardTitle>
          </Helper>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">{formContent}</CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('flex justify-end', className)}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            className="rounded-xl h-11 font-bold gap-2"
            style={{ backgroundColor: accentColor, color: '#fff' }}
          >
            <Award className="w-4 h-4 shrink-0" />
            Manually Add or Deduct Points
          </Button>
        </DialogTrigger>
        <DialogContent
          className={cn(
            'max-w-4xl w-[min(96vw,56rem)] max-h-[min(92vh,900px)] flex flex-col gap-0 overflow-hidden p-0',
            isGraphic ? 'bg-card/95 backdrop-blur-2xl text-foreground border-white/10' : 'bg-white',
          )}
        >
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle className="flex items-center gap-3 text-xl font-black">
              <div
                className={cn(
                  'p-2 rounded-xl',
                  isGraphic ? 'bg-chart-2/20 text-chart-2' : 'bg-ring/10 text-ring',
                )}
              >
                <Award className="w-5 h-5" />
              </div>
              Award / Deduct Points
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    </div>
  );
}
