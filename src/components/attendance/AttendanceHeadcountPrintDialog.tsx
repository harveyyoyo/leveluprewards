'use client';

import React, { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Student, Class, AttendanceLogEntry } from '@/lib/types';
import { getStudentNickname } from '@/lib/utils';

type AttendanceHeadcountPrintDialogProps = {
  schoolName?: string;
  students: Student[];
  classes: Class[];
  attendanceLogs?: AttendanceLogEntry[];
};

export function AttendanceHeadcountPrintDialog({
  schoolName = 'School',
  students = [],
  classes = [],
  attendanceLogs = [],
}: AttendanceHeadcountPrintDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  const todayStartMs = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const todayLogsByStudent = useMemo(() => {
    const map = new Map<string, AttendanceLogEntry>();
    for (const log of attendanceLogs || []) {
      if (!log.studentId || map.has(log.studentId)) continue;
      if (Number(log.signedInAt || 0) < todayStartMs) continue;
      map.set(log.studentId, log);
    }
    return map;
  }, [attendanceLogs, todayStartMs]);

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
    return list.sort((a, b) => {
      const classA = classMap.get(a.classId || '') || '';
      const classB = classMap.get(b.classId || '') || '';
      if (classA !== classB) return classA.localeCompare(classB);
      const lastA = (a.lastName || '').toLowerCase();
      const lastB = (b.lastName || '').toLowerCase();
      if (lastA !== lastB) return lastA.localeCompare(lastB);
      return (a.firstName || '').toLowerCase().localeCompare((b.firstName || '').toLowerCase());
    });
  }, [students, selectedClassId, classMap]);

  const stats = useMemo(() => {
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;

    for (const s of filteredStudents) {
      const log = todayLogsByStudent.get(s.id);
      if (!log) {
        absentCount++;
      } else if (log.onTime === false) {
        lateCount++;
      } else {
        presentCount++;
      }
    }

    return {
      total: filteredStudents.length,
      present: presentCount,
      late: lateCount,
      absent: absentCount,
    };
  }, [filteredStudents, todayLogsByStudent]);

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
        <Button variant="outline" size="sm" className="gap-2 rounded-xl h-10 px-3 shrink-0">
          <Printer className="w-4 h-4 text-primary" />
          <span>Print Today&apos;s Headcount</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <DialogTitle className="text-xl font-black">Daily Headcount & Emergency Roster</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Print a clean roster for morning attendance checks, fire drills, or substitutes.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handlePrint} className="gap-2 rounded-xl">
                <Printer className="w-4 h-4" />
                Print Roster
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Filter Toolbar (hidden on paper print) */}
        <div className="flex items-center gap-3 py-3 border-b print:hidden">
          <label className="text-xs font-bold text-muted-foreground">Class Filter:</label>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-[220px] rounded-xl h-9">
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

        {/* Printable Sheet Area */}
        <div className="overflow-y-auto flex-1 py-4 space-y-4 print:p-0 print:overflow-visible" id="headcount-print-area">
          {/* Print-only sheet header */}
          <div className="border-b pb-3">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black">{schoolName}</h2>
                <p className="text-sm font-bold text-muted-foreground">
                  Daily Attendance & Headcount Roster &bull; {currentDateFormatted} ({currentTimeFormatted})
                </p>
                {selectedClassId !== 'all' && (
                  <p className="text-xs font-semibold text-primary mt-0.5">
                    Class: {classMap.get(selectedClassId) || selectedClassId}
                  </p>
                )}
              </div>
            </div>

            {/* Quick summary cards */}
            <div className="grid grid-cols-4 gap-2 pt-3">
              <div className="p-2.5 rounded-xl border bg-muted/20 text-center">
                <p className="text-[10px] font-black uppercase text-muted-foreground">Total</p>
                <p className="text-base font-black">{stats.total}</p>
              </div>
              <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-center">
                <p className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300">On Time</p>
                <p className="text-base font-black text-emerald-700 dark:text-emerald-300">{stats.present}</p>
              </div>
              <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center">
                <p className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-300">Late</p>
                <p className="text-base font-black text-amber-700 dark:text-amber-300">{stats.late}</p>
              </div>
              <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-center">
                <p className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-300">Not Present</p>
                <p className="text-base font-black text-rose-700 dark:text-rose-300">{stats.absent}</p>
              </div>
            </div>
          </div>

          {/* Roster Table */}
          {filteredStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No students found for this selection.</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left text-xs font-black text-muted-foreground uppercase">
                    <th className="py-2 px-2 w-12 text-center">#</th>
                    <th className="py-2 px-2">Student Name</th>
                    <th className="py-2 px-2">Class</th>
                    <th className="py-2 px-2 text-center">Status</th>
                    <th className="py-2 px-2 text-right">Sign-In Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStudents.map((student, idx) => {
                    const log = todayLogsByStudent.get(student.id);
                    const isPresent = Boolean(log);
                    const isLate = log?.onTime === false;
                    const signTime = log?.signedInAt
                      ? new Date(log.signedInAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                      : '—';

                    return (
                      <tr key={student.id} className="hover:bg-muted/10">
                        <td className="py-2 px-2 text-center text-xs text-muted-foreground">{idx + 1}</td>
                        <td className="py-2 px-2 font-bold">
                          {student.lastName ? `${student.lastName}, ${student.firstName}` : getStudentNickname(student)}
                        </td>
                        <td className="py-2 px-2 text-xs text-muted-foreground">
                          {classMap.get(student.classId || '') || 'Unassigned'}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {isPresent ? (
                            isLate ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                Late
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                On Time
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold text-muted-foreground bg-muted/40">
                              Absent
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right text-xs font-medium text-muted-foreground">{signTime}</td>
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
