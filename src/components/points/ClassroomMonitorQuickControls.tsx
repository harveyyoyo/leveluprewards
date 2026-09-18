'use client';

import { createContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpenCheck,
  ClipboardCheck,
  Dices,
  GripVertical,
  IdCard,
  Pause,
  Play,
  Settings2,
  Shuffle,
  Sparkles,
  Timer,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ClassroomAttendanceSourceControl } from '@/components/classroom/ClassroomAttendanceSourceControl';
import { useClassroomLiveSidebarChrome } from '@/components/classroom/ClassroomLiveHoverSidebar';
import { ClassroomGroupsTool } from '@/components/classroom/ClassroomGroupsTool';
import { type ClassroomAttendanceSource } from '@/lib/classroom/classroomAttendanceSource';
import { type ClassroomGroupAssignment } from '@/lib/classroom/classroomGroups';
import { type ClassroomInteractionMode } from '@/lib/classroom/classroomInteractionMode';
import { type ClassroomDesign } from '@/components/points/classroomVisualTheme';
import type { ClassroomSeatingPrefs } from '@/lib/classroomSeatingChart';
import { type ClassroomSeatingShortcutsHintState } from '@/components/points/classroomSeatingShortcutsHint';
import {
  classroomSidebarToolAppearance,
  classroomSidebarToolTint,
  type ClassroomSidebarToolTone,
} from '@/lib/classroom/classroomTokenTheme';
import { cn } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

type MonitorToolbarPlacement = 'top' | 'left';
const MonitorToolbarPlacementContext = createContext<MonitorToolbarPlacement>('top');

type SidebarToolTone =
  | 'arrange'
  | 'random'
  | 'attendance'
  | 'sound'
  | 'timer'
  | 'gold'
  | 'raffle'
  | 'behavior'
  | 'groups';

const tactile =
  'border-transparent shadow-sm shadow-black/10 transition-all hover:-translate-y-0.5 hover:shadow-md';

function monitorSelectTriggerLook(
  design: ClassroomDesign,
  isFullscreen: boolean,
  tone: SidebarToolTone = 'arrange',
) {
  const look = classroomSidebarToolAppearance(design, tone);
  return {
    className: cn(
      'classroom-readable h-auto w-auto gap-1.5 rounded-xl px-2 py-1.5 text-xs tracking-normal sm:px-2.5',
      tactile,
      isFullscreen && 'px-2 py-1.5 text-xs',
      look.className,
    ),
    style: look.style,
    ink: look.ink,
  };
}

function iconInkClass(ink: 'light' | 'dark' | 'amber') {
  return ink === 'dark' ? 'text-slate-900' : ink === 'amber' ? 'text-amber-300' : 'text-white';
}

function CollapsedToolIcon({
  design,
  tone,
  label,
  title,
  active = false,
  onClick,
  children,
}: {
  design: ClassroomDesign;
  tone: ClassroomSidebarToolTone;
  label: string;
  title?: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const look = classroomSidebarToolAppearance(design, tone);
  return (
    <motion.button
      type="button"
      layoutId={`classroom-tool-icon-${tone}-${label}`}
      variants={{
        hidden: { opacity: 0, scale: 0.85 },
        visible: { opacity: 1, scale: 1, transition: spring },
      }}
      data-look={design}
      style={look.style}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm shadow-black/15',
        look.className,
        active && 'ring-2 ring-[#f5c518] ring-offset-1 ring-offset-transparent',
      )}
      aria-label={label}
      title={title ?? label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <span className={cn('inline-flex', iconInkClass(look.ink))}>{children}</span>
    </motion.button>
  );
}

