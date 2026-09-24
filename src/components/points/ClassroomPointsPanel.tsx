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
  GripVertical,
  Loader2,
  Maximize2,
  Shuffle,
  Sparkles,
  Undo2,
  Redo2,
  Users,
  MousePointerClick,
  Layers,
} from 'lucide-react';
import { ClassroomGroupAwardModal } from '@/components/classroom/ClassroomGroupAwardModal';
import {
  buildClassroomFullscreenUrl,

  openClassroomFullscreenTab,
  type ClassroomFullscreenAudience,
} from '@/lib/classroomPointsUrl';
import { sanitizeSessionForStudentDisplay } from '@/lib/classroom/classroomStudentDisplay';
import { isClassroomOnlyMode, isPillarOn, CLASSROOM_LOCAL_REWARDS, CLASSROOM_SESSION_ONLY, isRewardsPillarOn } from '@/lib/productPillars';
import { BehaviorNoteDialog } from '@/components/classroom/BehaviorNoteDialog';
import { useTodayAttendanceRecords } from '@/hooks/useTodayAttendanceMap';
import {
  markAllSeatedPresent,
  nextAttendanceClickMark,
  resolveClassroomRollMark,
  classroomStudentIsHere,
  classroomStudentCanTakeHallPass,
  seatedStudentsIncludedInClassAwards,
} from '@/lib/classroom/classroomAttendanceRoll';
import { persistClassroomRollMark, attendanceRecordsSince } from '@/lib/attendance/classroomAttendancePersist';
import {
  assignClassroomGroups,
  parseClassroomGroups,
} from '@/lib/classroom/classroomGroups';
import { ClassroomAttendanceModeBanner } from '@/components/classroom/ClassroomAttendanceModeBanner';
import { ClassroomWholeClassAwardControl } from '@/components/classroom/ClassroomWholeClassAwardControl';
import { ClassroomAwardPicker } from '@/components/classroom/ClassroomAwardPicker';
import { ClassroomAwardGivenNotice } from '@/components/classroom/ClassroomAwardGivenNotice';
import { ClassroomTapBurstSwitch } from '@/components/classroom/ClassroomTapBurstSwitch';
import { ClassroomLiveRafflePanel } from '@/components/classroom/ClassroomLiveRafflePanel';
import { ClassroomLiveRaffleProjectorOverlay } from '@/components/classroom/ClassroomLiveRaffleProjectorOverlay';
import { ClassroomLiveCheatsheetDesk } from '@/components/classroom/ClassroomLiveCheatsheet';
import {
  loadClassroomLiveCheatsheetShown,
  saveClassroomLiveCheatsheetShown,
  subscribeClassroomLiveCheatsheet,
} from '@/lib/classroom/classroomLiveCheatsheet';
import { ClassroomLiveBehaviorPanel } from '@/components/classroom/ClassroomLiveBehaviorPanel';
import { ClassroomLiveHoverSidebar } from '@/components/classroom/ClassroomLiveHoverSidebar';
import {
  ClassroomLiveSetupSheet,
  type ClassroomLiveSetupTab,
} from '@/components/classroom/ClassroomLiveSetupSheet';
import { ClassroomBehaviorNoteTypePicker } from '@/components/classroom/ClassroomBehaviorNoteTypePicker';
import { normalizeClassroomAttendanceSource, isClassroomCardScanSource } from '@/lib/classroom/classroomAttendanceSource';
import { useActiveBathroomPasses } from '@/hooks/useActiveBathroomPasses';
import { useActiveRecessPasses } from '@/hooks/useActiveRecessPasses';
import { BathroomPassesBar } from '@/components/attendance/BathroomPassesBar';
import { startBathroomPass, endBathroomPass } from '@/lib/db/bathroom';
import { formatBathroomElapsed } from '@/lib/bathroom/formatBathroomElapsed';
import { resolveRecessMaxMinutes } from '@/lib/recess/recessKioskSettings';
import {
  classroomHallPassByStudent,
  mergeClassroomWhosOutPasses,
} from '@/lib/classroom/classroomWhosOutPasses';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useFunctions, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Goal } from '@/lib/types';
import { buildStudentGoalRatioMap } from '@/lib/goals/classroomGoalProgress';
import { resolveGoalsOptions } from '@/lib/goals/goalsOptions';
import { syncAndPresentGoalsForStudents } from '@/lib/goals/presentGoalEvents';
import { awardClassroomPoints } from '@/lib/classroom/classroomPointsClient';
import {
  DEFAULT_CLASSROOM_INTERACTION_MODE,
  type ClassroomInteractionMode,
} from '@/lib/classroom/classroomInteractionMode';
import {
  classroomPointSoundEffect,
  CLASSROOM_PICK_SOUND,
  CLASSROOM_TAP_SOUND,
  CLASSROOM_UNDO_SOUND,
} from '@/lib/classroom/classroomPointSounds';
import type { SoundEffect } from '@/hooks/useArcadeSound';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Button } from '@/components/ui/button';
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
import { Helper } from '@/components/ui/helper';
import { Input } from '@/components/ui/input';
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
  buildRoomShapeLayout,
  CLASSROOM_ROOM_SHAPES,
  type ClassroomRoomShape,
  clearClassroomSession,
  findNewSessionAwards,
  initialLayoutColumnCount,
  loadClassroomLayout,
  loadClassroomPrefs,
  loadClassroomSession,
  classroomSessionStorageKey,
  subscribeClassroomSessionUpdates,
  setClassroomSessionRandomPick,
  setClassroomSessionGroups,
  setClassroomSessionRollMarks,
  startClassroomSessionAttendance,
  changeClassroomGridSize,
  classroomLayoutsEqual,
  cloneClassroomLayout,
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


