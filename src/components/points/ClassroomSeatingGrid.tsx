'use client';

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ClassroomDeskVisual,
  ClassroomEffectOverlay,
  ClassroomDeskFlashOverlay,
  ClassroomKioskFlyUpOverlay,
  ClassroomEmptyDeskLabel,
  ClassroomSessionBadge,
  classroomStudentDeskClass,
  type ClassroomDesign,
  type ClassroomEffect,
} from '@/components/points/classroomVisualTheme';
import type { ClassroomDeskDisplay } from '@/lib/classroom/classroomDeskDisplay';
import {
  classroomDeskVisualScale,
  fitClassroomSeatingGrid,
  type ClassroomDeskVisualScale,
  type ClassroomKioskFlyUpSize,
  type ClassroomSeatingGridFit,
} from '@/lib/classroomSeatingChart';
import type { TodayAttendanceStatus } from '@/hooks/useTodayAttendanceMap';
import { isBathroomOverLimit } from '@/lib/bathroom/formatBathroomElapsed';
import {
  isClassroomNoteShortcutKey,
  type ClassroomNoteShortcutKey,
} from '@/lib/classroom/classroomNoteShortcuts';
import { ClassroomDeskPassOutBadge } from '@/components/classroom/ClassroomDeskPassOutBadge';
import type { ClassroomWhosOutPass } from '@/lib/classroom/classroomWhosOutPasses';
import { sanitizeClassroomDeskAwardLabel } from '@/lib/classroom/classroomAwardLabel';
import { classroomDeskContextAction } from '@/lib/classroom/classroomDeskClick';
import { shouldHideEmptyDeskSlot } from '@/lib/classroom/classroomEmptyDeskVisibility';
import { classroomGroupTone } from '@/lib/classroom/classroomGroups';
import {
  classroomTokenDeskStyle,
  isClassroomTokenDesign,
} from '@/lib/classroom/classroomTokenTheme';
import { cn } from '@/lib/utils';
import { Check, Clock, X } from 'lucide-react';

const tokenSpring = { type: 'spring' as const, stiffness: 280, damping: 24 };

export type { ClassroomNoteShortcutKey };

export type ClassroomGridHandlers = {
  onDeskTap: (studentId: string, cellIndex: number) => void;
  /** Ctrl+click — deduct points from this student. */
  onDeduct?: (studentId: string, cellIndex: number) => void;
  onBehaviorNote: (studentId: string, shortcutKey: ClassroomNoteShortcutKey, fromHeldKey?: boolean) => void;
  /** Shift+click — pick a note/comment type for this student. */
  onNotePicker?: (studentId: string) => void;
  getNoteKeyHeld?: () => ClassroomNoteShortcutKey | null;
  /** Alt held via keydown (Windows menu bar can strip altKey from click). */
  getBathroomAltHeld?: () => boolean;
  onBathroomToggle?: (studentId: string) => void;
  onAttendanceOverride?: (studentId: string, mark: 'present' | 'late') => void;
  /** Right-click — open the awards menu (Instant Award). */
  onDeskMenu?: (studentId: string, cellIndex: number) => void;
  onDragStart: (cellIndex: number) => void;
  onDrop: (cellIndex: number) => void;
};

export type ActiveCelebrationState = {
  effect: string;
  cellIndex: number;
  runId: number;
  points: number;
} | null;

function isBathroomAltModifier(
  e: React.MouseEvent | React.PointerEvent,
  handlers: ClassroomGridHandlers | null | undefined,
): boolean {
  if (!handlers) return false;
  if (e.altKey) return true;
  const native = e.nativeEvent;
  if (typeof native.getModifierState === 'function' && native.getModifierState('Alt')) return true;
  return handlers.getBathroomAltHeld?.() === true;
}

function tryBathroomToggle(
  e: React.MouseEvent,
  handlers: ClassroomGridHandlers | null | undefined,
  studentId: string,
): boolean {
  if (!isBathroomAltModifier(e, handlers) || !handlers?.onBathroomToggle) return false;
  e.preventDefault();
  e.stopPropagation();
  handlers.onBathroomToggle(studentId);
  return true;
}

