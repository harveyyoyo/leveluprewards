'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Printer,
  RotateCcw,
  Search,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Student, Class, AttendanceLogEntry } from '@/lib/types';
import { getStudentNickname, cn } from '@/lib/utils';

type ManualHeadcountStatus = 'on-time' | 'late' | 'absent';

type AttendanceHeadcountPrintDialogProps = {
  schoolId?: string;
  schoolName?: string;
  students: Student[];
  classes: Class[];
  attendanceLogs?: AttendanceLogEntry[];
};

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function AttendanceHeadcountPrintDialog({
  schoolId,
  schoolName = 'School',
  students = [],
  classes = [],
  attendanceLogs,
}: AttendanceHeadcountPrintDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const firestore = useFirestore();

  // Pull today's sign-ins live so the headcount starts accurate, the same
  // way the "Today's Board" does. Callers can still pass attendanceLogs
  // directly (e.g. in tests) to skip the live query.
  const logQuery = useMemoFirebase(
    () =>
      schoolId && !attendanceLogs
        ? query(
            collection(firestore, 'schools', schoolId, 'attendanceLog'),
            orderBy('signedInAt', 'desc'),
            limit(500)
          )
        : null,
    [firestore, schoolId, attendanceLogs]
  );
  const { data: liveLogs } = useCollection<AttendanceLogEntry>(logQuery);
  const effectiveLogs = useMemo(() => attendanceLogs ?? liveLogs ?? [], [attendanceLogs, liveLogs]);

  // A staff member doing a physical roll call (fire drill, assembly, etc.)
  // can correct the auto-computed status by hand; those tweaks live only
  // for the current day and are remembered per browser via localStorage.
  const todayKey = useMemo(() => getTodayKey(), []);
  const storageKey = useMemo(() => `headcountOverrides:${schoolId || 'school'}:${todayKey}`, [schoolId, todayKey]);
  const [manualOverrides, setManualOverrides] = useState<Record<string, ManualHeadcountStatus>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      setManualOverrides(raw ? JSON.parse(raw) : {});
    } catch {
      setManualOverrides({});
    }
  }, [storageKey]);

  const setStudentOverride = (studentId: string, status: ManualHeadcountStatus | null) => {
    setManualOverrides((prev) => {
      const next = { ...prev };
      if (status === null) {
        delete next[studentId];
      } else {
        next[studentId] = status;
      }
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Best-effort only; the on-screen state still updates.
      }
      return next;
    });
  };

  const cycleStudentOverride = (student: Student, currentStatus: ManualHeadcountStatus) => {
    const order: ManualHeadcountStatus[] = ['on-time', 'late', 'absent'];
    const nextIndex = (order.indexOf(currentStatus) + 1) % order.length;
    setStudentOverride(student.id, order[nextIndex]);
  };

  const todayStartMs = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const todayLogsByStudent = useMemo(() => {
    const map = new Map<string, AttendanceLogEntry>();
    for (const log of effectiveLogs || []) {
      if (!log.studentId || map.has(log.studentId)) continue;
      if (Number(log.signedInAt || 0) < todayStartMs) continue;
      map.set(log.studentId, log);
    }
    return map;
  }, [effectiveLogs, todayStartMs]);

  const classMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of classes || []) {
      map.set(c.id, c.name);
    }
    return map;
  }, [classes]);

  const filteredStudents = useMemo(() => {
    let list = (students || []).slice();
    if (selectedClassId !== 'all') {
      list = list.filter((s) => s.classId === selectedClassId);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((s) => {
        const first = (s.firstName || '').toLowerCase();
        const last = (s.lastName || '').toLowerCase();
        const nick = (s.nickname || '').toLowerCase();
        const className = (classMap.get(s.classId || '') || '').toLowerCase();
        return first.includes(q) || last.includes(q) || nick.includes(q) || className.includes(q);
      });
    }
    return list.sort((a, b) => {
      const classA = classMap.get(a.classId || '') || '';
      const classB = classMap.get(b.classId || '') || '';
      if (classA !== classB) return classA.localeCompare(classB);
      const lastA = (a.lastName || '').toLowerCase();
      const lastB = (b.lastName || '').toLowerCase();
      if (lastA !== lastB) return lastA.localeCompare(lastB);
      return (a.firstName || '').toLowerCase().localeCompare((b.firstName || '').toLowerCase());
    });
  }, [students, selectedClassId, searchQuery, classMap]);

  const getEffectiveStatus = (student: Student): ManualHeadcountStatus => {
    const override = manualOverrides[student.id];
    if (override) return override;
    const log = todayLogsByStudent.get(student.id);
    if (!log) return 'absent';
    return log.onTime === false ? 'late' : 'on-time';
  };

  const stats = useMemo(() => {
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;

    for (const s of filteredStudents) {
      const status = getEffectiveStatus(s);
      if (status === 'absent') absentCount++;
      else if (status === 'late') lateCount++;
      else presentCount++;
    }

    return {
      total: filteredStudents.length,
      present: presentCount,
      late: lateCount,
      absent: absentCount,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredStudents, todayLogsByStudent, manualOverrides]);

  const editedCount = useMemo(
    () => filteredStudents.filter((s) => manualOverrides[s.id]).length,
    [filteredStudents, manualOverrides]
  );

  const handlePrint = () => {
    window.print();
  };

  const currentDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const currentTimeFormatted = useMemo(() => {
    return new Date().toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 rounded-xl h-10 px-3.5 font-bold shadow-xs border-border/70 hover:border-primary/50 shrink-0"
        >
          <ClipboardList className="w-4 h-4 text-primary" />
          <span>Daily Headcount</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-6 rounded-2xl">
        <DialogHeader className="print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight">
                  Daily Attendance & Headcount
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Print or view an official roster for morning roll call, fire drills, and assemblies.
                  Click a student&apos;s status below to correct it by hand.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handlePrint} className="gap-2 rounded-xl font-bold shadow-xs">
                <Printer className="w-4 h-4" />
                Print Roster
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Filter Toolbar (hidden on paper print) */}
        <div className="flex flex-wrap items-center gap-3 py-3 border-b print:hidden">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search student or class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 rounded-xl text-xs bg-muted/20"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-[200px] rounded-xl h-9 text-xs">
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes ({students.length})</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {editedCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 rounded-xl h-9 text-xs font-bold text-muted-foreground hover:text-foreground"
              onClick={() => {
                setManualOverrides({});
                try {
                  window.localStorage.removeItem(storageKey);
                } catch {
                  // ignore
                }
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Undo {editedCount} hand-edit{editedCount === 1 ? '' : 's'}
            </Button>
          ) : null}
        </div>

        {/* Printable Sheet Area */}
        <div
          className="overflow-y-auto flex-1 py-4 space-y-4 print:p-0 print:overflow-visible"
          id="headcount-print-area"
        >
          {/* Print-only / top sheet header */}
          <div className="border-b pb-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black">{schoolName}</h2>
                <p className="text-xs font-bold text-muted-foreground mt-0.5">
                  Daily Attendance & Headcount Roster &bull; {currentDateFormatted} ({currentTimeFormatted})
                </p>
                {selectedClassId !== 'all' && (
                  <p className="text-xs font-bold text-primary mt-1">
                    Class: {classMap.get(selectedClassId) || selectedClassId}
                  </p>
                )}
              </div>
            </div>

            {/* Quick summary cards */}
            <div className="grid grid-cols-4 gap-2.5 pt-4">
              <div className="p-3 rounded-2xl border bg-muted/15 flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] font-black uppercase tracking-wider">Total</span>
                  <Users className="w-3.5 h-3.5" />
                </div>
                <p className="text-xl font-black mt-1">{stats.total}</p>
              </div>
              <div className="p-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 flex flex-col justify-between text-emerald-700 dark:text-emerald-300">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider">On Time</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <p className="text-xl font-black mt-1">{stats.present}</p>
              </div>
              <div className="p-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 flex flex-col justify-between text-amber-700 dark:text-amber-300">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider">Late</span>
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <p className="text-xl font-black mt-1">{stats.late}</p>
              </div>
              <div className="p-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 flex flex-col justify-between text-rose-700 dark:text-rose-300">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider">Not Present</span>
                  <UserX className="w-3.5 h-3.5" />
                </div>
                <p className="text-xl font-black mt-1">{stats.absent}</p>
              </div>
            </div>
          </div>

          {/* Roster Table */}
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Users className="w-8 h-8 text-muted-foreground/50 mx-auto" />
              <p className="text-sm font-semibold text-muted-foreground">No students match your selection.</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto rounded-xl border">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/30 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Sign-In Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStudents.map((student, idx) => {
                    const log = todayLogsByStudent.get(student.id);
                    const status = getEffectiveStatus(student);
                    const isEdited = Boolean(manualOverrides[student.id]);
                    const signTime = log?.signedInAt
                      ? new Date(log.signedInAt).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      : '—';

                    const statusBadge =
                      status === 'late' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          Late
                        </span>
                      ) : status === 'on-time' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          On Time
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-muted-foreground bg-muted/40 border border-border/50">
                          <UserX className="w-3 h-3" />
                          Absent
                        </span>
                      );

                    return (
                      <tr key={student.id} className="hover:bg-muted/15 transition-colors">
                        <td className="py-2 px-3 text-center text-xs text-muted-foreground">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold">
                          {student.lastName
                            ? `${student.lastName}, ${student.firstName}`
                            : getStudentNickname(student)}
                        </td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">
                          {classMap.get(student.classId || '') || 'Unassigned'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {/* Screen-only: click to correct by hand. Printed paper shows plain text. */}
                          <button
                            type="button"
                            onClick={() => cycleStudentOverride(student, status)}
                            title="Click to change this student's status by hand"
                            className={cn(
                              'print:hidden inline-flex items-center gap-1.5 rounded-full transition-opacity hover:opacity-75',
                              isEdited && 'ring-2 ring-primary/40 ring-offset-1 ring-offset-background rounded-full'
                            )}
                          >
                            {statusBadge}
                            {isEdited && (
                              <span className="text-[9px] font-black uppercase tracking-wide text-primary">
                                Edited
                              </span>
                            )}
                          </button>
                          <span className="hidden print:inline-flex">{statusBadge}</span>
                        </td>
                        <td className="py-2 px-3 text-right text-xs font-medium text-muted-foreground">
                          {signTime}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
