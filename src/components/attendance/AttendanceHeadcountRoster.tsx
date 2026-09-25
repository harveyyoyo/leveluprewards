'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Link2,
  Loader2,
  Printer,
  Search,
  ShieldCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { collection, orderBy, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { AttendanceLogEntry, Class, Student } from '@/lib/types';
import {
  ATTENDANCE_MARK_LABEL,
  attendanceMarkOf,
  latestLogByStudent,
  type AttendanceMark,
} from '@/lib/attendance/attendanceStatus';
import { getSchoolDayClock } from '@/lib/attendance/schoolDayClock';
import { useMinuteClock } from '@/hooks/useMinuteClock';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type RosterMark = AttendanceMark | 'absent';
export type RosterSortKey = 'name' | 'class' | 'status' | 'time';
type SortDir = 'asc' | 'desc';

/** Order used when sorting by status: people to worry about first. */
const STATUS_ORDER: Record<RosterMark, number> = { absent: 0, late: 1, excused: 2, 'on-time': 3 };

const STATUS_CHIP: Record<RosterMark, { cls: string; icon: React.ElementType; label: string }> = {
  'on-time': {
    cls: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:text-emerald-300',
    icon: CheckCircle2,
    label: ATTENDANCE_MARK_LABEL['on-time'],
  },
  late: { cls: 'bg-amber-500/15 text-amber-800 border-amber-500/25 dark:text-amber-300', icon: Clock, label: 'Late' },
  excused: { cls: 'bg-sky-500/15 text-sky-700 border-sky-500/20 dark:text-sky-300', icon: ShieldCheck, label: 'Excused' },
  absent: { cls: 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300', icon: UserX, label: 'Not here' },
};

function rosterName(s: Student): string {
  if (s.lastName) return `${s.lastName}, ${s.firstName || ''}`.trim();
  return s.firstName || s.nickname || s.id;
}

export interface AttendanceHeadcountRosterProps {
  schoolId: string;
  schoolName: string;
  students: Student[];
  classes: Class[];
  timeZone?: string;
  classId: string;
  onClassIdChange: (classId: string) => void;
  sortKey: RosterSortKey;
  sortDir: SortDir;
  onSortChange: (key: RosterSortKey, dir: SortDir) => void;
}

/**
 * Live headcount of every student for today (roll call, fire drills, assemblies).
 * Lives on its own page so the link can be shared with other staff and printed.
 */
export function AttendanceHeadcountRoster({
  schoolId,
  schoolName,
  students,
  classes,
  timeZone,
  classId,
  onClassIdChange,
  sortKey,
  sortDir,
  onSortChange,
}: AttendanceHeadcountRosterProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RosterMark>('all');

  const nowMs = useMinuteClock();
  const clock = getSchoolDayClock(nowMs, timeZone, { whenUnset: 'local' });
  const startOfDay = nowMs - clock.minutesSinceMidnight * 60_000;

  const logQuery = useMemoFirebase(
    () =>
      schoolId
        ? query(
            collection(firestore, 'schools', schoolId, 'attendanceLog'),
            where('signedInAt', '>=', startOfDay),
            orderBy('signedInAt', 'desc'),
          )
        : null,
    [firestore, schoolId, startOfDay],
  );
  const { data: logs, isLoading, error } = useCollection<AttendanceLogEntry>(logQuery);
  const logByStudent = useMemo(() => latestLogByStudent(logs || []), [logs]);

  const classNameById = useMemo(() => new Map(classes.map((c) => [c.id, c.name || 'Class'])), [classes]);
  const sortedClasses = useMemo(
    () => classes.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [classes],
  );

  const formatTime = (ms: number) => {
    try {
      return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', ...(timeZone ? { timeZone } : {}) });
    } catch {
      return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
  };

  const rows = useMemo(
    () =>
      students.map((s) => {
        const log = logByStudent.get(s.id);
        return {
          student: s,
          name: rosterName(s),
          className: (s.classId && classNameById.get(s.classId)) || 'Unassigned',
          mark: (log ? attendanceMarkOf(log) : 'absent') as RosterMark,
          signedInAt: log ? Number(log.signedInAt || 0) : null,
        };
      }),
    [students, logByStudent, classNameById],
  );

  const inClass = useMemo(
    () => (classId === 'all' ? rows : rows.filter((r) => r.student.classId === classId)),
    [rows, classId],
  );

  const stats = useMemo(() => {
    const out = { total: inClass.length, 'on-time': 0, late: 0, excused: 0, absent: 0 };
    for (const r of inClass) out[r.mark] += 1;
    return out;
  }, [inClass]);

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = inClass.filter((r) => {
      if (statusFilter !== 'all' && r.mark !== statusFilter) return false;
      if (!q) return true;
      const s = r.student;
      return [s.firstName, s.lastName, s.nickname, r.className].some((v) => (v || '').toLowerCase().includes(q));
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    const byName = (a: (typeof filtered)[number], b: (typeof filtered)[number]) => a.name.localeCompare(b.name);
    return filtered.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = byName(a, b);
      else if (sortKey === 'class') cmp = a.className.localeCompare(b.className);
      else if (sortKey === 'status') cmp = STATUS_ORDER[a.mark] - STATUS_ORDER[b.mark];
      else if (sortKey === 'time') {
        // Students with no sign-in time always go last, whichever way the column is sorted.
        if (a.signedInAt == null || b.signedInAt == null) {
          if (a.signedInAt == null && b.signedInAt == null) return byName(a, b);
          return a.signedInAt == null ? 1 : -1;
        }
        cmp = a.signedInAt - b.signedInAt;
      }
      return cmp !== 0 ? cmp * dir : byName(a, b);
    });
  }, [inClass, searchQuery, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: RosterSortKey) => {
    if (key === sortKey) onSortChange(key, sortDir === 'asc' ? 'desc' : 'asc');
    else onSortChange(key, 'asc');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link copied',
        description: 'Anyone you send it to must be signed in as staff at your school to see the list.',
      });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy', description: 'Copy the address from the top of the browser instead.' });
    }
  };

  const dateLabel = new Date(nowMs).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(timeZone ? { timeZone } : {}),
  });

  const columns: { key: RosterSortKey; label: string; className?: string }[] = [
    { key: 'name', label: 'Student' },
    { key: 'class', label: 'Class' },
    { key: 'status', label: 'Status', className: 'text-center' },
    { key: 'time', label: 'Signed in', className: 'text-right' },
  ];

  const statTiles: { key: 'all' | RosterMark; label: string; value: number; cls: string; icon: React.ElementType }[] = [
    { key: 'all', label: 'Total', value: stats.total, cls: 'bg-card', icon: Users },
    { key: 'on-time', label: 'On time', value: stats['on-time'], cls: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', icon: CheckCircle2 },
    { key: 'late', label: 'Late', value: stats.late, cls: 'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300', icon: Clock },
    { key: 'excused', label: 'Excused', value: stats.excused, cls: 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300', icon: ShieldCheck },
    { key: 'absent', label: 'Not here', value: stats.absent, cls: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300', icon: UserX },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">{schoolName}</h1>
          <p className="text-sm font-semibold text-muted-foreground">
            Daily attendance &amp; headcount · {dateLabel}
            {classId !== 'all' ? ` · ${classNameById.get(classId) ?? ''}` : ''}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground print:hidden">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
            Updates live as students sign in
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" className="gap-2 rounded-xl font-bold" onClick={() => void copyLink()}>
            <Link2 className="h-4 w-4" aria-hidden="true" /> Copy link
          </Button>
          <Button className="gap-2 rounded-xl font-bold" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" /> Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {statTiles.map((t) => {
          const Icon = t.icon;
          const active = statusFilter === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setStatusFilter(active && t.key !== 'all' ? 'all' : t.key)}
              aria-pressed={active}
              className={cn(
                'rounded-2xl border p-3 text-left transition-shadow print:shadow-none',
                t.cls,
                active && t.key !== 'all' ? 'ring-2 ring-foreground/70' : 'hover:shadow-sm',
                t.key === 'all' && 'col-span-2 sm:col-span-1',
              )}
            >
              <span className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider opacity-80">
                {t.label}
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="mt-1 block text-2xl font-black">{t.value}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row print:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Find a student or class"
            aria-label="Find a student or class"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-xl pl-9 pr-8"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={classId} onValueChange={onClassIdChange}>
          <SelectTrigger className="h-10 rounded-xl sm:w-60" aria-label="Class">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes ({students.length})</SelectItem>
            {sortedClasses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm print:hidden" role="alert">
          Couldn&apos;t load today&apos;s sign-ins, so everyone may show as not here. Check the internet connection and reload.
        </p>
      )}

      {isLoading && !logs ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading today&apos;s sign-ins…
        </div>
      ) : visible.length === 0 ? (
        <div className="space-y-2 rounded-2xl border p-12 text-center text-muted-foreground">
          <Users className="mx-auto h-8 w-8 opacity-40" aria-hidden="true" />
          <p className="text-sm font-semibold">No students match.</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-2xl border bg-card [contain:inline-size] print:overflow-visible print:[contain:none]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <th className="w-12 px-3 py-2.5 text-center">#</th>
                {columns.map((col) => {
                  const active = sortKey === col.key;
                  const SortIcon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown;
                  return (
                    <th
                      key={col.key}
                      className={cn('px-3 py-2.5', col.className)}
                      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md px-1 py-0.5 uppercase tracking-wider hover:text-foreground',
                          active && 'text-foreground',
                        )}
                      >
                        {col.label}
                        <SortIcon className={cn('h-3.5 w-3.5 print:hidden', !active && 'opacity-40')} aria-hidden="true" />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.map((r, idx) => {
                const chip = STATUS_CHIP[r.mark];
                const Icon = chip.icon;
                return (
                  <tr key={r.student.id} className="transition-colors hover:bg-muted/20 print:break-inside-avoid">
                    <td className="px-3 py-2 text-center text-xs text-muted-foreground">{idx + 1}</td>
                    <td className="px-3 py-2 font-bold">{r.name}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.className}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold', chip.cls)}>
                        <Icon className="h-3 w-3" aria-hidden="true" />
                        {chip.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                      {r.signedInAt != null ? formatTime(r.signedInAt) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