type SeatingDeskCellProps = {
  cellIndex: number;
  visualColIndex: number;
  studentId: string | null;
  display: ClassroomDeskDisplay | null;
  design: ClassroomDesign;
  photoDisplayMode?: 'cover' | 'contain';
  accentColor: string;
  sessionPts: number;
  sessionLastLabel: string | null;
  sessionLastAt: number | null;
  showBalance: boolean;
  showSessionTotals: boolean;
  showSessionLastAward: boolean;
  tight: boolean;
  visualScale: ClassroomDeskVisualScale;
  editMode: boolean;
  isPending: boolean;
  flashPoints: number | null;
  flashRunId: number;
  hideFlashPointsBadge: boolean;
  isBurstSelected: boolean;
  isRandom: boolean;
  isRandomWinner: boolean;
  isAwarding: boolean;
  attendanceEnabled: boolean;
  attStatus: TodayAttendanceStatus;
  attendanceLook?: 'off' | 'card-scan' | 'manual';
  groupNumber?: number;
  randomPickLabel?: string | null;
  bathroomEnabled: boolean;
  bathroomStartedAt: number | null;
  bathroomMaxMinutes: number;
  bathroomTick: number;
  hallPass: ClassroomWhosOutPass | null;
  pendingStartedAt: number | null;
  autoAwardMs: number;
  activeCelebration: ActiveCelebrationState;
  handlersRef: RefObject<ClassroomGridHandlers>;
  cellWrapRef?: (cellIndex: number, el: HTMLDivElement | null) => void;
  /** Class screen: hide empty desk cards but keep the same row/column seats. */
  hideEmptyDesks?: boolean;
  /** Instant Award: right-click opens the awards menu. */
  deskMenuEnabled?: boolean;
  /** Best active goal fill ratio (0–1+) for a thin progress ring. */
  goalRatio?: number | null;
};

function attendanceDotClass(status: TodayAttendanceStatus): string {
  if (status === 'late') return 'bg-amber-500';
  if (status === 'on-time') return 'bg-emerald-500';
  return 'bg-red-500';
}

function attendanceTitle(status: TodayAttendanceStatus): string {
  if (status === 'late') return 'Late today';
  if (status === 'on-time') return 'Present today';
  return 'Not signed in today';
}

function attendanceStatusCue(
  look: 'off' | 'card-scan' | 'manual',
  status: TodayAttendanceStatus,
): 'present' | 'absent' | 'late' | null {
  if (status === 'late') return 'late';
  if (status === 'absent') return 'absent';
  if (look === 'manual' && status === 'on-time') return 'present';
  return null;
}

function seatingDeskCellPropsEqual(prev: SeatingDeskCellProps, next: SeatingDeskCellProps): boolean {
  return (
    prev.cellIndex === next.cellIndex &&
    prev.studentId === next.studentId &&
    prev.display === next.display &&
    prev.design === next.design &&
    prev.photoDisplayMode === next.photoDisplayMode &&
    prev.accentColor === next.accentColor &&
    prev.sessionPts === next.sessionPts &&
    prev.sessionLastLabel === next.sessionLastLabel &&
    prev.sessionLastAt === next.sessionLastAt &&
    prev.showBalance === next.showBalance &&
    prev.showSessionTotals === next.showSessionTotals &&
    prev.showSessionLastAward === next.showSessionLastAward &&
    prev.tight === next.tight &&
    prev.visualScale === next.visualScale &&
    prev.editMode === next.editMode &&
    prev.isPending === next.isPending &&
    prev.flashPoints === next.flashPoints &&
    prev.flashRunId === next.flashRunId &&
    prev.hideFlashPointsBadge === next.hideFlashPointsBadge &&
    prev.isBurstSelected === next.isBurstSelected &&
    prev.isRandom === next.isRandom &&
    prev.isRandomWinner === next.isRandomWinner &&
    prev.isAwarding === next.isAwarding &&
    prev.attendanceEnabled === next.attendanceEnabled &&
    prev.attStatus === next.attStatus &&
    prev.attendanceLook === next.attendanceLook &&
    prev.groupNumber === next.groupNumber &&
    prev.randomPickLabel === next.randomPickLabel &&
    prev.bathroomEnabled === next.bathroomEnabled &&
    prev.bathroomStartedAt === next.bathroomStartedAt &&
    prev.bathroomMaxMinutes === next.bathroomMaxMinutes &&
    prev.bathroomTick === next.bathroomTick &&
    prev.hallPass?.studentId === next.hallPass?.studentId &&
    prev.hallPass?.startedAt === next.hallPass?.startedAt &&
    prev.hallPass?.passLabel === next.hallPass?.passLabel &&
    prev.pendingStartedAt === next.pendingStartedAt &&
    prev.autoAwardMs === next.autoAwardMs &&
    prev.activeCelebration === next.activeCelebration &&
    prev.handlersRef === next.handlersRef &&
    prev.cellWrapRef === next.cellWrapRef &&
    prev.hideEmptyDesks === next.hideEmptyDesks &&
    prev.deskMenuEnabled === next.deskMenuEnabled &&
    prev.goalRatio === next.goalRatio
  );
}