function formatGroupTimer(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function ClassroomGroupTimer({
  design,
  isFullscreen,
  iconOnly = false,
}: {
  design: ClassroomDesign;
  isFullscreen: boolean;
  iconOnly?: boolean;
}) {
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (startedAtRef.current == null) return;
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 250);
    return () => window.clearInterval(id);
  }, [running]);

  const toggleRun = () => {
    if (running) {
      setRunning(false);
      if (startedAtRef.current != null) {
        setElapsedMs(Date.now() - startedAtRef.current);
      }
      startedAtRef.current = null;
      return;
    }
    startedAtRef.current = Date.now() - elapsedMs;
    setRunning(true);
  };

  if (iconOnly) {
    return (
      <CollapsedToolIcon
        design={design}
        tone="timer"
        label={running ? 'Pause group timer' : elapsedMs > 0 ? 'Resume group timer' : 'Start group timer'}
        title={
          running
            ? `Timer running ${formatGroupTimer(elapsedMs)} — click to pause`
            : `Group timer ${formatGroupTimer(elapsedMs)} — click to start`
        }
        active={running || elapsedMs > 0}
        onClick={toggleRun}
      >
        {running ? <Pause className="h-4 w-4" aria-hidden /> : <Timer className="h-4 w-4" aria-hidden />}
      </CollapsedToolIcon>
    );
  }

  const look = monitorSelectTriggerLook(design, isFullscreen, 'timer');
  const actionTint = classroomSidebarToolTint(design, 'timer');
  const inkClass = look.ink === 'dark' ? 'text-slate-900' : 'text-white';
  return (
    <div
      data-look={design}
      style={look.style}
      className={cn(
        look.className,
        'flex w-full flex-col items-stretch gap-2 rounded-xl p-3 hover:translate-y-0',
      )}
    >
      <div className={cn('flex items-center gap-1.5', inkClass)}>
        <Timer className="h-4 w-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 text-left text-xs font-semibold tracking-normal">Group timer</span>
        <span className="font-mono text-xs font-bold tabular-nums">{formatGroupTimer(elapsedMs)}</span>
      </div>
      <div className="flex items-center gap-1.5">
      <button
        type="button"
        className={cn(
          'inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold hover:brightness-105',
          inkClass,
        )}
        style={{ backgroundColor: actionTint }}
        onClick={toggleRun}
      >
        {running ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
        {running ? 'Pause' : elapsedMs > 0 ? 'Resume' : 'Start'}
      </button>
      <button
        type="button"
        className={cn(
          'inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold hover:brightness-105',
          inkClass,
        )}
        style={{ backgroundColor: actionTint }}
        onClick={() => {
          startedAtRef.current = null;
          setRunning(false);
          setElapsedMs(0);
        }}
      >
        Reset
      </button>
      </div>
    </div>
  );
}

