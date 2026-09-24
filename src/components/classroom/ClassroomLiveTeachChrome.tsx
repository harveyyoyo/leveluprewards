'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Cast,
  ChevronDown,
  GraduationCap,
  Home,
  RotateCcw,
  Users,
} from 'lucide-react';
import { ClassroomAppearancePopover } from '@/components/classroom/ClassroomAppearancePopover';
import { ClassroomAwardsEffectsPopover } from '@/components/classroom/ClassroomAwardsEffectsPopover';
import { ClassroomLiveCheatsheetTrigger } from '@/components/classroom/ClassroomLiveCheatsheet';
import { ClassroomShortcutsModal, ClassroomShortcutsTrigger } from '@/components/classroom/ClassroomShortcutsModal';
import {
  loadClassroomLiveCheatsheetShown,
  saveClassroomLiveCheatsheetShown,
} from '@/lib/classroom/classroomLiveCheatsheet';
import { ClassroomWhosOutPulse } from '@/components/classroom/ClassroomWhosOutPulse';
import type { ClassroomWhosOutPass } from '@/lib/classroom/classroomWhosOutPasses';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { classroomPortalHomeHref } from '@/lib/classroomRealmUrl';
import {
  CLASSROOM_ALL_STUDENTS_FILTER_ID,
  CLASSROOM_ALL_STUDENTS_LABEL,
} from '@/lib/classroom/classroomTabSections';
import type { ClassroomSeatingPrefs } from '@/lib/classroomSeatingChart';
import type { ClassroomSeatingShortcutsHintState } from '@/components/points/classroomSeatingShortcutsHint';
import type { Class } from '@/lib/types';
import { cn } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };

const iconBtnClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20';

/** Light pills on the dark header — force dark ink so words never vanish. */
const headerChipInk =
  'classroom-light-ink classroom-header-chip classroom-readable tracking-normal !text-[#102033]';

export type ClassroomLiveHeaderControls = {
  classScreenUrl: string | null;
  onResetSessionDisplay: () => void;
  appearance: {
    prefs: ClassroomSeatingPrefs;
    rewardsPillarOn: boolean;
    onChange: (patch: Partial<ClassroomSeatingPrefs>) => void;
  };
  shortcutHint: ClassroomSeatingShortcutsHintState;
  attendance?: {
    present: number;
    total: number;
    enabled: boolean;
    active?: boolean;
    source?: 'card-scan' | 'manual';
    onOpen: () => void;
    onManualRollCall?: () => void;
  };
  arranging?: boolean;
};