const SeatingDeskCell = memo(function SeatingDeskCell({
  cellIndex,
  visualColIndex,
  studentId,
  display,
  design,
  photoDisplayMode,
  accentColor,
  sessionPts,
  sessionLastLabel,
  sessionLastAt,
  showBalance,
  showSessionTotals,
  showSessionLastAward,
  tight,
  visualScale,
  editMode,
  isPending,
  flashPoints,
  flashRunId,
  hideFlashPointsBadge,
  isBurstSelected,
  isRandom,
  isRandomWinner,
  isAwarding,
  attendanceEnabled,
  attStatus,
  attendanceLook = 'off',
  groupNumber,
  randomPickLabel,
  bathroomEnabled,
  bathroomStartedAt,
  bathroomMaxMinutes,
  bathroomTick,
  hallPass,
  pendingStartedAt,
  autoAwardMs,
  activeCelebration,
  handlersRef,
  cellWrapRef,
  hideEmptyDesks = false,
  deskMenuEnabled = false,
  goalRatio = null,
}: SeatingDeskCellProps) {
  const hasStudent = !!studentId || !!display;
  const tokenLook = isClassroomTokenDesign(design);
  const reduceMotion = useReducedMotion();
  const attCue =
    attendanceEnabled && hasStudent ? attendanceStatusCue(attendanceLook, attStatus) : null;
  const attendanceDropped = attCue === 'absent';
  const attendanceLate = attCue === 'late';
  void bathroomTick;
  const suppressClickForBathroomRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearLongPressTimer(), [clearLongPressTimer]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (editMode || !studentId || e.button !== 0) return;
      if (tryBathroomToggle(e, handlersRef.current, studentId)) {
        suppressClickForBathroomRef.current = true;
      }
    },
    [editMode, handlersRef, studentId],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (editMode || !studentId || e.button !== 0 || attendanceLook !== 'manual') return;
      if (isBathroomAltModifier(e, handlersRef.current)) return;
      clearLongPressTimer();
      longPressFiredRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null;
        longPressFiredRef.current = true;
        handlersRef.current?.onAttendanceOverride?.(studentId, 'late');
      }, 520);
    },
    [attendanceLook, clearLongPressTimer, editMode, handlersRef, studentId],
  );

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      if (editMode || !studentId) return;
      if (suppressClickForBathroomRef.current || longPressFiredRef.current) {
        suppressClickForBathroomRef.current = false;
        longPressFiredRef.current = false;
        e.preventDefault();
        return;
      }
      const h = handlersRef.current;
      if (!h) return;
      if ((e.ctrlKey || e.metaKey) && h.onDeduct) {
        e.preventDefault();
        h.onDeduct(studentId, cellIndex);
        return;
      }
      if (tryBathroomToggle(e, h, studentId)) return;
      if (e.shiftKey && h.onNotePicker) {
        e.preventDefault();
        h.onNotePicker(studentId);
        return;
      }
      const noteKey = h.getNoteKeyHeld?.() ?? null;
      if (noteKey && isClassroomNoteShortcutKey(noteKey)) {
        h.onBehaviorNote(studentId, noteKey, true);
        return;
      }
      h.onDeskTap(studentId, cellIndex);
    },
    [cellIndex, editMode, handlersRef, studentId],
  );

  const bathroomElapsedMs =
    hallPass?.startedAt != null ? Date.now() - hallPass.startedAt : bathroomEnabled && bathroomStartedAt != null ? Date.now() - bathroomStartedAt : 0;
  const bathroomOver =
    hallPass != null
      ? isBathroomOverLimit(bathroomElapsedMs, hallPass.maxMinutes)
      : bathroomStartedAt != null && isBathroomOverLimit(bathroomElapsedMs, bathroomMaxMinutes);

  const showCelebration =
    activeCelebration != null && activeCelebration.cellIndex === cellIndex;

  if (shouldHideEmptyDeskSlot({ hasStudent: !!studentId, editMode, hideEmptyDesks })) {
    return (
      <div
        ref={(el) => cellWrapRef?.(cellIndex, el)}
        className="h-full min-h-0 min-w-0 w-full"
        aria-hidden
      />
    );
  }

  return (
    <motion.div
      ref={(el) => cellWrapRef?.(cellIndex, el)}
      className={cn(
        'relative h-full min-h-0 min-w-0 w-full',
        hasStudent ? 'z-[1] overflow-visible' : 'z-0 overflow-hidden p-1.5',
      )}
      whileHover={tokenLook && hasStudent && !editMode && !isRandom ? { zIndex: 20 } : undefined}
      initial={tokenLook && !reduceMotion ? { opacity: 0, y: 10, scale: 0.96 } : false}
      animate={{
        opacity: 1,
        y: 0,
        scale: isRandomWinner && !reduceMotion ? 1.1 : isRandom && !reduceMotion ? 1.05 : 1,
        zIndex: isRandom ? 24 : 1,
      }}
      transition={{
        ...tokenSpring,
        delay: tokenLook && !reduceMotion && !isRandom ? Math.min(cellIndex * 0.03, 0.36) : 0,
      }}
    >
      <motion.button
        type="button"
        draggable={editMode && !!studentId}
        onDragStart={() => handlersRef.current?.onDragStart(cellIndex)}
        onDragOver={(e) => {
          if (editMode) e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          handlersRef.current?.onDrop(cellIndex);
        }}
        onMouseDown={onMouseDown}
        onPointerDown={onPointerDown}
        onPointerUp={clearLongPressTimer}
        onPointerCancel={clearLongPressTimer}
        onPointerLeave={clearLongPressTimer}
        onContextMenu={(e) => {
          if (editMode || !studentId) return;
          const h = handlersRef.current;
          if (!h) return;
          const action = classroomDeskContextAction({
            takingAttendance: attendanceLook === 'manual',
            hasDeskMenu: Boolean(deskMenuEnabled && h.onDeskMenu),
            hasAttendanceOverride: Boolean(h.onAttendanceOverride),
          });
          if (action === 'none') return;
          e.preventDefault();
          if (action === 'menu') {
            h.onDeskMenu?.(studentId, cellIndex);
            return;
          }
          h.onAttendanceOverride?.(studentId, attendanceLook === 'manual' ? 'late' : 'present');
        }}
        onClick={onClick}
        title={
          (attendanceLook === 'manual' || attendanceLook === 'card-scan') && hasStudent
            ? 'Tap to mark here or not here. Hold for late.'
            : deskMenuEnabled && hasStudent
              ? 'Left click awards points. Right click opens the menu.'
              : undefined
        }
        disabled={!hasStudent && !editMode}
        data-classroom-desk={cellIndex}
        whileHover={
          tokenLook && hasStudent && !editMode && !reduceMotion && !isRandom && !attendanceDropped
            ? { y: 4, scale: 1.04, rotate: 1.2, zIndex: 20, transition: tokenSpring }
            : undefined
        }
        whileTap={
          tokenLook && hasStudent && !editMode && !reduceMotion
            ? { scale: 0.98, transition: tokenSpring }
            : undefined
        }
        style={{
          ...(tokenLook && hasStudent
            ? attendanceDropped
              ? {
                  ...classroomTokenDeskStyle(visualColIndex),
                  boxShadow: '1px 2px 0 0 rgba(15, 23, 42, 0.14)',
                  borderColor: 'rgba(15, 23, 42, 0.28)',
                }
              : classroomTokenDeskStyle(visualColIndex)
            : undefined),
          ...(hasStudent
            ? {
                backgroundColor: 'var(--theme-card-bg, undefined)',
                borderColor: 'var(--theme-card-border, undefined)',
                boxShadow: 'var(--theme-card-shadow, undefined)',
                borderRadius: 'var(--theme-card-radius, undefined)',
              }
            : undefined),
        }}
        aria-busy={isAwarding || undefined}
        className={cn(
          'absolute inset-0 h-full w-full',
          classroomStudentDeskClass(design, {
            hasStudent,
            isPending,
            isFlashing: false,
            isBurstSelected,
            isRandom,
            editMode,
            visualScale,
          }),
          attendanceLate && 'shadow-[inset_0_0_0_1.5px_rgba(217,119,6,0.7)]',
        )}
      >
        {hallPass ? (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-amber-400 ring-offset-1"
            animate={{ scale: [1, 1.035, 1], opacity: [1, 0.72, 1] }}
            transition={{ type: 'spring', stiffness: 180, damping: 16, repeat: Infinity }}
          />
        ) : null}
        {isRandom ? (
          <motion.span
            layoutId="classroom-random-spotlight"
            aria-hidden
            className={cn(
              'pointer-events-none absolute -inset-1 rounded-[inherit]',
              isRandomWinner
                ? 'ring-[5px] ring-amber-400 shadow-[0_0_32px_10px_rgba(251,191,36,0.6)]'
                : 'ring-4 ring-amber-300 shadow-[0_0_18px_6px_rgba(251,191,36,0.4)]',
            )}
            transition={tokenSpring}
          />
        ) : null}
        {isRandomWinner ? (
          <motion.span
            initial={reduceMotion ? false : { scale: 0.7, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            transition={tokenSpring}
            className="pointer-events-none absolute -top-2 left-1/2 z-[16] -translate-x-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black shadow-md"
          >
            {randomPickLabel || 'Picked'}
          </motion.span>
        ) : null}
        {display ? (
          <>
            <motion.div
              className="flex h-full w-full flex-col items-center justify-center gap-2 px-1"
              animate={{
                opacity: attendanceDropped ? 0.46 : attendanceLate ? 0.94 : 1,
                filter: attendanceDropped
                  ? 'grayscale(0.55) saturate(0.28)'
                  : 'grayscale(0) saturate(1)',
              }}
              transition={tokenSpring}
            >
              <ClassroomDeskVisual
                design={design}
                display={display}
                index={visualColIndex}
                accentColor={accentColor}
                photoDisplayMode={photoDisplayMode}
                sessionPts={sessionPts}
                showBalance={showBalance}
                showSession={false}
                visualScale={visualScale}
              />
            </motion.div>
          </>
        ) : (
          <ClassroomEmptyDeskLabel design={design} visualScale={visualScale} editMode={editMode} />
        )}

        {isPending && pendingStartedAt != null && autoAwardMs > 0 ? (
          <span
            key={pendingStartedAt}
            className="pointer-events-none absolute inset-0 rounded-2xl border-4 border-primary opacity-35 animate-classroom-pending-top"
            style={{
              animationDuration: `${autoAwardMs}ms`,
              animationDelay: `-${Math.min(autoAwardMs, Date.now() - pendingStartedAt)}ms`,
            }}
          />
        ) : null}

        {flashPoints != null && flashPoints > 0 ? (
          <ClassroomDeskFlashOverlay
            points={flashPoints}
            runId={flashRunId}
            showPointsBadge={!hideFlashPointsBadge}
            subtle={hideFlashPointsBadge}
          />
        ) : null}

        {typeof goalRatio === 'number' && goalRatio > 0 && display ? (
          <span
            className="pointer-events-none absolute left-1 top-1 z-[11] h-3.5 w-3.5 rounded-full"
            title={`Goal ${Math.min(999, Math.round(goalRatio * 100))}%`}
            style={{
              background: `conic-gradient(${accentColor} ${Math.min(100, goalRatio * 100)}%, hsl(var(--muted)) 0)`,
              boxShadow: '0 0 0 1px hsl(var(--background))',
            }}
            aria-hidden
          />
        ) : null}

        {attendanceEnabled && display && attendanceLook === 'manual' && attCue === 'present' ? (
          <span
            className="pointer-events-none absolute right-1 top-1 z-[12] flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm"
            title="Here"
          >
            <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
            <span className="sr-only">Here</span>
          </span>
        ) : null}
        {attendanceEnabled && display && attendanceLook === 'manual' && attCue === 'absent' ? (
          <span
            className="pointer-events-none absolute right-1 top-1 z-[12] flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm"
            title="Not here"
          >
            <X className="h-3 w-3" strokeWidth={3} aria-hidden />
            <span className="sr-only">Not here</span>
          </span>
        ) : null}
        {attendanceEnabled && display && attCue === 'late' ? (
          <span
            className="pointer-events-none absolute right-1 top-1 z-[12] flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[#102033] shadow-sm"
            title="Late"
          >
            <Clock className="h-3 w-3" strokeWidth={2.5} aria-hidden />
            <span className="sr-only">Late</span>
          </span>
        ) : null}
        {attendanceEnabled && display && attendanceLook === 'card-scan' ? (
          <span
            className={cn(
              'pointer-events-none absolute h-2.5 w-2.5 rounded-full ring-2 ring-white',
              tokenLook ? 'right-1.5 top-1.5' : 'left-1 top-1 ring-background',
              attendanceDotClass(attStatus),
            )}
            title={attendanceTitle(attStatus)}
          />
        ) : null}
        {groupNumber || showSessionTotals ? (
          <div className="pointer-events-none absolute inset-x-0.5 bottom-0.5 z-[14] flex items-end justify-between gap-1">
            {groupNumber ? (
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={tokenSpring}
                className="shrink-0 rounded-md px-1 py-0.5 text-[9px] font-bold tracking-normal"
                style={{
                  backgroundColor: classroomGroupTone(groupNumber).bg,
                  color: classroomGroupTone(groupNumber).fg,
                }}
              >
                G{groupNumber}
              </motion.span>
            ) : (
              <span />
            )}
            {showSessionTotals ? (
              <ClassroomSessionBadge
                sessionPts={sessionPts}
                lastAwardLabel={sessionLastLabel}
                lastAwardAt={sessionLastAt}
                tight={tight}
              />
            ) : null}
          </div>
        ) : null}

        <ClassroomDeskPassOutBadge
          visible={!!hallPass}
          compact={visualScale === 'sm' && !hideEmptyDesks}
          overLimit={!!hallPass && bathroomOver}
          passLabel={hallPass?.passLabel}
        />

        {showCelebration && activeCelebration && activeCelebration.effect !== 'none' ? (
          <ClassroomEffectOverlay
            effect={activeCelebration.effect as ClassroomEffect}
            runId={activeCelebration.runId}
            points={activeCelebration.points}
          />
        ) : null}
      </motion.button>
    </motion.div>
  );
}, seatingDeskCellPropsEqual);

