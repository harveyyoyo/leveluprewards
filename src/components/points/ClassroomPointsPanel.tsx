'use client';

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useDeferredValue,
} from 'react';
import {
  Check,
  GripVertical,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  Shuffle,
  Sparkles,
  Undo2,
  Users,
  MousePointerClick,
} from 'lucide-react';
import { openClassroomFullscreenTab } from '@/lib/classroomPointsUrl';
import { isClassroomOnlyMode, isPillarOn, CLASSROOM_LOCAL_REWARDS, CLASSROOM_SESSION_ONLY, isRewardsPillarOn } from '@/lib/productPillars';
import { BehaviorNoteDialog } from '@/components/classroom/BehaviorNoteDialog';
import { useTodayAttendanceMap } from '@/hooks/useTodayAttendanceMap';
import { useActiveBathroomPasses } from '@/hooks/useActiveBathroomPasses';
import { BathroomPassesBar } from '@/components/attendance/BathroomPassesBar';
import { startBathroomPass, endBathroomPass } from '@/lib/db/bathroom';
import { formatBathroomElapsed } from '@/lib/bathroom/formatBathroomElapsed';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  type ClassroomSeatingLayout,
  type ClassroomSeatingPrefs,
  type ClassroomSessionData,
  CLASSROOM_PREFS_VERSION,
  DEFAULT_CLASSROOM_PREFS,
} from '@/lib/classroomSeatingChart';
import { resolveClassroomDeduct } from '@/lib/classroom/classroomDeductSettings';
import { classroomAwardDisplayLabel, type ClassroomAwardLabelContext } from '@/lib/classroom/classroomAwardLabel';
import {
  ClassroomSeatingShortcutsHint,
  type ClassroomSeatingShortcutsHintState,
} from '@/components/points/classroomSeatingShortcutsHint';
import {
  remainingTeacherBudgetPoints,
  resolveTeacherBudgetPeriod,
  teacherBudgetRemainingPhrase,
  teacherWithBudgetAfterSpend,
} from '@/lib/teacherBudget';
import { ClassroomMonitorQuickControls } from '@/components/points/ClassroomMonitorQuickControls';
import { ClassroomSessionActivityList } from '@/components/points/ClassroomSessionActivityList';
import {
  ClassroomMonitorActionButton,
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
  type ClassroomNoteShortcutKey,
} from '@/components/points/ClassroomSeatingGrid';
import { isClassroomNoteShortcutKey } from '@/lib/classroom/classroomNoteShortcuts';
import {
  normalizeClassroomQuickAwards,
  resolveClassroomQuickTapDescription,
} from '@/lib/classroom/classroomQuickAwardsSettings';
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
  /** School point categories (same list as Points → Categories). */
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
  /** Publishes current seating controls so the parent can render compact shortcut help. */
  onSectionHintChange?: (state: ClassroomSeatingShortcutsHintState | null) => void;
  /** Fullscreen monitor — sync classId in the URL when the user switches class. */
  onClassIdChange?: (classId: string) => void;
};

