'use client';

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
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
import type { ClassroomKioskFlyUpSize } from '@/lib/classroomSeatingChart';
import type { TodayAttendanceStatus } from '@/hooks/useTodayAttendanceMap';
import { formatBathroomElapsed, isBathroomOverLimit } from '@/lib/bathroom/formatBathroomElapsed';
import {
  isClassroomNoteShortcutKey,
  type ClassroomNoteShortcutKey,
} from '@/lib/classroom/classroomNoteShortcuts';
import { cn } from '@/lib/utils';
import { Timer } from 'lucide-react';

export type { ClassroomNoteShortcutKey };

export type ClassroomGridHandlers = {
  onDeskTap: (studentId: string, cellIndex: number) => void;
  /** Ctrl+click — deduct points from this student. */
  onDeduct?: (studentId: string, cellIndex: number) => void;
  onBehaviorNote: (studentId: string, shortcutKey: ClassroomNoteShortcutKey, fromHeldKey?: boolean) => void;
  /** Shift+click — pick a note/comment type for this student. */
  onNotePicker?: (studentId: string) => void;
  getNoteKeyHeld?: () => ClassroomNoteShortcutKey | null;
  onBathroomToggle?: (studentId: string) => void;
  onDragStart: (cellIndex: number) => void;
  onDrop: (cellIndex: number) => void;
};