export type ClassroomSeatingGridProps = {
  layoutRows: number;
  layoutCols: number;
  cellStudentIds: (string | null)[];
  visualCells: { cellIndex: number; visualRow: number }[];
  deskCatalog: Map<string, ClassroomDeskDisplay>;
  design: ClassroomDesign;
  photoDisplayMode?: 'cover' | 'contain';
  accentColor: string;
  sessionTotals: Record<string, number>;
  sessionLastAwards: Record<string, { label: string; points: number; at: number }>;
  showBalance: boolean;
  showSessionTotals: boolean;
  showSessionLastAward: boolean;
  density: 'normal' | 'cozy' | 'tight';
  gridGap: number;
  editMode: boolean;
  pendingCellIndex: number | null;
  pendingStartedAt: number | null;
  autoAwardMs: number;
  flyUpCell: { index: number; points: number; runId: number; studentName: string } | null;
  flyUpSize: ClassroomKioskFlyUpSize;
  flashCell: { index: number; points: number; runId: number } | null;
  burstSelected: string[];
  randomHighlightId: string | null;
  randomPickWinnerId?: string | null;
  awardingStudentIds: ReadonlySet<string>;
  attendanceEnabled: boolean;
  attendanceByStudent: Map<string, TodayAttendanceStatus>;
  attendanceLook?: 'off' | 'card-scan' | 'manual';
  groupsByStudent?: Record<string, number>;
  randomPickLabel?: string | null;
  bathroomEnabled: boolean;
  bathroomByStudent: Map<string, { startedAt: number }>;
  bathroomMaxMinutes: number;
  bathroomTick: number;
  hallPassByStudent?: Map<string, ClassroomWhosOutPass>;
  activeCelebration: ActiveCelebrationState;
  handlersRef: RefObject<ClassroomGridHandlers>;
  className?: string;
  /** @deprecated Grid always fits the available box; kept so callers don’t break. */
  fitViewport?: boolean;
  /** Class screen: hide empty desk cards but keep the same row/column seats. */
  hideEmptyDesks?: boolean;
  /** Best active goal fill ratio by student id (Goals classroom option). */
  goalRatioByStudentId?: Record<string, number>;
  /** Instant Award: right-click opens the awards menu. */
  deskMenuEnabled?: boolean;
};

