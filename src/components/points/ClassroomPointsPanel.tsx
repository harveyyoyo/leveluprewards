'use client';

import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useDeferredValue,
} from 'react';
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
  Volume2,
} from 'lucide-react';
import { openClassroomFullscreenTab } from '@/lib/classroomPointsUrl';
import { isClassroomPillarOn, isClassroomOnlyMode, isPillarOn, CLASSROOM_SESSION_ONLY } from '@/lib/productPillars';
import { BehaviorNoteDialog } from '@/components/classroom/BehaviorNoteDialog';
import { useTodayAttendanceMap } from '@/hooks/useTodayAttendanceMap';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore } from '@/firebase';
import { awardClassroomPoints } from '@/lib/classroom/classroomPointsClient';
import {
  classroomPointSoundEffect,
  CLASSROOM_PICK_SOUND,
  CLASSROOM_TAP_SOUND,
  CLASSROOM_UNDO_SOUND,
} from '@/lib/classroom/classroomPointSounds';
import type { SoundEffect } from '@/hooks/useArcadeSound';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Button } from '@/components/ui/button';
import { Helper } from '@/components/ui/helper';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  applyClassroomSessionAward,
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
  type ClassroomSessionData,
  CLASSROOM_PREFS_VERSION,
  DEFAULT_CLASSROOM_PREFS,
} from '@/lib/classroomSeatingChart';
import { classroomAwardDisplayLabel } from '@/lib/classroom/classroomAwardLabel';
import {
  remainingTeacherBudgetPoints,
  resolveTeacherBudgetPeriod,
  teacherBudgetRemainingPhrase,
  teacherWithBudgetAfterSpend,
} from '@/lib/teacherBudget';
import {
  ClassroomDesignSwitcher,
  ClassroomHeaderBrand,
  ClassroomIconButton,
  ClassroomTeacherDesk,
  ClassroomToolButton,
  classroomControlsBarClass,
  classroomDesignShellClass,
  useClassroomCelebrationEffect,
  type ClassroomDesign,
  type ClassroomEffect,
} from '@/components/points/classroomVisualTheme';
import {
  ClassroomSeatingGrid,
  type ClassroomGridHandlers,
} from '@/components/points/ClassroomSeatingGrid';
import {
  buildClassroomDeskCatalog,
  classroomDeskCatalogSignature,
  type ClassroomDeskDisplay,
} from '@/lib/classroom/classroomDeskDisplay';
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
  classroomOnly?: boolean;
};

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
  /** Bumps admin behavior timeline when a note is saved from this panel. */
  onBehaviorNoteSaved?: () => void;
};

function deskDensity(cellCount: number): 'normal' | 'cozy' | 'tight' {
  if (cellCount > 36) return 'tight';
  if (cellCount > 20) return 'cozy';
  return 'normal';
}