export function ClassroomMonitorQuickControls({
  design,
  prefs,
  isFullscreen = false,
  placement = 'top',
  editMode = false,
  onChange,
  onToggleEditMode,
  liveAwardActions,
  onSeatEveryone,
  onRandomPick,
  interactionMode = 'award',
  attendanceEnabled = false,
  attendanceSource = 'card-scan',
  onAttendanceSourceChange,
  onStartNewClass,
  groups,
  onAssignGroups,
  onClearGroups,
  notesEnabled = true,
  shortcutHint = null,
  showRaffle = false,
  raffleOpen = false,
  onOpenRaffle,
  behaviorOpen = false,
  onOpenBehavior,
  setupOpen = false,
  onOpenSetup,
}: {
  design: ClassroomDesign;
  prefs: ClassroomSeatingPrefs;
  classes?: unknown;
  classId?: string;
  isFullscreen?: boolean;
  placement?: MonitorToolbarPlacement;
  editMode?: boolean;
  rewardsPillarOn?: boolean;
  onChange: (patch: Partial<ClassroomSeatingPrefs>) => void;
  onClassChange?: (classId: string) => void;
  onToggleEditMode?: () => void;
  awardActions?: ReactNode;
  liveAwardActions?: ReactNode;
  onSeatEveryone?: () => void;
  onRandomPick?: () => void;
  interactionMode?: ClassroomInteractionMode;
  onInteractionModeChange?: (mode: ClassroomInteractionMode) => void;
  attendanceEnabled?: boolean;
  attendanceSource?: ClassroomAttendanceSource;
  onAttendanceSourceChange?: (source: ClassroomAttendanceSource) => void;
  onStartNewClass?: () => void;
  groups?: ClassroomGroupAssignment;
  onAssignGroups?: (count: number) => void;
  onClearGroups?: () => void;
  notesEnabled?: boolean;
  shortcutHint?: ClassroomSeatingShortcutsHintState | null;
  behaviorNotesTipsOn?: boolean;
  onBehaviorNotesTipsChange?: (on: boolean) => void;
  classScreenUrl?: string | null;
  onResetSessionDisplay?: () => void;
  showRaffle?: boolean;
  raffleOpen?: boolean;
  onOpenRaffle?: () => void;
  behaviorOpen?: boolean;
  onOpenBehavior?: () => void;
  setupOpen?: boolean;
  onOpenSetup?: () => void;
}) {
  const isLeft = placement === 'left';
  const { iconOnly, requestExpand } = useClassroomLiveSidebarChrome();
  const showIconRail = isLeft && iconOnly;
  void shortcutHint;
  void notesEnabled;

  if (!isFullscreen) return null;

  const arrangeLook = monitorSelectTriggerLook(design, isFullscreen, 'arrange');
  const soundLook = monitorSelectTriggerLook(design, isFullscreen, 'sound');
  const randomLook = monitorSelectTriggerLook(design, isFullscreen, 'random');
  const raffleLook = monitorSelectTriggerLook(design, isFullscreen, 'raffle');
  const behaviorLook = monitorSelectTriggerLook(design, isFullscreen, 'behavior');
  const attendanceLook = monitorSelectTriggerLook(design, isFullscreen, 'attendance');
  const goldLook = monitorSelectTriggerLook(design, isFullscreen, 'gold');
  const groupsLook = monitorSelectTriggerLook(design, isFullscreen, 'groups');
  const iconInk = (ink: 'light' | 'dark' | 'amber') =>
    ink === 'dark' ? 'text-slate-900' : ink === 'amber' ? 'text-amber-300' : 'text-white';

  if (showIconRail) {
    const cardScan = attendanceSource === 'card-scan' && interactionMode !== 'attendance';
    return (
      <MonitorToolbarPlacementContext.Provider value={placement}>
        <motion.div
          key="classroom-monitor-icon-rail"
          layoutId="classroom-monitor-tabs"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { ...spring, staggerChildren: 0.04 } },
          }}
          className="flex h-full min-h-0 w-full flex-col items-center justify-start gap-1.5 overflow-x-hidden overflow-y-auto"
          data-testid="classroom-monitor-icon-rail"
        >
          {onToggleEditMode ? (
            <CollapsedToolIcon
              design={design}
              tone="arrange"
              label={editMode ? 'Done arranging' : 'Arrange seats'}
              title={editMode ? 'Done arranging seats' : 'Arrange seats — drag desks to match your room'}
              active={editMode}
              onClick={onToggleEditMode}
            >
              <GripVertical className="h-4 w-4" aria-hidden />
            </CollapsedToolIcon>
          ) : null}
          {liveAwardActions ? (
            <CollapsedToolIcon
              design={design}
              tone="gold"
              label="Awards"
              title="Hover to open awards and class tools"
              onClick={requestExpand}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
            </CollapsedToolIcon>
          ) : null}
          {onRandomPick ? (
            <CollapsedToolIcon
              design={design}
              tone="random"
              label="Random student picker"
              title="Pick a random student (R)"
              onClick={onRandomPick}
            >
              <Shuffle className="h-4 w-4" aria-hidden />
            </CollapsedToolIcon>
          ) : null}
          {showRaffle && onOpenRaffle ? (
            <CollapsedToolIcon
              design={design}
              tone="raffle"
              label="Raffle"
              title="Run a raffle for this class"
              active={raffleOpen}
              onClick={onOpenRaffle}
            >
              <Dices className="h-4 w-4" aria-hidden />
            </CollapsedToolIcon>
          ) : null}
          {onOpenBehavior ? (
            <CollapsedToolIcon
              design={design}
              tone="behavior"
              label="Behavior"
              title="Behavior notes for this class"
              active={behaviorOpen}
              onClick={onOpenBehavior}
            >
              <BookOpenCheck className="h-4 w-4" aria-hidden />
            </CollapsedToolIcon>
          ) : null}
          {attendanceEnabled && onAttendanceSourceChange ? (
            <CollapsedToolIcon
              design={design}
              tone="attendance"
              label={
                interactionMode === 'attendance'
                  ? 'Attendance: manual roll call. Open settings'
                  : cardScan
                    ? 'Attendance: Badge reader active. Open settings'
                    : 'Attendance settings'
              }
              title="Choose card scan or manual roll call — hover open for options"
              active={interactionMode === 'attendance'}
              onClick={requestExpand}
            >
              {cardScan ? <IdCard className="h-4 w-4" aria-hidden /> : <ClipboardCheck className="h-4 w-4" aria-hidden />}
            </CollapsedToolIcon>
          ) : null}
          <CollapsedToolIcon
            design={design}
            tone="sound"
            label={prefs.awardSounds !== false ? 'Turn award sounds off' : 'Turn award sounds on'}
            title={prefs.awardSounds !== false ? 'Award sounds on — click to mute' : 'Award sounds off — click to unmute'}
            active={prefs.awardSounds === false}
            onClick={() => onChange({ awardSounds: prefs.awardSounds === false })}
          >
            {prefs.awardSounds !== false ? (
              <Volume2 className="h-4 w-4" aria-hidden />
            ) : (
              <VolumeX className="h-4 w-4" aria-hidden />
            )}
          </CollapsedToolIcon>
          <ClassroomGroupTimer design={design} isFullscreen={isFullscreen} iconOnly />
          {onAssignGroups && onClearGroups ? (
            <CollapsedToolIcon
              design={design}
              tone="groups"
              label="Groups"
              title="Make classroom groups — hover open for options"
              active={Boolean(groups)}
              onClick={requestExpand}
            >
              <Users className="h-4 w-4" aria-hidden />
            </CollapsedToolIcon>
          ) : null}
          {onOpenSetup ? (
            <CollapsedToolIcon
              design={design}
              tone="menu"
              label="Setup and settings"
              title="School rules, poster TV, raffle setup, and more"
              active={setupOpen}
              onClick={onOpenSetup}
            >
              <Settings2 className="h-4 w-4" aria-hidden />
            </CollapsedToolIcon>
          ) : null}
        </motion.div>
      </MonitorToolbarPlacementContext.Provider>
    );
  }

  const arrangeButton = onToggleEditMode ? (
    <button
      type="button"
      data-look={design}
      style={arrangeLook.style}
      className={cn(
        arrangeLook.className,
        'inline-flex items-center gap-1 px-2 py-1.5 sm:px-2.5',
        isLeft && 'w-full justify-start',
        editMode && 'classroom-on-dark !bg-[#102033] !text-white ring-2 ring-[#f5c518]',
      )}
      aria-label={editMode ? 'Done arranging' : 'Arrange seats'}
      title={editMode ? 'Done arranging seats' : 'Arrange seats — drag desks to match your room'}
      onClick={onToggleEditMode}
    >
      <GripVertical className={cn('h-4 w-4 shrink-0', editMode ? 'text-white' : iconInk(arrangeLook.ink))} aria-hidden />
      <span>{editMode ? 'Done' : 'Arrange seats'}</span>
    </button>
  ) : null;

  const soundsButton = (
    <button
      type="button"
      data-look={design}
      style={soundLook.style}
      className={cn(
        soundLook.className,
        'inline-flex w-full items-center justify-start gap-2 px-2 py-1.5',
        prefs.awardSounds === false && 'opacity-80',
      )}
      aria-label={prefs.awardSounds !== false ? 'Turn award sounds off' : 'Turn award sounds on'}
      title={prefs.awardSounds !== false ? 'Award sounds on — click to mute' : 'Award sounds off — click to unmute'}
      onClick={() => onChange({ awardSounds: prefs.awardSounds === false })}
    >
      {prefs.awardSounds !== false ? (
        <Volume2 className={cn('h-4 w-4 shrink-0', iconInk(soundLook.ink))} aria-hidden />
      ) : (
        <VolumeX className={cn('h-4 w-4 shrink-0', iconInk(soundLook.ink))} aria-hidden />
      )}
      <span>Sound effects {prefs.awardSounds === false ? 'off' : 'on'}</span>
    </button>
  );

  const randomPickerButton = onRandomPick ? (
    <button
      type="button"
      data-look={design}
      style={randomLook.style}
      className={cn(
        randomLook.className,
        'inline-flex w-full items-center justify-start gap-2 px-2 py-1.5',
      )}
      aria-label="Random student picker"
      title="Pick a random student (R)"
      onClick={onRandomPick}
    >
      <Shuffle className={cn('h-4 w-4 shrink-0', iconInk(randomLook.ink))} aria-hidden />
      <span>Random student</span>
    </button>
  ) : null;

  const raffleButton = showRaffle && onOpenRaffle ? (
    <button
      type="button"
      data-look={design}
      style={raffleLook.style}
      className={cn(
        raffleLook.className,
        'inline-flex w-full items-center justify-start gap-2 px-2 py-1.5',
        raffleOpen && 'ring-2 ring-white/80',
      )}
      aria-label="Raffle"
      title="Run a raffle for this class"
      onClick={onOpenRaffle}
    >
      <Dices className={cn('h-4 w-4 shrink-0', iconInk(raffleLook.ink))} aria-hidden />
      <span>Raffle</span>
    </button>
  ) : null;

  const behaviorButton = onOpenBehavior ? (
    <button
      type="button"
      data-look={design}
      style={behaviorLook.style}
      className={cn(
        behaviorLook.className,
        'inline-flex w-full items-center justify-start gap-2 px-2 py-1.5',
        behaviorOpen && 'ring-2 ring-white/80',
      )}
      aria-label="Behavior"
      title="Behavior notes for this class"
      onClick={onOpenBehavior}
    >
      <BookOpenCheck className={cn('h-4 w-4 shrink-0', iconInk(behaviorLook.ink))} aria-hidden />
      <span>Behavior</span>
    </button>
  ) : null;

  const setupLook = monitorSelectTriggerLook(design, isFullscreen, 'groups');
  const setupButton = onOpenSetup ? (
    <button
      type="button"
      data-look={design}
      style={setupLook.style}
      className={cn(
        setupLook.className,
        'inline-flex w-full items-center justify-start gap-2 px-2 py-1.5',
        setupOpen && 'ring-2 ring-white/80',
      )}
      aria-label="Setup and settings"
      title="School rules, poster TV, raffle setup, and more"
      onClick={onOpenSetup}
    >
      <Settings2 className={cn('h-4 w-4 shrink-0', iconInk(setupLook.ink))} aria-hidden />
      <span>Setup &amp; more</span>
    </button>
  ) : null;

  return (
    <MonitorToolbarPlacementContext.Provider value={placement}>
      <motion.div
        key="classroom-monitor-full-panel"
        layoutId="classroom-monitor-tabs"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0, x: isLeft ? -12 : 0 },
          visible: {
            opacity: 1,
            x: 0,
            transition: { ...spring, staggerChildren: 0.05 },
          },
        }}
        className="flex h-full min-h-0 w-full flex-col items-stretch justify-start gap-1.5 overflow-x-hidden overflow-y-auto"
        data-testid="classroom-monitor-full-panel"
      >
        {editMode ? (
          <motion.section
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: spring } }}
            className="space-y-2"
          >
            <p className="px-0.5 text-[11px] font-black uppercase tracking-wide !text-foreground">
              Arrange classroom
            </p>
            {arrangeButton}
            {onSeatEveryone ? (
              <button
                type="button"
                data-look={design}
                style={goldLook.style}
                className={cn(
                  goldLook.className,
                  'inline-flex w-full items-center justify-start gap-2 px-2 py-2 sm:px-2.5',
                )}
                aria-label="Seat everyone"
                title="Put every student in this class back on a desk"
                onClick={onSeatEveryone}
              >
                <Users className={cn('h-4 w-4 shrink-0', iconInk(goldLook.ink))} aria-hidden />
                <span>Seat everyone</span>
              </button>
            ) : null}
            <p className="px-0.5 text-[11px] font-semibold leading-snug !text-foreground">
              Drag desks to match your room. Tap Done when you are finished.
            </p>
          </motion.section>
        ) : (
          <>
            <motion.section
              variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: spring } }}
              className="space-y-1.5"
            >
              {arrangeButton}
              {liveAwardActions ? (
                <div className="flex w-full flex-col items-stretch gap-1.5 [&_.classroom-monitor-action]:w-full [&_.classroom-whole-class-award]:w-full">
                  {liveAwardActions}
                </div>
              ) : null}
              {randomPickerButton}
              {raffleButton}
              {behaviorButton}
              {attendanceEnabled && onAttendanceSourceChange ? (
                <ClassroomAttendanceSourceControl
                  design={design}
                  isFullscreen={isFullscreen}
                  triggerStyle={attendanceLook.style}
                  triggerClassName={cn(
                    attendanceLook.className,
                    'inline-flex w-full items-center justify-start gap-2 px-2 py-1.5',
                  )}
                  source={attendanceSource}
                  takingAttendance={interactionMode === 'attendance'}
                  onSourceChange={onAttendanceSourceChange}
                  onStartNewClass={onStartNewClass}
                />
              ) : null}
              {soundsButton}
              <ClassroomGroupTimer design={design} isFullscreen={isFullscreen} />
              {onAssignGroups && onClearGroups ? (
                <ClassroomGroupsTool
                  triggerStyle={groupsLook.style}
                  triggerClassName={cn(
                    groupsLook.className,
                    'inline-flex w-full items-center justify-start gap-1.5 px-2 py-1.5',
                  )}
                  groups={groups}
                  onAssign={onAssignGroups}
                  onClear={onClearGroups}
                />
              ) : null}
              {setupButton ? (
                <motion.div
                  variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: spring } }}
                  className="mt-1 border-t border-black/10 pt-1.5"
                >
                  {setupButton}
                </motion.div>
              ) : null}
            </motion.section>
          </>
        )}
      </motion.div>
    </MonitorToolbarPlacementContext.Provider>
  );
}