export type ActiveCelebrationState = {
  effect: string;
  cellIndex: number;
  runId: number;
  points: number;
} | null;

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
  showBalance: boolean;
  showSessionTotals: boolean;
  showSessionLastAward: boolean;
  tight: boolean;
  fitViewport: boolean;
  editMode: boolean;
  isPending: boolean;
  flashPoints: number | null;
  flashRunId: number;
  hideFlashPointsBadge: boolean;
  isBurstSelected: boolean;
  isRandom: boolean;
  isAwarding: boolean;
  attendanceEnabled: boolean;
  attStatus: TodayAttendanceStatus;
  bathroomEnabled: boolean;
  bathroomStartedAt: number | null;
  bathroomMaxMinutes: number;
  bathroomTick: number;
  pendingStartedAt: number | null;
  autoAwardMs: number;
  activeCelebration: ActiveCelebrationState;
  handlersRef: RefObject<ClassroomGridHandlers>;
  cellWrapRef?: (cellIndex: number, el: HTMLDivElement | null) => void;
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
    prev.showBalance === next.showBalance &&
    prev.showSessionTotals === next.showSessionTotals &&
    prev.showSessionLastAward === next.showSessionLastAward &&
    prev.tight === next.tight &&
    prev.fitViewport === next.fitViewport &&
    prev.editMode === next.editMode &&
    prev.isPending === next.isPending &&
    prev.flashPoints === next.flashPoints &&
    prev.flashRunId === next.flashRunId &&
    prev.hideFlashPointsBadge === next.hideFlashPointsBadge &&
    prev.isBurstSelected === next.isBurstSelected &&
    prev.isRandom === next.isRandom &&
    prev.isAwarding === next.isAwarding &&
    prev.attendanceEnabled === next.attendanceEnabled &&
    prev.attStatus === next.attStatus &&
    prev.bathroomEnabled === next.bathroomEnabled &&
    prev.bathroomStartedAt === next.bathroomStartedAt &&
    prev.bathroomMaxMinutes === next.bathroomMaxMinutes &&
    prev.bathroomTick === next.bathroomTick &&
    prev.pendingStartedAt === next.pendingStartedAt &&
    prev.autoAwardMs === next.autoAwardMs &&
    prev.activeCelebration === next.activeCelebration &&
    prev.handlersRef === next.handlersRef &&
    prev.cellWrapRef === next.cellWrapRef
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
  showBalance,
  showSessionTotals,
  showSessionLastAward,
  tight,
  fitViewport,
  editMode,
  isPending,
  flashPoints,
  flashRunId,
  hideFlashPointsBadge,
  isBurstSelected,
  isRandom,
  isAwarding,
  attendanceEnabled,
  attStatus,
  bathroomEnabled,
  bathroomStartedAt,
  bathroomMaxMinutes,
  bathroomTick,
  pendingStartedAt,
  autoAwardMs,
  activeCelebration,
  handlersRef,
  cellWrapRef,
}: SeatingDeskCellProps) {
  const hasStudent = !!display;
  void bathroomTick;

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      if (editMode || !studentId) return;
      const h = handlersRef.current;
      if (!h) return;
      if ((e.ctrlKey || e.metaKey) && h.onDeduct) {
        e.preventDefault();
        h.onDeduct(studentId, cellIndex);
        return;
      }
      if (e.altKey && h.onBathroomToggle) {
        e.preventDefault();
        h.onBathroomToggle(studentId);
        return;
      }
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
    bathroomEnabled && bathroomStartedAt != null ? Date.now() - bathroomStartedAt : 0;
  const bathroomOver =
    bathroomStartedAt != null && isBathroomOverLimit(bathroomElapsedMs, bathroomMaxMinutes);

  const showCelebration =
    activeCelebration != null && activeCelebration.cellIndex === cellIndex;

  return (
    <div
      ref={(el) => cellWrapRef?.(cellIndex, el)}
      className={cn(
        'relative min-h-0 min-w-0 overflow-visible',
        fitViewport ? 'h-full w-full' : 'aspect-square',
      )}
    >
      <button
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
        onClick={onClick}
        disabled={!hasStudent && !editMode}
        className={cn(
          'absolute inset-0 h-full w-full',
          classroomStudentDeskClass(design, {
            hasStudent,
            isPending,
            isFlashing: false,
            isBurstSelected,
            isRandom,
            editMode,
          }),
          isAwarding && 'opacity-60',
        )}
      >
        {display ? (
          <>
            <ClassroomDeskVisual
              design={design}
              display={display}
              index={visualColIndex}
              accentColor={accentColor}
              photoDisplayMode={photoDisplayMode}
              sessionPts={sessionPts}
              showBalance={showBalance}
              showSession={false}
            />
            {showSessionTotals ? (
              <ClassroomSessionBadge
                sessionPts={sessionPts}
                lastAwardLabel={sessionLastLabel}
                tight={tight}
              />
            ) : null}
          </>
        ) : (
          <ClassroomEmptyDeskLabel design={design} />
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

        {attendanceEnabled && display && attStatus !== 'unknown' ? (
          <span
            className={cn(
              'pointer-events-none absolute left-1 top-1 h-2.5 w-2.5 rounded-full ring-2 ring-background',
              attendanceDotClass(attStatus),
            )}
            title={attendanceTitle(attStatus)}
          />
        ) : null}

        {bathroomEnabled && bathroomStartedAt != null ? (
          <span
            className={cn(
              'pointer-events-none absolute bottom-1 right-1 flex items-center gap-0.5 rounded-md px-1 py-0.5 text-[10px] font-bold font-mono tabular-nums ring-2 ring-background',
              bathroomOver
                ? 'bg-red-500 text-white'
                : 'bg-violet-600 text-white',
            )}
            title={bathroomOver ? 'Over bathroom time limit — click desk with Alt to mark returned' : 'On bathroom pass — Alt+click to mark returned'}
          >
            <Timer className="h-2.5 w-2.5 shrink-0" aria-hidden />
            {formatBathroomElapsed(bathroomElapsedMs)}
          </span>
        ) : null}

        {showCelebration && activeCelebration && activeCelebration.effect !== 'none' ? (
          <ClassroomEffectOverlay
            effect={activeCelebration.effect as ClassroomEffect}
            runId={activeCelebration.runId}
            points={activeCelebration.points}
          />
        ) : null}
      </button>
    </div>
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
  awardingStudentIds: ReadonlySet<string>;
  attendanceEnabled: boolean;
  attendanceByStudent: Map<string, TodayAttendanceStatus>;
  bathroomEnabled: boolean;
  bathroomByStudent: Map<string, { startedAt: number }>;
  bathroomMaxMinutes: number;
  bathroomTick: number;
  activeCelebration: ActiveCelebrationState;
  handlersRef: RefObject<ClassroomGridHandlers>;
  className?: string;
  /** Scale grid to available height (full-screen classroom view). */
  fitViewport?: boolean;
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
  awardingStudentIds,
  attendanceEnabled,
  attendanceByStudent,
  bathroomEnabled,
  bathroomByStudent,
  bathroomMaxMinutes,
  bathroomTick,
  activeCelebration,
  handlersRef,
  className,
  fitViewport = false,
}: ClassroomSeatingGridProps) {
  const cellRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [flyUpAnchor, setFlyUpAnchor] = useState<{ x: number; y: number } | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  const registerCellRef = useCallback((cellIndex: number, el: HTMLDivElement | null) => {
    if (el) cellRefs.current.set(cellIndex, el);
    else cellRefs.current.delete(cellIndex);
  }, []);

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
  }, [measureFlyUpAnchor, flyUpCell]);

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

  const gridStyle = {
    gridTemplateColumns: `repeat(${layoutCols}, minmax(0, 1fr))`,
    ...(fitViewport ? { gridTemplateRows: `repeat(${layoutRows}, minmax(0, 1fr))` } : {}),
    gap: gridGap,
  };

  const flyUpStudentId = flyUpCell ? cellStudentIds[flyUpCell.index] : null;
  const flyUpDisplay = flyUpStudentId ? deskCatalog.get(flyUpStudentId) ?? null : null;
  const flyUpName = flyUpCell?.studentName || flyUpDisplay?.name;

  return (
    <div
      className={cn(
        'relative min-h-0 w-full flex-1 px-0.5',
        fitViewport ? 'h-full overflow-hidden' : 'overflow-auto',
        className,
      )}
    >
      <div
        className={cn('grid w-full overflow-visible', fitViewport ? 'h-full' : 'content-start')}
        style={gridStyle}
      >
        {visualCells.map(({ cellIndex, visualRow }) => {
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
                  ? sessionLastAwards[studentId]?.label ?? null
                  : null
              }
              showBalance={showBalance}
              showSessionTotals={showSessionTotals}
              showSessionLastAward={showSessionLastAward}
              tight={density === 'tight'}
              fitViewport={fitViewport}
              editMode={editMode}
              isPending={pendingCellIndex === cellIndex}
              flashPoints={flashCell?.index === cellIndex ? flashCell.points : null}
              flashRunId={flashCell?.index === cellIndex ? flashCell.runId : 0}
              hideFlashPointsBadge={flyUpActive}
              isBurstSelected={studentId ? burstSelected.includes(studentId) : false}
              isRandom={studentId === randomHighlightId}
              isAwarding={studentId ? awardingStudentIds.has(studentId) : false}
              attendanceEnabled={attendanceEnabled}
              attStatus={
                studentId && attendanceEnabled
                  ? attendanceByStudent.get(studentId) ?? 'absent'
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
              pendingStartedAt={pendingCellIndex === cellIndex ? pendingStartedAt : null}
              autoAwardMs={autoAwardMs}
              activeCelebration={activeCelebration}
              handlersRef={handlersRef}
            />
          );
        })}
      </div>

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