export const ClassroomSeatingGrid = memo(function ClassroomSeatingGrid({
  layoutRows,
  layoutCols,
  cellStudentIds,
  visualCells,
  deskCatalog,
  design,
  photoDisplayMode,
  accentColor,
  sessionTotals,
  sessionLastAwards,
  showBalance,
  showSessionTotals,
  showSessionLastAward,
  density,
  gridGap,
  editMode,
  pendingCellIndex,
  pendingStartedAt,
  autoAwardMs,
  flyUpCell,
  flyUpSize,
  flashCell,
  burstSelected,
  randomHighlightId,
  randomPickWinnerId = null,
  awardingStudentIds,
  attendanceEnabled,
  attendanceByStudent,
  attendanceLook = 'off',
  groupsByStudent,
  randomPickLabel = null,
  bathroomEnabled,
  bathroomByStudent,
  bathroomMaxMinutes,
  bathroomTick,
  hallPassByStudent,
  activeCelebration,
  handlersRef,
  className,
  hideEmptyDesks = false,
  goalRatioByStudentId,
  deskMenuEnabled = false,
}: ClassroomSeatingGridProps) {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [fit, setFit] = useState<ClassroomSeatingGridFit | null>(null);
  const [flyUpAnchor, setFlyUpAnchor] = useState<{ x: number; y: number } | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const displayCells = visualCells;
  const displayRows = layoutRows;
  const displayCols = layoutCols;

  const registerCellRef = useCallback((cellIndex: number, el: HTMLDivElement | null) => {
    if (el) cellRefs.current.set(cellIndex, el);
    else cellRefs.current.delete(cellIndex);
  }, []);

  const measureFit = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const styles = window.getComputedStyle(el);
    const padX =
      (Number.parseFloat(styles.paddingLeft) || 0) + (Number.parseFloat(styles.paddingRight) || 0);
    const padY =
      (Number.parseFloat(styles.paddingTop) || 0) + (Number.parseFloat(styles.paddingBottom) || 0);
    const next = fitClassroomSeatingGrid({
      containerWidth: Math.max(0, el.clientWidth - padX),
      containerHeight: Math.max(0, el.clientHeight - padY),
      rows: displayRows,
      cols: displayCols,
      gap: gridGap,
    });
    setFit((prev) => {
      if (
        prev &&
        prev.cellSize === next.cellSize &&
        prev.gridWidth === next.gridWidth &&
        prev.gridHeight === next.gridHeight
      ) {
        return prev;
      }
      return next;
    });
  }, [displayCols, displayRows, gridGap]);

  useLayoutEffect(() => {
    measureFit();
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => measureFit());
    observer.observe(el);
    return () => observer.disconnect();
  }, [measureFit]);

  const measureFlyUpAnchor = useCallback(() => {
    if (!flyUpCell || flyUpCell.points <= 0) {
      setFlyUpAnchor(null);
      return;
    }
    const el = cellRefs.current.get(flyUpCell.index);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setFlyUpAnchor({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }, [flyUpCell]);

  useEffect(() => {
    setPortalReady(typeof document !== 'undefined');
  }, []);

  useLayoutEffect(() => {
    measureFlyUpAnchor();
    if (!flyUpCell) return;
    const raf = requestAnimationFrame(() => measureFlyUpAnchor());
    return () => cancelAnimationFrame(raf);
  }, [measureFlyUpAnchor, flyUpCell, fit]);

  useEffect(() => {
    if (!flyUpCell) return;
    const onMove = () => measureFlyUpAnchor();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [flyUpCell, measureFlyUpAnchor]);

  const visualScale = classroomDeskVisualScale(fit?.cellSize && fit.cellSize > 0 ? fit.cellSize : 120);
  const flyUpStudentId = flyUpCell ? cellStudentIds[flyUpCell.index] : null;
  const flyUpDisplay = flyUpStudentId ? deskCatalog.get(flyUpStudentId) ?? null : null;
  const flyUpName = flyUpCell?.studentName || flyUpDisplay?.name;
  const sizedFit = fit && fit.cellSize > 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex h-full min-h-0 min-w-0 w-full flex-1 items-center justify-center overflow-hidden px-1 py-1',
        className,
      )}
      data-classroom-room-fit=""
    >
      <motion.div
        className="grid isolate overflow-visible"
        initial={false}
        animate={
          sizedFit
            ? { width: fit.gridWidth, height: fit.gridHeight }
            : undefined
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: 'spring', stiffness: 280, damping: 32, mass: 0.7 }
        }
        style={{
          gap: gridGap,
          gridTemplateColumns: sizedFit
            ? `repeat(${displayCols}, minmax(0, ${fit.cellSize}px))`
            : `repeat(${Math.max(1, displayCols)}, minmax(4.5rem, 1fr))`,
          gridTemplateRows: sizedFit
            ? `repeat(${displayRows}, minmax(0, ${fit.cellSize}px))`
            : `repeat(${Math.max(1, displayRows)}, minmax(4.5rem, 1fr))`,
          width: sizedFit ? undefined : '100%',
          height: sizedFit ? undefined : '100%',
          aspectRatio: sizedFit ? undefined : `${Math.max(1, displayCols)} / ${Math.max(1, displayRows)}`,
        }}
      >
        {displayCells.map(({ cellIndex, visualRow }) => {
          const studentId = cellStudentIds[cellIndex];
          const display = studentId ? deskCatalog.get(studentId) ?? null : null;
          const flyUpActive = flyUpCell?.index === cellIndex && (flyUpCell?.points ?? 0) > 0;
          return (
            <SeatingDeskCell
              key={`desk-${cellIndex}`}
              cellWrapRef={registerCellRef}
              cellIndex={cellIndex}
              visualColIndex={visualRow * layoutCols + (cellIndex % layoutCols)}
              studentId={studentId}
              display={display}
              design={design}
              photoDisplayMode={photoDisplayMode}
              accentColor={accentColor}
              sessionPts={studentId ? sessionTotals[studentId] ?? 0 : 0}
              sessionLastLabel={
                studentId && showSessionTotals && showSessionLastAward
                  ? sanitizeClassroomDeskAwardLabel(sessionLastAwards[studentId]?.label)
                  : null
              }
              sessionLastAt={
                studentId && showSessionTotals && showSessionLastAward
                  ? sessionLastAwards[studentId]?.at ?? null
                  : null
              }
              showBalance={showBalance}
              showSessionTotals={showSessionTotals}
              showSessionLastAward={showSessionLastAward}
              tight={density === 'tight' || visualScale !== 'lg'}
              visualScale={visualScale}
              editMode={editMode}
              isPending={pendingCellIndex === cellIndex}
              flashPoints={flashCell?.index === cellIndex ? flashCell.points : null}
              flashRunId={flashCell?.index === cellIndex ? flashCell.runId : 0}
              hideFlashPointsBadge={flyUpActive}
              isBurstSelected={studentId ? burstSelected.includes(studentId) : false}
              isRandom={studentId === randomHighlightId}
              isRandomWinner={!!studentId && studentId === randomPickWinnerId}
              randomPickLabel={studentId && studentId === randomPickWinnerId ? randomPickLabel : null}
              isAwarding={studentId ? awardingStudentIds.has(studentId) : false}
              attendanceEnabled={attendanceEnabled}
              attendanceLook={attendanceLook}
              groupNumber={studentId ? groupsByStudent?.[studentId] : undefined}
              attStatus={
                studentId && attendanceEnabled
                  ? attendanceByStudent.get(studentId) ?? (attendanceLook === 'card-scan' ? 'absent' : 'unknown')
                  : 'unknown'
              }
              bathroomEnabled={bathroomEnabled}
              bathroomStartedAt={
                studentId && bathroomByStudent.has(studentId)
                  ? bathroomByStudent.get(studentId)!.startedAt
                  : null
              }
              bathroomMaxMinutes={bathroomMaxMinutes}
              bathroomTick={bathroomTick}
              hallPass={studentId ? hallPassByStudent?.get(studentId) ?? null : null}
              hideEmptyDesks={hideEmptyDesks}
              deskMenuEnabled={deskMenuEnabled}
              goalRatio={studentId && goalRatioByStudentId ? goalRatioByStudentId[studentId] ?? null : null}
              pendingStartedAt={pendingCellIndex === cellIndex ? pendingStartedAt : null}
              autoAwardMs={autoAwardMs}
              activeCelebration={activeCelebration}
              handlersRef={handlersRef}
            />
          );
        })}
      </motion.div>

      {portalReady &&
        flyUpCell &&
        flyUpCell.points > 0 &&
        flyUpAnchor &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[500]"
            style={{
              left: flyUpAnchor.x,
              top: flyUpAnchor.y,
            }}
            aria-hidden
          >
            <ClassroomKioskFlyUpOverlay
              points={flyUpCell.points}
              runId={flyUpCell.runId}
              studentName={flyUpName}
              size={flyUpSize}
              mode="viewport"
            />
          </div>,
          document.body,
        )}
    </div>
  );
});