import { queueClassroomPrefsFirestoreSync } from '@/lib/db/classroomPrefsSync';
import { resolveEffectiveDeskDisplayPrefs } from '@/lib/classroom/classroomMonitorDisplaySettings';
import {
  isNoteDeductType,
  resolveClassroomNoteDeduct,
} from '@/lib/classroom/classroomNoteDeductSettings';
import { getClassroomNoteShortcut } from '@/lib/classroom/classroomNoteShortcuts';
import { classroomAwardDisplayLabel, type ClassroomAwardLabelContext } from '@/lib/classroom/classroomAwardLabel';
import { type ClassroomSeatingShortcutsHintState } from '@/components/points/classroomSeatingShortcutsHint';
import {
  remainingTeacherBudgetPoints,
  resolveTeacherBudgetPeriod,
  teacherBudgetRemainingPhrase,
  teacherWithBudgetAfterSpend,
} from '@/lib/teacherBudget';
import type { ClassroomLiveHeaderControls } from '@/components/classroom/ClassroomLiveTeachChrome';
import { ClassroomArrangeOverflowTray } from '@/components/classroom/ClassroomArrangeOverflowTray';
import { ClassroomArrangeToolbar } from '@/components/classroom/ClassroomArrangeToolbar';
import { ClassroomMonitorQuickControls } from '@/components/points/ClassroomMonitorQuickControls';
import {
  ClassroomMonitorActionButton,
  ClassroomTeacherDesk,
  ClassroomToolButton,
  classroomControlsBarClass,
  classroomChartSurfaceClass,
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
import { isClassroomRaffleSectionVisible } from '@/lib/classroom/classroomTabSections';
import { isClassroomTokenDesign } from '@/lib/classroom/classroomTokenTheme';
import {
  buildClassroomRandomPickSequence,
  classroomRandomPickStepDelayMs,
} from '@/lib/classroom/classroomRandomPick';
import {
  normalizeClassroomQuickAwards,
  resolveClassroomQuickTapDescription,
} from '@/lib/classroom/classroomQuickAwardsSettings';
import {
  buildClassroomDeskCatalog,
  classroomDeskCatalogSignature,
  type ClassroomDeskDisplay,
} from '@/lib/classroom/classroomDeskDisplay';
import { CLASSROOM_ALL_STUDENTS_FILTER_ID, CLASSROOM_ALL_STUDENTS_LABEL } from '@/lib/classroom/classroomTabSections';
import type { Category, Class, Student, Teacher } from '@/lib/types';
import { cn, getStudentNickname } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

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
  /** Teacher monitor (default) or read-only class screen without behavior notes. */
  audience?: ClassroomFullscreenAudience;
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
  /** Live teacher header — projector, reset, appearance, notes help. */
  onLiveHeaderChange?: (controls: ClassroomLiveHeaderControls | null) => void;
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
  audience = 'teacher',
  initialClassId,
  accentColor = 'hsl(var(--primary))',
  isGraphic = false,
  budgetOptions,
  sessionOnly: sessionOnlyProp,
  onBehaviorNoteSaved,
  onSectionHintChange,
  onClassIdChange,
  onLiveHeaderChange,
}: ClassroomPointsPanelProps) {
  const { icon, label } = useCurrency();
  const deferredStudents = useDeferredValue(students);
  const isFullscreen = variant === 'fullscreen';
  const isStudentAudience = isFullscreen && audience === 'student';
  const { toast } = useToast();
  const playSound = useArcadeSound({ ignoreSchoolSoundMute: true });
  const { settings, updateSettings } = useSettings();
  const firestore = useFirestore();
  const goalsOpts = resolveGoalsOptions(settings.goalsOptions);
  const goalsQuery = useMemoFirebase(
    () =>
      settings.enableGoals && goalsOpts.showOnClassroom && schoolId
        ? collection(firestore, 'schools', schoolId, 'goals')
        : null,
    [settings.enableGoals, goalsOpts.showOnClassroom, firestore, schoolId],
  );
  const { data: classroomGoals } = useCollection<Goal>(goalsQuery);
  const hasSchoolGoal = classroomGoals?.some((goal) => goal.type === 'school' && goal.status === 'active' && !goal.archived);
  const schoolGoalStudentsQuery = useMemoFirebase(
    () => hasSchoolGoal && schoolId ? collection(firestore, 'schools', schoolId, 'students') : null,
    [hasSchoolGoal, firestore, schoolId],
  );
  const { data: schoolGoalStudents } = useCollection<Student>(schoolGoalStudentsQuery);
  const goalRatioByStudentId = useMemo(() => {
    if (!settings.enableGoals || !goalsOpts.showOnClassroom || !classroomGoals?.length) return undefined;
    return buildStudentGoalRatioMap(classroomGoals, deferredStudents, categories || [], schoolGoalStudents ?? undefined);
  }, [
    settings.enableGoals,
    goalsOpts.showOnClassroom,
    classroomGoals,
    schoolGoalStudents,
    deferredStudents,
    categories,
  ]);
  const functions = useFunctions();
  const sessionOnly = sessionOnlyProp ?? isClassroomOnlyMode(settings);
  const rewardsPillarOn = isRewardsPillarOn(settings);
  const classroomNoteDeduct = useMemo(() => resolveClassroomNoteDeduct(settings), [settings]);

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
  const recessMaxMinutes = resolveRecessMaxMinutes(settings);
  const schoolTodayAttendanceRecords = useTodayAttendanceRecords(schoolId, attendanceEnabled);
  const [liveTool, setLiveTool] = useState<'raffle' | 'behavior' | 'setup' | null>(null);
  const [setupTab, setSetupTab] = useState<ClassroomLiveSetupTab>('setup');
  const [behaviorPickKey, setBehaviorPickKey] = useState<ClassroomNoteShortcutKey | null>(null);
  const [notePickerStudent, setNotePickerStudent] = useState<Student | null>(null);
  const [restartAttendanceOpen, setRestartAttendanceOpen] = useState(false);
  const activeBathroomPasses = useActiveBathroomPasses(schoolId, true);
  const activeRecessPasses = useActiveRecessPasses(schoolId, true);
  const operatorId = teacherDocId || storageScope;
  const operatorName = userName || storageScope;
  const [behaviorNoteStudent, setBehaviorNoteStudent] = useState<Student | null>(null);
  const [behaviorNotePoints, setBehaviorNotePoints] = useState<{ label?: string; amount?: number }>({});
  const [behaviorNoteShortcutKey, setBehaviorNoteShortcutKey] =
    useState<ClassroomNoteShortcutKey>('c');
  const [behaviorNoteSuppressHeldKey, setBehaviorNoteSuppressHeldKey] =
    useState<ClassroomNoteShortcutKey | null>(null);
  const heldNoteKeyRef = useRef<ClassroomNoteShortcutKey | null>(null);
  const heldAltRef = useRef(false);
  const [latePickArmed, setLatePickArmed] = useState(false);
  const [interactionMode, setInteractionMode] = useState<ClassroomInteractionMode>(
    DEFAULT_CLASSROOM_INTERACTION_MODE,
  );
  const attendanceBusyRef = useRef(false);
  const notesEnabled = true;
  const [classroomBalances, setClassroomBalances] = useState<Record<string, number>>({});

  const [filterClassId, setFilterClassId] = useState(() => {
    if (initialClassId === CLASSROOM_ALL_STUDENTS_FILTER_ID && isFullscreen) {
      return CLASSROOM_ALL_STUDENTS_FILTER_ID;
    }
    if (initialClassId && classes.some((c) => c.id === initialClassId)) {
      return initialClassId;
    }
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('defaultClassId');
      if (stored === CLASSROOM_ALL_STUDENTS_FILTER_ID && isFullscreen) {
        return CLASSROOM_ALL_STUDENTS_FILTER_ID;
      }
      if (
        stored &&
        stored !== CLASSROOM_ALL_STUDENTS_FILTER_ID &&
        classes.some((c) => c.id === stored)
      ) {
        return stored;
      }
    }
    return classes[0]?.id ?? CLASSROOM_ALL_STUDENTS_FILTER_ID;
  });

  useEffect(() => {
    if (initialClassId === CLASSROOM_ALL_STUDENTS_FILTER_ID && isFullscreen) {
      setFilterClassId((current) =>
        current === CLASSROOM_ALL_STUDENTS_FILTER_ID ? current : CLASSROOM_ALL_STUDENTS_FILTER_ID,
      );
      return;
    }
    if (!initialClassId || !classes.some((c) => c.id === initialClassId)) return;
    setFilterClassId((current) => (current === initialClassId ? current : initialClassId));
  }, [initialClassId, classes, isFullscreen]);
  const [layout, setLayout] = useState<ClassroomSeatingLayout | null>(null);
  const [prefs, setPrefs] = useState<ClassroomSeatingPrefs>(DEFAULT_CLASSROOM_PREFS);
  const sessionOnlyBalance =
    sessionOnlyProp !== undefined ? sessionOnlyProp : !rewardsPillarOn;
  const rewardsModeActive = !sessionOnlyBalance;
  const localAwardToast = sessionOnlyBalance
    ? CLASSROOM_SESSION_ONLY.toastDescription
    : CLASSROOM_LOCAL_REWARDS.toastDescription;
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
  const effectiveDeskDisplay = useMemo(
    () => resolveEffectiveDeskDisplayPrefs(settings, prefs),
    [settings, prefs],
  );
  const awardLabelContext = useMemo<ClassroomAwardLabelContext>(
    () => ({
      ...chartPrefsForAwards,
      quickTapDescription: chartPrefsForAwards.defaultDescription,
    }),
    [chartPrefsForAwards],
  );
  const behaviorNotesTipsOn = settings.classroomMonitorShowBehaviorNotesTips !== false;
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (isFullscreen || !onSectionHintChange) return;
    if (!behaviorNotesTipsOn) {
      onSectionHintChange(null);
      return () => onSectionHintChange(null);
    }
    onSectionHintChange({
      prefs,
      editMode,
      attendanceEnabled,
      bathroomEnabled: bathroomTimerOn,
      classroomNoteDeduct,
    });
    return () => onSectionHintChange(null);
  }, [
    attendanceEnabled,
    bathroomTimerOn,
    behaviorNotesTipsOn,
    classroomNoteDeduct,
    editMode,
    isFullscreen,
    onSectionHintChange,
    prefs,
  ]);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overflowDragId, setOverflowDragId] = useState<string | null>(null);
  const [layoutUndoStack, setLayoutUndoStack] = useState<ClassroomSeatingLayout[]>([]);
  const [layoutRedoStack, setLayoutRedoStack] = useState<ClassroomSeatingLayout[]>([]);
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
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  useEffect(() => {
    if (!attendanceEnabled && interactionMode === 'attendance') {
      setInteractionMode('award');
    }
  }, [attendanceEnabled, interactionMode]);

  useEffect(() => {
    if (interactionMode !== 'attendance') setLatePickArmed(false);
  }, [interactionMode]);

  useEffect(() => {
    if (interactionMode === 'award') return;
    setBurstMode(false);
    setBurstSelected([]);
    setPendingAward(null);
  }, [interactionMode]);
  const [sessionData, setSessionData] = useState<ClassroomSessionData>({ totals: {}, lastAward: {} });
  const sessionDataRef = useRef(sessionData);
  sessionDataRef.current = sessionData;
  const todayAttendanceRecords = useMemo(
    () => attendanceRecordsSince(schoolTodayAttendanceRecords, sessionData.attendanceSince),
    [schoolTodayAttendanceRecords, sessionData.attendanceSince],
  );
  const todayAttendance = useMemo(() => {
    const map = new Map<string, 'unknown' | 'absent' | 'on-time' | 'late'>();
    todayAttendanceRecords.forEach((record, studentId) => map.set(studentId, record.status));
    return map;
  }, [todayAttendanceRecords]);
  const attendanceSource = normalizeClassroomAttendanceSource(prefs.attendanceSource);
  const displayAttendance = useMemo(() => {
    const map = new Map(todayAttendance);
    Object.entries(sessionData.rollMarks ?? {}).forEach(([studentId, mark]) => {
      if (mark === 'present') map.set(studentId, 'on-time');
      else if (mark === 'late') map.set(studentId, 'late');
      else if (mark === 'absent') map.set(studentId, 'absent');
    });
    return map;
  }, [sessionData.rollMarks, todayAttendance]);
  const prevPresentIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!attendanceEnabled || isStudentAudience || interactionMode === 'attendance') return;
    const present = new Set<string>();
    displayAttendance.forEach((status, studentId) => {
      if (status === 'on-time' || status === 'late') present.add(studentId);
    });
    const prev = prevPresentIdsRef.current;
    let added = false;
    present.forEach((id) => {
      if (!prev.has(id)) added = true;
    });
    if (added && prev.size > 0) playClassroomSound(CLASSROOM_PICK_SOUND);
    prevPresentIdsRef.current = present;
  }, [attendanceEnabled, displayAttendance, interactionMode, isStudentAudience, playClassroomSound]);
  const [lastAwardSummary, setLastAwardSummary] = useState<{
    label: string;
    points: number;
    studentLabel: string;
  } | null>(null);
  const lastActionRef = useRef<LastClassroomAction | null>(null);
  const [lastAction, setLastActionState] = useState<LastClassroomAction | null>(null);
  const setLastAction = useCallback(
    (
      action:
        | LastClassroomAction
        | null
        | ((current: LastClassroomAction | null) => LastClassroomAction | null),
    ) => {
      if (typeof action === 'function') {
        setLastActionState((current) => {
          const next = action(current);
          lastActionRef.current = next;
          return next;
        });
        return;
      }
      lastActionRef.current = action;
      setLastActionState(action);
    },
    [],
  );
  const [redoAction, setRedoAction] = useState<LastClassroomAction | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const [randomHighlightId, setRandomHighlightId] = useState<string | null>(null);
  const [randomPickWinnerId, setRandomPickWinnerId] = useState<string | null>(null);
  const randomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const randomPickBusyRef = useRef(false);
  const { playEffectAtCell, activeCelebration } = useClassroomCelebrationEffect();
  const design = prefs.design;
  const [cheatsheetShown, setCheatsheetShown] = useState(false);

  useEffect(() => {
    setCheatsheetShown(loadClassroomLiveCheatsheetShown());
    return subscribeClassroomLiveCheatsheet((prefs) => setCheatsheetShown(prefs.showQuickSheet));
  }, []);

  const classNameById = useMemo(
    () => new Map(classes.map((c) => [c.id, c.name ?? ''])),
    [classes],
  );
  const viewingAllStudents = filterClassId === CLASSROOM_ALL_STUDENTS_FILTER_ID;

  const classStudents = useMemo(() => {
    if (!viewingAllStudents) {
      return deferredStudents.filter((s) => s.classId === filterClassId);
    }
    return deferredStudents.slice().sort((a, b) => {
      const classCmp = (classNameById.get(a.classId ?? '') ?? '').localeCompare(
        classNameById.get(b.classId ?? '') ?? '',
      );
      if (classCmp !== 0) return classCmp;
      const last = (a.lastName ?? '').localeCompare(b.lastName ?? '');
      if (last !== 0) return last;
      return (a.firstName ?? '').localeCompare(b.firstName ?? '');
    });
  }, [classNameById, deferredStudents, filterClassId, viewingAllStudents]);

  const bathroomEnabled = bathroomTimerOn && !editMode;
  const bathroomByStudent = useMemo(() => {
    const map = new Map<string, { startedAt: number }>();
    activeBathroomPasses.forEach((pass, studentId) => {
      if (pass.startedAt) map.set(studentId, { startedAt: pass.startedAt });
    });
    return map;
  }, [activeBathroomPasses]);
  const bathroomTick = activeBathroomPasses.size + activeRecessPasses.size;
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

  const hallPassByStudent = useMemo(
    () =>
      classroomHallPassByStudent(
        mergeClassroomWhosOutPasses({
          recess: activeRecessPasses,
          bathroom: activeBathroomPasses,
          nameFor: (studentId, fallbackName) => {
            const s = studentById.get(studentId);
            return s ? getStudentNickname(s) : fallbackName || 'Student';
          },
          recessMaxMinutes,
          bathroomMaxMinutes,
        }),
      ),
    [activeBathroomPasses, activeRecessPasses, bathroomMaxMinutes, recessMaxMinutes, studentById],
  );

  const effectiveClassId = filterClassId;
  const effectiveClassName = useMemo(() => {
    if (viewingAllStudents) return CLASSROOM_ALL_STUDENTS_LABEL;
    return effectiveClassId ? classes.find((c) => c.id === effectiveClassId)?.name : undefined;
  }, [classes, effectiveClassId, viewingAllStudents]);

  const classScreenUrl = useMemo(() => {
    if (!isFullscreen || isStudentAudience) return null;
    if (settings.classroomStudentDisplayEnabled === false) return null;
    if (viewingAllStudents) return null;
    return buildClassroomFullscreenUrl({
      schoolId,
      classId: effectiveClassId,
      scope: storageScope,
      audience: 'student',
    });
  }, [
    effectiveClassId,
    isFullscreen,
    isStudentAudience,
    schoolId,
    settings.classroomStudentDisplayEnabled,
    storageScope,
    viewingAllStudents,
  ]);

  const computedLayout = useMemo((): ClassroomSeatingLayout | null => {
    if (!effectiveClassId) return null;
    if (viewingAllStudents && !isFullscreen) return null;
    const ids = classStudents.map((s) => s.id);
    const saved = loadClassroomLayout(schoolId, storageScope, effectiveClassId);
    if (saved) {
      const allowed = new Set(ids);
      const cells = saved.cells.map((id) => (id && allowed.has(id) ? id : null));
      const placed = cells.some(Boolean);
      if (placed || ids.length === 0 || !viewingAllStudents) {
        return { ...saved, cells };
      }
    }
    return buildInitialLayout(
      ids,
      viewingAllStudents ? initialLayoutColumnCount(ids.length) : 5,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- roster layout only when class membership changes
  }, [schoolId, storageScope, effectiveClassId, classStudentIdsKey, viewingAllStudents, isFullscreen]);

  const activeLayout = layout ?? computedLayout;
  const activeLayoutRef = useRef(activeLayout);
  activeLayoutRef.current = activeLayout;

  const persistLayoutNow = useCallback(
    (next: ClassroomSeatingLayout | null) => {
      if (!next || !effectiveClassId) return;
      saveClassroomLayout(schoolId, storageScope, effectiveClassId, next);
      if (firestore && teacherDocId && teacherDocId === storageScope) {
        queueClassroomPrefsFirestoreSync(firestore, schoolId, teacherDocId, {
          layoutsByClass: { [effectiveClassId]: next },
        });
      }
    },
    [effectiveClassId, firestore, schoolId, storageScope, teacherDocId],
  );

  const commitLayout = useCallback((next: ClassroomSeatingLayout) => {
    const current = activeLayoutRef.current;
    if (!current || classroomLayoutsEqual(current, next)) return;
    setLayoutUndoStack((stack) => [...stack, cloneClassroomLayout(current)].slice(-40));
    setLayoutRedoStack([]);
    const cloned = cloneClassroomLayout(next);
    activeLayoutRef.current = cloned;
    setLayout(cloned);
    persistLayoutNow(cloned);
  }, [persistLayoutNow]);

  const undoLayout = useCallback(() => {
    const current = activeLayoutRef.current;
    if (!current) return;
    setLayoutUndoStack((stack) => {
      if (!stack.length) return stack;
      const previous = stack[stack.length - 1]!;
      setLayoutRedoStack((redo) => [...redo, cloneClassroomLayout(current)]);
      const cloned = cloneClassroomLayout(previous);
      activeLayoutRef.current = cloned;
      setLayout(cloned);
      return stack.slice(0, -1);
    });
  }, []);

  const redoLayout = useCallback(() => {
    const current = activeLayoutRef.current;
    if (!current) return;
    setLayoutRedoStack((stack) => {
      if (!stack.length) return stack;
      const next = stack[stack.length - 1]!;
      setLayoutUndoStack((undo) => [...undo, cloneClassroomLayout(current)]);
      const cloned = cloneClassroomLayout(next);
      activeLayoutRef.current = cloned;
      setLayout(cloned);
      return stack.slice(0, -1);
    });
  }, []);

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
      classId: viewingAllStudents ? undefined : effectiveClassId || undefined,
      className: viewingAllStudents ? undefined : classes.find((c) => c.id === effectiveClassId)?.name,
      teacherId: operatorId,
      teacherName: operatorName,
    }),
    [classes, effectiveClassId, operatorId, operatorName, viewingAllStudents],
  );

  const deskDisplayOptions = useMemo(
    () => ({
      showLastName: effectiveDeskDisplay.showLastName,
      showStudentPhotos: effectiveDeskDisplay.showStudentPhotos,
      showStudentEmoji: effectiveDeskDisplay.showStudentEmoji,
      defaultStudentTheme: settings.defaultStudentTheme,
      studentThemesEnabled: settings.enableStudentThemes !== false,
    }),
    [
      effectiveDeskDisplay.showLastName,
      effectiveDeskDisplay.showStudentPhotos,
      effectiveDeskDisplay.showStudentEmoji,
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
      sessionOnlyBalance,
      classroomBalances,
      deskCatalogRef.current,
      deskDisplayOptions,
    );
    deskCatalogRef.current = next;
    return next;
  }, [sessionOnlyBalance, classroomBalances, deferredStudents, filterClassId, deskDisplayOptions]);

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

  const layoutSourceKey = `${schoolId}:${storageScope}:${effectiveClassId}:${classStudentIdsKey}:${viewingAllStudents}:${isFullscreen}`;
  const layoutSourceKeyRef = useRef(layoutSourceKey);
  useEffect(() => {
    if (layoutSourceKeyRef.current === layoutSourceKey) return;
    layoutSourceKeyRef.current = layoutSourceKey;
    setLayout(computedLayout);
  }, [computedLayout, layoutSourceKey]);

  const layoutSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!activeLayout || !effectiveClassId) return;
    if (layoutSaveTimerRef.current) clearTimeout(layoutSaveTimerRef.current);
    layoutSaveTimerRef.current = setTimeout(() => {
      saveClassroomLayout(schoolId, storageScope, effectiveClassId, activeLayout);
      if (firestore && teacherDocId && teacherDocId === storageScope) {
        queueClassroomPrefsFirestoreSync(firestore, schoolId, teacherDocId, {
          layoutsByClass: { [effectiveClassId]: activeLayout },
        });
      }
      layoutSaveTimerRef.current = null;
    }, 450);
    return () => {
      if (layoutSaveTimerRef.current) clearTimeout(layoutSaveTimerRef.current);
    };
  }, [activeLayout, schoolId, storageScope, effectiveClassId, firestore, teacherDocId]);

  const reloadSessionData = useCallback(() => {
    if (!effectiveClassId) return;
    const loaded = loadClassroomSession(schoolId, storageScope, effectiveClassId);
    setSessionData(isStudentAudience ? sanitizeSessionForStudentDisplay(loaded) : loaded);
  }, [effectiveClassId, isStudentAudience, schoolId, storageScope]);

  const resetSessionDisplay = useCallback(() => {
    if (!effectiveClassId) return;
    const cleared = clearClassroomSession(schoolId, storageScope, effectiveClassId);
    setSessionData(isStudentAudience ? sanitizeSessionForStudentDisplay(cleared) : cleared);
    setLastAwardSummary(null);
    setFlyUpCell(null);
    setFlashCell(null);
    toast({
      title: 'Session display reset',
      description: 'On-screen session totals cleared. Student points are unchanged.',
    });
  }, [effectiveClassId, isStudentAudience, schoolId, storageScope, toast]);

  useEffect(() => {
    if (!effectiveClassId) return;
    reloadSessionData();
    setLastAwardSummary(null);
    setBurstSelected([]);
    setLastAction(null);
    setRedoAction(null);
  }, [effectiveClassId, reloadSessionData, setLastAction]);

  useEffect(() => {
    if (!isStudentAudience || !effectiveClassId) return;
    const sessionKey = classroomSessionStorageKey(schoolId, storageScope, effectiveClassId);
    const unsubscribe = subscribeClassroomSessionUpdates((key, data) => {
      if (key !== sessionKey) return;
      setSessionData(sanitizeSessionForStudentDisplay(data));
    });
    const pollId = window.setInterval(reloadSessionData, 3000);
    return () => {
      unsubscribe();
      window.clearInterval(pollId);
    };
  }, [effectiveClassId, isStudentAudience, reloadSessionData, schoolId, storageScope]);

  const placedStudentIds = useMemo(() => {
    if (!activeLayout) return [] as string[];
    return activeLayout.cells.filter((id): id is string => !!id);
  }, [activeLayout]);

  const presentSeatedIds = useMemo(
    () =>
      seatedStudentsIncludedInClassAwards(placedStudentIds, displayAttendance, {
        attendanceEnabled,
        treatUnsignedAsAbsent: isClassroomCardScanSource(attendanceSource),
      }),
    [attendanceEnabled, attendanceSource, displayAttendance, placedStudentIds],
  );

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

  const prevSessionLastAwardRef = useRef<ClassroomSessionData['lastAward']>({});
  const sessionEffectsSeededRef = useRef(false);

  useEffect(() => {
    prevSessionLastAwardRef.current = {};
    sessionEffectsSeededRef.current = false;
  }, [effectiveClassId]);

  useEffect(() => {
    if (!isStudentAudience || !activeLayout) return;

    if (!sessionEffectsSeededRef.current) {
      prevSessionLastAwardRef.current = sessionData.lastAward;
      sessionEffectsSeededRef.current = true;
      return;
    }

    const newAwards = findNewSessionAwards(prevSessionLastAwardRef.current, sessionData.lastAward);
    prevSessionLastAwardRef.current = sessionData.lastAward;
    if (newAwards.length === 0) return;

    newAwards.forEach((award, i) => {
      const cellIndex = activeLayout.cells.indexOf(award.studentId);
      if (cellIndex < 0) return;
      const student = studentById.get(award.studentId);
      const name = student ? getStudentNickname(student) : '';
      window.setTimeout(() => {
        triggerDeskAwardFeedback(cellIndex, award.points, name);
      }, i * 90);
    });
  }, [
    activeLayout,
    isStudentAudience,
    sessionData,
    studentById,
    triggerDeskAwardFeedback,
  ]);

  const recordSessionAwards = useCallback(
    (studentIds: string[], pointsDelta: number, description: string) => {
      if (!effectiveClassId) return;
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

  useEffect(() => {
    if (!lastAwardSummary) return;
    const timer = window.setTimeout(() => setLastAwardSummary(null), 5000);
    return () => window.clearTimeout(timer);
  }, [lastAwardSummary]);

  const applyPointsToStudents = useCallback(
    async (
      studentIds: string[],
      points: number,
      description: string,
      options?: { flashCellIndex?: number; silent?: boolean },
    ) => {
      if (
        studentIds.length === 0 ||
        (rewardsModeActive && studentIds.some((id) => awardingStudentIds.has(id)))
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

      if (!isDeduct && !skipBudget && settings.enableTeacherBudgets && !teacher) {
        toast({ variant: 'destructive', title: 'Teacher budget is loading', description: 'Please wait for your teacher account to load, then try again.' });
        return false;
      }

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
            title: 'Insufficient Budget',
            description: `You need ${totalCost} ${label.toLowerCase()} but only have ${remainingPts.toLocaleString()} remaining ${phrase}.`,
          });
          return false;
        }
      }

      const signedDelta = isDeduct ? -magnitude : magnitude;
      const rewardsMode = rewardsModeActive;
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
              title: 'Points awarded',
              description: oneStudent
                ? `You gave ${getStudentNickname(oneStudent)} +${magnitude} for ${awardLabel}`
                : `You gave +${magnitude} · ${awardLabel}`,
            });
          }
          if (settings.enableGoals && !isDeduct) {
            void syncAndPresentGoalsForStudents(firestore, schoolId, studentIds, {
              enabled: true,
              options: settings.goalsOptions,
              toast,
              playSound: () => playSound('success'),
            });
          }
          if (effectiveClassId) {
            startTransition(() => {
              recordSessionAwards(studentIds, magnitude, description);
              setRedoAction(null);
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
          if (effectiveClassId) {
            recordSessionAwards(studentIds, delta, description);
          }
        });
      };

      if (sessionOnlyBalance) {
        optimisticAction = {
          mode: isDeduct ? 'deduct' : 'award',
          studentIds: [...studentIds],
          points: magnitude,
          description,
          classroomOnly: true,
        };
        startTransition(() => {
          applySessionDelta(signedDelta);
          setRedoAction(null);
          setLastAction(optimisticAction);
        });
      } else {
        addAwardingStudents(studentIds);
      }

      const canTrackSession = Boolean(effectiveClassId);
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
              ? `${getStudentNickname(oneStudent)}: −${magnitude} ${icon}`
              : sessionOnlyBalance
                ? `−${magnitude} ${label}${magnitude === 1 ? '' : 's'}`
                : `−${magnitude} from ${count} student(s)`
            : 'Points awarded',
          description: isDeduct
            ? sessionOnlyBalance
              ? localAwardToast
              : count > 1
                ? `${count} students · -${magnitude} ${icon} each`
                : `-${magnitude} ${icon}`
            : oneStudent
              ? `You gave ${getStudentNickname(oneStudent)} +${magnitude} for ${awardLabel}`
              : count > 1
                ? `You gave ${count} students +${magnitude} ${icon} each · ${awardLabel}`
                : `You gave +${magnitude} · ${awardLabel}`,
        });
      };

      if (sessionOnlyBalance) {
        playClassroomSound(classroomPointSoundEffect(points, isDeduct));
        showAwardToast();
      } else if (rewardsMode) {
        applyOptimisticSession();
        playClassroomSound(classroomPointSoundEffect(points, isDeduct));
        showAwardToast();
        setRedoAction(null);
        setLastAction({
          mode: isDeduct ? 'deduct' : 'award',
          studentIds: [...studentIds],
          points: magnitude,
          description,
          classroomOnly: false,
        });
      }

      try {
        const result = await awardClassroomPoints(firestore, {
          schoolId,
          studentIds,
          signedDelta,
          description,
          rewardsMode,
          ...classroomMeta,
        });

        if (!result.success) {
          if (sessionOnlyBalance && optimisticAction) {
            applySessionDelta(-signedDelta);
            setLastAction((current) => (current === optimisticAction ? null : current));
          }
          rollbackOptimisticSession();
          playClassroomSound('error');
          toast({
            variant: 'destructive',
            title: sessionOnlyBalance ? 'Could not save classroom points' : isDeduct ? 'Could not deduct points' : 'Could not award points',
            description: result.message,
          });
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
          if (budgetSpent) {
            startTransition(() => {
              setLastAction((current) =>
                current &&
                current.description === description &&
                current.points === magnitude &&
                current.studentIds.join(',') === studentIds.join(',')
                  ? { ...current, budgetSpent }
                  : current,
              );
            });
          }
        }

        // Points just landed: check goals so they finish, pay bonuses, and cheer right away.
        if (rewardsMode && !isDeduct && result.count > 0 && settings.enableGoals) {
          void syncAndPresentGoalsForStudents(firestore, schoolId, studentIds, {
            enabled: true,
            options: settings.goalsOptions,
            toast,
            playSound: () => playSound('success'),
          });
        }

        return true;
      } finally {
        if (rewardsMode) removeAwardingStudents(studentIds);
      }
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
      playSound,
      toast,
      schoolId,
      effectiveClassId,
      sessionOnlyBalance,
      rewardsModeActive,
      localAwardToast,
      firestore,
      classroomMeta,
      triggerDeskAwardFeedback,
      triggerFeedbackForStudentIds,
      recordSessionAwards,
      setLastAction,
      studentById,
      deferredStudents,
      label,
      icon,
      settings.enableGoals,
      settings.goalsOptions,
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
    clearAutoTimer();
  }, [pendingAward, clearAutoTimer]);

  const saveRollMarks = useCallback(
    (nextMarks: Record<string, 'present' | 'absent' | 'late'>) => {
      if (!effectiveClassId) return;
      const next = setClassroomSessionRollMarks(schoolId, storageScope, effectiveClassId, nextMarks);
      setSessionData(next);
    },
    [effectiveClassId, schoolId, storageScope],
  );

  const applyRollMark = useCallback(
    async (studentId: string, mark: 'present' | 'absent' | 'late') => {
      if (!attendanceEnabled) return;
      const student = studentById.get(studentId);
      if (!student || attendanceBusyRef.current) return;
      attendanceBusyRef.current = true;
      playClassroomSound(CLASSROOM_TAP_SOUND);
      const existingLogId = todayAttendanceRecords.get(studentId)?.logId;
      try {
        const saved = await persistClassroomRollMark({
          functions,
          firestore,
          schoolId,
          student,
          mark,
          existingLogId,
        });
        if (!saved.ok) {
          toast({ variant: 'destructive', title: 'Could not save that mark', description: saved.message });
          return;
        }
        const nextMarks = { ...(sessionDataRef.current.rollMarks ?? {}), [studentId]: mark };
        saveRollMarks(nextMarks);
      } finally {
        attendanceBusyRef.current = false;
      }
    },
    [
      attendanceEnabled,
      firestore,
      functions,
      playClassroomSound,
      saveRollMarks,
      schoolId,
      studentById,
      toast,
      todayAttendanceRecords,
    ],
  );

  const handleAttendanceTap = useCallback(
    async (studentId: string) => {
      if (latePickArmed) {
        setLatePickArmed(false);
        await applyRollMark(studentId, 'late');
        return;
      }
      const current = resolveClassroomRollMark(displayAttendance.get(studentId));
      await applyRollMark(studentId, nextAttendanceClickMark(current) === 'absent' ? 'absent' : 'present');
    },
    [applyRollMark, displayAttendance, latePickArmed],
  );

  const handleAttendanceOverride = useCallback(
    (studentId: string, mark: 'present' | 'late') => {
      void applyRollMark(studentId, mark);
    },
    [applyRollMark],
  );

  const handleMarkAllPresent = useCallback(() => {
    const seated =
      placedStudentIds.length > 0 ? placedStudentIds : classStudents.map((student) => student.id);
    const nextMarks = markAllSeatedPresent(seated, sessionDataRef.current.rollMarks);
    setLatePickArmed(false);
    playClassroomSound(CLASSROOM_TAP_SOUND);
    saveRollMarks(nextMarks);
  }, [classStudents, placedStudentIds, playClassroomSound, saveRollMarks]);

  const handleStartNewClass = useCallback(() => {
    if (!effectiveClassId) return;
    setLatePickArmed(false);
    // Check-ins stay saved for the school; this class screen just starts counting from now.
    const next = startClassroomSessionAttendance(schoolId, storageScope, effectiveClassId, Date.now());
    setSessionData(next);
    setRestartAttendanceOpen(false);
    toast({
      title: 'Ready for a new class',
      description: 'Every desk is waiting again.',
    });
  }, [effectiveClassId, schoolId, storageScope, toast]);

  const handleDeskTap = (studentId: string, cellIndex: number) => {
    if (editMode) return;

    if (behaviorPickKey) {
      const s = studentById.get(studentId);
      if (!s) return;
      setPendingAward(null);
      clearAutoTimer();
      openBehaviorNote(s, { shortcutKey: behaviorPickKey });
      return;
    }

    if (interactionMode === 'attendance') {
      void handleAttendanceTap(studentId);
      return;
    }

    playClassroomSound(CLASSROOM_TAP_SOUND);
    if (prefs.instantTap) {
      void runAward(studentId, prefs.defaultPoints, prefs.defaultDescription, cellIndex);
      return;
    }
    setPendingAward({ studentId, cellIndex, startedAt: Date.now() });
  };

  const handleDeskMenu = (studentId: string, cellIndex: number) => {
    if (editMode || isStudentAudience) return;
    if (interactionMode === 'attendance') return;
    if (behaviorPickKey) {
      handleDeskTap(studentId, cellIndex);
      return;
    }
    playClassroomSound(CLASSROOM_TAP_SOUND);
    setPendingAward({ studentId, cellIndex, startedAt: Date.now() });
  };

  const pickRandomStudent = useCallback(() => {
    if (randomPickBusyRef.current) return;
    const pick = buildClassroomRandomPickSequence(presentSeatedIds);
    if (!pick) {
      toast({
        title: 'Nobody here to pick',
        description: 'Kids marked absent are left out of random pick.',
      });
      return;
    }
    randomPickBusyRef.current = true;
    if (randomTimerRef.current) clearTimeout(randomTimerRef.current);
    setRandomPickWinnerId(null);

    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const steps = reduceMotion ? [pick.winner] : pick.steps;
    let step = 0;

    const publishPick = (studentId: string | null, winnerId: string | null, label?: string) => {
      if (!effectiveClassId || isStudentAudience) return;
      const next = setClassroomSessionRandomPick(
        schoolId,
        storageScope,
        effectiveClassId,
        studentId || winnerId ? { studentId, winnerId, label, at: Date.now() } : null,
      );
      setSessionData(next);
    };

    const land = () => {
      setRandomHighlightId(pick.winner);
      setRandomPickWinnerId(pick.winner);
      playClassroomSound(CLASSROOM_PICK_SOUND);
      const student = studentById.get(pick.winner);
      const label = student ? getStudentNickname(student) : 'Student';
      publishPick(pick.winner, pick.winner, label);
      toast({
        title: 'Random pick',
        description: label,
      });
      randomTimerRef.current = setTimeout(() => {
        setRandomHighlightId(null);
        setRandomPickWinnerId(null);
        publishPick(null, null);
        randomPickBusyRef.current = false;
      }, 4500);
    };

    const tick = () => {
      const id = steps[step];
      if (id) {
        setRandomHighlightId(id);
        publishPick(id, null);
      }
      step += 1;
      if (step >= steps.length) {
        land();
        return;
      }
      playClassroomSound(CLASSROOM_TAP_SOUND);
      randomTimerRef.current = setTimeout(tick, classroomRandomPickStepDelayMs(step, steps.length));
    };

    tick();
  }, [
    effectiveClassId,
    isStudentAudience,
    presentSeatedIds,
    playClassroomSound,
    schoolId,
    storageScope,
    studentById,
    toast,
  ]);

  useEffect(() => {
    return () => {
      if (randomTimerRef.current) clearTimeout(randomTimerRef.current);
    };
  }, []);

  const awardWholeClass = useCallback(() => {
    if (!presentSeatedIds.length) {
      toast({
        title: 'Nobody here for points',
        description: 'Kids marked absent are left out of Give everyone.',
      });
      return;
    }
    const points = Math.max(1, prefs.classAwardPoints ?? prefs.defaultPoints);
    if (
      presentSeatedIds.length > 8 &&
      typeof window !== 'undefined' &&
      !window.confirm(
        `Give +${points} points to all ${presentSeatedIds.length} students here?`,
      )
    ) {
      return;
    }
    void applyPointsToStudents(
      presentSeatedIds,
      points,
      `Classroom — ${prefs.defaultDescription}`,
    );
  }, [presentSeatedIds, prefs.classAwardPoints, prefs.defaultPoints, prefs.defaultDescription, applyPointsToStudents, toast]);

  const awardBurstSelection = useCallback(async () => {
    const ids = presentSeatedIds.filter((id) => burstSelected.includes(id));
    if (!ids.length) return;
    const ok = await applyPointsToStudents(
      ids,
      prefs.defaultPoints,
      `Classroom burst — ${prefs.defaultDescription}`,
    );
    if (ok) setBurstSelected([]);
  }, [burstSelected, presentSeatedIds, prefs.defaultPoints, prefs.defaultDescription, applyPointsToStudents]);

  const handleAwardGroup = useCallback(
    async (studentIds: string[], groupName: string, points: number) => {
      if (!studentIds.length) return;
      playClassroomSound(CLASSROOM_TAP_SOUND);
      const desc = `${groupName} — ${prefs.defaultDescription}`;
      await applyPointsToStudents(studentIds, points, desc);
      triggerFeedbackForStudentIds(studentIds, points);
    },
    [applyPointsToStudents, playClassroomSound, prefs.defaultDescription, triggerFeedbackForStudentIds],
  );

  const applyRoomShape = useCallback(
    (shape: ClassroomRoomShape) => {
      const ids = classStudents.map((s) => s.id);
      if (!ids.length) {
        toast({
          variant: 'destructive',
          title: 'No students in class',
          description: 'Add students to the class before arranging the room shape.',
        });
        return;
      }
      const nextLayout = buildRoomShapeLayout(shape, ids);
      commitLayout(nextLayout);
      const meta = CLASSROOM_ROOM_SHAPES.find((s) => s.id === shape);
      toast({
        title: `${meta?.emoji ?? '📐'} Room shape arranged`,
        description: `Arranged into ${meta?.label.toLowerCase() ?? shape}. You can still drag desks around.`,
      });
    },
    [classStudents, commitLayout, toast],
  );

  const handleUndo = useCallback(async () => {
    if (!lastAction || isUndoing) return;
    setIsUndoing(true);
    const actionToUndo = lastAction;
    const undoLabel = `Undo: ${actionToUndo.description}`;
    const teacher = budgetOptions?.currentTeacher ?? null;
    const skipBudget = !budgetOptions || budgetOptions.isAdmin;
    try {
      const undoRewardsMode = !(sessionOnlyBalance || actionToUndo.classroomOnly);
      const signedDelta = actionToUndo.mode === 'award' ? -actionToUndo.points : actionToUndo.points;
      const result = await awardClassroomPoints(firestore, {
        schoolId,
        studentIds: actionToUndo.studentIds,
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
      if (sessionOnlyBalance || actionToUndo.classroomOnly) {
        setClassroomBalances((prev) => {
          const next = { ...prev };
          for (const id of actionToUndo.studentIds) {
            next[id] = Math.max(0, (prev[id] ?? 0) + signedDelta);
          }
          return next;
        });
      } else if (
        actionToUndo.mode === 'award' &&
        !skipBudget &&
        settings.enableTeacherBudgets &&
        teacher &&
        actionToUndo.budgetSpent &&
        budgetOptions?.onBudgetSpend
      ) {
        await budgetOptions.onBudgetSpend(-actionToUndo.budgetSpent);
      }
      if (effectiveClassId) {
        recordSessionAwards(actionToUndo.studentIds, signedDelta, undoLabel);
      }
      playClassroomSound(CLASSROOM_UNDO_SOUND);
      toast({
        title: 'Undone',
        description: `Reversed last action for ${actionToUndo.studentIds.length} student(s).`,
      });
      setRedoAction(actionToUndo);
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
    sessionOnlyBalance,
    firestore,
    classroomMeta,
    recordSessionAwards,
    setLastAction,
  ]);

  const handleRedo = useCallback(async () => {
    if (!redoAction || isUndoing) return;
    setIsUndoing(true);
    const actionToRedo = redoAction;
    try {
      const signedPoints = actionToRedo.mode === 'deduct' ? -actionToRedo.points : actionToRedo.points;
      const ok = await applyPointsToStudents(actionToRedo.studentIds, signedPoints, actionToRedo.description);
      if (ok) {
        setLastAction(actionToRedo);
        setRedoAction(null);
        toast({
          title: 'Redone',
          description: `Restored last action for ${actionToRedo.studentIds.length} student(s).`,
        });
      }
    } finally {
      setIsUndoing(false);
    }
  }, [redoAction, isUndoing, applyPointsToStudents, toast, setLastAction]);


  useEffect(() => {
    if (editMode || isStudentAudience) return;
    const isTypingTarget = (target: EventTarget | null) =>
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable);

    const onAltDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === 'Alt' || e.key === 'AltGraph') heldAltRef.current = true;
    };

    const onAltUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' || e.key === 'AltGraph') heldAltRef.current = false;
    };

    const clearHeldAlt = () => {
      heldAltRef.current = false;
    };

    window.addEventListener('keydown', onAltDown, true);
    window.addEventListener('keyup', onAltUp, true);
    window.addEventListener('blur', clearHeldAlt);
    return () => {
      window.removeEventListener('keydown', onAltDown, true);
      window.removeEventListener('keyup', onAltUp, true);
      window.removeEventListener('blur', clearHeldAlt);
    };
  }, [editMode, isStudentAudience]);

  useEffect(() => {
    if (editMode || isStudentAudience) return;
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
  }, [editMode, isStudentAudience]);

  useEffect(() => {
    if (editMode || pendingAward || isStudentAudience) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.target instanceof HTMLSelectElement) return;
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey || e.shiftKey;
      if (heldNoteKeyRef.current) return;
      if (
        (isFullscreen || prefsRef.current.showRandomPicker) &&
        (e.key === 'r' || e.key === 'R') &&
        !hasModifier
      ) {
        e.preventDefault();
        pickRandomStudent();
      } else if (e.key === 'u' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        void handleRedo();
      } else if (e.key === 'u' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void handleUndo();
      } else if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void handleRedo();
      } else if (e.key === 'Escape') {
        setPendingAward(null);
        clearAutoTimer();
        setBurstSelected([]);
        setBehaviorPickKey(null);
        setLiveTool(null);
        setNotePickerStudent(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editMode, pendingAward, pickRandomStudent, handleUndo, handleRedo, clearAutoTimer, isFullscreen, isStudentAudience]);

  const handleDragStart = (index: number) => {
    if (!editMode) return;
    setOverflowDragId(null);
    setDragIndex(index);
  };

  const handleDrop = (targetIndex: number) => {
    if (!editMode || !activeLayout) return;
    if (overflowDragId) {
      placeStudentOnDesk(overflowDragId, targetIndex);
      setOverflowDragId(null);
      setDragIndex(null);
      return;
    }
    if (dragIndex === null) return;
    if (dragIndex !== targetIndex) {
      commitLayout(swapCells(activeLayout, dragIndex, targetIndex));
    }
    setDragIndex(null);
  };

  const bathroomRequirePresent = settings.bathroomRequirePresent;
  const bathroomMaxStudentsOut = settings.bathroomMaxStudentsOut ?? 2;

  const handleBathroomToggle = useCallback(
    async (studentId: string) => {
      if (!bathroomEnabled) return;
      const student = studentById.get(studentId);
      if (!student) return;

      const isOut = activeBathroomPasses.has(studentId);
      if (!isOut && bathroomRequirePresent !== false) {
        if (!classroomStudentCanTakeHallPass(displayAttendance.get(studentId))) {
          toast({
            variant: 'destructive',
            title: 'Not signed in',
            description: 'This student still has a red dot. Mark them present or late first.',
          });
          return;
        }
      }

      if (!isOut) {
        if (bathroomMaxStudentsOut > 0 && activeBathroomPasses.size >= bathroomMaxStudentsOut) {
          toast({
            variant: 'destructive',
            title: 'Room pass limit reached',
            description: `Maximum ${bathroomMaxStudentsOut} student${bathroomMaxStudentsOut === 1 ? '' : 's'} can be out at once. Please wait for someone to return.`,
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
            classId: viewingAllStudents ? student.classId : effectiveClassId || student.classId,
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
      bathroomMaxStudentsOut,
      bathroomRequirePresent,
      effectiveClassId,
      viewingAllStudents,
      firestore,
      operatorId,
      operatorName,
      schoolId,
      studentById,
      displayAttendance,
      toast,
    ],
  );

  gridHandlersRef.current = {
    onDeskTap: handleDeskTap,
    onDeduct: undefined,
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
      setNotePickerStudent(s);
    },
    getNoteKeyHeld: () => heldNoteKeyRef.current,
    getBathroomAltHeld: () => heldAltRef.current,
    onBathroomToggle: bathroomEnabled ? handleBathroomToggle : undefined,
    onAttendanceOverride: attendanceEnabled && !isStudentAudience ? handleAttendanceOverride : undefined,
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
    commitLayout({ ...activeLayout, cells });
  };

  const applyGridSize = (rows: number, cols: number) => {
    if (!activeLayout) return;
    const result = changeClassroomGridSize(
      activeLayout,
      rows,
      cols,
      unassignedStudents.map((student) => student.id),
    );
    commitLayout(result.layout);
    if (result.displacedIds.length > 0 && result.overflowIds.length > 0) {
      toast({
        variant: 'destructive',
        title: 'This room is too small for everyone',
        description: 'Those students are waiting on the side. Add a row or column to give them a seat.',
      });
    }
  };

  const placeOverflowStudent = (studentId: string) => {
    if (!activeLayout) return;
    const emptyIndex = activeLayout.cells.findIndex((id) => !id);
    if (emptyIndex >= 0) {
      placeStudentOnDesk(studentId, emptyIndex);
      return;
    }
    toast({
      variant: 'destructive',
      title: 'This room is too small for everyone',
      description: 'Add a row or column first, then give them a seat.',
    });
  };

  const seatEveryone = () => {
    const ids = classStudents.map((s) => s.id);
    if (!ids.length) {
      toast({
        title: 'No students in this class',
        description: 'Add students first, then tap Seat everyone.',
      });
      return;
    }
    commitLayout(
      buildInitialLayout(
        ids,
        viewingAllStudents ? initialLayoutColumnCount(ids.length) : 5,
      ),
    );
    setPendingAward(null);
    clearAutoTimer();
    toast({
      title: 'Everyone is seated',
      description: 'Every student in this class is back on a desk.',
    });
  };

  const resetLayout = () => {
    if (typeof window !== 'undefined') {
      const className = effectiveClassName?.trim();
      const prompt = className
        ? `Reset the seating layout for ${className}? Desk positions will be rebuilt and any custom arrangement will be lost.`
        : 'Reset the seating layout? Desk positions will be rebuilt and any custom arrangement will be lost.';
      if (!window.confirm(prompt)) return;
    }
    seatEveryone();
  };

  const updatePrefs = useCallback((next: ClassroomSeatingPrefs) => {
    const normalized = {
      ...next,
      prefsVersion: CLASSROOM_PREFS_VERSION,
    };
    setPrefs(normalized);
    saveClassroomPrefs(schoolId, storageScope, normalized);
    if (firestore && teacherDocId && teacherDocId === storageScope) {
      queueClassroomPrefsFirestoreSync(firestore, schoolId, teacherDocId, {
        seatingPrefsByScope: { [storageScope]: normalized },
      });
    }
  }, [schoolId, storageScope, firestore, teacherDocId]);

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
        classAwardPoints:
          patch.classAwardPoints !== undefined
            ? Math.max(1, Math.min(99, patch.classAwardPoints))
            : prefs.classAwardPoints,
        correctionPoints:
          patch.correctionPoints !== undefined
            ? Math.max(0, patch.correctionPoints)
            : prefs.correctionPoints,
      });
    },
    [prefs, updatePrefs],
  );

  useEffect(() => {
    if (!onLiveHeaderChange || !isFullscreen || isStudentAudience) {
      onLiveHeaderChange?.(null);
      return;
    }
    const presentCount = classStudents.reduce((count, student) => {
      return classroomStudentIsHere(displayAttendance.get(student.id)) ? count + 1 : count;
    }, 0);
    onLiveHeaderChange({
      classScreenUrl,
      onResetSessionDisplay: resetSessionDisplay,
      appearance: {
        prefs,
        rewardsPillarOn,
        onChange: patchPrefs,
      },
      shortcutHint: {
        prefs,
        editMode,
        attendanceEnabled,
        bathroomEnabled: bathroomTimerOn,
        classroomNoteDeduct,
      },
      attendance: {
        present: presentCount,
        total: classStudents.length,
        enabled: attendanceEnabled,
        active: interactionMode === 'attendance',
        source: attendanceSource,
        onOpen: () => setInteractionMode('attendance'),
        onManualRollCall: () => {
          patchPrefs({ attendanceSource: 'manual' });
          setInteractionMode('attendance');
        },
      },
      arranging: editMode,
    });
    return () => onLiveHeaderChange(null);
  }, [
    attendanceEnabled,
    bathroomTimerOn,
    classStudents,
    classScreenUrl,
    classroomNoteDeduct,
    editMode,
    interactionMode,
    isFullscreen,
    isStudentAudience,
    onLiveHeaderChange,
    patchPrefs,
    prefs,
    resetSessionDisplay,
    rewardsPillarOn,
    todayAttendance,
    displayAttendance,
    attendanceSource,
  ]);

  const toggleEditMode = useCallback(() => {
    setEditMode((v) => {
      if (v) persistLayoutNow(activeLayoutRef.current);
      return !v;
    });
    setLayoutUndoStack([]);
    setLayoutRedoStack([]);
    setBurstMode(false);
    setBurstSelected([]);
    setPendingAward(null);
    clearAutoTimer();
  }, [clearAutoTimer, persistLayoutNow]);

  if (classes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Add a class and students to use the classroom view.</p>
    );
  }

  if ((!effectiveClassId || viewingAllStudents) && !isFullscreen) {
    return (
      <div className="space-y-4">
        <Helper content="Pick one class so the seating chart matches your room. Layout is saved per class on this device.">
          <p className="text-sm font-medium text-foreground">Choose a class for your seating chart</p>
        </Helper>
        <Select
          value={viewingAllStudents ? '' : filterClassId}
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
    seatEveryone();
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


  const showLiveClassTools = isFullscreen || prefs.showClassAwardButton;
  const showAwardModeSwitch = isFullscreen;
  const monitorLiveAwardActions =
    !editMode &&
    !isStudentAudience &&
    (showLiveClassTools || showAwardModeSwitch) ? (
      <div className="flex w-full min-w-0 shrink-0 flex-col items-stretch gap-1.5">
        {showLiveClassTools ? (
          <ClassroomWholeClassAwardControl
            design={design}
            points={prefs.classAwardPoints ?? prefs.defaultPoints}
            onPointsChange={(points) => patchPrefs({ classAwardPoints: points })}
            onAward={awardWholeClass}
            disabled={!presentSeatedIds.length}
          />
        ) : null}
        {showAwardModeSwitch ? (
          <ClassroomTapBurstSwitch
            design={design}
            mode={prefs.instantTap ? 'one-tap' : 'show-menu'}
            defaultPoints={prefs.defaultPoints}
            onChange={(mode) => {
              playClassroomSound(CLASSROOM_TAP_SOUND);
              setInteractionMode('award');
              patchPrefs({ instantTap: mode === 'one-tap' });
              setBurstMode(false);
              setBurstSelected([]);
              setPendingAward(null);
              clearAutoTimer();
            }}
          />
        ) : null}
      </div>
    ) : null;

  const monitorAwardActions =
    !editMode &&
    !isStudentAudience &&
    (prefs.showRandomPicker || monitorLiveAwardActions) ? (
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">

        {prefs.showRandomPicker ? (
          <ClassroomMonitorActionButton
            design={design}
            isFullscreen={isFullscreen}
            iconOnly={!isFullscreen}
            tone="random"
            icon={Shuffle}
            label="Random"
            title="Random student (R)"
            onClick={pickRandomStudent}
          />
        ) : null}
        <ClassroomMonitorActionButton
          design={design}
          isFullscreen={isFullscreen}
          iconOnly={!isFullscreen}
          tone="group"
          icon={Layers}
          label="Table / Group"
          title="Reward a Table or Row of students"
          onClick={() => {
            playClassroomSound(CLASSROOM_TAP_SOUND);
            setGroupModalOpen(true);
          }}
          disabled={!placedStudentIds.length}
        />
        {monitorLiveAwardActions}
      </div>
    ) : null;

  const teacherDesk = (
    <ClassroomTeacherDesk
      design={design}
      frontAtBottom={frontAtBottom}
      showFrontHint={!isStudentAudience}
      trailingAction={
        !isStudentAudience && !editMode ? (
          <ClassroomLiveCheatsheetDesk
            open={cheatsheetShown}
            tapPoints={prefs.defaultPoints ?? 5}
            instantTap={prefs.instantTap}
            onHide={() => {
              saveClassroomLiveCheatsheetShown(false);
              setCheatsheetShown(false);
            }}
          />
        ) : null
      }
    />
  );

  const openFullscreen = () => {
    if (!effectiveClassId || viewingAllStudents) {
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

  const pendingStudentStatus = pendingStudent && attendanceEnabled ? (todayAttendance.get(pendingStudent.id) ?? 'absent') : undefined;

  const awardMenu =
    pendingAward && pendingStudent ? (
      <ClassroomAwardPicker
        student={pendingStudent}
        prefs={chartPrefsForAwards}
        onPick={(points, description) => {
          playClassroomSound(CLASSROOM_TAP_SOUND);
          void confirmPendingAward(points, description);
        }}
        onBehaviorNote={() => {
          openBehaviorNote(pendingStudent);
          setPendingAward(null);
          clearAutoTimer();
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
        'classroom-native-colors classroom-readable',
        design !== 'midnight' && 'text-foreground',
        classroomDesignShellClass(design, isFullscreen),
        isFullscreen && 'h-full min-h-0 w-full gap-0 p-0',
        !isFullscreen && 'flex min-h-[min(62vh,600px)] flex-1 flex-col',
      )}
    >
      {isStudentAudience && effectiveClassName ? (
        <div className="shrink-0 px-3 py-2 text-center">
          <p className="classroom-readable text-base font-bold tracking-normal text-foreground">
            {effectiveClassName}
          </p>
        </div>
      ) : null}
      {!isStudentAudience && !isFullscreen && !editMode ? (
        <div
          className="flex w-full min-w-0 shrink-0 items-start gap-2 border-b border-border/50 pb-3 sm:items-center"
        >
          <div
            className={cn(
              classroomControlsBarClass(design),
              'mb-0 min-w-0 flex-1 items-start sm:items-center',
            )}
          >
            <div className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">
              <ClassroomToolButton
                design={design}
                icon={Undo2}
                label="Undo"
                title={lastAction ? 'Undo last award (Ctrl+U)' : 'Nothing to undo yet'}
                deskRow
                iconOnly
                onClick={() => void handleUndo()}
                disabled={!lastAction || isUndoing}
              />
              <ClassroomToolButton
                design={design}
                icon={Redo2}
                label="Redo"
                title={redoAction ? 'Redo (Ctrl+Y)' : 'Nothing to redo yet'}
                deskRow
                iconOnly
                onClick={() => void handleRedo()}
                disabled={!redoAction || isUndoing}
              />
              <ClassroomToolButton
                design={design}
                icon={GripVertical}
                label="Arrange seats"
                onClick={toggleEditMode}
              />
              <ClassroomToolButton
                design={design}
                icon={Maximize2}
                label="Full screen"
                onClick={openFullscreen}
              />
            </div>
          </div>

          {monitorAwardActions ? (
            <>
              <span className="hidden h-7 w-px shrink-0 bg-border/70 sm:inline" aria-hidden />
              {monitorAwardActions}
            </>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col',
          isFullscreen ? 'w-full' : 'pt-3',
        )}
      >
        {interactionMode === 'attendance' && !isStudentAudience && !editMode ? (
          <ClassroomAttendanceModeBanner
            onMarkAllPresent={() => handleMarkAllPresent()}
            onDone={() => setInteractionMode('award')}
            onStartNewClass={() => setRestartAttendanceOpen(true)}
            busy={attendanceBusyRef.current}
          />
        ) : null}
        {editMode && !isStudentAudience ? (
          <ClassroomArrangeToolbar
            design={design}
            frontAtBottom={prefs.frontAtBottom}
            rows={activeLayout.rows}
            cols={activeLayout.cols}
            canUndo={layoutUndoStack.length > 0}
            canRedo={layoutRedoStack.length > 0}
            onFrontChange={(next) => patchPrefs({ frontAtBottom: next })}
            onUndo={undoLayout}
            onRedo={redoLayout}
            onRowsChange={(rows) => applyGridSize(rows, activeLayout.cols)}
            onColsChange={(cols) => applyGridSize(activeLayout.rows, cols)}
            onApplyRoomShape={applyRoomShape}
            onSeatEveryone={seatEveryone}
            onDone={toggleEditMode}
          />
        ) : null}
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1',
          isFullscreen && !isStudentAudience && !editMode ? 'flex-row' : 'flex-col',
        )}
      >
        {isFullscreen && !isStudentAudience && !editMode ? (
          <ClassroomLiveHoverSidebar
            design={design}
            setupActive={liveTool === 'setup'}
            onOpenSetup={() => {
              setSetupTab('setup');
              setLiveTool((current) => (current === 'setup' ? null : 'setup'));
            }}
          >
            <ClassroomMonitorQuickControls
              design={design}
              prefs={prefs}
              classes={classes}
              classId={filterClassId}
              isFullscreen={isFullscreen}
              placement="left"
              editMode={false}
              rewardsPillarOn={rewardsPillarOn}
              onChange={patchPrefs}
              onToggleEditMode={toggleEditMode}
              liveAwardActions={monitorLiveAwardActions}
              onRandomPick={pickRandomStudent}
              interactionMode={interactionMode}
              onInteractionModeChange={setInteractionMode}
              attendanceEnabled={attendanceEnabled}
              attendanceSource={attendanceSource}
              onAttendanceSourceChange={(source) => {
                patchPrefs({ attendanceSource: source });
                setInteractionMode(source === 'manual' ? 'attendance' : 'award');
              }}
              onStartNewClass={() => setRestartAttendanceOpen(true)}
              groups={parseClassroomGroups(sessionData.groups)}
              onAssignGroups={(count) => {
                if (!effectiveClassId) return;
                const nextGroups = assignClassroomGroups(presentSeatedIds, count);
                const next = setClassroomSessionGroups(schoolId, storageScope, effectiveClassId, nextGroups);
                setSessionData(next);
              }}
              onClearGroups={() => {
                if (!effectiveClassId) return;
                setSessionData(setClassroomSessionGroups(schoolId, storageScope, effectiveClassId, null));
              }}
              notesEnabled={notesEnabled}
              shortcutHint={{
                prefs,
                editMode: false,
                attendanceEnabled,
                bathroomEnabled: bathroomTimerOn,
                classroomNoteDeduct,
              }}
              showRaffle={isClassroomRaffleSectionVisible(
                settings,
                loginState === 'teacher' ? 'teacher' : 'admin',
              )}
              raffleOpen={liveTool === 'raffle'}
              onOpenRaffle={() => setLiveTool((current) => (current === 'raffle' ? null : 'raffle'))}
              behaviorOpen={liveTool === 'behavior'}
              onOpenBehavior={() => setLiveTool((current) => (current === 'behavior' ? null : 'behavior'))}
              setupOpen={liveTool === 'setup'}
              onOpenSetup={() => {
                setSetupTab('setup');
                setLiveTool((current) => (current === 'setup' ? null : 'setup'));
              }}
            />
          </ClassroomLiveHoverSidebar>
        ) : null}
        <div
          className={cn(
            'flex min-h-0 min-w-0 flex-1 flex-col gap-3',
            isClassroomTokenDesign(design) ? 'overflow-visible' : 'overflow-hidden',
            !editMode && classroomChartSurfaceClass(design),
          )}
        >
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

      {bathroomEnabled && !isStudentAudience && !isFullscreen && activeBathroomList.length > 0 ? (
        <BathroomPassesBar
          passes={activeBathroomList}
          maxMinutes={bathroomMaxMinutes}
          classStudentIds={classStudentIdSet}
          onReturn={(studentId) => void handleBathroomToggle(studentId)}
        />
      ) : null}

      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1',
          !isStudentAudience && editMode ? 'flex-row gap-2' : 'flex-col',
          'overflow-hidden',
          isStudentAudience && 'pointer-events-none select-none',
        )}
      >
        <div
          className={cn(
            'relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
            isClassroomTokenDesign(design) ? 'gap-2' : null,
          )}
        >
        {!isStudentAudience && !editMode && lastAwardSummary && lastAwardSummary.points > 0 ? (
          <ClassroomAwardGivenNotice
            visible
            studentLabel={lastAwardSummary.studentLabel}
            points={lastAwardSummary.points}
            awardLabel={lastAwardSummary.label}
          />
        ) : null}
        {isStudentAudience && sessionData.raffleProjector?.show ? (
          <ClassroomLiveRaffleProjectorOverlay raffle={sessionData.raffleProjector} />
        ) : null}
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
          goalRatioByStudentId={goalRatioByStudentId}
          sessionTotals={sessionData.totals}
          sessionLastAwards={sessionData.lastAward}
          showBalance={effectiveDeskDisplay.showPointBalances}
          showSessionTotals={effectiveDeskDisplay.showSessionTotals}
          showSessionLastAward={effectiveDeskDisplay.showSessionLastAward}
          density={density}
          gridGap={gridGap}
          editMode={editMode}
          pendingCellIndex={pendingAward?.cellIndex ?? null}
          pendingStartedAt={pendingAward?.startedAt ?? null}
          autoAwardMs={0}
          flyUpCell={flyUpCell}
          flyUpSize={prefs.kioskFlyUpSize}
          flashCell={flashCell}
          burstSelected={burstSelected}
          randomHighlightId={
            isStudentAudience ? sessionData.randomPick?.studentId ?? null : randomHighlightId
          }
          randomPickWinnerId={
            isStudentAudience ? sessionData.randomPick?.winnerId ?? null : randomPickWinnerId
          }
          randomPickLabel={
            isStudentAudience
              ? sessionData.randomPick?.label ?? null
              : randomPickWinnerId && studentById.get(randomPickWinnerId)
                ? getStudentNickname(studentById.get(randomPickWinnerId)!)
                : null
          }
          awardingStudentIds={awardingStudentIds}
          attendanceEnabled={!isStudentAudience && attendanceEnabled}
          attendanceLook={
            isStudentAudience || !attendanceEnabled
              ? 'off'
              : interactionMode === 'attendance'
                ? 'manual'
                : attendanceSource === 'card-scan'
                  ? 'card-scan'
                  : 'off'
          }
          attendanceByStudent={displayAttendance}
          groupsByStudent={sessionData.groups?.byStudent}
          bathroomEnabled={!isStudentAudience && bathroomEnabled}
          bathroomByStudent={bathroomByStudent}
          bathroomMaxMinutes={bathroomMaxMinutes}
          bathroomTick={bathroomTick}
          hallPassByStudent={hallPassByStudent}
          activeCelebration={gridActiveCelebration}
          handlersRef={gridHandlersRef}
          fitViewport={isFullscreen}
          hideEmptyDesks={isStudentAudience}
          deskMenuEnabled={
            prefs.instantTap && interactionMode !== 'attendance' && !isStudentAudience && !editMode
          }
        />
        {frontAtBottom && teacherDesk}
        {!isStudentAudience && isFullscreen ? (
          <>
            <ClassroomLiveRafflePanel
              open={liveTool === 'raffle'}
              onClose={() => setLiveTool(null)}
              schoolId={schoolId}
              students={classStudents.filter((student) => presentSeatedIds.includes(student.id))}
              classes={classes}
              classId={viewingAllStudents ? undefined : effectiveClassId || undefined}
              storageScope={storageScope}
              canEditSettings={loginState === 'admin' || loginState === 'developer'}
              operatorName={operatorName}
            />
            <ClassroomLiveBehaviorPanel
              open={liveTool === 'behavior'}
              onClose={() => {
                setLiveTool(null);
                setBehaviorPickKey(null);
              }}
              schoolId={schoolId}
              pickKey={behaviorPickKey}
              onPickKey={(key) => {
                setBehaviorPickKey(key);
                toast({
                  title: 'Tap a desk',
                  description: 'Write that note for the student you tap.',
                });
              }}
            />
            <ClassroomLiveSetupSheet
              open={liveTool === 'setup'}
              initialTab={setupTab}
              onClose={() => setLiveTool(null)}
              schoolId={schoolId}
              storageScope={storageScope}
              classes={classes}
              students={students}
              classId={viewingAllStudents ? undefined : effectiveClassId || undefined}
              canEditSettings={loginState === 'admin' || loginState === 'developer'}
              canEditRaffleSettings={loginState === 'admin' || loginState === 'developer'}
              operatorName={operatorName}
            />
          </>
        ) : null}
        </div>
        {editMode && !isStudentAudience && unassignedStudents.length > 0 ? (
          <ClassroomArrangeOverflowTray
            students={unassignedStudents.map((student) => ({
              id: student.id,
              label: `${getStudentNickname(student)}${student.lastName?.charAt(0) ? ` ${student.lastName.charAt(0)}.` : ''}`,
            }))}
            onDragStudent={setOverflowDragId}
            onPlaceStudent={placeOverflowStudent}
          />
        ) : null}
      </div>

      {!editMode && !isFullscreen && behaviorNotesTipsOn ? (
        <p className="flex shrink-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="text-muted-foreground/70">
            Shift+click behavior note
            {classroomNoteDeduct?.points
              ? ` · Some behavior notes can deduct -${classroomNoteDeduct.points} ${icon}`
              : ''}
            {prefs.showRandomPicker ? ' · R random' : ''}
            · Arrange to flip room
            {attendanceEnabled ? ' · Dot = today attendance' : ''}
            {bathroomEnabled ? ' · Alt+click = bathroom pass' : ''}
          </span>
        </p>
      ) : null}

        </div>
      </div>
      </div>

      {awardMenu}
      {notePickerStudent ? (
        <ClassroomBehaviorNoteTypePicker
          studentLabel={getStudentNickname(notePickerStudent)}
          onClose={() => setNotePickerStudent(null)}
          onPick={(key) => {
            const student = notePickerStudent;
            setNotePickerStudent(null);
            openBehaviorNote(student, { shortcutKey: key });
          }}
        />
      ) : null}
      <ClassroomGroupAwardModal
        open={groupModalOpen}
        onOpenChange={setGroupModalOpen}
        layout={activeLayout}
        students={classStudents}
        frontAtBottom={prefs.frontAtBottom}
        defaultPoints={prefs.defaultPoints}
        icon={icon}
        onAwardGroup={handleAwardGroup}
      />
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
            viewingAllStudents
              ? behaviorNoteStudent.classId
              : effectiveClassId || behaviorNoteStudent.classId
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
          deductPoints={
            behaviorNoteStudent &&
            isNoteDeductType(classroomNoteDeduct, behaviorNoteShortcutKey)
              ? classroomNoteDeduct.points
              : undefined
          }
          onDeductPoints={async (points, noteText) => {
            if (!behaviorNoteStudent) return;
            const shortcut = getClassroomNoteShortcut(behaviorNoteShortcutKey);
            const cellIndex = activeLayout?.cells.findIndex((id) => id === behaviorNoteStudent.id) ?? -1;
            await applyPointsToStudents(
              [behaviorNoteStudent.id],
              -points,
              `${shortcut.hintLabel}: ${noteText}`,
              cellIndex >= 0 ? { flashCellIndex: cellIndex } : undefined,
            );
          }}
          onSaved={onBehaviorNoteSaved}
        />
      ) : null}
      <AlertDialog open={restartAttendanceOpen} onOpenChange={setRestartAttendanceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">Start a new class?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears who is here, late, or absent for this class. Every desk goes back to waiting. The
              count starts at zero.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep this roll</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartNewClass}>Start new class</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const ClassroomPointsPanel = ClassroomPointsPanelInner;
