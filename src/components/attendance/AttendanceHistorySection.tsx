'use client';

import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Download,
  FileSpreadsheet,
  History,
  Loader2,
  Printer,
  Search,
  UserCheck,
  Users,
} from 'lucide-react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { AttendanceLogEntry, Class, Student, Teacher } from '@/lib/types';
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

export interface AttendanceHistorySectionProps {
  schoolId: string;
  students: Student[];
  classes: Class[];
  teachers?: Teacher[];
  teacherIdScope?: string;
}

export function AttendanceHistorySection({
  schoolId,
  students = [],
  classes = [],
  teachers = [],
  teacherIdScope,
}: AttendanceHistorySectionProps) {
  const firestore = useFirestore();

  // Date input defaults to today YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  // Calculate day start and end timestamps in local time
  const { startMs, endMs } = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
    const end = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
    return { startMs: start, endMs: end };
  }, [selectedDate]);

  // Query logs (up to 1000 items)
  const logQuery = useMemoFirebase(
    () =>
      schoolId
        ? query(
            collection(firestore, 'schools', schoolId, 'attendanceLog'),
            orderBy('signedInAt', 'desc'),
            limit(1000)
          )
        : null,
    [firestore, schoolId]
  );
  const { data: allLogs, isLoading } = useCollection<AttendanceLogEntry>(logQuery);

  // Filter logs for selected date
  const filteredLogs = useMemo(() => {
    return (allLogs || []).filter((log) => {
      const t = Number(log.signedInAt || 0);
      if (t < startMs || t > endMs) return false;

      if (teacherIdScope && log.teacherId && log.teacherId !== teacherIdScope) {
        return false;
      }

      if (searchQuery.trim()) {
        const name = (log.studentName || '').toLowerCase();
        if (!name.includes(searchQuery.toLowerCase())) return false;
      }

      if (selectedClassId !== 'all') {
        const student = students.find((s) => s.id === log.studentId);
        if (student?.classId !== selectedClassId) return false;
      }

      return true;
    });
  }, [allLogs, startMs, endMs, teacherIdScope, searchQuery, selectedClassId, students]);

  // Calculate statistics for that day
  const dayStats = useMemo(() => {
    const total = filteredLogs.length;
    let onTime = 0;
    let late = 0;
    let totalPoints = 0;

    for (const log of filteredLogs) {
      if (log.onTime !== false && log.status !== 'late') onTime++;
      else late++;
      totalPoints += log.pointsAwarded || 0;
    }

    return { total, onTime, late, totalPoints };
  }, [filteredLogs]);

  // Export CSV
  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;

    const headers = ['Student Name', 'Student ID', 'Class', 'Date & Time', 'Status', 'Period', 'Points'];
    const rows = filteredLogs.map((log) => {
      const student = students.find((s) => s.id === log.studentId);
      const cls = classes.find((c) => c.id === student?.classId)?.name || 'Unassigned';
      const status = log.onTime !== false && log.status !== 'late' ? 'On-Time' : 'Late';
      const timeStr = new Date(log.signedInAt).toLocaleString();

      return [
        `"${(log.studentName || '').replace(/"/g, '""')}"`,
        `"${log.studentId}"`,
        `"${cls.replace(/"/g, '""')}"`,
        `"${timeStr}"`,
        `"${status}"`,
        `"${(log.periodLabel || '').replace(/"/g, '""')}"`,
        log.pointsAwarded ?? 0,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendance-${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Sheet
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Date & Filter Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" /> Select Date
            </Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl h-10 w-[170px] font-medium bg-background"
            />
          </div>

          <div className="space-y-1 min-w-[180px]">
            <Label className="text-xs font-bold text-muted-foreground">Class Filter</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="rounded-xl h-10 bg-background">
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
          </div>

          <div className="space-y-1 min-w-[200px] flex-1">
            <Label className="text-xs font-bold text-muted-foreground">Search Student</Label>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type name..."
              className="rounded-xl h-10 bg-background"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto pt-2 sm:pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="rounded-xl font-bold gap-2"
          >
            <Download className="w-4 h-4 text-primary" />
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={filteredLogs.length === 0}
            className="rounded-xl font-bold gap-2"
          >
            <Printer className="w-4 h-4" />
            Print Sheet
          </Button>
        </div>
      </div>

      {/* Daily Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Total Check-Ins
          </span>
          <p className="text-2xl font-black mt-2">{dayStats.total}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Recorded on {selectedDate}</p>
        </div>

        <div className="rounded-2xl border bg-emerald-500/[0.06] border-emerald-500/20 p-4 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            On-Time
          </span>
          <p className="text-2xl font-black mt-2 text-emerald-700 dark:text-emerald-300">
            {dayStats.onTime}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Within bonus window</p>
        </div>

        <div className="rounded-2xl border bg-amber-500/[0.06] border-amber-500/20 p-4 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            Late / Tardy
          </span>
          <p className="text-2xl font-black mt-2 text-amber-700 dark:text-amber-300">
            {dayStats.late}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Arrived after window</p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Points Awarded
          </span>
          <p className="text-2xl font-black mt-2 text-primary">+{dayStats.totalPoints}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Total attendance points</p>
        </div>
      </div>

      {/* Log Table */}
      <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
            Loading attendance records...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-10 text-center space-y-2 text-muted-foreground">
            <History className="w-8 h-8 opacity-40 mx-auto" />
            <p className="font-bold text-sm">No attendance records for {selectedDate}</p>
            <p className="text-xs">Pick another date or check your filters.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredLogs.map((log) => {
                  const student = students.find((s) => s.id === log.studentId);
                  const cls = classes.find((c) => c.id === student?.classId)?.name || 'Unassigned';
                  const isOnTime = log.onTime !== false && log.status !== 'late';

                  return (
                    <tr key={log.id ?? `${log.studentId}_${log.signedInAt}`} className="hover:bg-muted/20">
                      <td className="py-3 px-4 font-bold text-foreground">
                        {log.studentName || log.studentId}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-muted-foreground">
                        {cls}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {new Date(log.signedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4">
                        {isOnTime ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold">
                            On-Time
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-bold">
                            Late
                          </Badge>
                        )}
                        {log.manual && (
                          <span className="ml-1.5 text-[10px] text-muted-foreground font-semibold">
                            (Manual)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-muted-foreground">
                        {log.periodLabel || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-primary text-xs">
                        +{log.pointsAwarded ?? 0} pts
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