function deskDensity(cellCount: number, fullscreen = false): 'normal' | 'cozy' | 'tight' {
  if (fullscreen) {
    if (cellCount > 20) return 'tight';
    if (cellCount > 10) return 'cozy';
    return 'cozy';
  }
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
  onSectionHintChange,
  onClassIdChange,
}: ClassroomPointsPanelProps) {
  const deferredStudents = useDeferredValue(students);
  const isFullscreen = variant === 'fullscreen';
  const { toast } = useToast();
  const playSound = useArcadeSound({ ignoreSchoolSoundMute: true });
  const { settings } = useSettings();
  const firestore = useFirestore();
  const sessionOnly = sessionOnlyProp ?? isClassroomOnlyMode(settings);
  const rewardsPillarOn = isRewardsPillarOn(settings);
  const classroomDeduct = useMemo(() => resolveClassroomDeduct(settings), [settings]);

  const {
    awardPoints,
    awardPointsToMultipleStudents,
    deductPointsFromMultipleStudents,
    userName,
    teacherDocId,
    loginState,
    isAdmin,
    isTeacher,
    isSecretary,
  } = useAppContext();
  const attendanceEnabled = isPillarOn(settings, 'payAttendance') && !!settings.enableClassSignIn;
  const bathroomTimerOn = attendanceEnabled && (settings.enableBathroomTimer ?? true);
  const bathroomMaxMinutes = Math.min(30, Math.max(1, settings.bathroomMaxMinutes ?? 5));
  const todayAttendance = useTodayAttendanceMap(schoolId, attendanceEnabled);
  const activeBathroomPasses = useActiveBathroomPasses(schoolId, bathroomTimerOn);
  const operatorId = teacherDocId || storageScope;
  const operatorName = userName || storageScope;
  const [behaviorNoteStudent, setBehaviorNoteStudent] = useState<Student | null>(null);
  const [behaviorNotePoints, setBehaviorNotePoints] = useState<{ label?: string; amount?: number }>({});
  const [behaviorNoteShortcutKey, setBehaviorNoteShortcutKey] =
    useState<ClassroomNoteShortcutKey>('c');
  const [behaviorNoteSuppressHeldKey, setBehaviorNoteSuppressHeldKey] =
    useState<ClassroomNoteShortcutKey | null>(null);
  const heldNoteKeyRef = useRef<ClassroomNoteShortcutKey | null>(null);
  const [classroomBalances, setClassroomBalances] = useState<Record<string, number>>({});

  const [filterClassId, setFilterClassId] = useState(() => {
    if (initialClassId && classes.some((c) => c.id === initialClassId)) {
      return initialClassId;
    }
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('defaultClassId');
      if (stored && stored !== 'all' && classes.some((c) => c.id === stored)) return stored;
    }
    return isFullscreen ? classes[0]?.id ?? 'all' : classes[0]?.id ?? 'all';
  });

  useEffect(() => {
    if (!initialClassId || !classes.some((c) => c.id === initialClassId)) return;
    setFilterClassId((current) => (current === initialClassId ? current : initialClassId));
  }, [initialClassId, classes]);

  useEffect(() => {
    if (!isFullscreen || filterClassId !== 'all') return;
    const fallback =
      initialClassId && classes.some((c) => c.id === initialClassId)
        ? initialClassId
        : classes[0]?.id;
    if (fallback) setFilterClassId(fallback);
  }, [isFullscreen, filterClassId, initialClassId, classes]);
  const [layout, setLayout] = useState<ClassroomSeatingLayout | null>(null);
  const [prefs, setPrefs] = useState<ClassroomSeatingPrefs>(DEFAULT_CLASSROOM_PREFS);
  const useLocalClassroomRewards =
    sessionOnlyProp !== undefined
      ? sessionOnlyProp
      : !rewardsPillarOn || prefs.awardSource === 'local';
  const localAwardToast = rewardsPillarOn
    ? CLASSROOM_LOCAL_REWARDS.toastDescription
    : CLASSROOM_SESSION_ONLY.toastDescription;
  const chartQuickAwards = useMemo(
    () => normalizeClassroomQuickAwards(settings.classroomQuickAwards, prefs.quickAwards),
    [settings.classroomQuickAwards, prefs.quickAwards],
  );
  const chartPrefsForAwards = useMemo(
    () => ({
      ...prefs,
      quickAwards: chartQuickAwards,
      defaultDescription: resolveClassroomQuickTapDescription(settings),
    }),
    [prefs, chartQuickAwards, settings],
  );
  const awardLabelContext = useMemo<ClassroomAwardLabelContext>(
    () => ({
      ...chartPrefsForAwards,
      quickTapDescription: chartPrefsForAwards.defaultDescription,
    }),
    [chartPrefsForAwards],
  );
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (isFullscreen || !onSectionHintChange) return;
    onSectionHintChange({
      prefs,
      editMode,
      attendanceEnabled,
      bathroomEnabled: bathroomTimerOn,
      classroomDeduct,
    });
    return () => onSectionHintChange(null);
  }, [attendanceEnabled, bathroomTimerOn, classroomDeduct, editMode, isFullscreen, onSectionHintChange, prefs]);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [pendingAward, setPendingAward] = useState<PendingAward | null>(null);
  const [awardingStudentIds, setAwardingStudentIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const addAwardingStudents = useCallback((ids: string[]) => {
    if (!ids.length) return;
    setAwardingStudentIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }, []);
  const removeAwardingStudents = useCallback((ids: string[]) => {
    if (!ids.length) return;
    setAwardingStudentIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of ids) {
        if (next.delete(id)) changed = true;
      }
      return changed ? next : prev;
    });
  }, []);
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
  const awardLabelContextRef = useRef(awardLabelContext);
  awardLabelContextRef.current = awardLabelContext;

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

  const bathroomEnabled = bathroomTimerOn && !editMode;
  const bathroomByStudent = useMemo(() => {
    const map = new Map<string, { startedAt: number }>();
    activeBathroomPasses.forEach((pass, studentId) => {
      if (pass.startedAt) map.set(studentId, { startedAt: pass.startedAt });
    });
    return map;
  }, [activeBathroomPasses]);
  const bathroomTick = activeBathroomPasses.size;
  const classStudentIdSet = useMemo(() => new Set(classStudents.map((s) => s.id)), [classStudents]);
  const activeBathroomList = useMemo(
    () => Array.from(activeBathroomPasses.values()),
    [activeBathroomPasses],
  );

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

  const computedLayout = useMemo((): ClassroomSeatingLayout | null => {
    if (!effectiveClassId || effectiveClassId === 'all') return null;
    const ids = classStudents.map((s) => s.id);
    const saved = loadClassroomLayout(schoolId, storageScope, effectiveClassId);
    if (saved) {
      const allowed = new Set(ids);
      const cells = saved.cells.map((id) => (id && allowed.has(id) ? id : null));
      return { ...saved, cells };
    }
    return buildInitialLayout(ids);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- roster layout only when class membership changes
  }, [schoolId, storageScope, effectiveClassId, classStudentIdsKey]);

  const activeLayout = layout ?? computedLayout;

  const openBehaviorNote = useCallback(
    (
      student: Student,
      options?: {
        label?: string;
        amount?: number;
        shortcutKey?: ClassroomNoteShortcutKey;
        fromHeldKey?: boolean;
      },
    ) => {
      setBehaviorNotePoints(
        options?.label || options?.amount
          ? { label: options.label, amount: options.amount }
          : {},
      );
      const shortcut = options?.shortcutKey ?? 'c';
      setBehaviorNoteShortcutKey(shortcut);
      setBehaviorNoteSuppressHeldKey(
        options?.fromHeldKey && options.shortcutKey ? options.shortcutKey : null,
      );
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

  const deskDisplayOptions = useMemo(
    () => ({
      showLastName: prefs.showLastName,
      showStudentEmoji: prefs.showStudentEmoji,
      defaultStudentTheme: settings.defaultStudentTheme,
      studentThemesEnabled: settings.enableStudentThemes !== false,
    }),
    [
      prefs.showLastName,
      prefs.showStudentEmoji,
      settings.defaultStudentTheme,
      settings.enableStudentThemes,
    ],
  );

  const deskCatalogSig = useMemo(
    () => classroomDeskCatalogSignature(deferredStudents, filterClassId, deskDisplayOptions),
    [deferredStudents, filterClassId, deskDisplayOptions],
  );

  const deskCatalogRef = useRef<Map<string, ClassroomDeskDisplay>>(new Map());
  const deskCatalog = useMemo(() => {
    const next = buildClassroomDeskCatalog(
      deferredStudents,
      filterClassId,
      useLocalClassroomRewards,
      classroomBalances,
      deskCatalogRef.current,
      deskDisplayOptions,
    );
    deskCatalogRef.current = next;
    return next;
  }, [useLocalClassroomRewards, classroomBalances, deferredStudents, filterClassId, deskDisplayOptions]);

  const visualCells = useMemo(
    () => (activeLayout ? visualLayoutPositions(activeLayout, prefs.frontAtBottom) : []),
    [activeLayout, prefs.frontAtBottom],
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
    onDeduct: () => {},
    onBehaviorNote: () => {},
    onDragStart: () => {},
    onDrop: () => {},
  });

  useEffect(() => {
    setPrefs(loadClassroomPrefs(schoolId, storageScope));
  }, [schoolId, storageScope]);

  useEffect(() => {
    if (!prefs.showBurstAward && burstMode) {
      setBurstMode(false);
      setBurstSelected([]);
    }
  }, [prefs.showBurstAward, burstMode]);

  useEffect(() => {
    setLayout(computedLayout);
  }, [computedLayout]);

  const layoutSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!activeLayout || !effectiveClassId || effectiveClassId === 'all') return;
    if (layoutSaveTimerRef.current) clearTimeout(layoutSaveTimerRef.current);
    layoutSaveTimerRef.current = setTimeout(() => {
      saveClassroomLayout(schoolId, storageScope, effectiveClassId, activeLayout);
      layoutSaveTimerRef.current = null;
    }, 450);
    return () => {
      if (layoutSaveTimerRef.current) clearTimeout(layoutSaveTimerRef.current);
    };
  }, [activeLayout, schoolId, storageScope, effectiveClassId]);

  useEffect(() => {
    if (!effectiveClassId || effectiveClassId === 'all') return;
    setSessionData(loadClassroomSession(schoolId, storageScope, effectiveClassId));
    setLastAwardSummary(null);
    setBurstSelected([]);
    setLastAction(null);
  }, [schoolId, storageScope, effectiveClassId]);

  const placedStudentIds = useMemo(() => {
    if (!activeLayout) return [] as string[];
    return activeLayout.cells.filter((id): id is string => !!id);
  }, [activeLayout]);

  const unassignedStudents = useMemo(() => {
    if (!activeLayout) return classStudents;
    const placed = studentIdsInLayout(activeLayout);
    return classStudents.filter((s) => !placed.has(s.id));
  }, [classStudents, activeLayout]);

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
      const FLASH_MS = 350;
      const FLY_UP_DELAY_MS = showDeskFlash ? 200 : 0;
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
      if (!activeLayout || points <= 0) return;
      studentIds.forEach((id, i) => {
        const cellIndex = activeLayout.cells.indexOf(id);
        if (cellIndex < 0) return;
        const student = studentById.get(id);
        const name = student ? getStudentNickname(student) : '';
        window.setTimeout(() => {
          triggerDeskAwardFeedback(cellIndex, points, name);
        }, i * 90);
      });
    },
    [activeLayout, studentById, triggerDeskAwardFeedback],
  );

  const recordSessionAwards = useCallback(
    (studentIds: string[], pointsDelta: number, description: string) => {
      if (!effectiveClassId || effectiveClassId === 'all') return;
      const label = classroomAwardDisplayLabel(description, awardLabelContextRef.current);
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
      const next = applyClassroomSessionAward(
        schoolId,
        storageScope,
        effectiveClassId,
        studentIds,
        pointsDelta,
        label,
        studentLabel ? { studentLabel } : undefined,
      );
      setSessionData(next);
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
      if (
        studentIds.length === 0 ||
        (!useLocalClassroomRewards && studentIds.some((id) => awardingStudentIds.has(id)))
      ) {
        return false;
      }
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

      const signedDelta = isDeduct ? -magnitude : magnitude;
      const rewardsMode = !useLocalClassroomRewards;
      const staffish =
        isAdmin ||
        isTeacher ||
        isSecretary ||
        loginState === 'developer' ||
        loginState === 'reports';

      if (
        rewardsMode &&
        !isDeduct &&
        typeof navigator !== 'undefined' &&
        navigator.onLine === false &&
        staffish &&
        settings.enableTeacherOfflineAwardQueue !== false
      ) {
        addAwardingStudents(studentIds);
        const result =
          studentIds.length === 1
            ? await awardPoints(studentIds[0]!, magnitude, description)
            : await awardPointsToMultipleStudents(studentIds, magnitude, description);
        if (result.success) {
          playClassroomSound(classroomPointSoundEffect(points, isDeduct));
          if (!options?.silent) {
            const awardLabel = classroomAwardDisplayLabel(description, awardLabelContextRef.current);
            const oneStudent =
              studentIds.length === 1 ? studentById.get(studentIds[0]!) : undefined;
            toast({
              title: oneStudent
                ? `${getStudentNickname(oneStudent)}: ${awardLabel}`
                : `${awardLabel} (+${magnitude})`,
              description: result.message,
            });
          }
          if (effectiveClassId && effectiveClassId !== 'all') {
            startTransition(() => {
              recordSessionAwards(studentIds, magnitude, description);
              setLastAction({
                mode: 'award',
                studentIds: [...studentIds],
                points: magnitude,
                description,
              });
            });
          }
          removeAwardingStudents(studentIds);
          return true;
        }
        playClassroomSound('error');
        toast({
          variant: 'destructive',
          title: 'Could not award points',
          description: result.message,
        });
        removeAwardingStudents(studentIds);
        return false;
      }

      let optimisticAction: LastClassroomAction | null = null;
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

      if (useLocalClassroomRewards) {
        optimisticAction = {
          mode: isDeduct ? 'deduct' : 'award',
          studentIds: [...studentIds],
          points: magnitude,
          description,
          classroomOnly: true,
        };
        startTransition(() => {
          applySessionDelta(signedDelta);
          setLastAction(optimisticAction);
        });
      } else {
        addAwardingStudents(studentIds);
      }

      const canTrackSession = effectiveClassId && effectiveClassId !== 'all';
      const sessionDelta = isDeduct ? -magnitude : magnitude;
      let optimisticSessionApplied = false;
      const rollbackOptimisticSession = () => {
        if (!optimisticSessionApplied || !canTrackSession) return;
        optimisticSessionApplied = false;
        startTransition(() => {
          recordSessionAwards(studentIds, -sessionDelta, `Undo: ${description}`);
          setLastAction(null);
        });
      };
      const applyOptimisticSession = () => {
        if (!canTrackSession) return;
        optimisticSessionApplied = true;
        startTransition(() => {
          recordSessionAwards(studentIds, sessionDelta, description);
        });
      };

      const showAwardToast = (count = studentIds.length) => {
        if (options?.silent) return;
        const awardLabel = classroomAwardDisplayLabel(description, awardLabelContextRef.current);
        const oneStudent =
          studentIds.length === 1 ? studentById.get(studentIds[0]!) : undefined;
        toast({
          title: isDeduct
            ? oneStudent
              ? `${getStudentNickname(oneStudent)}: −${magnitude}`
              : useLocalClassroomRewards
                ? `−${magnitude} classroom pt${magnitude === 1 ? '' : 's'}`
                : `−${magnitude} from ${count} student(s)`
            : oneStudent
              ? `${getStudentNickname(oneStudent)}: ${awardLabel}`
              : `${awardLabel} (+${magnitude})`,
          description: isDeduct
            ? useLocalClassroomRewards
              ? localAwardToast
              : count > 1
                ? `${count} students · −${magnitude} pts each`
                : `−${magnitude} pts`
            : useLocalClassroomRewards
              ? localAwardToast
              : count > 1
                ? `${count} students · +${magnitude} pts each`
                : `+${magnitude} pts`,
        });
      };

      if (useLocalClassroomRewards) {
        playClassroomSound(classroomPointSoundEffect(points, isDeduct));
        showAwardToast();
      } else if (rewardsMode) {
        applyOptimisticSession();
        playClassroomSound(classroomPointSoundEffect(points, isDeduct));
        showAwardToast();
      }

      const result = await awardClassroomPoints(firestore, {
        schoolId,
        studentIds,
        signedDelta,
        description,
        rewardsMode,
        ...classroomMeta,
      });

      if (!result.success) {
        if (useLocalClassroomRewards && optimisticAction) {
          applySessionDelta(-signedDelta);
          setLastAction((current) => (current === optimisticAction ? null : current));
        }
        rollbackOptimisticSession();
        playClassroomSound('error');
        toast({
          variant: 'destructive',
          title: useLocalClassroomRewards ? 'Could not save classroom points' : isDeduct ? 'Could not deduct points' : 'Could not award points',
          description: result.message,
        });
        if (rewardsMode) {
          removeAwardingStudents(studentIds);
        }
        return false;
      }

      if (rewardsMode && result.count === 0) {
        rollbackOptimisticSession();
      }

      if (
        rewardsMode &&
        !isDeduct &&
        !skipBudget &&
        settings.enableTeacherBudgets &&
        teacher &&
        budgetOptions?.onBudgetSpend
      ) {
        await budgetOptions.onBudgetSpend(totalCost);
      }

      if (rewardsMode && result.count > 0) {
        const budgetSpent = !isDeduct && !skipBudget && settings.enableTeacherBudgets ? totalCost : undefined;
        startTransition(() => {
          setLastAction({
            mode: isDeduct ? 'deduct' : 'award',
            studentIds: [...studentIds],
            points: magnitude,
            description,
            classroomOnly: false,
            budgetSpent,
          });
        });
      }

      if (rewardsMode) removeAwardingStudents(studentIds);
      return true;
    },
    [
      awardingStudentIds,
      addAwardingStudents,
      removeAwardingStudents,
      budgetOptions,
      settings.enableTeacherBudgets,
      awardPoints,
      awardPointsToMultipleStudents,
      loginState,
      isAdmin,
      isTeacher,
      isSecretary,
      settings.enableTeacherOfflineAwardQueue,
      playClassroomSound,
      toast,
      schoolId,
      effectiveClassId,
      useLocalClassroomRewards,
      localAwardToast,
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
    if (editMode) return;

    if (burstMode && prefs.showBurstAward) {
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

  const handleDeduct = (studentId: string, cellIndex: number) => {
    if (editMode || !classroomDeduct.enabled) return;
    playClassroomSound(CLASSROOM_TAP_SOUND);
    void applyPointsToStudents(
      [studentId],
      -classroomDeduct.points,
      classroomDeduct.description,
      { flashCellIndex: cellIndex },
    );
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
      const undoRewardsMode = !(useLocalClassroomRewards || lastAction.classroomOnly);
      const signedDelta = lastAction.mode === 'award' ? -lastAction.points : lastAction.points;
      const result = await awardClassroomPoints(firestore, {
        schoolId,
        studentIds: lastAction.studentIds,
        signedDelta,
        description: undoLabel,
        rewardsMode: undoRewardsMode,
        ...classroomMeta,
      });
      if (!result.success) {
        playClassroomSound('error');
        toast({ variant: 'destructive', title: 'Undo failed', description: result.message });
        return;
      }
      if (useLocalClassroomRewards || lastAction.classroomOnly) {
        setClassroomBalances((prev) => {
          const next = { ...prev };
          for (const id of lastAction.studentIds) {
            next[id] = Math.max(0, (prev[id] ?? 0) + signedDelta);
          }
          return next;
        });
      } else if (
        lastAction.mode === 'award' &&
        !skipBudget &&
        settings.enableTeacherBudgets &&
        teacher &&
        lastAction.budgetSpent &&
        budgetOptions?.onBudgetSpend
      ) {
        await budgetOptions.onBudgetSpend(-lastAction.budgetSpent);
      }
      if (effectiveClassId && effectiveClassId !== 'all') {
        recordSessionAwards(lastAction.studentIds, signedDelta, undoLabel);
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
    playClassroomSound,
    toast,
    schoolId,
    effectiveClassId,
    useLocalClassroomRewards,
    firestore,
    classroomMeta,
    recordSessionAwards,
  ]);

  useEffect(() => {
    if (editMode) return;
    const isTypingTarget = (target: EventTarget | null) =>
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable);

    const onNoteKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (!isClassroomNoteShortcutKey(key)) return;
      heldNoteKeyRef.current = key;
      e.preventDefault();
    };

    const onNoteKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (heldNoteKeyRef.current === key) {
        heldNoteKeyRef.current = null;
      }
    };

    const clearHeldNoteKey = () => {
      heldNoteKeyRef.current = null;
    };

    window.addEventListener('keydown', onNoteKeyDown, true);
    window.addEventListener('keyup', onNoteKeyUp, true);
    window.addEventListener('blur', clearHeldNoteKey);
    return () => {
      window.removeEventListener('keydown', onNoteKeyDown, true);
      window.removeEventListener('keyup', onNoteKeyUp, true);
      window.removeEventListener('blur', clearHeldNoteKey);
    };
  }, [editMode]);

  useEffect(() => {
    if (editMode || pendingAward) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.target instanceof HTMLSelectElement) return;
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey || e.shiftKey;
      if (heldNoteKeyRef.current) return;
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
    if (!editMode || dragIndex === null || !activeLayout) return;
    if (dragIndex !== targetIndex) {
      setLayout(swapCells(activeLayout, dragIndex, targetIndex));
    }
    setDragIndex(null);
  };

  const handleBathroomToggle = useCallback(
    async (studentId: string) => {
      if (!bathroomEnabled) return;
      const student = studentById.get(studentId);
      if (!student) return;

      const isOut = activeBathroomPasses.has(studentId);
      if (!isOut && settings.bathroomRequirePresent !== false) {
        const status = todayAttendance.get(studentId) ?? 'absent';
        if (status === 'absent') {
          toast({
            variant: 'destructive',
            title: 'Not signed in',
            description: 'Student must sign in for attendance before leaving for the bathroom.',
          });
          return;
        }
      }

      try {
        if (isOut) {
          const log = await endBathroomPass(firestore, schoolId, studentId, bathroomMaxMinutes);
          if (log) {
            toast({
              title: 'Back from bathroom',
              description: `${log.studentName || studentId} · ${formatBathroomElapsed(log.durationMs)}${
                log.overLimit ? ' (over limit)' : ''
              }`,
            });
          }
        } else {
          await startBathroomPass(firestore, schoolId, student, {
            teacherId: operatorId,
            teacherName: operatorName,
            classId: effectiveClassId && effectiveClassId !== 'all' ? effectiveClassId : student.classId,
          });
          toast({
            title: 'Bathroom pass started',
            description: `${[student.firstName, student.lastName].filter(Boolean).join(' ') || student.nickname || studentId} is out. Alt+click when they return.`,
          });
        }
      } catch (err) {
        console.error('Bathroom pass failed', err);
        toast({
          variant: 'destructive',
          title: 'Bathroom pass failed',
          description: err instanceof Error ? err.message : 'Could not update bathroom pass.',
        });
      }
    },
    [
      activeBathroomPasses,
      bathroomEnabled,
      bathroomMaxMinutes,
      effectiveClassId,
      firestore,
      operatorId,
      operatorName,
      schoolId,
      settings.bathroomRequirePresent,
      studentById,
      todayAttendance,
      toast,
    ],
  );

  gridHandlersRef.current = {
    onDeskTap: handleDeskTap,
    onDeduct: classroomDeduct.enabled ? handleDeduct : undefined,
    onBehaviorNote: (studentId, shortcutKey, fromHeldKey) => {
      const s = studentById.get(studentId);
      if (!s) return;
      setPendingAward(null);
      clearAutoTimer();
      openBehaviorNote(s, { shortcutKey, fromHeldKey });
    },
    onNotePicker: (studentId) => {
      const s = studentById.get(studentId);
      if (!s) return;
      setPendingAward(null);
      clearAutoTimer();
      openBehaviorNote(s, { shortcutKey: 'c' });
    },
    getNoteKeyHeld: () => heldNoteKeyRef.current,
    onBathroomToggle: bathroomEnabled ? handleBathroomToggle : undefined,
    onDragStart: handleDragStart,
    onDrop: handleDrop,
  };

  const placeStudentOnDesk = (studentId: string, cellIndex: number) => {
    if (!activeLayout) return;
    const cells = activeLayout.cells.map((id, i) => {
      if (id === studentId) return null;
      if (i === cellIndex) return studentId;
      return id;
    });
    setLayout({ ...activeLayout, cells });
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

  const updatePrefs = useCallback((next: ClassroomSeatingPrefs) => {
    const normalized = {
      ...next,
      prefsVersion: CLASSROOM_PREFS_VERSION,
    };
    setPrefs(normalized);
    saveClassroomPrefs(schoolId, storageScope, normalized);
  }, [schoolId, storageScope]);

  const patchPrefs = useCallback(
    (patch: Partial<ClassroomSeatingPrefs>) => {
      updatePrefs({
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
    [prefs, updatePrefs],
  );

  const handleMonitorClassChange = useCallback(
    (nextClassId: string) => {
      if (!nextClassId || nextClassId === filterClassId) return;
      setFilterClassId(nextClassId);
      localStorage.setItem('defaultClassId', nextClassId);
      setPendingAward(null);
      clearAutoTimer();
      onClassIdChange?.(nextClassId);
    },
    [clearAutoTimer, filterClassId, onClassIdChange],
  );

  if (classes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Add a class and students to use the classroom view.</p>
    );
  }

  if ((!effectiveClassId || filterClassId === 'all') && !isFullscreen) {
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

  if (!activeLayout) {
    return (
      <div
        className={cn(
          'flex flex-1 items-center justify-center',
          isFullscreen && 'h-full min-h-0 w-full',
        )}
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading seating chart" />
      </div>
    );
  }

  const pendingStudent = pendingAward ? studentById.get(pendingAward.studentId) : null;
  const chartNeedsRosterPlacement =
    !editMode && classStudents.length > 0 && placedStudentIds.length === 0;
  const noStudentsInClass = !editMode && classStudents.length === 0;
  const fillChartFromRoster = () => {
    const ids = classStudents.map((s) => s.id);
    setLayout(buildInitialLayout(ids));
  };
  const cellCount = activeLayout.rows * activeLayout.cols;
  const density = deskDensity(cellCount, isFullscreen);
  const gridGap = isFullscreen
    ? density === 'tight'
      ? 2
      : density === 'cozy'
        ? 3
        : 4
    : density === 'tight'
      ? 3
      : density === 'cozy'
        ? 5
        : 8;
  const frontAtBottom = prefs.frontAtBottom;

  const arrangeSeatsButton = (
    <ClassroomToolButton
      design={design}
      icon={GripVertical}
      label={editMode ? 'Done arranging' : 'Arrange seats'}
      primary={editMode}
      large
      onClick={() => {
        setEditMode((v) => !v);
        setBurstMode(false);
        setBurstSelected([]);
        setPendingAward(null);
        clearAutoTimer();
      }}
    />
  );

  const undoButton = !editMode ? (
    <ClassroomToolButton
      design={design}
      icon={Undo2}
      label="Undo"
      title={lastAction ? 'Undo last award (Ctrl+U)' : 'Nothing to undo yet'}
      large
      onClick={() => void handleUndo()}
      disabled={!lastAction || isUndoing}
    />
  ) : null;

  const sessionActivity = sessionData.activity ?? [];

  const monitorAwardActions =
    !editMode &&
    (prefs.showRandomPicker ||
      prefs.showClassAwardButton ||
      prefs.showBurstAward ||
      (prefs.showBurstAward && burstMode && burstSelected.length > 0)) ? (
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {prefs.showRandomPicker ? (
          <ClassroomMonitorActionButton
            design={design}
            isFullscreen={isFullscreen}
            iconOnly
            tone="random"
            icon={Shuffle}
            label="Random"
            title="Random student (R)"
            onClick={pickRandomStudent}
          />
        ) : null}
        {prefs.showClassAwardButton ? (
          <ClassroomMonitorActionButton
            design={design}
            isFullscreen={isFullscreen}
            iconOnly
            tone="class"
            icon={Users}
            label={`Class +${prefs.defaultPoints}`}
            title={`Award +${prefs.defaultPoints} to everyone on the chart`}
            onClick={awardWholeClass}
            disabled={!placedStudentIds.length}
          />
        ) : null}
        {prefs.showBurstAward ? (
          <ClassroomMonitorActionButton
            design={design}
            isFullscreen={isFullscreen}
            iconOnly
            tone="burst"
            icon={MousePointerClick}
            label={burstMode ? `Burst (${burstSelected.length})` : 'Burst'}
            primary={burstMode}
            title={
              burstMode && burstSelected.length > 0
                ? `Burst mode — ${burstSelected.length} selected`
                : 'Select several students, then award once'
            }
            onClick={() => {
              playClassroomSound(CLASSROOM_TAP_SOUND);
              setBurstMode((v) => !v);
              setBurstSelected([]);
              setPendingAward(null);
              clearAutoTimer();
            }}
          />
        ) : null}
        {prefs.showBurstAward && burstMode && burstSelected.length > 0 ? (
          <>
            <span className="px-0.5 text-[10px] font-bold text-sky-800 dark:text-sky-200 sm:text-[11px]">
              {burstSelected.length} picked
            </span>
            <button
              type="button"
              className="inline-flex items-center rounded-lg border-2 border-transparent px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:brightness-110 sm:px-3 sm:py-2 sm:text-xs"
              style={{ backgroundColor: accentColor }}
              onClick={() => void awardBurstSelection()}
            >
              Award +{prefs.defaultPoints}
            </button>
            <button
              type="button"
              className={cn(
                'inline-flex items-center rounded-lg border-2 px-2.5 py-1.5 text-[11px] font-bold shadow-sm transition sm:px-3 sm:py-2 sm:text-xs',
                design === 'brutalist'
                  ? 'border-foreground bg-card hover:bg-yellow-100'
                  : 'border-primary/45 bg-primary/12 text-primary hover:bg-primary/18',
              )}
              onClick={() => setBurstSelected([])}
            >
              Clear
            </button>
          </>
        ) : null}
      </div>
    ) : null;

  const teacherDesk = (
    <ClassroomTeacherDesk
      design={design}
      frontAtBottom={frontAtBottom}
      leadingAction={arrangeSeatsButton}
      trailingAction={undoButton}
    />
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
        prefs={chartPrefsForAwards}
        pendingAward={pendingAward}
        categories={sortedCategories}
        showCategoryAwards={!useLocalClassroomRewards && sortedCategories.length > 0}
        showQuickAwards={useLocalClassroomRewards}
        onPick={(points, description) => {
          playClassroomSound(CLASSROOM_TAP_SOUND);
          void confirmPendingAward(points, description);
        }}
        onBehaviorNote={() => {
          openBehaviorNote(pendingStudent);
          setPendingAward(null);
          clearAutoTimer();
        }}
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
    <div
      className={cn(
        classroomDesignShellClass(design, isFullscreen),
        isFullscreen && 'h-full min-h-0 w-full gap-1 p-0',
      )}
    >
      {isFullscreen && !editMode ? (
        <div className="shrink-0 border-b border-border/40 bg-muted/15 px-3 py-2">
          <ClassroomSeatingShortcutsHint
            prefs={prefs}
            editMode={editMode}
            attendanceEnabled={attendanceEnabled}
            bathroomEnabled={bathroomTimerOn}
            classroomDeduct={classroomDeduct}
            monitorDisplay
          />
        </div>
      ) : null}
      {!(isFullscreen && editMode) ? (
      <div
        className={cn(
          classroomControlsBarClass(design),
          isFullscreen && 'mb-1 shrink-0 p-1.5',
          'items-start sm:items-center',
        )}
      >
        {isFullscreen && !editMode ? (
          <ClassroomMonitorQuickControls
            design={design}
            prefs={prefs}
            classes={classes}
            classId={effectiveClassId ?? ''}
            isFullscreen={isFullscreen}
            editMode={editMode}
            rewardsPillarOn={rewardsPillarOn}
            onChange={patchPrefs}
            onClassChange={
              isFullscreen && classes.length > 1 && !editMode ? handleMonitorClassChange : undefined
            }
            awardActions={monitorAwardActions}
          />
        ) : (
          <>
            {monitorAwardActions}
            <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
              {!editMode ? (
                <ClassroomSessionActivityList entries={sessionActivity} compact />
              ) : null}
              {!isFullscreen && (
                <ClassroomToolButton
                  design={design}
                  icon={Maximize2}
                  label="Full screen"
                  onClick={openFullscreen}
                />
              )}
            </div>
          </>
        )}
      </div>
      ) : null}

      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1',
          isFullscreen && !editMode && 'gap-0',
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">

      {editMode && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-dashed bg-muted/20 px-3 py-2 text-xs">
          <span className="w-full font-semibold text-muted-foreground sm:w-auto">Arrange room</span>
          <span className="hidden font-semibold text-muted-foreground sm:inline">Layout:</span>
          <RadioGroup
            value={prefs.frontAtBottom ? 'bottom' : 'top'}
            onValueChange={(v) => patchPrefs({ frontAtBottom: v === 'bottom' })}
            className="flex flex-wrap items-center gap-3"
          >
            <label className="flex cursor-pointer items-center gap-1.5">
              <RadioGroupItem value="top" aria-label="Teacher desk at top" />
              <span className="font-medium">Desk at top</span>
            </label>
            <label className="flex cursor-pointer items-center gap-1.5">
              <RadioGroupItem value="bottom" aria-label="Teacher desk at bottom" />
              <span className="font-medium">Desk at bottom</span>
            </label>
          </RadioGroup>
          <span className="hidden text-muted-foreground sm:inline">·</span>
          <span className="font-semibold text-muted-foreground">Grid:</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            disabled={activeLayout.rows <= 1}
            onClick={() => setLayout(resizeLayout(activeLayout, activeLayout.rows - 1, activeLayout.cols))}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="min-w-[4rem] text-center font-mono font-bold">{activeLayout.rows} rows</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => setLayout(resizeLayout(activeLayout, activeLayout.rows + 1, activeLayout.cols))}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <span className="mx-1 text-muted-foreground">×</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            disabled={activeLayout.cols <= 1}
            onClick={() => setLayout(resizeLayout(activeLayout, activeLayout.rows, activeLayout.cols - 1))}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="min-w-[4rem] text-center font-mono font-bold">{activeLayout.cols} cols</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => setLayout(resizeLayout(activeLayout, activeLayout.rows, activeLayout.cols + 1))}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <span className="text-muted-foreground">Drag desks to match your room.</span>
        </div>
      )}

      {chartNeedsRosterPlacement && !isFullscreen ? (
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
      {noStudentsInClass && !isFullscreen ? (
        <p className="shrink-0 rounded-xl border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          No students in {effectiveClassName || 'this class'} yet. Add them under{' '}
          <span className="font-semibold text-foreground">Students</span> (or import a roster), then return here.
        </p>
      ) : null}

      {bathroomEnabled && activeBathroomList.length > 0 && !(isFullscreen && editMode) ? (
        <BathroomPassesBar
          passes={activeBathroomList}
          maxMinutes={bathroomMaxMinutes}
          classStudentIds={filterClassId !== 'all' ? classStudentIdSet : undefined}
          onReturn={(studentId) => void handleBathroomToggle(studentId)}
        />
      ) : null}

      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-col',
          isFullscreen ? 'flex-1 overflow-hidden' : 'h-[min(58vh,560px)] min-h-[200px] overflow-visible',
        )}
      >
        {!frontAtBottom && teacherDesk}
        <ClassroomSeatingGrid
          layoutRows={activeLayout.rows}
          layoutCols={activeLayout.cols}
          cellStudentIds={activeLayout.cells}
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
          awardingStudentIds={awardingStudentIds}
          attendanceEnabled={attendanceEnabled}
          attendanceByStudent={todayAttendance}
          bathroomEnabled={bathroomEnabled}
          bathroomByStudent={bathroomByStudent}
          bathroomMaxMinutes={bathroomMaxMinutes}
          bathroomTick={bathroomTick}
          activeCelebration={gridActiveCelebration}
          handlersRef={gridHandlersRef}
          fitViewport={isFullscreen}
        />
        {frontAtBottom && teacherDesk}
      </div>

      {lastAwardSummary && prefs.showSessionTotals && !editMode && !isFullscreen ? (
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

      {editMode && unassignedStudents.length > 0 && !isFullscreen && (
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
                  const emptyIndex = activeLayout.cells.findIndex((id) => !id);
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
            {classroomDeduct.enabled ? ` · Ctrl+click ${classroomDeduct.label.toLowerCase()} (−${classroomDeduct.points})` : ''}
            {prefs.showRandomPicker ? ' · R random' : ''}
            {prefs.showBurstAward ? ' · Burst on toolbar' : ''} · Ctrl+U undo · Arrange to flip room
            {attendanceEnabled ? ' · Dot = today attendance' : ''}
            {bathroomEnabled ? ' · Alt+click = bathroom pass' : ''}
          </span>
        </p>
      )}

        </div>

        {isFullscreen && !editMode ? (
          <aside className="hidden min-h-0 w-44 shrink-0 border-l border-border/40 bg-muted/10 p-2 sm:flex sm:flex-col lg:w-52">
            <ClassroomSessionActivityList entries={sessionActivity} className="min-h-0 flex-1" />
          </aside>
        ) : null}
      </div>

      {awardMenu}
      {behaviorNoteStudent ? (
        <BehaviorNoteDialog
          open={!!behaviorNoteStudent}
          onOpenChange={(open) => {
            if (!open) {
              setBehaviorNoteStudent(null);
              setBehaviorNoteSuppressHeldKey(null);
            }
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
          shortcutKey={behaviorNoteShortcutKey}
          suppressHeldShortcutKey={behaviorNoteSuppressHeldKey}
          behaviorQuickOptions={settings.classroomBehaviorQuickOptions}
          onSaved={onBehaviorNoteSaved}
        />
      ) : null}
    </div>
  );
}

export const ClassroomPointsPanel = ClassroomPointsPanelInner;

function ClassroomAwardMenu({
  student,
  prefs,
  pendingAward,
  categories,
  showCategoryAwards,
  showQuickAwards,
  onPick,
  onBehaviorNote,
  onPauseAutoAward,
  onCancel,
}: {
  student: Student;
  prefs: ClassroomSeatingPrefs;
  pendingAward: PendingAward;
  categories: Category[];
  showCategoryAwards: boolean;
  showQuickAwards: boolean;
  onPick: (points: number, description: string) => void;
  onBehaviorNote?: () => void;
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
      {showCategoryAwards && (
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
      {!showCategoryAwards && !showQuickAwards ? (
        <p className="mb-2 rounded-xl border border-dashed bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
          No reward categories yet. Add them under Points → Categories, or switch to Local rewards in Toolbar
          options.
        </p>
      ) : null}
      {showQuickAwards ? (
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
        {prefs.quickAwards.map((q) => {
          const isDefault =
            q.description === prefs.defaultDescription &&
            q.points === prefs.defaultPoints;
          return (
            <Button
              key={q.id}
              type="button"
              size="sm"
              variant={isDefault ? 'default' : 'secondary'}
              className={cn(
                'relative h-auto flex-col rounded-xl py-2 text-[10px] font-bold leading-tight sm:text-xs',
                isDefault && 'ring-2 ring-primary ring-offset-1',
              )}
              onClick={(e) => {
                e.stopPropagation();
                onPick(q.points, q.description);
              }}
            >
              {isDefault && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-2.5 w-2.5" aria-hidden />
                </span>
              )}
              <span>{q.label}</span>
              <span className={isDefault ? 'text-primary-foreground/80' : 'text-primary'}>
                +{q.points}
              </span>
            </Button>
          );
        })}
      </div>
      ) : null}
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
