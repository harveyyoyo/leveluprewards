'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlipVertical2,
  GripVertical,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Settings2,
  Shuffle,
  Sparkles,
  Undo2,
  Users,
  MousePointerClick,
} from 'lucide-react';
import { openClassroomFullscreenTab } from '@/lib/classroomPointsUrl';
import { ClassroomScreenSetupPopover } from '@/components/points/ClassroomScreenSetupPopover';
import { isClassroomPillarOn, isClassroomOnlyMode, isPillarOn } from '@/lib/productPillars';
import { BehaviorNoteDialog } from '@/components/classroom/BehaviorNoteDialog';
import {
  attendanceStatusForStudent,
  useTodayAttendanceMap,
  type TodayAttendanceStatus,
} from '@/hooks/useTodayAttendanceMap';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Button } from '@/components/ui/button';
import { Helper } from '@/components/ui/helper';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import {
  addToClassroomSession,
  buildInitialLayout,
  loadClassroomLayout,
  loadClassroomPrefs,
  loadClassroomSession,
  resizeLayout,
  saveClassroomLayout,
  saveClassroomPrefs,
  studentIdsInLayout,
  swapCells,
  visualLayoutPositions,
  type ClassroomQuickAward,
  type ClassroomSeatingLayout,
  type ClassroomSeatingPrefs,
  type ClassroomSessionTotals,
  DEFAULT_CLASSROOM_PREFS,
} from '@/lib/classroomSeatingChart';
import {
  remainingTeacherBudgetPoints,
  resolveTeacherBudgetPeriod,
  teacherBudgetRemainingPhrase,
  teacherWithBudgetAfterSpend,
} from '@/lib/teacherBudget';
import {
  ClassroomDeskVisual,
  ClassroomDesignSwitcher,
  ClassroomEffectOverlay,
  ClassroomEmptyDeskLabel,
  ClassroomHeaderBrand,
  ClassroomIconButton,
  ClassroomSessionBadge,
  ClassroomTeacherDesk,
  ClassroomToolButton,
  classroomControlsBarClass,
  classroomDesignShellClass,
  classroomStudentDeskClass,
  useClassroomCelebrationEffect,
  type ClassroomDesign,
} from '@/components/points/classroomVisualTheme';
import type { Category, Class, Student, Teacher } from '@/lib/types';
import { cn, getStudentNickname } from '@/lib/utils';

type BudgetOptions = {
  isAdmin: boolean;
  currentTeacher: Teacher | null;
  onBudgetSpend: (totalCost: number) => Promise<void>;
};

type PendingAward = {
  studentId: string;
  cellIndex: number;
  startedAt: number;
};

type LastClassroomAction = {
  mode: 'award' | 'deduct';
  studentIds: string[];
  points: number;
  description: string;
  budgetSpent?: number;
};

function attendanceDotClass(status: TodayAttendanceStatus): string {
  if (status === 'absent') return 'bg-red-500';
  if (status === 'late') return 'bg-amber-500';
  if (status === 'on-time') return 'bg-emerald-500';
  return 'bg-muted-foreground/40';
}

function attendanceTitle(status: TodayAttendanceStatus): string {
  if (status === 'absent') return 'Absent today';
  if (status === 'late') return 'Late today';
  if (status === 'on-time') return 'Present today';
  return '';
}

type ClassroomPointsPanelProps = {
  schoolId: string;
  students: Student[];
  classes: Class[];
  /** School award categories (same list as Points → Award Categories). */
  categories?: Category[];
  storageScope: string;
  /** Embedded in Points tab vs dedicated fullscreen tab. */
  variant?: 'embedded' | 'fullscreen';
  initialClassId?: string;
  accentColor?: string;
  isGraphic?: boolean;
  budgetOptions?: BudgetOptions;
  /** When Rewards pillar is off, track session totals only (no Firestore point writes). */
  sessionOnly?: boolean;
};

function deskDensity(cellCount: number): 'normal' | 'cozy' | 'tight' {
  if (cellCount > 36) return 'tight';
  if (cellCount > 20) return 'cozy';
  return 'normal';
}

