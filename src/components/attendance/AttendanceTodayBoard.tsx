'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  ClipboardCopy,
  Loader2,
  PlusCircle,
  Radio,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { collection, orderBy, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { AttendanceLogEntry, AttendanceScheduleSlot, AttendanceSettings, Class, Student, Teacher } from '@/lib/types';
import { getAttendanceConfig, recordManualAttendance, updateAttendanceStatus } from '@/lib/db/attendance';
import { getSchoolDayClock } from '@/lib/attendance/schoolDayClock';
import {
  ATTENDANCE_MARK_LABEL,
  attendanceMarkOf,
  classesForTeacher,
  latestLogByStudent,
  studentDisplayName,
  studentsForTeacher,
  type AttendanceMark,
} from '@/lib/attendance/attendanceStatus';
import { useMinuteClock } from '@/hooks/useMinuteClock';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

export interface AttendanceTodayBoardProps {
  schoolId: string;
  students: Student[];
  classes: Class[];
  teachers?: Teacher[];
  periods?: AttendanceScheduleSlot[];
  /** School attendance settings. Loaded here when the page doesn't pass them (teacher portal). */
  attendanceConfig?: AttendanceSettings | null;
  teacherIdScope?: string;
  variant?: 'admin' | 'teacher';
}

type StatusFilter = 'all' | 'absent' | AttendanceMark;

const MARK_STYLES: Record<AttendanceMark | 'absent', { chip: string; dot: string; icon: React.ElementType }> = {
  'on-time': {
    chip: 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  late: {
    chip: 'bg-amber-500/12 text-amber-800 ring-amber-500/30 dark:text-amber-300',
    dot: 'bg-amber-500',
    icon: Clock,
  },
  excused: {
    chip: 'bg-sky-500/12 text-sky-700 ring-sky-500/25 dark:text-sky-300',
    dot: 'bg-sky-500',
    icon: ShieldCheck,
  },
  absent: {
    chip: 'bg-muted text-muted-foreground ring-border',
    dot: 'bg-muted-foreground/40',
    icon: UserX,
  },
};

function parseTimeToMinutes(hhmm: string): number | null {
  const m = (hhmm || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** "8:05 AM" from "08:05". */
function formatClockTime(hhmm: string): string {
  const mins = parseTimeToMinutes(hhmm);
  if (mins == null) return hhmm;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function initials(s: Student): string {
  const a = (s.firstName || s.nickname || '?').trim()[0] ?? '?';
  const b = (s.lastName || '').trim()[0] ?? '';
  return (a + b).toUpperCase();
}

function StatusChip({ mark }: { mark: AttendanceMark | 'absent' }) {
  const style = MARK_STYLES[mark];
  const Icon = style.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset', style.chip)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {ATTENDANCE_MARK_LABEL[mark]}
    </span>
  );
}

/** Ring showing the share of students in so far. */
function ProgressRing({ value, size = 88 }: { value: number; size?: number }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (clamped / 100) * c}
          className="fill-none stroke-emerald-500 transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black leading-none">{clamped}%</span>
        <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">here</span>
      </div>
    </div>
  );
}

export function AttendanceTodayBoard({
  schoolId,
  students,
  classes,
  periods = [],
  attendanceConfig: attendanceConfigProp,
  teacherIdScope,
  variant = 'admin',
}: AttendanceTodayBoardProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  // The teacher portal doesn't pass school settings; load them so points and time zone match the school.
  const [loadedConfig, setLoadedConfig] = useState<AttendanceSettings | null>(null);
  useEffect(() => {
    if (attendanceConfigProp !== undefined || !schoolId || !firestore) return;
    let cancelled = false;
    getAttendanceConfig(firestore, schoolId)
      .then((c) => {
        if (!cancelled) setLoadedConfig(c);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [attendanceConfigProp, firestore, schoolId]);
  const attendanceConfig = attendanceConfigProp !== undefined ? attendanceConfigProp : loadedConfig;
  const timeZone = attendanceConfig?.attendanceTimeZone;
  const pointsForSignIn = attendanceConfig?.pointsForSignIn ?? 1;
  const pointsForOnTime = attendanceConfig?.pointsForOnTime ?? 5;
  const defaultPointsFor = (mark: AttendanceMark) =>
    mark === 'on-time' ? pointsForSignIn + pointsForOnTime : pointsForSignIn;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<'roster' | 'feed'>('roster');

  // Manual check-in dialog
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInStudentId, setCheckInStudentId] = useState<string>('');
  const [checkInStatus, setCheckInStatus] = useState<AttendanceMark>('on-time');
  const [checkInPeriod, setCheckInPeriod] = useState<string>('auto');
  const [checkInCustomPoints, setCheckInCustomPoints] = useState<string>('');
  const [checkInNote, setCheckInNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [busyStudentId, setBusyStudentId] = useState<string | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  // Ticks every minute so the current period and "today" keep up on a board left open all day.
  // Uses the school's time zone when one is set, otherwise this screen's clock.
  const nowMs = useMinuteClock();
  const schoolClock = getSchoolDayClock(nowMs, timeZone, { whenUnset: 'local' });
  const nowMin = schoolClock.minutesSinceMidnight;
  const startOfDay = nowMs - nowMin * 60_000;

  const formatLogTime = (ms: number) => {
    try {
      return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', ...(timeZone ? { timeZone } : {}) });
    } catch {
      return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
  };

  // Every check-in since midnight, live.
  const logQuery = useMemoFirebase(
    () =>
      schoolId
        ? query(
            collection(firestore, 'schools', schoolId, 'attendanceLog'),
            where('signedInAt', '>=', startOfDay),
            orderBy('signedInAt', 'desc')
          )
        : null,
    [firestore, schoolId, startOfDay]
  );
  const { data: todayLogsRaw, isLoading: logsLoading, error: logsError } = useCollection<AttendanceLogEntry>(logQuery);
  const todayLogs = useMemo(() => todayLogsRaw || [], [todayLogsRaw]);
  const todayStudentLogMap = useMemo(() => latestLogByStudent(todayLogs), [todayLogs]);

  const sortedPeriods = useMemo(
    () =>
      periods
        .map((p) => ({ p, start: parseTimeToMinutes(p.startTime), end: parseTimeToMinutes(p.endTime) }))
        .filter((x): x is { p: AttendanceScheduleSlot; start: number; end: number } => x.start != null && x.end != null)
        .sort((a, b) => a.start - b.start),
    [periods]
  );
  const activePeriod = useMemo(
    () => sortedPeriods.find((x) => nowMin >= x.start && nowMin <= x.end)?.p,
    [sortedPeriods, nowMin]
  );
  const nextPeriod = useMemo(() => sortedPeriods.find((x) => x.start > nowMin), [sortedPeriods, nowMin]);

  const teacherScope = variant === 'teacher' ? teacherIdScope : undefined;
  const scopedClasses = useMemo(
    () => classesForTeacher(classes, teacherScope).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [classes, teacherScope]
  );
  const scopedStudents = useMemo(
    () => studentsForTeacher(students || [], classes, teacherScope),
    [students, classes, teacherScope]
  );
  const classNameById = useMemo(() => new Map(classes.map((c) => [c.id, c.name || 'Class'])), [classes]);

  const markFor = (studentId: string): AttendanceMark | 'absent' => {
    const log = todayStudentLogMap.get(studentId);
    return log ? attendanceMarkOf(log) : 'absent';
  };

  // Students in the chosen class (before the status filter), used for stats and the bulk action.
  const classStudents = useMemo(
    () => (selectedClassId === 'all' ? scopedStudents : scopedStudents.filter((s) => s.classId === selectedClassId)),
    [scopedStudents, selectedClassId]
  );

  const stats = useMemo(() => {
    const out = { total: classStudents.length, present: 0, 'on-time': 0, late: 0, excused: 0, absent: 0 };
    for (const s of classStudents) {
      const log = todayStudentLogMap.get(s.id);
      if (!log) {
        out.absent += 1;
        continue;
      }
      out.present += 1;
      out[attendanceMarkOf(log)] += 1;
    }
    const rate = out.total > 0 ? Math.round((out.present / out.total) * 100) : 0;
    return { ...out, rate };
  }, [classStudents, todayStudentLogMap]);

  const perClass = useMemo(
    () =>
      scopedClasses.map((c) => {
        const inClass = scopedStudents.filter((s) => s.classId === c.id);
        const here = inClass.filter((s) => todayStudentLogMap.has(s.id)).length;
        return { cls: c, here, total: inClass.length };
      }),
    [scopedClasses, scopedStudents, todayStudentLogMap]
  );

  const displayedStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return classStudents
      .filter((student) => {
        if (q) {
          const name = `${student.firstName || ''} ${student.lastName || ''} ${student.nickname || ''}`.toLowerCase();
          if (!name.includes(q)) return false;
        }
        if (selectedStatus === 'all') return true;
        return markFor(student.id) === selectedStatus;
      })
      .sort((a, b) => {
        // Not-yet-in first so the people who still need attention are on top.
        const ai = todayStudentLogMap.has(a.id) ? 1 : 0;
        const bi = todayStudentLogMap.has(b.id) ? 1 : 0;
        if (ai !== bi) return ai - bi;
        return studentDisplayName(a).localeCompare(studentDisplayName(b));
      });
    // markFor reads todayStudentLogMap, which is in the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classStudents, searchQuery, selectedStatus, todayStudentLogMap]);

  const periodLabelNow = activePeriod?.label || 'Homeroom';

  const recordCheckIn = async (student: Student, status: AttendanceMark, opts?: { points?: number; periodLabel?: string; note?: string }) => {
    return recordManualAttendance(firestore, schoolId, student.id, student, {
      status,
      points: opts?.points ?? defaultPointsFor(status),
      periodLabel: opts?.periodLabel ?? periodLabelNow,
      teacherId: teacherIdScope,
      note: opts?.note,
      attendanceTimeZone: timeZone,
      categoryId: attendanceConfig?.categoryId,
    });
  };

  const handleQuickCheckIn = async (student: Student, status: AttendanceMark) => {
    if (!schoolId) return;
    setBusyStudentId(student.id);
    try {
      const res = await recordCheckIn(student, status);
      const first = student.firstName || 'Student';
      if (!res.success && res.reason === 'already_checked_in') {
        toast({ title: 'Already checked in', description: `${first} is already checked in for this class period.` });
      } else {
        toast({
          title: `${first}: ${ATTENDANCE_MARK_LABEL[status].toLowerCase()}`,
          description: `+${res.pointsAwarded} attendance points.`,
        });
      }
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Check-in failed',
        description: e instanceof Error ? e.message : 'Could not record attendance.',
      });
    } finally {
      setBusyStudentId(null);
    }
  };

  const handleChangeStatus = async (student: Student, status: AttendanceMark) => {
    const log = todayStudentLogMap.get(student.id);
    if (!log?.id) return;
    setBusyStudentId(student.id);
    try {
      await updateAttendanceStatus(firestore, schoolId, log.id, status);
      toast({
        title: `${student.firstName || 'Student'} changed to ${ATTENDANCE_MARK_LABEL[status].toLowerCase()}`,
        description: 'Points already given stay the same.',
      });
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not change that',
        description: e instanceof Error ? e.message : 'Try again in a moment.',
      });
    } finally {
      setBusyStudentId(null);
    }
  };

  const handleSubmitManualCheckIn = async () => {
    const student = scopedStudents.find((s) => s.id === checkInStudentId);
    if (!schoolId || !student) {
      toast({ variant: 'destructive', title: 'Pick a student first' });
      return;
    }
    setIsSubmitting(true);
    try {
      const parsed = parseInt(checkInCustomPoints, 10);
      const points = Number.isNaN(parsed) ? defaultPointsFor(checkInStatus) : Math.max(0, parsed);
      const periodLabel =
        checkInPeriod === 'auto' ? periodLabelNow : checkInPeriod === 'none' ? undefined : checkInPeriod;
      const res = await recordCheckIn(student, checkInStatus, {
        points,
        periodLabel,
        note: checkInNote.trim() || undefined,
      });
      if (!res.success && res.reason === 'already_checked_in') {
        toast({
          title: 'Already recorded',
          description: `${student.firstName || 'Student'} was already checked in for that class period.`,
        });
        return;
      }
      toast({ title: 'Checked in', description: `${studentDisplayName(student)} · +${points} points.` });
      setIsCheckInOpen(false);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not check in',
        description: e instanceof Error ? e.message : 'Could not save check-in.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openManualCheckIn = (studentId?: string) => {
    setCheckInStudentId(studentId ?? '');
    setCheckInStatus('on-time');
    setCheckInPeriod('auto');
    setCheckInCustomPoints(String(defaultPointsFor('on-time')));
    setCheckInNote('');
    setIsCheckInOpen(true);
  };

  const notInYet = classStudents.filter((s) => !todayStudentLogMap.has(s.id));

  const handleMarkRestPresent = async () => {
    setBulkConfirmOpen(false);
    const list = notInYet.slice();
    if (!list.length) return;
    setBulkProgress({ done: 0, total: list.length });
    let failed = 0;
    for (let i = 0; i < list.length; i += 1) {
      try {
        await recordCheckIn(list[i], 'on-time');
      } catch {
        failed += 1;
      }
      setBulkProgress({ done: i + 1, total: list.length });
    }
    setBulkProgress(null);
    toast({
      variant: failed ? 'destructive' : undefined,
      title: failed ? `${list.length - failed} checked in, ${failed} did not save` : `${list.length} students checked in`,
      description: failed ? 'Try the missing ones again from their rows.' : 'Everyone left in this class is marked on time.',
    });
  };

  const handleCopyNames = async () => {
    const lines = displayedStudents.map((s) => {
      const cls = s.classId ? classNameById.get(s.classId) : undefined;
      return cls ? `${studentDisplayName(s)} (${cls})` : studentDisplayName(s);
    });
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast({ title: `Copied ${lines.length} names`, description: 'Paste them into an email or message.' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy', description: 'Your browser blocked copying.' });
    }
  };

  const selectedClassName = selectedClassId === 'all' ? null : classNameById.get(selectedClassId);
  const statusFilters: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Everyone', count: stats.total },
    { id: 'absent', label: 'Not in yet', count: stats.absent },
    { id: 'on-time', label: 'On time', count: stats['on-time'] },
    { id: 'late', label: 'Late', count: stats.late },
    { id: 'excused', label: 'Excused', count: stats.excused },
  ];
  const checkInStudent = scopedStudents.find((s) => s.id === checkInStudentId);
  const checkInStudentAlreadyIn = checkInStudent ? todayStudentLogMap.has(checkInStudent.id) : false;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-emerald-500/[0.08] via-background to-primary/[0.06] p-5">
          <div className="flex flex-wrap items-center gap-5">
            <ProgressRing value={stats.rate} />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {selectedClassName ? selectedClassName : variant === 'teacher' ? 'My classes' : 'Whole school'} · today
              </p>
              <p className="text-2xl font-black leading-tight sm:text-3xl">
                {stats.present} <span className="text-muted-foreground font-bold">of</span> {stats.total}{' '}
                <span className="text-base font-bold text-muted-foreground sm:text-lg">checked in</span>
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm">
                {(['on-time', 'late', 'excused'] as const).map((m) => (
                  <span key={m} className="inline-flex items-center gap-1.5 font-semibold">
                    <span className={cn('h-2.5 w-2.5 rounded-full', MARK_STYLES[m].dot)} aria-hidden="true" />
                    {stats[m]} {ATTENDANCE_MARK_LABEL[m].toLowerCase()}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground">
                  <span className={cn('h-2.5 w-2.5 rounded-full', MARK_STYLES.absent.dot)} aria-hidden="true" />
                  {stats.absent} not in yet
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-3xl border bg-card p-5">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                activePeriod ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'
              )}
            >
              {activePeriod ? <Radio className="h-5 w-5" aria-hidden="true" /> : <Clock className="h-5 w-5" aria-hidden="true" />}
            </div>
            <div className="min-w-0">
              <p className="text-base font-black leading-tight">
                {activePeriod ? activePeriod.label : 'Between class periods'}
                {activePeriod && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 align-middle text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Now
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {activePeriod
                  ? `${formatClockTime(activePeriod.startTime)} – ${formatClockTime(activePeriod.endTime)}`
                  : nextPeriod
                    ? `Next: ${nextPeriod.p.label} at ${formatClockTime(nextPeriod.p.startTime)}`
                    : periods.length
                      ? 'No more class periods today'
                      : 'No bell schedule set up yet'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => openManualCheckIn()} className="flex-1 gap-2 rounded-xl font-black shadow-sm">
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              Check in a student
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-1.5 rounded-xl font-bold">
                  More <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-xs">
                  {selectedClassName ? selectedClassName : 'Pick a class below for class actions'}
                </DropdownMenuLabel>
                <DropdownMenuItem
                  disabled={!selectedClassName || notInYet.length === 0 || !!bulkProgress}
                  onSelect={() => setBulkConfirmOpen(true)}
                >
                  <UserCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                  Mark everyone else here ({selectedClassName ? notInYet.length : 0})
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={displayedStudents.length === 0} onSelect={() => void handleCopyNames()}>
                  <ClipboardCopy className="mr-2 h-4 w-4" aria-hidden="true" />
                  Copy names in this list ({displayedStudents.length})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {bulkProgress && (
            <div className="space-y-1" role="status">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.round((bulkProgress.done / bulkProgress.total) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Checking in {bulkProgress.done} of {bulkProgress.total}…
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Classes at a glance */}
      {perClass.length > 1 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [contain:inline-size]" role="group" aria-label="Filter by class">
          <button
            type="button"
            onClick={() => setSelectedClassId('all')}
            className={cn(
              'shrink-0 rounded-2xl border px-3.5 py-2 text-left transition-colors',
              selectedClassId === 'all' ? 'border-primary bg-primary/10' : 'bg-card hover:bg-muted/50'
            )}
            aria-pressed={selectedClassId === 'all'}
          >
            <span className="block text-xs font-black">All classes</span>
            <span className="block text-[11px] text-muted-foreground">{scopedStudents.length} students</span>
          </button>
          {perClass.map(({ cls, here, total }) => {
            const pct = total ? Math.round((here / total) * 100) : 0;
            const active = selectedClassId === cls.id;
            return (
              <button
                key={cls.id}
                type="button"
                onClick={() => setSelectedClassId(active ? 'all' : cls.id)}
                className={cn(
                  'w-36 shrink-0 rounded-2xl border px-3.5 py-2 text-left transition-colors',
                  active ? 'border-primary bg-primary/10' : 'bg-card hover:bg-muted/50'
                )}
                aria-pressed={active}
              >
                <span className="block truncate text-xs font-black">{cls.name}</span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn('block h-full rounded-full', pct === 100 ? 'bg-emerald-500' : 'bg-primary')}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="mt-1 block text-[11px] font-semibold text-muted-foreground">
                  {here}/{total} in
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-3 md:flex-row md:items-center">
        <div className="relative md:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Find a student"
            aria-label="Find a student"
            className="h-10 rounded-xl bg-background pl-9 pr-8"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {perClass.length <= 1 && scopedClasses.length > 0 && (
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="h-10 rounded-xl bg-background md:w-48" aria-label="Class">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {scopedClasses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [contain:inline-size] md:[contain:none]" role="group" aria-label="Filter by status">
          {statusFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedStatus(f.id)}
              aria-pressed={selectedStatus === f.id}
              className={cn(
                'shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-colors',
                selectedStatus === f.id
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground'
              )}
            >
              {f.label} <span className="opacity-70">{f.count}</span>
            </button>
          ))}
        </div>

        <div className="flex shrink-0 gap-1 rounded-xl border bg-background p-1">
          {(['roster', 'feed'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              aria-pressed={viewMode === mode}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
                viewMode === mode ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {mode === 'roster' ? 'Students' : `Live feed · ${todayLogs.length}`}
            </button>
          ))}
        </div>
      </div>

      {logsError && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-sm" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <p className="font-bold">Couldn&apos;t load today&apos;s check-ins</p>
            <p className="text-xs text-muted-foreground">
              Everyone may look &quot;not in yet&quot; until it loads. Check the internet connection, then reload the page.
            </p>
          </div>
        </div>
      )}

      {/* Students */}
      {viewMode === 'roster' && (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          {logsLoading && !todayLogsRaw ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading today&apos;s check-ins…
            </div>
          ) : displayedStudents.length === 0 ? (
            <div className="space-y-2 p-12 text-center text-muted-foreground">
              {selectedStatus === 'absent' && classStudents.length > 0 ? (
                <>
                  <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" aria-hidden="true" />
                  <p className="text-base font-bold text-foreground">Everyone is in!</p>
                  <p className="text-xs">No one is missing{selectedClassName ? ` from ${selectedClassName}` : ''} right now.</p>
                </>
              ) : (
                <>
                  <Users className="mx-auto h-8 w-8 opacity-40" aria-hidden="true" />
                  <p className="text-base font-bold">No students match</p>
                  <p className="text-xs">Try clearing the search or picking a different class.</p>
                </>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {displayedStudents.map((student) => {
                const log = todayStudentLogMap.get(student.id);
                const mark = markFor(student.id);
                const isBusy = busyStudentId === student.id;
                const cls = student.classId ? classNameById.get(student.classId) : undefined;
                return (
                  <li
                    key={student.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-muted/20"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div
                        className={cn(
                          'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black',
                          log ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'
                        )}
                        aria-hidden="true"
                      >
                        {initials(student)}
                        <span
                          className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card', MARK_STYLES[mark].dot)}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-foreground">{studentDisplayName(student)}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {cls || 'No class'}
                          {log && (
                            <>
                              {' · '}
                              {formatLogTime(log.signedInAt)}
                              {log.periodLabel ? ` · ${log.periodLabel}` : ''}
                              {log.manual ? ' · by staff' : ''}
                            </>
                          )}
                        </p>
                        {log?.note && <p className="truncate text-xs italic text-muted-foreground">“{log.note}”</p>}
                      </div>
                    </div>

                    <div className={cn('flex items-center gap-2', !log && 'hidden sm:flex')}>
                      <StatusChip mark={mark} />
                      {log && (
                        <span className="w-14 text-right text-xs font-black text-primary">+{log.pointsAwarded ?? 0}</span>
                      )}
                    </div>

                    <div className="flex w-full items-center justify-end gap-1.5 sm:w-auto">
                      {isBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Saving" />
                      ) : !log ? (
                        <>
                          <Button
                            size="sm"
                            className="h-9 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white hover:bg-emerald-700"
                            onClick={() => void handleQuickCheckIn(student, 'on-time')}
                          >
                            Here
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 rounded-xl border-amber-500/40 text-xs font-bold text-amber-800 hover:bg-amber-500/10 dark:text-amber-300"
                            onClick={() => void handleQuickCheckIn(student, 'late')}
                          >
                            Late
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 rounded-xl text-xs font-semibold text-muted-foreground"
                            onClick={() => openManualCheckIn(student.id)}
                          >
                            More…
                          </Button>
                        </>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-9 gap-1 rounded-xl text-xs font-semibold text-muted-foreground">
                              Change <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="text-xs">Change today&apos;s status</DropdownMenuLabel>
                            {(['on-time', 'late', 'excused'] as const).map((m) => (
                              <DropdownMenuItem
                                key={m}
                                disabled={m === mark}
                                onSelect={() => void handleChangeStatus(student, m)}
                              >
                                <span className={cn('mr-2 h-2.5 w-2.5 rounded-full', MARK_STYLES[m].dot)} aria-hidden="true" />
                                {ATTENDANCE_MARK_LABEL[m]}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Live feed */}
      {viewMode === 'feed' && (
        <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between border-b pb-3">
            <h4 className="flex items-center gap-2 text-sm font-bold">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
              Check-ins today
            </h4>
            <span className="text-xs text-muted-foreground">Newest first</span>
          </div>
          {todayLogs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No check-ins yet today. They show up here the moment students sign in.
            </p>
          ) : (
            <ol className="relative space-y-1 border-l border-border/70 pl-5">
              {todayLogs.map((entry) => {
                const mark = attendanceMarkOf(entry);
                return (
                  <li key={entry.id ?? `${entry.studentId}_${entry.signedInAt}`} className="relative py-2">
                    <span
                      className={cn('absolute -left-[26px] top-3.5 h-3 w-3 rounded-full ring-4 ring-card', MARK_STYLES[mark].dot)}
                      aria-hidden="true"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{entry.studentName || entry.studentId}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatLogTime(entry.signedInAt)}
                          {entry.periodLabel ? ` · ${entry.periodLabel}` : ''}
                          {entry.manual ? ' · by staff' : ' · signed in'}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusChip mark={mark} />
                        <span className="w-10 text-right text-xs font-black text-primary">+{entry.pointsAwarded ?? 0}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      {/* Mark everyone else present */}
      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark everyone else in {selectedClassName} as here?</AlertDialogTitle>
            <AlertDialogDescription>
              {notInYet.length} {notInYet.length === 1 ? 'student' : 'students'} who haven&apos;t checked in will be
              marked on time for {periodLabelNow} and get {defaultPointsFor('on-time')} points each. You can change
              anyone afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleMarkRestPresent()}>Mark {notInYet.length} here</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manual check-in */}
      <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Check in a student</DialogTitle>
            <DialogDescription className="text-xs">
              For a forgotten card, a late arrival with a note, or a student sent from the office.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Student</Label>
              {checkInStudent ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                      {initials(checkInStudent)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{studentDisplayName(checkInStudent)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {checkInStudent.classId ? classNameById.get(checkInStudent.classId) : 'No class'}
                        {checkInStudentAlreadyIn ? ' · already checked in today' : ''}
                      </p>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="rounded-lg text-xs" onClick={() => setCheckInStudentId('')}>
                    Change
                  </Button>
                </div>
              ) : (
                <Command className="rounded-xl border">
                  <CommandInput placeholder="Type a name…" autoFocus />
                  <CommandList className="max-h-56">
                    <CommandEmpty>No student with that name.</CommandEmpty>
                    {scopedStudents
                      .slice()
                      .sort((a, b) => studentDisplayName(a).localeCompare(studentDisplayName(b)))
                      .map((s) => {
                        const cls = s.classId ? classNameById.get(s.classId) : '';
                        const inAlready = todayStudentLogMap.has(s.id);
                        return (
                          <CommandItem
                            key={s.id}
                            value={`${studentDisplayName(s)} ${cls} ${s.id}`}
                            onSelect={() => setCheckInStudentId(s.id)}
                          >
                            <span className="flex-1 truncate">{studentDisplayName(s)}</span>
                            <span className="text-xs text-muted-foreground">{cls}</span>
                            {inAlready && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-label="Already in" />}
                          </CommandItem>
                        );
                      })}
                  </CommandList>
                </Command>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Status</Label>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Status">
                {(['on-time', 'late', 'excused'] as const).map((m) => {
                  const Icon = MARK_STYLES[m].icon;
                  const selected = checkInStatus === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setCheckInStatus(m);
                        setCheckInCustomPoints(String(defaultPointsFor(m)));
                      }}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-bold transition-colors',
                        selected ? cn('ring-2 ring-inset', MARK_STYLES[m].chip) : 'hover:bg-muted/50'
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {ATTENDANCE_MARK_LABEL[m]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Class period</Label>
                <Select value={checkInPeriod} onValueChange={setCheckInPeriod}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Right now ({periodLabelNow})</SelectItem>
                    {periods.map((p) => (
                      <SelectItem key={p.id} value={p.label}>
                        {p.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="none">Whole day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold" htmlFor="attendance-checkin-points">
                  Points
                </Label>
                <Input
                  id="attendance-checkin-points"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={checkInCustomPoints}
                  onChange={(e) => setCheckInCustomPoints(e.target.value)}
                  className="h-10 rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold" htmlFor="attendance-checkin-note">
                Note <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="attendance-checkin-note"
                value={checkInNote}
                onChange={(e) => setCheckInNote(e.target.value)}
                placeholder="e.g. Doctor's note, bus was late"
                className="h-10 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setIsCheckInOpen(false)} className="rounded-xl" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmitManualCheckIn()}
              disabled={!checkInStudentId || isSubmitting}
              className="rounded-xl font-bold"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Check in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