function ClassroomPointsPanelInner({
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
  onBehaviorNoteSaved,
}: ClassroomPointsPanelProps) {
  const deferredStudents = useDeferredValue(students);
  const isFullscreen = variant === 'fullscreen';
  const { toast } = useToast();
  const playSound = useArcadeSound({ ignoreSchoolSoundMute: true });
  const { settings } = useSettings();
  const firestore = useFirestore();
  const sessionOnly = sessionOnlyProp ?? isClassroomOnlyMode(settings);
  const { awardPoints, awardPointsToMultipleStudents, deductPointsFromMultipleStudents, userName, teacherDocId } =
    useAppContext();
  const attendanceEnabled = isPillarOn(settings, 'payAttendance') && !!settings.enableClassSignIn;
  const todayAttendance = useTodayAttendanceMap(schoolId, attendanceEnabled);
  const operatorId = teacherDocId || storageScope;
  const operatorName = userName || storageScope;
  const [behaviorNoteStudent, setBehaviorNoteStudent] = useState<Student | null>(null);
  const [behaviorNotePoints, setBehaviorNotePoints] = useState<{ label?: string; amount?: number }>({});
  const [classroomBalances, setClassroomBalances] = useState<Record<string, number>>({});

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
  const [flyUpCell, setFlyUpCell] = useState<{
    index: number;
    points: number;
    runId: number;
    studentName: string;
  } | null>(null);
  const [flashCell, setFlashCell] = useState<{ index: number; points: number; runId: number } | null>(
    null,
  );
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const playClassroomSound = useCallback(
    (sound: SoundEffect) => {
      if (!prefsRef.current.awardSounds) return;
      playSound(sound);
    },
    [playSound],
  );
  const [burstMode, setBurstMode] = useState(false);
  const [burstSelected, setBurstSelected] = useState<string[]>([]);
  const [sessionData, setSessionData] = useState<ClassroomSessionData>({ totals: {}, lastAward: {} });
  const [lastAwardSummary, setLastAwardSummary] = useState<{
    label: string;
    points: number;
    studentLabel: string;
  } | null>(null);
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
    if (filterClassId === 'all') return deferredStudents;
    return deferredStudents.filter((s) => s.classId === filterClassId);
  }, [deferredStudents, filterClassId]);

  const classStudentIdsKey = useMemo(
    () => classStudents.map((s) => s.id).join('\0'),
    [classStudents],
  );

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
    const map: Record<string, number> = {};
    for (const s of deferredStudents) {
      map[s.id] = s.classroomPoints ?? 0;
    }
    setClassroomBalances((prev) => {
      const keys = Object.keys(map);
      if (keys.length === Object.keys(prev).length && keys.every((id) => prev[id] === map[id])) {
        return prev;
      }
      return map;
    });
  }, [deferredStudents]);

  const classroomMeta = useMemo(
    () => ({
      classId: effectiveClassId && effectiveClassId !== 'all' ? effectiveClassId : undefined,
      className: classes.find((c) => c.id === effectiveClassId)?.name,
      teacherId: operatorId,
      teacherName: operatorName,
    }),
    [classes, effectiveClassId, operatorId, operatorName],
  );

  const deskCatalogSig = useMemo(
    () => classroomDeskCatalogSignature(deferredStudents, filterClassId),
    [deferredStudents, filterClassId],
  );

  const deskCatalogRef = useRef<Map<string, ClassroomDeskDisplay>>(new Map());
  const deskCatalog = useMemo(() => {
    const next = buildClassroomDeskCatalog(
      deferredStudents,
      filterClassId,
      sessionOnly,
      classroomBalances,
      deskCatalogRef.current,
    );
    deskCatalogRef.current = next;
    return next;
  }, [sessionOnly, classroomBalances, deferredStudents, filterClassId]);

  const visualCells = useMemo(
    () => (layout ? visualLayoutPositions(layout, prefs.frontAtBottom) : []),
    [layout, prefs.frontAtBottom],
  );

  const gridActiveCelebration = useMemo(
    () =>
      activeCelebration
        ? {
            effect: activeCelebration.effect,
            cellIndex: activeCelebration.cellIndex,
            runId: activeCelebration.runId,
            points: activeCelebration.points,
          }
        : null,
    [activeCelebration],
  );

  const gridHandlersRef = useRef<ClassroomGridHandlers>({
    onDeskTap: () => {},
    onBehaviorNote: () => {},
    onDragStart: () => {},
    onDrop: () => {},
  });

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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- roster layout only when class membership changes
  }, [schoolId, storageScope, effectiveClassId, classStudentIdsKey]);

  const layoutSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!layout || !effectiveClassId || effectiveClassId === 'all') return;
    if (layoutSaveTimerRef.current) clearTimeout(layoutSaveTimerRef.current);
    layoutSaveTimerRef.current = setTimeout(() => {
      saveClassroomLayout(schoolId, storageScope, effectiveClassId, layout);
      layoutSaveTimerRef.current = null;
    }, 450);
    return () => {
      if (layoutSaveTimerRef.current) clearTimeout(layoutSaveTimerRef.current);
    };
  }, [layout, schoolId, storageScope, effectiveClassId]);

  useEffect(() => {
    if (!effectiveClassId || effectiveClassId === 'all') return;
    setSessionData(loadClassroomSession(schoolId, storageScope, effectiveClassId));
    setLastAwardSummary(null);
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

  const triggerDeskAwardFeedback = useCallback(
    (cellIndex: number, points: number, studentName?: string) => {
      if (points <= 0 || cellIndex < 0) return;
      const prefsNow = prefsRef.current;
      const celebration = prefsNow.celebrationEffect ?? 'flash';
      const particleEffect =
        celebration !== 'none' && celebration !== 'flash' ? celebration : null;
      const showDeskFlash = celebration !== 'none';
      const FLASH_MS = 520;
      const FLY_UP_DELAY_MS = showDeskFlash ? FLASH_MS : 0;
      /** Matches student kiosk: `animate-fly-up` 1.5s ease-out */
      const FLY_UP_HOLD_MS = 1500;

      if (showDeskFlash) {
        const flashRunId = Date.now();
        setFlashCell({ index: cellIndex, points, runId: flashRunId });
        window.setTimeout(() => setFlashCell(null), FLASH_MS + 150);
      }

      if (prefsNow.showKioskFlyUp !== false) {
        window.setTimeout(() => {
          const flyRunId = Date.now();
          setFlyUpCell({
            index: cellIndex,
            points,
            runId: flyRunId,
            studentName: (studentName || '').trim(),
          });
          window.setTimeout(() => setFlyUpCell(null), FLY_UP_HOLD_MS);
        }, FLY_UP_DELAY_MS);
      }

      if (particleEffect) {
        playEffectAtCell(particleEffect as ClassroomEffect, cellIndex, points);
      }
    },
    [playEffectAtCell],
  );

  const triggerFeedbackForStudentIds = useCallback(
    (studentIds: string[], points: number) => {
      if (!layout || points <= 0) return;
      studentIds.forEach((id, i) => {
        const cellIndex = layout.cells.indexOf(id);
        if (cellIndex < 0) return;
        const student = studentById.get(id);
        const name = student ? getStudentNickname(student) : '';
        window.setTimeout(() => {
          triggerDeskAwardFeedback(cellIndex, points, name);
        }, i * 90);
      });
    },
    [layout, studentById, triggerDeskAwardFeedback],
  );

  const recordSessionAwards = useCallback(
    (studentIds: string[], pointsDelta: number, description: string) => {
      if (!effectiveClassId || effectiveClassId === 'all') return;
      const label = classroomAwardDisplayLabel(description, prefsRef.current);
      const next = applyClassroomSessionAward(
        schoolId,
        storageScope,
        effectiveClassId,
        studentIds,
        pointsDelta,
        label,
      );
      setSessionData(next);
      const names = studentIds
        .map((id) => {
          const s = studentById.get(id);
          return s ? getStudentNickname(s) : null;
        })
        .filter((n): n is string => !!n);
      const studentLabel =
        names.length === 0
          ? ''
          : names.length === 1
            ? names[0]!
            : names.length === 2
              ? `${names[0]} & ${names[1]}`
              : `${names[0]} +${names.length - 1} more`;
      setLastAwardSummary({
        label,
        points: pointsDelta,
        studentLabel,
      });
    },
    [effectiveClassId, schoolId, storageScope, studentById],
  );

  const applyPointsToStudents = useCallback(
    async (
      studentIds: string[],
      points: number,
      description: string,
      options?: { flashCellIndex?: number; silent?: boolean },
    ) => {
      if (studentIds.length === 0 || (!sessionOnly && awardingId)) return false;
      const magnitude = Math.abs(points);
      const isDeduct = points < 0;

      if (!isDeduct) {
        if (options?.flashCellIndex !== undefined) {
          const awardStudentId = studentIds.length === 1 ? studentIds[0]! : null;
          const flyUpName = awardStudentId
            ? (() => {
                const s =
                  studentById.get(awardStudentId) ??
                  deferredStudents.find((st) => st.id === awardStudentId);
                return s ? getStudentNickname(s) : '';
              })()
            : '';
          triggerDeskAwardFeedback(options.flashCellIndex, magnitude, flyUpName);
        } else if (studentIds.length > 0) {
          triggerFeedbackForStudentIds(studentIds, magnitude);
        }
      }

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
          playClassroomSound('error');
          toast({
            variant: 'destructive',
            title: 'Budget exceeded',
            description: `You need ${totalCost} pts but only have ${remainingPts.toLocaleString()} remaining ${phrase}.`,
          });
          return false;
        }
      }

      if (sessionOnly) {
        const signedDelta = isDeduct ? -magnitude : magnitude;
        const optimisticAction: LastClassroomAction = {
          mode: isDeduct ? 'deduct' : 'award',
          studentIds: [...studentIds],
          points: magnitude,
          description,
          classroomOnly: true,
        };
        const applySessionDelta = (delta: number) => {
          startTransition(() => {
            setClassroomBalances((prev) => {
              const next = { ...prev };
              for (const id of studentIds) {
                next[id] = Math.max(0, (prev[id] ?? 0) + delta);
              }
              return next;
            });
            if (effectiveClassId && effectiveClassId !== 'all') {
              recordSessionAwards(studentIds, delta, description);
            }
          });
        };

        startTransition(() => {
          applySessionDelta(signedDelta);
          setLastAction(optimisticAction);
        });
        playClassroomSound(classroomPointSoundEffect(points, isDeduct));
        if (!options?.silent) {
          const awardLabel = classroomAwardDisplayLabel(description, prefsRef.current);
          const oneStudent =
            studentIds.length === 1 ? studentById.get(studentIds[0]!) : undefined;
          toast({
            title: isDeduct
              ? oneStudent
                ? `${getStudentNickname(oneStudent)}: −${magnitude}`
                : `−${magnitude} classroom pt${magnitude === 1 ? '' : 's'}`
              : oneStudent
                ? `${getStudentNickname(oneStudent)}: ${awardLabel}`
                : `${awardLabel} (+${magnitude})`,
            description: isDeduct
              ? CLASSROOM_SESSION_ONLY.toastDescription
              : studentIds.length > 1
                ? `${studentIds.length} students · +${magnitude} pts each`
                : `+${magnitude} pts`,
          });
        }

        const result = await awardClassroomPoints(firestore, {
          schoolId,
          studentIds,
          signedDelta,
          description,
          ...classroomMeta,
        });
        if (!result.success) {
          applySessionDelta(-signedDelta);
          setLastAction((current) => (current === optimisticAction ? null : current));
          playClassroomSound('error');
          toast({
            variant: 'destructive',
            title: 'Could not save classroom points',
            description: result.message,
          });
          return false;
        }
        return true;
      }

      setAwardingId(studentIds[0] ?? null);

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
        playClassroomSound(classroomPointSoundEffect(points, isDeduct));
        if (!options?.silent) {
          const count =
            'count' in result && typeof result.count === 'number'
              ? result.count
              : studentIds.length;
          const awardLabel = classroomAwardDisplayLabel(description, prefsRef.current);
          const oneStudent =
            studentIds.length === 1 ? studentById.get(studentIds[0]!) : undefined;
          toast({
            title: isDeduct
              ? `−${magnitude} from ${count} student(s)`
              : oneStudent
                ? `${getStudentNickname(oneStudent)}: ${awardLabel}`
                : `${awardLabel} (+${magnitude})`,
            description: queued
              ? result.message
              : count > 1
                ? `${count} students · ${isDeduct ? '−' : '+'}${magnitude} pts each`
                : `${isDeduct ? '−' : '+'}${magnitude} pts`,
          });
        }
        if (!queued && effectiveClassId && effectiveClassId !== 'all') {
          const sessionDelta = isDeduct ? -magnitude : magnitude;
          startTransition(() => {
            recordSessionAwards(studentIds, sessionDelta, description);
            setLastAction({
              mode: isDeduct ? 'deduct' : 'award',
              studentIds: [...studentIds],
              points: magnitude,
              description,
              budgetSpent: !isDeduct && !skipBudget && settings.enableTeacherBudgets ? totalCost : undefined,
            });
          });
        }
        setAwardingId(null);
        return true;
      }

      playClassroomSound('error');
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
      playClassroomSound,
      toast,
      schoolId,
      effectiveClassId,
      sessionOnly,
      firestore,
      classroomMeta,
      triggerDeskAwardFeedback,
      triggerFeedbackForStudentIds,
      recordSessionAwards,
      studentById,
      deferredStudents,
    ],
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
      await runAward(studentId, points, description, cellIndex);
    },
    [pendingAward, clearAutoTimer, runAward],
  );

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
      );
    }, remaining);
    return clearAutoTimer;
  }, [pendingAward, clearAutoTimer, runAward]);

  const handleDeskTap = (studentId: string, cellIndex: number) => {
    if (editMode || awardingId) return;

    if (burstMode) {
      playClassroomSound(CLASSROOM_TAP_SOUND);
      setBurstSelected((prev) =>
        prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
      );
      return;
    }

    if (prefs.instantTap) {
      playClassroomSound(CLASSROOM_TAP_SOUND);
      void runAward(studentId, prefs.defaultPoints, prefs.defaultDescription, cellIndex);
      return;
    }
    playClassroomSound(CLASSROOM_TAP_SOUND);
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
      playClassroomSound(CLASSROOM_PICK_SOUND);
      toast({
        title: 'Random pick',
        description: getStudentNickname(student),
      });
    }
  }, [placedStudentIds, studentById, playClassroomSound, toast]);

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
      if (sessionOnly || lastAction.classroomOnly) {
        const signedDelta = lastAction.mode === 'award' ? -lastAction.points : lastAction.points;
        const result = await awardClassroomPoints(firestore, {
          schoolId,
          studentIds: lastAction.studentIds,
          signedDelta,
          description: undoLabel,
          ...classroomMeta,
        });
        if (!result.success) {
          playClassroomSound('error');
          toast({ variant: 'destructive', title: 'Undo failed', description: result.message });
          return;
        }
        setClassroomBalances((prev) => {
          const next = { ...prev };
          for (const id of lastAction.studentIds) {
            next[id] = Math.max(0, (prev[id] ?? 0) + signedDelta);
          }
          return next;
        });
        if (effectiveClassId && effectiveClassId !== 'all') {
          recordSessionAwards(lastAction.studentIds, signedDelta, undoLabel);
        }
      } else if (lastAction.mode === 'award') {
        const result = await deductPointsFromMultipleStudents(
          lastAction.studentIds,
          lastAction.points,
          undoLabel,
        );
        if (!result.success) {
          playClassroomSound('error');
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
          recordSessionAwards(lastAction.studentIds, -lastAction.points, undoLabel);
        }
      } else {
        const result = await awardPointsToMultipleStudents(
          lastAction.studentIds,
          lastAction.points,
          undoLabel,
        );
        if (!result.success) {
          playClassroomSound('error');
          toast({ variant: 'destructive', title: 'Undo failed', description: result.message });
          return;
        }
        if (effectiveClassId && effectiveClassId !== 'all') {
          recordSessionAwards(lastAction.studentIds, lastAction.points, undoLabel);
        }
      }
      playClassroomSound(CLASSROOM_UNDO_SOUND);
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
    playClassroomSound,
    toast,
    schoolId,
    effectiveClassId,
    sessionOnly,
    firestore,
    classroomMeta,
    recordSessionAwards,
  ]);

  useEffect(() => {
    if (editMode || pendingAward) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.target instanceof HTMLSelectElement) return;
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey || e.shiftKey;
      if (
        prefsRef.current.showRandomPicker &&
        (e.key === 'r' || e.key === 'R') &&
        !hasModifier
      ) {
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

  gridHandlersRef.current = {
    onDeskTap: handleDeskTap,
    onBehaviorNote: (studentId) => {
      const s = studentById.get(studentId);
      if (s) openBehaviorNote(s);
    },
    onDragStart: handleDragStart,
    onDrop: handleDrop,
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
    if (typeof window !== 'undefined') {
      const className = effectiveClassName?.trim();
      const prompt = className
        ? `Reset the seating layout for ${className}? Desk positions will be rebuilt and any custom arrangement will be lost.`
        : 'Reset the seating layout? Desk positions will be rebuilt and any custom arrangement will be lost.';
      if (!window.confirm(prompt)) return;
    }
    const ids = classStudents.map((s) => s.id);
    setLayout(buildInitialLayout(ids));
    setPendingAward(null);
    clearAutoTimer();
  };

  const updatePrefs = (next: ClassroomSeatingPrefs) => {
    const normalized = {
      ...next,
      prefsVersion: CLASSROOM_PREFS_VERSION,
    };
    setPrefs(normalized);
    saveClassroomPrefs(schoolId, storageScope, normalized);
  };

  const setDesign = (nextDesign: ClassroomDesign) => {
    updatePrefs({ ...prefs, design: nextDesign });
  };

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
  const chartNeedsRosterPlacement =
    !editMode && classStudents.length > 0 && placedStudentIds.length === 0;
  const noStudentsInClass = !editMode && classStudents.length === 0;
  const fillChartFromRoster = () => {
    const ids = classStudents.map((s) => s.id);
    setLayout(buildInitialLayout(ids));
  };
  const cellCount = layout.rows * layout.cols;
  const density = deskDensity(cellCount);
  const gridGap = density === 'tight' ? 3 : density === 'cozy' ? 5 : 8;
  const frontAtBottom = prefs.frontAtBottom;

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
        onPick={(points, description) => {
          playClassroomSound(CLASSROOM_TAP_SOUND);
          void confirmPendingAward(points, description);
        }}
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
      {isFullscreen ? (
        <ClassroomHeaderBrand
          design={design}
          studentCount={placedStudentIds.length}
          className="shrink-0 px-1"
        />
      ) : null}

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
            {prefs.showRandomPicker ? (
              <ClassroomToolButton
                design={design}
                icon={Shuffle}
                label="Random"
                title="Random student (R)"
                onClick={pickRandomStudent}
              />
            ) : null}
            {prefs.showClassAwardButton ? (
              <ClassroomToolButton
                design={design}
                icon={Users}
                label={`Class +${prefs.defaultPoints}`}
                title={`Award +${prefs.defaultPoints} to everyone on the chart`}
                onClick={awardWholeClass}
                disabled={!placedStudentIds.length}
              />
            ) : null}
            <ClassroomToolButton
              design={design}
              icon={MousePointerClick}
              label={burstMode ? `Burst (${burstSelected.length})` : 'Burst'}
              primary={burstMode}
              title="Select several students, then award once"
              onClick={() => {
                playClassroomSound(CLASSROOM_TAP_SOUND);
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

        {/* Room display launcher moves to the Room display section when it leaves "coming soon". */}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <ClassroomDesignSwitcher design={design} onDesignChange={setDesign} />
          <ClassroomPrefsPopover prefs={prefs} onChange={updatePrefs} />
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

      {chartNeedsRosterPlacement ? (
        <div className="flex shrink-0 flex-col gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-950 dark:text-amber-50">
            <span className="font-bold">No students on the chart.</span>{' '}
            {effectiveClassName ? `${effectiveClassName} has ` : ''}
            {classStudents.length} student{classStudents.length === 1 ? '' : 's'} in the roster but none are
            on seats yet.
          </p>
          <Button type="button" size="sm" className="shrink-0 rounded-xl font-bold" onClick={fillChartFromRoster}>
            Place class on chart
          </Button>
        </div>
      ) : null}
      {noStudentsInClass ? (
        <p className="shrink-0 rounded-xl border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          No students in {effectiveClassName || 'this class'} yet. Add them under{' '}
          <span className="font-semibold text-foreground">Students</span> (or import a roster), then return here.
        </p>
      ) : null}

      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-col overflow-visible',
          isFullscreen ? 'flex-1' : 'h-[min(58vh,560px)] min-h-[200px]',
        )}
      >
        {!frontAtBottom && teacherDesk}
        <ClassroomSeatingGrid
          layoutRows={layout.rows}
          layoutCols={layout.cols}
          cellStudentIds={layout.cells}
          visualCells={visualCells}
          deskCatalog={deskCatalog}
          design={design}
          photoDisplayMode={settings.photoDisplayMode === 'contain' ? 'contain' : 'cover'}
          accentColor={accentColor}
          sessionTotals={sessionData.totals}
          sessionLastAwards={sessionData.lastAward}
          showBalance={prefs.showPointBalances}
          showSessionTotals={prefs.showSessionTotals}
          density={density}
          gridGap={gridGap}
          editMode={editMode}
          pendingCellIndex={pendingAward?.cellIndex ?? null}
          pendingStartedAt={pendingAward?.startedAt ?? null}
          autoAwardMs={prefs.autoAwardMs}
          flyUpCell={flyUpCell}
          flyUpSize={prefs.kioskFlyUpSize}
          flashCell={flashCell}
          burstSelected={burstSelected}
          randomHighlightId={randomHighlightId}
          awardingId={awardingId}
          attendanceEnabled={attendanceEnabled}
          attendanceByStudent={todayAttendance}
          activeCelebration={gridActiveCelebration}
          handlersRef={gridHandlersRef}
        />
        {frontAtBottom && teacherDesk}
      </div>

      {lastAwardSummary && prefs.showSessionTotals && !editMode ? (
        <p
          className="mt-2 shrink-0 text-center text-[11px] leading-snug text-muted-foreground sm:text-xs"
          aria-live="polite"
        >
          Last award:{' '}
          <span className="font-semibold text-foreground">
            {lastAwardSummary.label}
            {lastAwardSummary.points > 0 ? ` (+${lastAwardSummary.points})` : ''}
          </span>
          {lastAwardSummary.studentLabel ? (
            <>
              {' '}
              → <span className="font-medium text-foreground">{lastAwardSummary.studentLabel}</span>
            </>
          ) : null}
        </p>
      ) : null}

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
          <>Tap once = instant +{prefs.defaultPoints}.</>
          <span className="text-muted-foreground/70">
            · Shift+click behavior note
            {prefs.showRandomPicker ? ' · R random' : ''} · Ctrl+U undo · Arrange to flip room
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
          onSaved={onBehaviorNoteSaved}
        />
      ) : null}
    </div>
  );
}

