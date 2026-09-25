'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  History,
  Loader2,
  Printer,
  Search,
  TrendingUp,
} from 'lucide-react';
import { collection, orderBy, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { AttendanceLogEntry, Class, Student, Teacher } from '@/lib/types';
import {
  ATTENDANCE_MARK_LABEL,
  attendanceMarkOf,
  classesForTeacher,
  csvCell,
  latestLogByStudent,
  localDayKey,
  recentSchoolDays,
  studentDisplayName,
  studentsForTeacher,
  summarizeAttendance,
  type AttendanceMark,
} from '@/lib/attendance/attendanceStatus';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface AttendanceHistorySectionProps {
  schoolId: string;
  students: Student[];
  classes: Class[];
  teachers?: Teacher[];
  teacherIdScope?: string;
}

const MARK_CHIP: Record<AttendanceMark | 'absent', string> = {
  'on-time': 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300',
  late: 'bg-amber-500/12 text-amber-800 ring-amber-500/30 dark:text-amber-300',
  excused: 'bg-sky-500/12 text-sky-700 ring-sky-500/25 dark:text-sky-300',
  absent: 'bg-rose-500/10 text-rose-700 ring-rose-500/25 dark:text-rose-300',
};

function Chip({ mark, label }: { mark: AttendanceMark | 'absent'; label?: string }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset', MARK_CHIP[mark])}>
      {label ?? (mark === 'absent' ? 'Missed' : ATTENDANCE_MARK_LABEL[mark])}
    </span>
  );
}