export function ClassroomPointsPanel({
  schoolId,
  students,
  classes,
  categories = [],
  storageScope,
  variant = 'embedded',
  initialClassId,
  accentColor = 'hsl(var(--primary))',
  isGraphic = false,
  budgetOptions,
  sessionOnly: sessionOnlyProp,
}: ClassroomPointsPanelProps) {
  const isFullscreen = variant === 'fullscreen';
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const { settings } = useSettings();
  const sessionOnly = sessionOnlyProp ?? isClassroomOnlyMode(settings);
  const { awardPoints, awardPointsToMultipleStudents, deductPointsFromMultipleStudents, userName, teacherDocId } =
    useAppContext();
  const attendanceEnabled = isPillarOn(settings, 'payAttendance') && !!settings.enableClassSignIn;
  const todayAttendance = useTodayAttendanceMap(schoolId, attendanceEnabled);
  const operatorId = teacherDocId || storageScope;
  const operatorName = userName || storageScope;
  const [behaviorNoteStudent, setBehaviorNoteStudent] = useState<Student | null>(null);
  const [behaviorNotePoints, setBehaviorNotePoints] = useState<{ label?: string; amount?: number }>({});

  const [filterClassId, setFilterClassId] = useState(() => {
    if (initialClassId && classes.some((c) => c.id === initialClassId)) {
      return initialClassId;
    }
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('defaultClassId');
      if (stored && stored !== 'all') return stored;
    }
    return isFullscreen ? classes[0]?.id ?? 'all' : classes[0]?.id ?? 'all';
  });
  const [layout, setLayout] = useState<ClassroomSeatingLayout | null>(null);
  const [prefs, setPrefs] = useState<ClassroomSeatingPrefs>(DEFAULT_CLASSROOM_PREFS);
  const [editMode, setEditMode] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [pendingAward, setPendingAward] = useState<PendingAward | null>(null);
  const [awardingId, setAwardingId] = useState<string | null>(null);
  const [flashCell, setFlashCell] = useState<{ index: number; points: number } | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const [countdownTick, setCountdownTick] = useState(0);
  const [burstMode, setBurstMode] = useState(false);
  const [burstSelected, setBurstSelected] = useState<string[]>([]);
  const [sessionTotals, setSessionTotals] = useState<ClassroomSessionTotals>({});
  const [lastAction, setLastAction] = useState<LastClassroomAction | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const [randomHighlightId, setRandomHighlightId] = useState<string | null>(null);
  const randomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { playEffectAtCell, activeCelebration } = useClassroomCelebrationEffect();
  const design = prefs.design;

  const sortedCategories = useMemo(
    () => categories.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  const classStudents = useMemo(() => {
    if (filterClassId === 'all') return students;
    return students.filter((s) => s.classId === filterClassId);
  }, [students, filterClassId]);

  const studentById = useMemo(() => {
    const map = new Map<string, Student>();
    classStudents.forEach((s) => map.set(s.id, s));
    return map;
  }, [classStudents]);

  const effectiveClassId = filterClassId === 'all' ? classes[0]?.id : filterClassId;
  const effectiveClassName = useMemo(() => {
    const id = effectiveClassId && effectiveClassId !== 'all' ? effectiveClassId : null;
    return id ? classes.find((c) => c.id === id)?.name : undefined;
  }, [classes, effectiveClassId]);

  const openBehaviorNote = useCallback(
    (student: Student, points?: { label?: string; amount?: number }) => {
      setBehaviorNotePoints(points ?? {});
      setBehaviorNoteStudent(student);
    },
    [],
  );

  useEffect(() => {
    setPrefs(loadClassroomPrefs(schoolId, storageScope));
  }, [schoolId, storageScope]);

  useEffect(() => {
    if (!effectiveClassId || effectiveClassId === 'all') {
      setLayout(null);
      return;
    }
    const ids = classStudents.map((s) => s.id);
    const saved = loadClassroomLayout(schoolId, storageScope, effectiveClassId);
    if (saved) {
      const allowed = new Set(ids);
      const cells = saved.cells.map((id) => (id && allowed.has(id) ? id : null));
      setLayout({ ...saved, cells });
    } else {
      setLayout(buildInitialLayout(ids));
    }
  }, [schoolId, storageScope, effectiveClassId, classStudents]);

  useEffect(() => {
    if (!layout || !effectiveClassId || effectiveClassId === 'all') return;
    saveClassroomLayout(schoolId, storageScope, effectiveClassId, layout);
  }, [layout, schoolId, storageScope, effectiveClassId]);

  useEffect(() => {
    if (!effectiveClassId || effectiveClassId === 'all') return;
    setSessionTotals(loadClassroomSession(schoolId, storageScope, effectiveClassId));
    setBurstSelected([]);
    setLastAction(null);
  }, [schoolId, storageScope, effectiveClassId]);

  const placedStudentIds = useMemo(() => {
    if (!layout) return [] as string[];
    return layout.cells.filter((id): id is string => !!id);
  }, [layout]);

  const unassignedStudents = useMemo(() => {
    if (!layout) return classStudents;
    const placed = studentIdsInLayout(layout);
    return classStudents.filter((s) => !placed.has(s.id));
  }, [classStudents, layout]);

  const clearAutoTimer = useCallback(() => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }, []);

  const applyPointsToStudents = useCallback(
    async (
      studentIds: string[],
      points: number,
      description: string,
      options?: { flashCellIndex?: number; silent?: boolean },
    ) => {
      if (awardingId || studentIds.length === 0) return false;
      const magnitude = Math.abs(points);
      const isDeduct = points < 0;
      const teacher = budgetOptions?.currentTeacher ?? null;
      const skipBudget = !budgetOptions || budgetOptions.isAdmin;
      const totalCost = magnitude * studentIds.length;

      if (
        !isDeduct &&
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
            title: 'Budget exceeded',
            description: `You need ${totalCost} pts but only have ${remainingPts.toLocaleString()} remaining ${phrase}.`,
          });
          return false;
        }
      }

      setAwardingId(studentIds[0] ?? null);

      if (sessionOnly && effectiveClassId && effectiveClassId !== 'all') {
        const sessionDelta = isDeduct ? -magnitude : magnitude;
        setSessionTotals(
          addToClassroomSession(
            schoolId,
            storageScope,
            effectiveClassId,
            studentIds,
            sessionDelta,
          ),
        );
        setLastAction({
          mode: isDeduct ? 'deduct' : 'award',
          studentIds: [...studentIds],
          points: magnitude,
          description,
        });
        if (options?.flashCellIndex !== undefined && !isDeduct) {
          setFlashCell({ index: options.flashCellIndex, points: magnitude });
          window.setTimeout(() => setFlashCell(null), 900);
        }
        playSound(isDeduct ? 'swoosh' : 'success');
        if (!options?.silent) {
          toast({
            title: isDeduct
              ? `−${magnitude} session (Rewards off)`
              : `+${magnitude} session (Rewards off)`,
            description: 'Tracked for the room display only — enable Rewards to update balances.',
          });
        }
        setAwardingId(null);
        return true;
      }

      const result = isDeduct
        ? await deductPointsFromMultipleStudents(studentIds, magnitude, description)
        : studentIds.length === 1
          ? await awardPoints(studentIds[0], magnitude, description)
          : await awardPointsToMultipleStudents(studentIds, magnitude, description);

      if (result.success) {
        const queued = !!(result as { queued?: boolean }).queued;
        if (
          !isDeduct &&
          !skipBudget &&
          settings.enableTeacherBudgets &&
          teacher &&
          !queued &&
          budgetOptions?.onBudgetSpend
        ) {
          await budgetOptions.onBudgetSpend(totalCost);
        }
        playSound(isDeduct ? 'swoosh' : 'success');
        if (!options?.silent) {
          const count =
            'count' in result && typeof result.count === 'number'
              ? result.count
              : studentIds.length;
          toast({
            title: isDeduct
              ? `−${magnitude} from ${count} student(s)`
              : `+${magnitude} to ${count} student(s)`,
            description: queued ? result.message : description,
          });
        }
        if (!queued && effectiveClassId && effectiveClassId !== 'all') {
          const sessionDelta = isDeduct ? -magnitude : magnitude;
          setSessionTotals(
            addToClassroomSession(
              schoolId,
              storageScope,
              effectiveClassId,
              studentIds,
              sessionDelta,
            ),
          );
          setLastAction({
            mode: isDeduct ? 'deduct' : 'award',
            studentIds: [...studentIds],
            points: magnitude,
            description,
            budgetSpent: !isDeduct && !skipBudget && settings.enableTeacherBudgets ? totalCost : undefined,
          });
        }
        if (options?.flashCellIndex !== undefined && !isDeduct) {
          setFlashCell({ index: options.flashCellIndex, points: magnitude });
          window.setTimeout(() => setFlashCell(null), 900);
        }
        setAwardingId(null);
        return true;
      }

      playSound('error');
      toast({
        variant: 'destructive',
        title: isDeduct ? 'Could not deduct points' : 'Could not award points',
        description: result.message,
      });
      setAwardingId(null);
      return false;
    },
    [
      awardingId,
      budgetOptions,
      settings.enableTeacherBudgets,
      awardPoints,
      awardPointsToMultipleStudents,
      deductPointsFromMultipleStudents,
      playSound,
      toast,
      schoolId,
      storageScope,
      effectiveClassId,
      sessionOnly,
    ],
  );

  const celebrateAtCell = useCallback(
    (cellIndex: number) => {
      playEffectAtCell(prefsRef.current.celebrationEffect ?? 'sparkles', cellIndex);
    },
    [playEffectAtCell],
  );

  const runAward = useCallback(
    (studentId: string, points: number, description: string, cellIndex?: number) =>
      applyPointsToStudents([studentId], points, description, { flashCellIndex: cellIndex }),
    [applyPointsToStudents],
  );

  const confirmPendingAward = useCallback(
    async (points: number, description: string) => {
      if (!pendingAward) return;
      clearAutoTimer();
      const { studentId, cellIndex } = pendingAward;
      setPendingAward(null);
      const ok = await runAward(studentId, points, description, cellIndex);
      if (ok && points > 0) celebrateAtCell(cellIndex);
    },
    [pendingAward, clearAutoTimer, runAward, celebrateAtCell],
  );

  useEffect(() => {
    if (!pendingAward) return;
    const interval = setInterval(() => setCountdownTick((t) => t + 1), 100);
    return () => clearInterval(interval);
  }, [pendingAward]);

  useEffect(() => {
    if (!pendingAward) {
      clearAutoTimer();
      return;
    }
    const { studentId, cellIndex, startedAt } = pendingAward;
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, prefsRef.current.autoAwardMs - elapsed);
    autoTimerRef.current = setTimeout(() => {
      setPendingAward(null);
      void runAward(
        studentId,
        prefsRef.current.defaultPoints,
        prefsRef.current.defaultDescription,
        cellIndex,
      ).then((ok) => {
        if (ok) celebrateAtCell(cellIndex);
      });
    }, remaining);
    return clearAutoTimer;
  }, [pendingAward, clearAutoTimer, runAward, celebrateAtCell]);

  const handleDeskTap = (studentId: string, cellIndex: number) => {
    if (editMode || awardingId) return;

    if (burstMode) {
      setBurstSelected((prev) =>
        prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
      );
      return;
    }

    if (prefs.instantTap) {
      void runAward(studentId, prefs.defaultPoints, prefs.defaultDescription, cellIndex).then((ok) => {
        if (ok) celebrateAtCell(cellIndex);
      });
      return;
    }

    if (pendingAward?.studentId === studentId) {
      confirmPendingAward(prefs.defaultPoints, prefs.defaultDescription);
      return;
    }
    if (pendingAward) {
      clearAutoTimer();
      setPendingAward(null);
    }
    setPendingAward({ studentId, cellIndex, startedAt: Date.now() });
  };

  const pickRandomStudent = useCallback(() => {
    if (!placedStudentIds.length) return;
    const id = placedStudentIds[Math.floor(Math.random() * placedStudentIds.length)];
    setRandomHighlightId(id);
    if (randomTimerRef.current) clearTimeout(randomTimerRef.current);
    randomTimerRef.current = setTimeout(() => setRandomHighlightId(null), 2500);
    const student = studentById.get(id);
    if (student) {
      playSound('success');
      toast({
        title: 'Random pick',
        description: getStudentNickname(student),
      });
    }
  }, [placedStudentIds, studentById, playSound, toast]);

  const awardWholeClass = useCallback(() => {
    if (!placedStudentIds.length) return;
    if (
      placedStudentIds.length > 8 &&
      typeof window !== 'undefined' &&
      !window.confirm(
        `Award +${prefs.defaultPoints} points to all ${placedStudentIds.length} students on the chart?`,
      )
    ) {
      return;
    }
    void applyPointsToStudents(
      placedStudentIds,
      prefs.defaultPoints,
      `Classroom — ${prefs.defaultDescription}`,
    );
  }, [placedStudentIds, prefs.defaultPoints, prefs.defaultDescription, applyPointsToStudents]);

  const awardBurstSelection = useCallback(async () => {
    if (!burstSelected.length) return;
    const ok = await applyPointsToStudents(
      burstSelected,
      prefs.defaultPoints,
      `Classroom burst — ${prefs.defaultDescription}`,
    );
    if (ok) setBurstSelected([]);
  }, [burstSelected, prefs.defaultPoints, prefs.defaultDescription, applyPointsToStudents]);

  const handleUndo = useCallback(async () => {
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
          toast({ variant: 'destructive', title: 'Undo failed', description: result.message });
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
        if (effectiveClassId && effectiveClassId !== 'all') {
          setSessionTotals(
            addToClassroomSession(
              schoolId,
              storageScope,
              effectiveClassId,
              lastAction.studentIds,
              -lastAction.points,
            ),
          );
        }
      } else {
        const result = await awardPointsToMultipleStudents(
          lastAction.studentIds,
          lastAction.points,
          undoLabel,
        );
        if (!result.success) {
          playSound('error');
          toast({ variant: 'destructive', title: 'Undo failed', description: result.message });
          return;
        }
        if (effectiveClassId && effectiveClassId !== 'all') {
          setSessionTotals(
            addToClassroomSession(
              schoolId,
              storageScope,
              effectiveClassId,
              lastAction.studentIds,
              lastAction.points,
            ),
          );
        }
      }
      playSound('swoosh');
      toast({ title: 'Undone', description: `Reversed last action for ${lastAction.studentIds.length} student(s).` });
      setLastAction(null);
    } finally {
      setIsUndoing(false);
    }
  }, [
    lastAction,
    isUndoing,
    budgetOptions,
    settings.enableTeacherBudgets,
    deductPointsFromMultipleStudents,
    awardPointsToMultipleStudents,
    playSound,
    toast,
    schoolId,
    storageScope,
    effectiveClassId,
  ]);

  useEffect(() => {
    if (editMode || pendingAward) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        pickRandomStudent();
      } else if (e.key === 'u' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void handleUndo();
      } else if (e.key === 'Escape') {
        setPendingAward(null);
        clearAutoTimer();
        setBurstSelected([]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editMode, pendingAward, pickRandomStudent, handleUndo, clearAutoTimer]);

  const handleDragStart = (index: number) => {
    if (!editMode) return;
    setDragIndex(index);
  };

  const handleDrop = (targetIndex: number) => {
    if (!editMode || dragIndex === null || !layout) return;
    if (dragIndex !== targetIndex) {
      setLayout(swapCells(layout, dragIndex, targetIndex));
    }
    setDragIndex(null);
  };

  const placeStudentOnDesk = (studentId: string, cellIndex: number) => {
    if (!layout) return;
    const cells = layout.cells.map((id, i) => {
      if (id === studentId) return null;
      if (i === cellIndex) return studentId;
      return id;
    });
    setLayout({ ...layout, cells });
  };

  const resetLayout = () => {
    const ids = classStudents.map((s) => s.id);
    setLayout(buildInitialLayout(ids));
    setPendingAward(null);
    clearAutoTimer();
  };

  const updatePrefs = (next: ClassroomSeatingPrefs) => {
    setPrefs(next);
    saveClassroomPrefs(schoolId, storageScope, next);
  };

  const setDesign = (nextDesign: ClassroomDesign) => {
    updatePrefs({ ...prefs, design: nextDesign });
  };

  const pendingProgress =
    pendingAward && prefs.autoAwardMs > 0
      ? Math.min(1, (Date.now() - pendingAward.startedAt) / prefs.autoAwardMs)
      : 0;
  void countdownTick;

  if (classes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Add a class and students to use the classroom view.</p>
    );
  }

  if (!effectiveClassId || filterClassId === 'all') {
    return (
      <div className="space-y-4">
        <Helper content="Pick one class so the seating chart matches your room. Layout is saved per class on this device.">
          <p className="text-sm font-medium text-foreground">Choose a class for your seating chart</p>
        </Helper>
        <Select
          value={filterClassId === 'all' ? '' : filterClassId}
          onValueChange={(val) => {
            setFilterClassId(val);
            localStorage.setItem('defaultClassId', val);
          }}
        >
          <SelectTrigger className="h-11 max-w-md rounded-xl">
            <SelectValue placeholder="Select class…" />
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
    );
  }

  if (!layout) return null;

  const pendingStudent = pendingAward ? studentById.get(pendingAward.studentId) : null;
  const cellCount = layout.rows * layout.cols;
  const density = deskDensity(cellCount);
  const gridGap = density === 'tight' ? 3 : density === 'cozy' ? 5 : 8;
  const frontAtBottom = prefs.frontAtBottom;
  const visualCells = visualLayoutPositions(layout, frontAtBottom);

  const teacherDesk = (
    <ClassroomTeacherDesk design={design} frontAtBottom={frontAtBottom} />
  );

  const openFullscreen = () => {
    if (!effectiveClassId || effectiveClassId === 'all') {
      toast({
        variant: 'destructive',
        title: 'Select a class first',
        description: 'Choose your class, then open the full-screen classroom view.',
      });
      return;
    }
    openClassroomFullscreenTab({
      schoolId,
      classId: effectiveClassId,
      scope: storageScope,
    });
  };

  const awardMenu =
    !prefs.instantTap && pendingAward && pendingStudent ? (
      <ClassroomAwardMenu
        student={pendingStudent}
        prefs={prefs}
        pendingAward={pendingAward}
        categories={sortedCategories}
        onPick={(points, description) => confirmPendingAward(points, description)}
        onBehaviorNote={() => {
          openBehaviorNote(pendingStudent);
          setPendingAward(null);
          clearAutoTimer();
        }}
        onCorrection={() => {
          if (!pendingAward) return;
          const { studentId, cellIndex } = pendingAward;
          setPendingAward(null);
          clearAutoTimer();
          void applyPointsToStudents(
            [studentId],
            -prefs.correctionPoints,
            prefs.correctionDescription,
            { flashCellIndex: cellIndex },
          );
        }}
        correctionLabel={prefs.correctionLabel}
        correctionPoints={prefs.correctionPoints}
        onPauseAutoAward={(dropdownOpen) => {
          if (dropdownOpen) {
            clearAutoTimer();
          } else if (pendingAward) {
            setPendingAward({ ...pendingAward, startedAt: Date.now() });
          }
        }}
        onCancel={() => {
          setPendingAward(null);
          clearAutoTimer();
        }}
      />
    ) : null;

  return (
    <div className={cn(classroomDesignShellClass(design, isFullscreen), isFullscreen && 'gap-2 p-1')}>
      {sessionOnly ? (
        <p className="rounded-xl border border-amber-300/40 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          Session-only mode — taps update the room display, not student point balances.
        </p>
      ) : null}
      {isFullscreen ? (
        <ClassroomHeaderBrand
          design={design}
          studentCount={placedStudentIds.length}
          className="shrink-0 px-1"
        />
      ) : (
        <Helper content="Tap a student for a quick award. Use Arrange to drag desks; the teacher desk marks the front of the room.">
          <ClassroomHeaderBrand design={design} studentCount={placedStudentIds.length} />
        </Helper>
      )}

      <div className={classroomControlsBarClass(design)}>
        <Select
          value={effectiveClassId}
          onValueChange={(val) => {
            setFilterClassId(val);
            localStorage.setItem('defaultClassId', val);
            setPendingAward(null);
          }}
        >
          <SelectTrigger className="h-10 min-w-[10rem] rounded-xl border-border bg-background text-sm font-semibold shadow-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[250]" position="popper">
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!editMode && (
          <>
            <ClassroomToolButton
              design={design}
              icon={Shuffle}
              label="Random"
              title="Random student (R)"
              onClick={pickRandomStudent}
            />
            <ClassroomToolButton
              design={design}
              icon={Users}
              label={`Class +${prefs.defaultPoints}`}
              title={`Award +${prefs.defaultPoints} to everyone on the chart`}
              onClick={awardWholeClass}
              disabled={!placedStudentIds.length}
            />
            <ClassroomToolButton
              design={design}
              icon={MousePointerClick}
              label={burstMode ? `Burst (${burstSelected.length})` : 'Burst'}
              primary={burstMode}
              title="Select several students, then award once"
              onClick={() => {
                setBurstMode((v) => !v);
                setBurstSelected([]);
                setPendingAward(null);
                clearAutoTimer();
              }}
            />
            {lastAction && (
              <ClassroomToolButton
                design={design}
                icon={Undo2}
                label="Undo"
                title="Undo last award (Ctrl+U)"
                onClick={() => void handleUndo()}
                disabled={isUndoing}
              />
            )}
          </>
        )}

        <ClassroomToolButton
          design={design}
          icon={GripVertical}
          label={editMode ? 'Done arranging' : 'Arrange seats'}
          primary={editMode}
          onClick={() => {
            setEditMode((v) => !v);
            setBurstMode(false);
            setBurstSelected([]);
            setPendingAward(null);
            clearAutoTimer();
          }}
        />

        {!isFullscreen && (
          <ClassroomToolButton
            design={design}
            icon={Maximize2}
            label="Full screen"
            onClick={openFullscreen}
          />
        )}

        {!isFullscreen && effectiveClassId && effectiveClassId !== 'all' ? (
          <ClassroomScreenSetupPopover
            schoolId={schoolId}
            scope={storageScope}
            classId={effectiveClassId}
          />
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <ClassroomDesignSwitcher design={design} onDesignChange={setDesign} />
          <ClassroomPrefsPopover prefs={prefs} onChange={updatePrefs} accentColor={accentColor} />
          <ClassroomIconButton design={design} title="Reset layout" onClick={resetLayout}>
            <RotateCcw className="h-4 w-4" />
          </ClassroomIconButton>
        </div>
      </div>

      {editMode && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-dashed bg-muted/20 px-3 py-2 text-xs">
          <span className="w-full font-semibold text-muted-foreground sm:w-auto">Arrange room</span>
          <span className="font-semibold text-muted-foreground">Grid:</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            disabled={layout.rows <= 1}
            onClick={() => setLayout(resizeLayout(layout, layout.rows - 1, layout.cols))}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="min-w-[4rem] text-center font-mono font-bold">{layout.rows} rows</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => setLayout(resizeLayout(layout, layout.rows + 1, layout.cols))}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <span className="mx-1 text-muted-foreground">×</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            disabled={layout.cols <= 1}
            onClick={() => setLayout(resizeLayout(layout, layout.rows, layout.cols - 1))}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="min-w-[4rem] text-center font-mono font-bold">{layout.cols} cols</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => setLayout(resizeLayout(layout, layout.rows, layout.cols + 1))}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <span className="text-muted-foreground">Drag desks to match your room.</span>
          <label className="ml-auto flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5">
            <Checkbox
              checked={frontAtBottom}
              onCheckedChange={(v) => updatePrefs({ ...prefs, frontAtBottom: v === true })}
            />
            <span className="flex items-center gap-1.5 font-medium">
              <FlipVertical2 className="h-3.5 w-3.5" />
              Teacher desk at bottom (front of class)
            </span>
          </label>
        </div>
      )}

      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-col',
          isFullscreen ? 'flex-1' : 'h-[min(58vh,560px)] min-h-[200px]',
        )}
      >
        {!frontAtBottom && teacherDesk}
        <div
          className="grid h-full min-h-0 w-full flex-1"
          style={{
            gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
            gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
            gap: gridGap,
          }}
        >
        {visualCells.map(({ cellIndex, visualRow }) => {
          const studentId = layout.cells[cellIndex];
          const student = studentId ? studentById.get(studentId) : null;
          const isPending = pendingAward?.cellIndex === cellIndex;
          const isFlashing = flashCell?.index === cellIndex;
          const isBurstSelected = studentId ? burstSelected.includes(studentId) : false;
          const isRandom = studentId === randomHighlightId;
          const sessionPts = studentId ? sessionTotals[studentId] ?? 0 : 0;
          const attStatus = studentId
            ? attendanceStatusForStudent(todayAttendance, studentId, attendanceEnabled)
            : 'unknown';

          return (
            <div
              key={`desk-${cellIndex}`}
              className="relative min-h-0 min-w-0"
            >
              <button
                type="button"
                draggable={editMode && !!studentId}
                onDragStart={() => handleDragStart(cellIndex)}
                onDragOver={(e) => {
                  if (editMode) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(cellIndex);
                }}
                onClick={(e) => {
                  if (editMode) return;
                  if (studentId && e.shiftKey) {
                    const s = studentById.get(studentId);
                    if (s) openBehaviorNote(s);
                    return;
                  }
                  if (studentId) handleDeskTap(studentId, cellIndex);
                }}
                disabled={!student && !editMode}
                className={cn(
                  classroomStudentDeskClass(design, {
                    hasStudent: !!student,
                    isPending,
                    isFlashing,
                    isBurstSelected,
                    isRandom,
                    editMode,
                  }),
                  awardingId === studentId && 'opacity-60',
                )}
              >
                {student ? (
                  <>
                    <ClassroomDeskVisual
                      design={design}
                      student={student}
                      index={visualRow * layout.cols + (cellIndex % layout.cols)}
                      accentColor={accentColor}
                      sessionPts={sessionPts}
                      showBalance={prefs.showPointBalances}
                      showSession={false}
                    />
                    {prefs.showSessionTotals && (
                      <ClassroomSessionBadge sessionPts={sessionPts} tight={density === 'tight'} />
                    )}
                  </>
                ) : (
                  <ClassroomEmptyDeskLabel design={design} />
                )}

                {isPending && (
                  <span
                    className="pointer-events-none absolute inset-0 rounded-2xl border-4 border-primary"
                    style={{
                      clipPath: `inset(${100 - pendingProgress * 100}% 0 0 0)`,
                      opacity: 0.35,
                    }}
                  />
                )}

                {isFlashing && flashCell && (
                  <span className="pointer-events-none absolute -top-1 right-1 animate-bounce text-sm font-black text-emerald-600">
                    +{flashCell.points}
                  </span>
                )}

                {attendanceEnabled && student && attStatus !== 'unknown' ? (
                  <span
                    className={cn(
                      'pointer-events-none absolute left-1 top-1 h-2.5 w-2.5 rounded-full ring-2 ring-background',
                      attendanceDotClass(attStatus),
                    )}
                    title={attendanceTitle(attStatus)}
                  />
                ) : null}

                {activeCelebration?.cellIndex === cellIndex ? (
                  <ClassroomEffectOverlay
                    effect={activeCelebration.effect}
                    runId={activeCelebration.runId}
                  />
                ) : null}
              </button>

            </div>
          );
        })}
        </div>
        {frontAtBottom && teacherDesk}
      </div>

      {burstMode && burstSelected.length > 0 && !editMode && (
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2">
          <span className="text-xs font-bold text-sky-900 dark:text-sky-100">
            {burstSelected.length} selected
          </span>
          <Button
            type="button"
            size="sm"
            className="rounded-lg font-bold"
            style={{ backgroundColor: accentColor, color: '#fff' }}
            onClick={awardBurstSelection}
          >
            Award +{prefs.defaultPoints}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="rounded-lg text-xs" onClick={() => setBurstSelected([])}>
            Clear
          </Button>
        </div>
      )}

      {editMode && unassignedStudents.length > 0 && (
        <div
          className={cn(
            'shrink-0 rounded-2xl border border-dashed bg-muted/15 p-3',
            isFullscreen && 'max-h-[18vh] overflow-y-auto p-2',
          )}
        >
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            Not on chart — tap a desk, then tap a name
          </div>
          <div className="flex flex-wrap gap-2">
            {unassignedStudents.map((s) => (
              <button
                key={s.id}
                type="button"
                className="rounded-xl border bg-background px-3 py-1.5 text-xs font-bold shadow-sm hover:border-primary"
                onClick={() => {
                  const emptyIndex = layout.cells.findIndex((id) => !id);
                  if (emptyIndex >= 0) placeStudentOnDesk(s.id, emptyIndex);
                  else toast({ variant: 'destructive', title: 'No empty desks', description: 'Add a row or column first.' });
                }}
              >
                {getStudentNickname(s)} {s.lastName?.charAt(0) ? `${s.lastName.charAt(0)}.` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {!editMode && !isFullscreen && (
        <p className="flex shrink-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
          {prefs.instantTap ? (
            <>Tap once = instant +{prefs.defaultPoints} (no menu).</>
          ) : (
            <>
              Tap a student — menu auto-awards +{prefs.defaultPoints} after {prefs.autoAwardMs / 1000}s, or pick
              a reason sooner.
            </>
          )}
          <span className="text-muted-foreground/70">
            · Shift+click behavior note · R random · Ctrl+U undo · Arrange to flip room
            {attendanceEnabled ? ' · Dot = today attendance' : ''}
          </span>
        </p>
      )}

      {awardMenu}
      {behaviorNoteStudent ? (
        <BehaviorNoteDialog
          open={!!behaviorNoteStudent}
          onOpenChange={(open) => {
            if (!open) setBehaviorNoteStudent(null);
          }}
          schoolId={schoolId}
          student={behaviorNoteStudent}
          classId={
            effectiveClassId && effectiveClassId !== 'all'
              ? effectiveClassId
              : behaviorNoteStudent.classId
          }
          className={
            effectiveClassName ??
            classes.find((c) => c.id === behaviorNoteStudent.classId)?.name
          }
          teacherId={operatorId}
          teacherName={operatorName}
          pointsLabel={behaviorNotePoints.label}
          pointsAmount={behaviorNotePoints.amount}
        />
      ) : null}
    </div>
  );
}

function ClassroomAwardMenu({
  student,
  prefs,
  pendingAward,
  categories,
  onPick,
  onBehaviorNote,
  onCorrection,
  correctionLabel,
  correctionPoints,
  onPauseAutoAward,
  onCancel,
}: {
  student: Student;
  prefs: ClassroomSeatingPrefs;
  pendingAward: PendingAward;
  categories: Category[];
  onPick: (points: number, description: string) => void;
  onBehaviorNote?: () => void;
  onCorrection: () => void;
  correctionLabel: string;
  correctionPoints: number;
  onPauseAutoAward: (dropdownOpen: boolean) => void;
  onCancel: () => void;
}) {
  const [categoryId, setCategoryId] = useState(() => categories[0]?.id ?? '');
  const [rubricLevelId, setRubricLevelId] = useState('');

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId],
  );

  const rubricLevels = useMemo(
    () => selectedCategory?.rubricLevels ?? [],
    [selectedCategory],
  );

  useEffect(() => {
    if (!categories.length) {
      setCategoryId('');
      return;
    }
    if (!categories.some((c) => c.id === categoryId)) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  useEffect(() => {
    if (rubricLevels.length > 0) {
      setRubricLevelId(rubricLevels[0].id);
    } else {
      setRubricLevelId('');
    }
  }, [rubricLevels]);

  const secondsLeft = Math.max(
    0,
    Math.ceil((prefs.autoAwardMs - (Date.now() - pendingAward.startedAt)) / 1000),
  );

  const awardFromCategory = () => {
    if (!selectedCategory) return;
    const level = rubricLevels.find((l) => l.id === rubricLevelId);
    if (level) {
      onPick(level.points, `${selectedCategory.name}: ${level.label}`);
      return;
    }
    onPick(selectedCategory.points, selectedCategory.name);
  };

  const menuBody = (
    <>
      <p className="mb-2 truncate px-1 text-center text-xs font-bold sm:text-sm">
        {getStudentNickname(student)}
        {!prefs.instantTap && (
          <span className="block text-[10px] font-normal text-muted-foreground sm:text-xs">
            Auto +{prefs.defaultPoints} in {secondsLeft}s — or pick below
          </span>
        )}
      </p>
      {categories.length > 0 && (
        <div
          className="mb-2 space-y-1.5 rounded-xl border bg-muted/20 p-2"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Point category
          </Label>
          <Select
            value={categoryId || undefined}
            onOpenChange={onPauseAutoAward}
            onValueChange={(id) => setCategoryId(id)}
          >
            <SelectTrigger className="h-9 rounded-lg text-xs font-semibold">
              <SelectValue placeholder="Choose category…" />
            </SelectTrigger>
            <SelectContent className="z-[350] max-h-[min(50vh,16rem)]" position="popper">
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  <span className="flex items-center gap-2">
                    {c.color ? (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                    ) : null}
                    <span>
                      {c.name}{' '}
                      <span className="text-muted-foreground">(+{c.points})</span>
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {rubricLevels.length > 0 && (
            <Select
              value={rubricLevelId || undefined}
              onOpenChange={onPauseAutoAward}
              onValueChange={(id) => setRubricLevelId(id)}
            >
              <SelectTrigger className="h-9 rounded-lg text-xs font-semibold">
                <SelectValue placeholder="Level…" />
              </SelectTrigger>
              <SelectContent className="z-[350]" position="popper">
                {rubricLevels.map((level) => (
                  <SelectItem key={level.id} value={level.id} className="text-xs">
                    {level.label} (+{level.points})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            type="button"
            size="sm"
            className="h-9 w-full rounded-lg text-xs font-bold"
            disabled={!selectedCategory}
            onClick={(e) => {
              e.stopPropagation();
              awardFromCategory();
            }}
          >
            Award{' '}
            {selectedCategory
              ? rubricLevels.find((l) => l.id === rubricLevelId)?.points ?? selectedCategory.points
              : ''}{' '}
            pts
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
        {prefs.quickAwards.map((q) => (
          <Button
            key={q.id}
            type="button"
            size="sm"
            className="h-auto flex-col rounded-xl py-2 text-[10px] font-bold leading-tight sm:text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onPick(q.points, q.description);
            }}
          >
            <span>{q.label}</span>
            <span className="text-primary">+{q.points}</span>
          </Button>
        ))}
      </div>
      {correctionPoints > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 w-full rounded-xl border-rose-300 text-xs font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300"
          onClick={(e) => {
            e.stopPropagation();
            onCorrection();
          }}
        >
          {correctionLabel} (−{correctionPoints})
        </Button>
      )}
      {onBehaviorNote ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 w-full rounded-xl text-xs font-bold"
          onClick={(e) => {
            e.stopPropagation();
            onBehaviorNote();
          }}
        >
          Behavior note
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-1.5 w-full rounded-xl text-xs"
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
      >
        Cancel
      </Button>
    </>
  );

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-label={`Award points to ${getStudentNickname(student)}`}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="max-h-[min(90vh,640px)] w-full max-w-sm overflow-y-auto rounded-2xl border bg-popover p-3 shadow-2xl sm:p-4"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {menuBody}
      </div>
    </div>
  );
}

function ClassroomPrefsPopover({
  prefs,
  onChange,
  accentColor,
}: {
  prefs: ClassroomSeatingPrefs;
  onChange: (p: ClassroomSeatingPrefs) => void;
  accentColor: string;
}) {
  const [draft, setDraft] = useState(prefs);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) setDraft(prefs);
  }, [open, prefs]);

  const save = () => {
    onChange({
      ...draft,
      autoAwardMs: Math.max(1000, Math.min(10000, draft.autoAwardMs)),
      defaultPoints: Math.max(1, draft.defaultPoints),
    });
    setOpen(false);
  };

  const updateQuick = (index: number, patch: Partial<ClassroomQuickAward>) => {
    setDraft((d) => ({
      ...d,
      quickAwards: d.quickAwards.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    }));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" className="rounded-xl" title="Classroom settings">
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[250] max-h-[min(85vh,560px)] w-96 overflow-y-auto rounded-2xl" align="end">
        <p className="mb-1 text-sm font-black">Classroom settings</p>
        <p className="mb-4 text-xs text-muted-foreground">
          How tapping students works, what the award menu shows, and desk display options.
        </p>
        <div className="space-y-4">
          <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">When you tap a student</p>
            <label className="flex cursor-pointer items-start gap-2">
              <Checkbox
                className="mt-0.5"
                checked={draft.instantTap}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, instantTap: v === true }))}
              />
              <span className="text-xs leading-snug">
                <span className="font-semibold">Instant tap</span> — award default points immediately with no popup
                menu.
              </span>
            </label>
            {!draft.instantTap && (
              <div>
                <Label className="text-xs">Auto-award countdown (seconds)</Label>
                <p className="mb-1 text-[11px] text-muted-foreground">
                  If you open the menu and wait, this many seconds pass before default points are applied
                  automatically.
                </p>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  className="h-9 rounded-lg"
                  value={draft.autoAwardMs / 1000}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      autoAwardMs: Math.max(1, Number(e.target.value) || 3) * 1000,
                    }))
                  }
                />
              </div>
            )}
            <div>
              <Label className="text-xs">Default points</Label>
              <p className="mb-1 text-[11px] text-muted-foreground">
                Used for instant tap, auto-award, Class +N, and burst awards.
              </p>
              <Input
                type="number"
                min={1}
                className="h-9 rounded-lg"
                value={draft.defaultPoints}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    defaultPoints: Math.max(1, Number(e.target.value) || 5),
                  }))
                }
              />
            </div>
            <div>
              <Label className="text-xs">Celebration effect</Label>
              <p className="mb-1 text-[11px] text-muted-foreground">
                Plays on the student&apos;s desk when points are awarded.
              </p>
              <Select
                value={draft.celebrationEffect}
                onValueChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    celebrationEffect: v as ClassroomSeatingPrefs['celebrationEffect'],
                  }))
                }
              >
                <SelectTrigger className="h-9 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[350]" position="popper">
                  <SelectItem value="sparkles">Sparkles</SelectItem>
                  <SelectItem value="confetti">Confetti</SelectItem>
                  <SelectItem value="hearts">Hearts</SelectItem>
                  <SelectItem value="stars">Stars</SelectItem>
                  <SelectItem value="fireworks">Fireworks</SelectItem>
                  <SelectItem value="snow">Snow</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Desk display</p>
            <label className="flex cursor-pointer items-start gap-2">
              <Checkbox
                className="mt-0.5"
                checked={draft.showPointBalances}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, showPointBalances: v === true }))}
              />
              <span className="text-xs leading-snug">
                <span className="font-semibold">Point balances</span> — show each student&apos;s current total on
                their desk.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <Checkbox
                className="mt-0.5"
                checked={draft.showSessionTotals}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, showSessionTotals: v === true }))}
              />
              <span className="text-xs leading-snug">
                <span className="font-semibold">Session badges</span> — small +/− badge for points given today in
                this class.
              </span>
            </label>
          </div>

          <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Award menu buttons</p>
            <p className="text-[11px] text-muted-foreground">
              Quick-pick shortcuts in the popup (label and points). Activity uses the label as the reason.
            </p>
            {draft.quickAwards.map((q, i) => (
              <div key={q.id} className="grid grid-cols-[1fr_4rem] gap-1">
                <Input
                  className="h-8 rounded-lg text-xs"
                  value={q.label}
                  onChange={(e) => updateQuick(i, { label: e.target.value })}
                />
                <Input
                  type="number"
                  min={1}
                  className="h-8 rounded-lg text-xs"
                  value={q.points}
                  onChange={(e) =>
                    updateQuick(i, {
                      points: Math.max(1, Number(e.target.value) || 1),
                      description: q.description || q.label,
                    })
                  }
                />
              </div>
            ))}
          </div>

          <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Correction button</p>
            <p className="text-[11px] text-muted-foreground">
              Optional deduct shortcut at the bottom of the award menu (e.g. reminder −2 pts).
            </p>
            <div className="grid grid-cols-[1fr_4rem] gap-1">
              <Input
                className="h-8 rounded-lg text-xs"
                value={draft.correctionLabel}
                onChange={(e) => setDraft((d) => ({ ...d, correctionLabel: e.target.value }))}
              />
              <Input
                type="number"
                min={0}
                className="h-8 rounded-lg text-xs"
                value={draft.correctionPoints}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    correctionPoints: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
              />
            </div>
          </div>
        </div>
        <Button
          type="button"
          className="mt-4 w-full rounded-xl font-bold"
          style={{ backgroundColor: accentColor, color: '#fff' }}
          onClick={save}
        >
          Save
        </Button>
      </PopoverContent>
    </Popover>
  );
}