function classroomStudentsSignature(students: Student[]): string {
  return students
    .map((s) => `${s.id}:${s.classroomPoints ?? 0}:${s.points ?? 0}:${s.classId ?? ''}:${s.photoUrl ?? ''}`)
    .sort()
    .join('|');
}

/** Skips re-render when unrelated parent state changes but roster display is the same. */
export const ClassroomPointsPanel = memo(ClassroomPointsPanelInner, (prev, next) => {
  return (
    prev.schoolId === next.schoolId &&
    prev.storageScope === next.storageScope &&
    prev.variant === next.variant &&
    prev.initialClassId === next.initialClassId &&
    prev.sessionOnly === next.sessionOnly &&
    prev.onBehaviorNoteSaved === next.onBehaviorNoteSaved &&
    prev.accentColor === next.accentColor &&
    prev.isGraphic === next.isGraphic &&
    prev.classes.length === next.classes.length &&
    prev.classes.every((c, i) => c.id === next.classes[i]?.id) &&
    (prev.categories?.length ?? 0) === (next.categories?.length ?? 0) &&
    prev.budgetOptions === next.budgetOptions &&
    classroomStudentsSignature(prev.students) === classroomStudentsSignature(next.students)
  );
});

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
}: {
  prefs: ClassroomSeatingPrefs;
  onChange: (p: ClassroomSeatingPrefs) => void;
}) {
  const [open, setOpen] = useState(false);

  const patchPrefs = useCallback(
    (patch: Partial<ClassroomSeatingPrefs>) => {
      onChange({
        ...prefs,
        ...patch,
        autoAwardMs:
          patch.autoAwardMs !== undefined
            ? Math.max(1000, Math.min(10000, patch.autoAwardMs))
            : prefs.autoAwardMs,
        defaultPoints:
          patch.defaultPoints !== undefined ? Math.max(1, patch.defaultPoints) : prefs.defaultPoints,
        correctionPoints:
          patch.correctionPoints !== undefined
            ? Math.max(0, patch.correctionPoints)
            : prefs.correctionPoints,
      });
    },
    [onChange, prefs],
  );

  const updateQuick = (index: number, patch: Partial<ClassroomQuickAward>) => {
    patchPrefs({
      quickAwards: prefs.quickAwards.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    });
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
          Changes apply immediately. Default points, kiosk fly-up, particles, and desk display.
        </p>
        <div className="space-y-4">
          <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">When you tap a student</p>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Pick one mode — quick select and show award menu cannot both be active.
            </p>
            <RadioGroup
              value={prefs.instantTap ? 'quick' : 'menu'}
              onValueChange={(v) => {
                if (v === 'quick' || v === 'menu') patchPrefs({ instantTap: v === 'quick' });
              }}
              className="gap-1.5"
            >
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors',
                  prefs.instantTap
                    ? 'border-primary/35 bg-primary/5'
                    : 'border-transparent hover:bg-muted/50',
                )}
              >
                <RadioGroupItem value="quick" className="mt-0.5" aria-label="Quick select" />
                <span className="text-xs leading-snug">
                  <span className="font-semibold text-foreground">Quick select</span>
                  <span className="mt-0.5 block text-muted-foreground">
                    One tap awards your default points right away — best for fast line-ups and walk-by praise.
                  </span>
                </span>
              </label>
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors',
                  !prefs.instantTap
                    ? 'border-primary/35 bg-primary/5'
                    : 'border-transparent hover:bg-muted/50',
                )}
              >
                <RadioGroupItem value="menu" className="mt-0.5" aria-label="Show award menu" />
                <span className="text-xs leading-snug">
                  <span className="font-semibold text-foreground">Show award menu</span>
                  <span className="mt-0.5 block text-muted-foreground">
                    Tap opens the menu to choose quick awards, categories, corrections, or a behavior note.
                  </span>
                </span>
              </label>
            </RadioGroup>
            <div>
              <Label className="text-xs">Default points</Label>
              <p className="mb-1 text-[11px] text-muted-foreground">
                {prefs.instantTap
                  ? 'Used for each quick-select tap, entire-class awards (when enabled), and burst awards.'
                  : 'Used for the menu auto-award timer, entire-class awards (when enabled), and burst awards.'}
              </p>
              <Input
                type="number"
                min={1}
                className="h-9 rounded-lg"
                value={prefs.defaultPoints}
                onChange={(e) =>
                  patchPrefs({ defaultPoints: Math.max(1, Number(e.target.value) || 5) })
                }
              />
            </div>
            <label className="flex cursor-pointer items-start gap-2">
              <Switch
                className="mt-0.5"
                checked={prefs.awardSounds !== false}
                onCheckedChange={(v) => patchPrefs({ awardSounds: v })}
              />
              <span className="text-xs leading-snug">
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <Volume2 className="h-3.5 w-3.5" aria-hidden />
                  Award sounds
                </span>{' '}
                — soft chimes for taps and points on this chart. On by default; works even when school-wide sounds
                are off in main Settings.
              </span>
            </label>
          </div>

          <div className="space-y-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
              Kiosk fly-up
            </p>
            <label className="flex cursor-pointer items-start gap-2">
              <Checkbox
                className="mt-0.5"
                checked={prefs.showKioskFlyUp}
                onCheckedChange={(v) => patchPrefs({ showKioskFlyUp: v === true })}
              />
              <span className="text-xs leading-snug">
                <span className="font-semibold">Show +PTS fly-up</span> — floating name and points on the desk (student
                kiosk style). Independent of celebration below.
              </span>
            </label>
            {prefs.showKioskFlyUp ? (
              <div className="space-y-1 pl-6">
                <Label className="text-xs">Fly-up size</Label>
                <Select
                  value={prefs.kioskFlyUpSize}
                  onValueChange={(v) =>
                    patchPrefs({ kioskFlyUpSize: v as ClassroomSeatingPrefs['kioskFlyUpSize'] })
                  }
                >
                  <SelectTrigger className="h-9 rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[350]" position="popper">
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Celebration
            </p>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Simple flash is the default. Particle styles add extra motion on top of the flash. +PTS fly-up is
              separate below. If nothing animates, check that Celebration is not None and that your device is not
              using &quot;Reduce motion&quot; in accessibility settings.
            </p>
            <Select
              value={prefs.celebrationEffect}
              onValueChange={(v) =>
                patchPrefs({
                  celebrationEffect: v as ClassroomSeatingPrefs['celebrationEffect'],
                })
              }
            >
              <SelectTrigger className="h-9 rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[350]" position="popper">
                <SelectItem value="flash">Simple flash</SelectItem>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="sparkles">Sparkles</SelectItem>
                <SelectItem value="confetti">Confetti</SelectItem>
                <SelectItem value="hearts">Hearts</SelectItem>
                <SelectItem value="stars">Stars</SelectItem>
                <SelectItem value="fireworks">Fireworks</SelectItem>
                <SelectItem value="snow">Snow</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Toolbar</p>
            <label className="flex cursor-pointer items-start gap-2">
              <Checkbox
                className="mt-0.5"
                checked={prefs.showRandomPicker}
                onCheckedChange={(v) => patchPrefs({ showRandomPicker: v === true })}
              />
              <span className="text-xs leading-snug">
                <span className="font-semibold">Random picker</span> — show the Random button and{' '}
                <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">R</kbd> shortcut to highlight a
                student on the chart.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <Checkbox
                className="mt-0.5"
                checked={prefs.showClassAwardButton}
                onCheckedChange={(v) => patchPrefs({ showClassAwardButton: v === true })}
              />
              <span className="text-xs leading-snug">
                <span className="font-semibold">Entire class award</span> — show the Class +N button to award default
                points to every student on the seating chart at once.
              </span>
            </label>
          </div>

          <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Desk display</p>
            <label className="flex cursor-pointer items-start gap-2">
              <Checkbox
                className="mt-0.5"
                checked={prefs.showPointBalances}
                onCheckedChange={(v) => patchPrefs({ showPointBalances: v === true })}
              />
              <span className="text-xs leading-snug">
                <span className="font-semibold">Point balances</span> — show each student&apos;s current total on
                their desk.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <Checkbox
                className="mt-0.5"
                checked={prefs.showSessionTotals}
                onCheckedChange={(v) => patchPrefs({ showSessionTotals: v === true })}
              />
              <span className="text-xs leading-snug">
                <span className="font-semibold">Session badges</span> — session points and the last quick-award label
                on each desk; a summary line below the chart after each award.
              </span>
            </label>
          </div>

          <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Quick award labels</p>
            <p className="text-[11px] text-muted-foreground">
              Shortcuts if you use the award menu elsewhere (label and points).
            </p>
            {prefs.quickAwards.map((q, i) => (
              <div key={q.id} className="grid grid-cols-[1fr_4rem] gap-1">
                <Input
                  className="h-8 rounded-lg text-xs"
                  defaultValue={q.label}
                  key={`${q.id}-label-${q.label}`}
                  onBlur={(e) => updateQuick(i, { label: e.target.value.trim() || q.label })}
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
              Optional deduct shortcut (e.g. reminder −2 pts).
            </p>
            <div className="grid grid-cols-[1fr_4rem] gap-1">
              <Input
                className="h-8 rounded-lg text-xs"
                defaultValue={prefs.correctionLabel}
                key={`correction-label-${prefs.correctionLabel}`}
                onBlur={(e) =>
                  patchPrefs({ correctionLabel: e.target.value.trim() || prefs.correctionLabel })
                }
              />
              <Input
                type="number"
                min={0}
                className="h-8 rounded-lg text-xs"
                value={prefs.correctionPoints}
                onChange={(e) =>
                  patchPrefs({ correctionPoints: Math.max(0, Number(e.target.value) || 0) })
                }
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