export function ClassroomLiveTeachChrome({
  schoolId,
  classId,
  classNameLabel,
  classes = [],
  sessionPoints,
  passes,
  bathroomMaxMinutes,
  onReturn,
  onClassChange,
  headerControls,
}: {
  schoolId: string;
  classId: string;
  classNameLabel: string;
  classes?: Class[];
  scope: string;
  sessionPoints: number;
  passes: ClassroomWhosOutPass[];
  bathroomMaxMinutes: number;
  onReturn: (studentId: string) => void;
  onClassChange?: (classId: string) => void;
  headerControls?: ClassroomLiveHeaderControls | null;
}) {
  const sorted = classes.slice().sort((a, b) => a.name.localeCompare(b.name));
  const viewingAll = classId === CLASSROOM_ALL_STUDENTS_FILTER_ID;
  const pickerLabel = viewingAll ? CLASSROOM_ALL_STUDENTS_LABEL : classNameLabel;
  const attendance = headerControls?.attendance;
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);

  useEffect(() => {
    setCheatsheetOpen(loadClassroomLiveCheatsheetShown());
  }, []);

  return (
    <motion.div
      layoutId="classroom-teach-now"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0, y: -10 },
        visible: { opacity: 1, y: 0, transition: { ...spring, staggerChildren: 0.05 } },
      }}
      style={{
        backgroundColor: 'var(--theme-header-bg, undefined)',
        borderColor: 'var(--theme-header-border, undefined)',
        color: 'var(--theme-header-text, undefined)',
        fontFamily: 'var(--theme-font-heading, inherit)',
      }}
      className={cn(
        'relative z-20 flex min-h-[68px] shrink-0 flex-wrap items-center gap-x-3 gap-y-2 overflow-hidden border-b border-white/10 px-3 py-2',
        !headerControls?.appearance?.prefs?.themeKitSlug && 'bg-gradient-to-r from-[#0b1424] via-[#121a32] to-[#0c1528]',
      )}
    >
      <motion.div
        variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: spring } }}
        className="flex min-w-0 shrink-0 items-center gap-2"
      >
        <Link
          href={classroomPortalHomeHref(schoolId)}
          aria-label="Home"
          title="Home"
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/12 text-white hover:bg-white/20"
        >
          <Home className="h-5 w-5" aria-hidden />
        </Link>
        {onClassChange && sorted.length > 0 ? (
          <Popover modal>
            <PopoverTrigger asChild>
              <button
                type="button"
                style={{ fontFamily: 'var(--theme-font-heading, inherit)' }}
                className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-white/20 bg-white/10 px-3 text-sm font-black text-white"
                aria-label="Switch class"
              >
                {viewingAll ? (
                  <Users className="h-4 w-4 shrink-0" aria-hidden />
                ) : (
                  <GraduationCap className="h-4 w-4 shrink-0" aria-hidden />
                )}
                <span className="max-w-[10rem] truncate">{pickerLabel}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
              </button>
            </PopoverTrigger>
            <PopoverContent className="z-[500] w-56 rounded-xl p-3" align="start" collisionPadding={12}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Class</p>
              <div className="space-y-1">
                <button
                  type="button"
                  className={cn(
                    'w-full rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted',
                    viewingAll && 'bg-primary/10 ring-1 ring-primary/30',
                  )}
                  onClick={() => onClassChange(CLASSROOM_ALL_STUDENTS_FILTER_ID)}
                >
                  <span className="font-semibold">{CLASSROOM_ALL_STUDENTS_LABEL}</span>
                  <span className="block text-xs text-muted-foreground">Every student you can see</span>
                </button>
                {sorted.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={cn(
                      'w-full rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted',
                      classId === c.id && 'bg-primary/10 ring-1 ring-primary/30',
                    )}
                    onClick={() => onClassChange(c.id)}
                  >
                    <span className="font-semibold">{c.name}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <p className="text-sm font-black text-white">{classNameLabel}</p>
        )}
      </motion.div>

      <motion.div
        variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: spring } }}
        className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-2"
      >
        {attendance?.enabled ? (
          <button
            type="button"
            onClick={attendance.source === 'card-scan' && !attendance.active ? undefined : attendance.onOpen}
            className={cn(
              headerChipInk,
              'inline-flex h-8 min-w-0 max-w-full items-center overflow-hidden whitespace-nowrap rounded-full border px-3 text-xs font-bold tracking-normal !text-[#102033]',
              attendance.active ? 'border-sky-400 bg-sky-100' : 'border-emerald-400 bg-emerald-100',
            )}
            aria-label={
              attendance.active
                ? `${attendance.present} of ${attendance.total} here. Roll call`
                : attendance.source === 'card-scan'
                  ? `${attendance.present} of ${attendance.total} here. Card scan`
                  : `${attendance.present} of ${attendance.total} here. Manual`
            }
            title={
              attendance.source === 'card-scan' && !attendance.active
                ? 'Kids checking in on cards update this count'
                : 'Take attendance'
            }
          >
            <span className="min-w-0 truncate">
              {`${
                attendance.present === attendance.total
                  ? `${attendance.present} Here`
                  : `${attendance.present}/${attendance.total} Here`
              } · ${
                attendance.active
                  ? 'Roll call'
                  : attendance.source === 'card-scan'
                    ? 'Cards'
                    : 'Manual'
              }`}
            </span>
          </button>
        ) : null}
        <ClassroomWhosOutPulse
          variant="chip"
          passes={passes}
          maxMinutes={bathroomMaxMinutes}
          onReturn={onReturn}
        />
      </motion.div>

      <motion.div
        variants={{ hidden: { opacity: 0, x: 8 }, visible: { opacity: 1, x: 0, transition: spring } }}
        className="flex shrink-0 items-center justify-end gap-2"
      >
        <span
          style={{ fontFamily: 'var(--theme-font-heading, inherit)' }}
          className={cn(
            headerChipInk,
            'inline-flex h-8 shrink-0 items-center rounded-full border border-amber-400 bg-amber-100 px-3 py-1.5 text-xs font-bold tabular-nums tracking-normal',
          )}
        >
          +{sessionPoints} pts
        </span>
        {headerControls?.appearance ? (
          <>
            <ClassroomAppearancePopover
              prefs={headerControls.appearance.prefs}
              rewardsPillarOn={headerControls.appearance.rewardsPillarOn}
              onChange={headerControls.appearance.onChange}
              triggerClassName="inline-flex h-8 items-center justify-center rounded-full border border-white/20 bg-white/10 px-2.5 text-xs font-bold text-white hover:bg-white/20 gap-1.5"
            />
            <ClassroomAwardsEffectsPopover
              prefs={headerControls.appearance.prefs}
              onChange={headerControls.appearance.onChange}
              triggerClassName={iconBtnClass}
              iconOnly
            />
          </>
        ) : null}
        {headerControls?.onResetSessionDisplay ? (
          <button
            type="button"
            className={iconBtnClass}
            aria-label="Reset screen"
            title="Clear on-screen session totals. Student points stay the same."
            onClick={headerControls.onResetSessionDisplay}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
        {headerControls?.classScreenUrl ? (
          <a
            href={headerControls.classScreenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-violet-700 px-3 text-xs font-black text-white no-underline hover:bg-violet-600"
            aria-label="Projector view"
            title="Open the clean class screen on another display"
          >
            <Cast className="h-4 w-4 shrink-0" aria-hidden />
            Projector
          </a>
        ) : null}
        {headerControls?.shortcutHint ? (
          <>
            <ClassroomLiveCheatsheetTrigger
              visible={cheatsheetOpen}
              onShow={() => {
                saveClassroomLiveCheatsheetShown(true);
                setCheatsheetOpen(true);
              }}
            />
            <ClassroomShortcutsTrigger onOpen={() => setShortcutsOpen(true)} />
            <ClassroomShortcutsModal
              open={shortcutsOpen}
              onOpenChange={setShortcutsOpen}
              tapPoints={headerControls.shortcutHint.prefs.defaultPoints ?? 5}
              showOnScreen={cheatsheetOpen}
              onShowOnScreenChange={(show) => {
                saveClassroomLiveCheatsheetShown(show);
                setCheatsheetOpen(show);
              }}
            />
          </>
        ) : null}
      </motion.div>
    </motion.div>
  );
}
