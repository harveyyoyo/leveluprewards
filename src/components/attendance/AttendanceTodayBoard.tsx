'use client';

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Filter,
  Loader2,
  PlusCircle,
  Search,
  UserCheck,
  Users,
  AlertCircle,
  UserX,
  ListFilter,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { collection, orderBy, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { AttendanceLogEntry, AttendanceScheduleSlot, AttendanceSettings, Class, Student, Teacher } from '@/lib/types';
import { recordManualAttendance } from '@/lib/db/attendance';
import { getSchoolDayClock } from '@/lib/attendance/schoolDayClock';
import { useMinuteClock } from '@/hooks/useMinuteClock';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';

export interface AttendanceTodayBoardProps {
  schoolId: string;
  students: Student[];
  classes: Class[];
  teachers?: Teacher[];
  periods?: AttendanceScheduleSlot[];
  attendanceConfig?: AttendanceSettings | null;
  teacherIdScope?: string;
  variant?: 'admin' | 'teacher';
}

function parseTimeToMinutes(hhmm: string): number | null {
  const s = (hhmm || '').trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

export function AttendanceTodayBoard({
  schoolId,
  students,
  classes,
  teachers = [],
  periods = [],
  attendanceConfig,
  teacherIdScope,
  variant = 'admin',
}: AttendanceTodayBoardProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'present' | 'on-time' | 'late' | 'absent'>('all');
  const [viewMode, setViewMode] = useState<'roster' | 'feed'>('roster');

  // Manual Check-in Dialog State
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInStudentId, setCheckInStudentId] = useState<string>('');
  const [checkInStatus, setCheckInStatus] = useState<'on-time' | 'late' | 'excused'>('on-time');
  const [checkInPeriod, setCheckInPeriod] = useState<string>('auto');
  const [checkInCustomPoints, setCheckInCustomPoints] = useState<string>('');
  const [checkInNote, setCheckInNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Action row loading ID
  const [quickActionStudentId, setQuickActionStudentId] = useState<string | null>(null);

  // Ticks every minute so the current period and "today" keep up on a board left open all day.
  // Uses the school's time zone when one is set, otherwise this screen's clock.
  const nowMs = useMinuteClock();
  const schoolClock = getSchoolDayClock(nowMs, attendanceConfig?.attendanceTimeZone, { whenUnset: 'local' });
  const nowMin = schoolClock.minutesSinceMidnight;
  const startOfDay = nowMs - nowMin * 60_000;

  // Realtime live attendance logs today — all of them, however many students signed in.
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
  const { data: todayLogsRaw } = useCollection<AttendanceLogEntry>(logQuery);
  const todayLogs = useMemo(() => todayLogsRaw || [], [todayLogsRaw]);

  // Map studentId -> most recent log entry today
  const todayStudentLogMap = useMemo(() => {
    const map = new Map<string, AttendanceLogEntry>();
    for (const log of todayLogs) {
      if (!log.studentId || map.has(log.studentId)) continue;
      map.set(log.studentId, log);
    }
    return map;
  }, [todayLogs]);

  // Determine current active period
  const activePeriod = useMemo(() => {
    return periods.find((p) => {
      const start = parseTimeToMinutes(p.startTime);
      const end = parseTimeToMinutes(p.endTime);
      if (start == null || end == null) return false;
      return nowMin >= start && nowMin <= end;
    });
  }, [periods, nowMin]);

  // Filter students based on teacher scope and class list
  const scopedStudents = useMemo(() => {
    let list = students || [];
    if (teacherIdScope && variant === 'teacher') {
      const teacherClassIds = new Set(
        classes.filter((c) => c.primaryTeacherId === teacherIdScope || c.teacherIds?.includes(teacherIdScope)).map((c) => c.id)
      );
      list = list.filter((s) => s.classId && teacherClassIds.has(s.classId));
    }
    return list;
  }, [students, classes, teacherIdScope, variant]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = scopedStudents.length;
    let presentCount = 0;
    let onTimeCount = 0;
    let lateCount = 0;

    for (const student of scopedStudents) {
      const log = todayStudentLogMap.get(student.id);
      if (log) {
        presentCount++;
        if (log.onTime !== false && log.status !== 'late') {
          onTimeCount++;
        } else {
          lateCount++;
        }
      }
    }

    const absentCount = Math.max(0, total - presentCount);
    const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

    return { total, presentCount, onTimeCount, lateCount, absentCount, rate };
  }, [scopedStudents, todayStudentLogMap]);

  // Filtered students for Roster display
  const displayedStudents = useMemo(() => {
    return scopedStudents.filter((student) => {
      const name = `${student.firstName || ''} ${student.lastName || ''} ${student.nickname || ''}`.toLowerCase();
      if (searchQuery.trim() && !name.includes(searchQuery.toLowerCase())) {
        return false;
      }

      if (selectedClassId !== 'all' && student.classId !== selectedClassId) {
        return false;
      }

      const log = todayStudentLogMap.get(student.id);
      const isPresent = Boolean(log);
      const isOnTime = isPresent && log?.onTime !== false && log?.status !== 'late';
      const isLate = isPresent && (log?.onTime === false || log?.status === 'late');

      if (selectedStatus === 'present' && !isPresent) return false;
      if (selectedStatus === 'on-time' && !isOnTime) return false;
      if (selectedStatus === 'late' && !isLate) return false;
      if (selectedStatus === 'absent' && isPresent) return false;

      return true;
    });
  }, [scopedStudents, searchQuery, selectedClassId, selectedStatus, todayStudentLogMap]);

  // Quick mark present or late directly from the row
  const handleQuickCheckIn = async (student: Student, status: 'on-time' | 'late') => {
    if (!schoolId) return;
    setQuickActionStudentId(student.id);
    try {
      const defaultOnTime = attendanceConfig?.pointsForOnTime ?? 5;
      const defaultSignIn = attendanceConfig?.pointsForSignIn ?? 1;
      const points = status === 'on-time' ? defaultSignIn + defaultOnTime : defaultSignIn;

      const res = await recordManualAttendance(firestore, schoolId, student.id, student, {
        status,
        points,
        periodLabel: activePeriod?.label || 'Homeroom',
        teacherId: teacherIdScope,
        attendanceTimeZone: attendanceConfig?.attendanceTimeZone,
        categoryId: attendanceConfig?.categoryId,
      });

      if (!res.success && res.reason === 'already_checked_in') {
        toast({
          title: 'Already marked present',
          description: `${student.firstName || 'Student'} is already checked in for this session.`,
        });
      } else {
        toast({
          title: status === 'on-time' ? 'Marked on-time!' : 'Marked late!',
          description: `${student.firstName || 'Student'} received +${points} attendance points.`,
        });
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Check-in failed',
        description: e?.message || 'Could not record attendance.',
      });
    } finally {
      setQuickActionStudentId(null);
    }
  };

  // Submit from full manual check-in dialog
  const handleSubmitManualCheckIn = async () => {
    if (!schoolId || !checkInStudentId) {
      toast({ variant: 'destructive', title: 'Pick a student first' });
      return;
    }
    const student = scopedStudents.find((s) => s.id === checkInStudentId);
    if (!student) return;

    setIsSubmitting(true);
    try {
      let pts = parseInt(checkInCustomPoints, 10);
      if (Number.isNaN(pts)) {
        const defaultOnTime = attendanceConfig?.pointsForOnTime ?? 5;
        const defaultSignIn = attendanceConfig?.pointsForSignIn ?? 1;
        pts = checkInStatus === 'on-time' ? defaultSignIn + defaultOnTime : defaultSignIn;
      }

      const periodLabel =
        checkInPeriod === 'auto'
          ? activePeriod?.label || 'General Attendance'
          : checkInPeriod === 'none'
          ? undefined
          : checkInPeriod;

      const res = await recordManualAttendance(firestore, schoolId, student.id, student, {
        status: checkInStatus,
        points: pts,
        periodLabel,
        teacherId: teacherIdScope,
        note: checkInNote.trim() || undefined,
        attendanceTimeZone: attendanceConfig?.attendanceTimeZone,
        categoryId: attendanceConfig?.categoryId,
      });

      if (!res.success && res.reason === 'already_checked_in') {
        toast({
          title: 'Already recorded',
          description: `${student.firstName || 'Student'} was already marked for this session.`,
        });
      } else {
        toast({
          title: 'Attendance recorded!',
          description: `${student.firstName || 'Student'} recorded with +${pts} points.`,
        });
        setIsCheckInOpen(false);
        setCheckInStudentId('');
        setCheckInNote('');
        setCheckInCustomPoints('');
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to record',
        description: e?.message || 'Could not save check-in.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openManualCheckInFor = (studentId?: string) => {
    if (studentId) setCheckInStudentId(studentId);
    setCheckInStatus('on-time');
    setCheckInPeriod('auto');
    const defaultOnTime = attendanceConfig?.pointsForOnTime ?? 5;
    const defaultSignIn = attendanceConfig?.pointsForSignIn ?? 1;
    setCheckInCustomPoints(String(defaultSignIn + defaultOnTime));
    setCheckInNote('');
    setIsCheckInOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Active Period Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border bg-gradient-to-r from-primary/10 via-background to-muted/20">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-black">
                {activePeriod ? `Active Period: ${activePeriod.label}` : 'No active period right now'}
              </p>
              {activePeriod && (
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activePeriod
                ? `${activePeriod.startTime} – ${activePeriod.endTime} · Sign-ins earn period attendance points`
                : 'Sign-ins outside periods earn daily baseline attendance'}
            </p>
          </div>
        </div>

        <Button
          onClick={() => openManualCheckInFor()}
          className="rounded-xl font-black gap-2 shrink-0 shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Check In Student
        </Button>
      </div>

      {/* High-Level Stat Counters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Total</span>
            <Users className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black mt-2 text-foreground">{stats.total}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Enrolled students</p>
        </div>

        <div className="rounded-2xl border bg-emerald-500/[0.06] border-emerald-500/20 p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
            <span className="text-xs font-bold uppercase tracking-wider">Present</span>
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
              {stats.presentCount}
            </p>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              ({stats.rate}%)
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Checked in today</p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">On-Time</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black mt-2 text-foreground">{stats.onTimeCount}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Earned bonus</p>
        </div>

        <div className="rounded-2xl border bg-amber-500/[0.06] border-amber-500/20 p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-300">
            <span className="text-xs font-bold uppercase tracking-wider">Late / Tardy</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black mt-2 text-amber-700 dark:text-amber-300">
            {stats.lateCount}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">After start window</p>
        </div>

        <div className="col-span-2 md:col-span-1 rounded-2xl border bg-rose-500/[0.06] border-rose-500/20 p-4 shadow-sm">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-300">
            <span className="text-xs font-bold uppercase tracking-wider">Absent</span>
            <UserX className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black mt-2 text-rose-700 dark:text-rose-300">
            {stats.absentCount}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Not yet checked in</p>
        </div>
      </div>

      {/* Filter and View Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border bg-muted/20">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student name..."
              className="pl-9 h-10 rounded-xl bg-background"
            />
          </div>

          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-[170px] h-10 rounded-xl bg-background">
              <SelectValue placeholder="All classes" />
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

          <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as any)}>
            <SelectTrigger className="w-[140px] h-10 rounded-xl bg-background">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="present">Present ({stats.presentCount})</SelectItem>
              <SelectItem value="on-time">On-Time ({stats.onTimeCount})</SelectItem>
              <SelectItem value="late">Late ({stats.lateCount})</SelectItem>
              <SelectItem value="absent">Absent ({stats.absentCount})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto bg-background p-1 rounded-xl border">
          <Button
            type="button"
            variant={viewMode === 'roster' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('roster')}
            className="rounded-lg text-xs font-bold h-8"
          >
            Roster ({displayedStudents.length})
          </Button>
          <Button
            type="button"
            variant={viewMode === 'feed' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('feed')}
            className="rounded-lg text-xs font-bold h-8"
          >
            Live Feed ({todayLogs.length})
          </Button>
        </div>
      </div>

      {/* Roster View */}
      {viewMode === 'roster' && (
        <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
          {displayedStudents.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <UserX className="w-8 h-8 mx-auto opacity-40" />
              <p className="font-bold text-base">No students found</p>
              <p className="text-xs">Try clearing your search or changing the class filter.</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Status Today</th>
                    <th className="py-3 px-4">Check-In Time</th>
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Points</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {displayedStudents.map((student) => {
                    const log = todayStudentLogMap.get(student.id);
                    const isPresent = Boolean(log);
                    const isOnTime = isPresent && log?.onTime !== false && log?.status !== 'late';
                    const isLate = isPresent && (log?.onTime === false || log?.status === 'late');
                    const className = classes.find((c) => c.id === student.classId)?.name || 'Unassigned';
                    const studentName =
                      [student.firstName, student.lastName].filter(Boolean).join(' ') ||
                      student.nickname ||
                      'Student';

                    const isRowBusy = quickActionStudentId === student.id;

                    return (
                      <tr key={student.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-bold text-foreground">
                          {studentName}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs font-semibold">
                          {className}
                        </td>
                        <td className="py-3 px-4">
                          {isOnTime && (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold gap-1">
                              <CheckCircle2 className="w-3 h-3" /> On-Time
                            </Badge>
                          )}
                          {isLate && (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold gap-1">
                              <Clock className="w-3 h-3" /> Late / Tardy
                            </Badge>
                          )}
                          {!isPresent && (
                            <Badge variant="outline" className="text-muted-foreground font-semibold">
                              Not Checked In
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {log ? new Date(log.signedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-muted-foreground">
                          {log?.periodLabel || '—'}
                        </td>
                        <td className="py-3 px-4 text-xs font-black">
                          {log ? (
                            <span className="text-primary">+{log.pointsAwarded ?? 0} pts</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isPresent ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-lg text-xs font-bold hover:bg-emerald-500/10 hover:text-emerald-700 hover:border-emerald-500/40"
                                onClick={() => handleQuickCheckIn(student, 'on-time')}
                                disabled={isRowBusy}
                              >
                                {isRowBusy ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  'Present'
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                                onClick={() => handleQuickCheckIn(student, 'late')}
                                disabled={isRowBusy}
                              >
                                Late
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground"
                              onClick={() => openManualCheckInFor(student.id)}
                            >
                              Edit
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Live Feed View */}
      {viewMode === 'feed' && (
        <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b pb-3">
            <h4 className="font-bold text-sm">Today&apos;s Sign-in Feed ({todayLogs.length})</h4>
            <span className="text-xs text-muted-foreground">Latest sign-ins at the top</span>
          </div>

          {todayLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No sign-ins recorded yet today. When students scan their badge, they will appear here live.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {todayLogs.map((entry) => (
                <li key={entry.id ?? `${entry.studentId}_${entry.signedInAt}`} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{entry.studentName || entry.studentId}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(entry.signedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {entry.periodLabel ? ` · ${entry.periodLabel}` : ''}
                      {entry.manual ? ' · Manual Entry' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {entry.onTime !== false && entry.status !== 'late' ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[11px] font-bold">
                        On-Time
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[11px] font-bold">
                        Late
                      </Badge>
                    )}
                    <span className="font-black text-primary text-sm">+{entry.pointsAwarded ?? 0} pts</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Manual Check-in Dialog */}
      <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Check In Student</DialogTitle>
            <DialogDescription className="text-xs">
              Record attendance manually for late arrivals, forgotten badges, or office passes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Student</Label>
              <Select value={checkInStudentId} onValueChange={setCheckInStudentId}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue placeholder="Select student..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {scopedStudents.map((s) => {
                    const c = classes.find((cls) => cls.id === s.classId);
                    return (
                      <SelectItem key={s.id} value={s.id}>
                        {[s.firstName, s.lastName].filter(Boolean).join(' ') || s.nickname || s.id}
                        {c ? ` (${c.name})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Attendance Status</Label>
                <Select value={checkInStatus} onValueChange={(v: any) => setCheckInStatus(v)}>
                  <SelectTrigger className="rounded-xl h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on-time">On-Time</SelectItem>
                    <SelectItem value="late">Late / Tardy</SelectItem>
                    <SelectItem value="excused">Excused</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Class Period</Label>
                <Select value={checkInPeriod} onValueChange={setCheckInPeriod}>
                  <SelectTrigger className="rounded-xl h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Current Period {activePeriod ? `(${activePeriod.label})` : ''}</SelectItem>
                    {periods.map((p) => (
                      <SelectItem key={p.id} value={p.label}>
                        {p.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="none">General / Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Points Awarded</Label>
              <Input
                type="number"
                min={0}
                value={checkInCustomPoints}
                onChange={(e) => setCheckInCustomPoints(e.target.value)}
                placeholder="5"
                className="rounded-xl h-10 font-bold"
              />
              <p className="text-[11px] text-muted-foreground">
                Leave as-is to use standard school points for this status.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Note (Optional)</Label>
              <Input
                value={checkInNote}
                onChange={(e) => setCheckInNote(e.target.value)}
                placeholder="e.g. Doctor appointment note"
                className="rounded-xl h-10"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCheckInOpen(false)}
              className="rounded-xl"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitManualCheckIn}
              disabled={!checkInStudentId || isSubmitting}
              className="rounded-xl font-bold"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Check-In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