function StatTile({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: string }) {
  return (
    <div className={cn('rounded-2xl border bg-card p-4 shadow-sm', tone)}>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-black">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Opens a clean printable page with just this table (not the whole app screen). */
function printTable(title: string, subtitle: string, headers: string[], rows: string[][]) {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return false;
  w.document.write(`<!doctype html><html><head><title>${esc(title)}</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:32px;color:#0f172a}
h1{font-size:20px;margin:0}p{margin:4px 0 16px;color:#475569;font-size:13px}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e2e8f0}
th{background:#f1f5f9;text-transform:uppercase;font-size:10px;letter-spacing:.05em}
</style></head><body><h1>${esc(title)}</h1><p>${esc(subtitle)}</p>
<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
<script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
  return true;
}

function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return localDayKey(new Date(y, m - 1, d + delta));
}

function prettyDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function AttendanceHistorySection({
  schoolId,
  students: studentsProp,
  classes: classesProp,
  teacherIdScope,
}: AttendanceHistorySectionProps) {
  // Pages pass null while their lists are still loading; treat that as empty.
  const students = useMemo(() => studentsProp ?? [], [studentsProp]);
  const classes = useMemo(() => classesProp ?? [], [classesProp]);
  const [view, setView] = useState<'day' | 'patterns'>('day');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  const scopedClasses = useMemo(
    () => classesForTeacher(classes, teacherIdScope).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [classes, teacherIdScope]
  );
  const scopedStudents = useMemo(() => studentsForTeacher(students, classes, teacherIdScope), [students, classes, teacherIdScope]);
  const classStudents = useMemo(
    () => (selectedClassId === 'all' ? scopedStudents : scopedStudents.filter((s) => s.classId === selectedClassId)),
    [scopedStudents, selectedClassId]
  );
  const classNameById = useMemo(() => new Map(classes.map((c) => [c.id, c.name || 'Class'])), [classes]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-2xl border bg-muted/30 p-1" role="tablist" aria-label="History view">
          {(
            [
              ['day', 'One day', CalendarDays],
              ['patterns', 'Patterns', TrendingUp],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors',
                view === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {scopedClasses.length > 0 && (
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="h-10 rounded-xl bg-background sm:w-52" aria-label="Class">
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
      </div>

      {view === 'day' ? (
        <DayView
          schoolId={schoolId}
          students={classStudents}
          classNameById={classNameById}
          classLabel={selectedClassId === 'all' ? 'All classes' : classNameById.get(selectedClassId) || ''}
        />
      ) : (
        <PatternsView
          schoolId={schoolId}
          students={classStudents}
          classNameById={classNameById}
          classLabel={selectedClassId === 'all' ? 'All classes' : classNameById.get(selectedClassId) || ''}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// One day
// ---------------------------------------------------------------------------

function DayView({
  schoolId,
  students,
  classNameById,
  classLabel,
}: {
  schoolId: string;
  students: Student[];
  classNameById: Map<string, string>;
  classLabel: string;
}) {
  const firestore = useFirestore();
  const todayKey = localDayKey(new Date());
  const [dayKey, setDayKey] = useState(todayKey);
  const [searchQuery, setSearchQuery] = useState('');
  const [show, setShow] = useState<'in' | 'missed'>('in');

  const { startMs, endMs } = useMemo(() => {
    const [y, m, d] = dayKey.split('-').map(Number);
    return { startMs: new Date(y, m - 1, d).getTime(), endMs: new Date(y, m - 1, d + 1).getTime() - 1 };
  }, [dayKey]);

  // Only that day's check-ins — any day, however long ago.
  const logQuery = useMemoFirebase(
    () =>
      schoolId && Number.isFinite(startMs)
        ? query(
            collection(firestore, 'schools', schoolId, 'attendanceLog'),
            where('signedInAt', '>=', startMs),
            where('signedInAt', '<=', endMs),
            orderBy('signedInAt', 'desc')
          )
        : null,
    [firestore, schoolId, startMs, endMs]
  );
  const { data: dayLogs, isLoading } = useCollection<AttendanceLogEntry>(logQuery);

  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const q = searchQuery.trim().toLowerCase();

  const logs = useMemo(
    () =>
      (dayLogs || []).filter((log) => {
        if (!studentById.has(log.studentId)) return false;
        return !q || (log.studentName || '').toLowerCase().includes(q);
      }),
    [dayLogs, studentById, q]
  );
  const byStudent = useMemo(() => latestLogByStudent(logs), [logs]);
  const allByStudent = useMemo(
    () => latestLogByStudent((dayLogs || []).filter((l) => studentById.has(l.studentId))),
    [dayLogs, studentById]
  );
  const missed = useMemo(
    () =>
      students
        .filter((s) => !allByStudent.has(s.id))
        .filter((s) => !q || studentDisplayName(s).toLowerCase().includes(q))
        .sort((a, b) => studentDisplayName(a).localeCompare(studentDisplayName(b))),
    [students, allByStudent, q]
  );

  const stats = useMemo(() => {
    const out = { 'on-time': 0, late: 0, excused: 0, points: 0 };
    for (const log of allByStudent.values()) out[attendanceMarkOf(log)] += 1;
    for (const log of (dayLogs || []).filter((l) => studentById.has(l.studentId))) out.points += log.pointsAwarded || 0;
    return out;
  }, [allByStudent, dayLogs, studentById]);
  const checkedIn = allByStudent.size;
  const rate = students.length ? Math.round((checkedIn / students.length) * 100) : 0;
  const noCheckInsAtAll = !isLoading && (dayLogs || []).length === 0;

  const className = (studentId: string) => {
    const s = studentById.get(studentId);
    return (s?.classId && classNameById.get(s.classId)) || 'No class';
  };
  const time = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const exportRows = (): { headers: string[]; rows: string[][] } => {
    if (show === 'missed') {
      return {
        headers: ['Student', 'Class'],
        rows: missed.map((s) => [studentDisplayName(s), (s.classId && classNameById.get(s.classId)) || 'No class']),
      };
    }
    return {
      headers: ['Student', 'Class', 'Time', 'Status', 'Class period', 'Points', 'Entered by', 'Note'],
      rows: logs.map((log) => [
        log.studentName || log.studentId,
        className(log.studentId),
        time(log.signedInAt),
        ATTENDANCE_MARK_LABEL[attendanceMarkOf(log)],
        log.periodLabel || '',
        String(log.pointsAwarded ?? 0),
        log.manual ? 'Staff' : 'Sign-in screen',
        log.note || '',
      ]),
    };
  };

  const listTitle = show === 'missed' ? 'Did not check in' : 'Check-ins';

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-sm md:flex-row md:items-center">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setDayKey(shiftDay(dayKey, -1))} aria-label="Day before">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            value={dayKey}
            max={todayKey}
            onChange={(e) => e.target.value && setDayKey(e.target.value)}
            className="h-10 w-[160px] rounded-xl bg-background font-medium"
            aria-label="Day"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={() => setDayKey(shiftDay(dayKey, 1))}
            disabled={dayKey >= todayKey}
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {dayKey !== todayKey && (
            <Button variant="ghost" size="sm" className="rounded-xl text-xs font-bold" onClick={() => setDayKey(todayKey)}>
              Today
            </Button>
          )}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Find a student"
            aria-label="Find a student"
            className="h-10 rounded-xl bg-background pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-10 gap-2 rounded-xl font-bold"
            disabled={(show === 'in' ? logs.length : missed.length) === 0}
            onClick={() => {
              const { headers, rows } = exportRows();
              downloadCsv(`attendance-${show === 'missed' ? 'missed-' : ''}${dayKey}.csv`, [headers, ...rows]);
            }}
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Spreadsheet
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-10 gap-2 rounded-xl font-bold"
            disabled={(show === 'in' ? logs.length : missed.length) === 0}
            onClick={() => {
              const { headers, rows } = exportRows();
              printTable(`${listTitle} — ${prettyDay(dayKey)}`, classLabel, headers, rows);
            }}
          >
            <Printer className="h-4 w-4" aria-hidden="true" /> Print
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-black">{prettyDay(dayKey)}</h3>
        <p className="text-xs text-muted-foreground">{classLabel}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Checked in" value={`${checkedIn}/${students.length}`} sub={`${rate}% of students`} />
        <StatTile label="On time" value={stats['on-time']} tone="bg-emerald-500/[0.05] border-emerald-500/20" />
        <StatTile
          label="Late · Excused"
          value={
            <>
              {stats.late} <span className="text-muted-foreground">·</span> {stats.excused}
            </>
          }
          tone="bg-amber-500/[0.05] border-amber-500/20"
        />
        <StatTile label="Points given" value={<span className="text-primary">+{stats.points}</span>} />
      </div>

      <div className="inline-flex rounded-xl border bg-muted/30 p-1" role="tablist" aria-label="Which students">
        {(
          [
            ['in', `Checked in · ${byStudent.size}`],
            ['missed', `Did not check in · ${noCheckInsAtAll ? 0 : missed.length}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={show === id}
            onClick={() => setShow(id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
              show === id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading that day…
          </div>
        ) : noCheckInsAtAll ? (
          <div className="space-y-2 p-10 text-center text-muted-foreground">
            <History className="mx-auto h-8 w-8 opacity-40" aria-hidden="true" />
            <p className="text-sm font-bold">No one checked in on this day</p>
            <p className="text-xs">It may have been a day off. Try another day.</p>
          </div>
        ) : show === 'missed' ? (
          missed.length === 0 ? (
            <p className="p-10 text-center text-sm font-bold text-emerald-600">Everyone checked in this day.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {missed.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{studentDisplayName(s)}</p>
                    <p className="text-xs text-muted-foreground">{(s.classId && classNameById.get(s.classId)) || 'No class'}</p>
                  </div>
                  <Chip mark="absent" />
                </li>
              ))}
            </ul>
          )
        ) : logs.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No check-ins match your search.</p>
        ) : (
          <div className="w-full overflow-x-auto [contain:inline-size]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="hidden px-4 py-3 md:table-cell">Class period</th>
                  <th className="px-4 py-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {logs.map((log) => (
                  <tr key={log.id ?? `${log.studentId}_${log.signedInAt}`} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-bold">{log.studentName || log.studentId}</p>
                      <p className="text-xs text-muted-foreground">
                        {className(log.studentId)}
                        {log.manual ? ' · entered by staff' : ''}
                        {log.note ? ` · “${log.note}”` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{time(log.signedInAt)}</td>
                    <td className="px-4 py-3">
                      <Chip mark={attendanceMarkOf(log)} />
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">{log.periodLabel || '—'}</td>
                    <td className="px-4 py-3 text-right text-xs font-black text-primary">+{log.pointsAwarded ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Patterns over several school days
// ---------------------------------------------------------------------------

function PatternsView({
  schoolId,
  students,
  classNameById,
  classLabel,
}: {
  schoolId: string;
  students: Student[];
  classNameById: Map<string, string>;
  classLabel: string;
}) {
  const firestore = useFirestore();
  const [range, setRange] = useState<'5' | '10' | '20'>('10');
  const [onlyAttention, setOnlyAttention] = useState(false);
  const [sortBy, setSortBy] = useState<'rate' | 'late' | 'name'>('rate');

  const days = useMemo(() => recentSchoolDays(new Date(), Number(range)), [range]);
  const fromMs = days[0]?.startMs ?? Date.now();

  const logQuery = useMemoFirebase(
    () =>
      schoolId
        ? query(
            collection(firestore, 'schools', schoolId, 'attendanceLog'),
            where('signedInAt', '>=', fromMs),
            orderBy('signedInAt', 'desc')
          )
        : null,
    [firestore, schoolId, fromMs]
  );
  const { data: logs, isLoading } = useCollection<AttendanceLogEntry>(logQuery);

  const summary = useMemo(() => summarizeAttendance(logs || [], students, days), [logs, students, days]);
  const attentionCount = summary.students.filter((s) => s.needsAttention).length;
  const avgRate = summary.students.length
    ? Math.round(summary.students.reduce((a, s) => a + s.rate, 0) / summary.students.length)
    : 0;
  const maxBar = Math.max(1, students.length);

  const rows = useMemo(() => {
    const list = summary.students.filter((s) => !onlyAttention || s.needsAttention);
    return list.sort((a, b) => {
      if (sortBy === 'name') return studentDisplayName(a.student).localeCompare(studentDisplayName(b.student));
      if (sortBy === 'late') return b.late - a.late || a.rate - b.rate;
      return a.rate - b.rate || b.late - a.late;
    });
  }, [summary.students, onlyAttention, sortBy]);

  const exportRows = () => ({
    headers: ['Student', 'Class', 'Days in', 'Days missed', 'Late', 'Excused', 'Attendance %', 'Needs attention'],
    rows: rows.map((r) => [
      studentDisplayName(r.student),
      (r.student.classId && classNameById.get(r.student.classId)) || 'No class',
      String(r.daysIn),
      String(r.missed),
      String(r.late),
      String(r.excused),
      `${r.rate}%`,
      r.needsAttention ? 'Yes' : '',
    ]),
  });

  const rangeLabel = `Last ${range} school days`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-sm md:flex-row md:items-center">
        <div className="inline-flex rounded-xl border bg-muted/30 p-1" role="group" aria-label="How many days">
          {(['5', '10', '20'] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => setRange(r)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
                range === r ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {r === '5' ? '1 week' : r === '10' ? '2 weeks' : '4 weeks'}
            </button>
          ))}
        </div>
        <p className="flex-1 text-xs text-muted-foreground">
          {rangeLabel}. Days when no one checked in (like holidays) are skipped.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-10 gap-2 rounded-xl font-bold"
            disabled={rows.length === 0}
            onClick={() => {
              const { headers, rows: r } = exportRows();
              downloadCsv(`attendance-patterns-${localDayKey(new Date())}.csv`, [headers, ...r]);
            }}
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Spreadsheet
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-10 gap-2 rounded-xl font-bold"
            disabled={rows.length === 0}
            onClick={() => {
              const { headers, rows: r } = exportRows();
              printTable('Attendance patterns', `${classLabel} · ${rangeLabel}`, headers, r);
            }}
          >
            <Printer className="h-4 w-4" aria-hidden="true" /> Print
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Adding up attendance…
        </div>
      ) : summary.schoolDays === 0 ? (
        <div className="space-y-2 rounded-2xl border p-10 text-center text-muted-foreground">
          <TrendingUp className="mx-auto h-8 w-8 opacity-40" aria-hidden="true" />
          <p className="text-sm font-bold">No check-ins in this time yet</p>
          <p className="text-xs">Patterns show up once students have been signing in for a few days.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatTile label="Average attendance" value={`${avgRate}%`} sub={`${summary.schoolDays} school days counted`} />
            <StatTile
              label="Need attention"
              value={<span className={attentionCount ? 'text-rose-600' : 'text-emerald-600'}>{attentionCount}</span>}
              sub="Missed a lot, or often late"
              tone={attentionCount ? 'bg-rose-500/[0.05] border-rose-500/20' : undefined}
            />
            <StatTile label="Students" value={students.length} sub={classLabel} />
          </div>

          {/* Day by day */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-black">Day by day</h4>
              <div className="flex gap-3 text-[11px] font-semibold text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> On time
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Late
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm bg-sky-400" /> Excused
                </span>
              </div>
            </div>
            <div className="flex h-40 items-end gap-1.5 sm:gap-2" role="img" aria-label="Check-ins for each day">
              {summary.daily.map((d) => {
                const onTime = d.present - d.late - d.excused;
                const [y, m, dd] = d.key.split('-').map(Number);
                const date = new Date(y, m - 1, dd);
                const title = `${date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}: ${d.present} in, ${d.late} late, ${d.excused} excused${d.present ? `, ${d.missing} missed` : ' (no check-ins)'}`;
                return (
                  <div key={d.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={title}>
                    <span className="text-[10px] font-bold text-muted-foreground">{d.present || ''}</span>
                    <div className="flex w-full max-w-[36px] flex-col-reverse overflow-hidden rounded-md bg-muted/60" style={{ height: '100%' }}>
                      <div className="bg-emerald-500" style={{ height: `${(onTime / maxBar) * 100}%` }} />
                      <div className="bg-amber-400" style={{ height: `${(d.late / maxBar) * 100}%` }} />
                      <div className="bg-sky-400" style={{ height: `${(d.excused / maxBar) * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {date.toLocaleDateString(undefined, { weekday: 'narrow' })}
                      <span className="hidden sm:inline"> {dd}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Students */}
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
              <button
                type="button"
                onClick={() => setOnlyAttention((v) => !v)}
                aria-pressed={onlyAttention}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors',
                  onlyAttention ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300' : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                Only students who need attention ({attentionCount})
              </button>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="h-9 w-44 rounded-xl text-xs" aria-label="Sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rate">Lowest attendance first</SelectItem>
                  <SelectItem value="late">Most late first</SelectItem>
                  <SelectItem value="name">By name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {rows.length === 0 ? (
              <p className="p-10 text-center text-sm font-bold text-emerald-600">No one needs attention right now.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {rows.map((r) => (
                  <li key={r.student.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-sm font-bold">
                        {studentDisplayName(r.student)}
                        {r.needsAttention && (
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-500" aria-label="Needs attention" />
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(r.student.classId && classNameById.get(r.student.classId)) || 'No class'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Chip mark="on-time" label={`${r.daysIn} in`} />
                      {r.missed > 0 && <Chip mark="absent" label={`${r.missed} missed`} />}
                      {r.late > 0 && <Chip mark="late" label={`${r.late} late`} />}
                      {r.excused > 0 && <Chip mark="excused" label={`${r.excused} excused`} />}
                    </div>
                    <div className="flex w-32 items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            r.rate >= 95 ? 'bg-emerald-500' : r.rate >= 90 ? 'bg-amber-400' : 'bg-rose-500'
                          )}
                          style={{ width: `${r.rate}%` }}
                        />
                      </div>
                      <span className="w-9 text-right text-xs font-black">{r.rate}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
