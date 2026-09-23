'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useOfficeWrite } from '@/lib/office/useOfficeWrite';
import { useOfficeAttendanceForDate } from '@/lib/office/useOfficeAttendance';
import { officeStudentsForClass, getOfficeStudentFullName } from '@/lib/office/officeUtils';
import { OfficeEmptyState } from '@/components/office/OfficeEmptyState';
import { OfficeLoadingRows } from '@/components/office/OfficeLoadingRows';
import { cn } from '@/lib/utils';
import type { OfficeAttendanceStatus, OfficeClass, OfficeStudent } from '@/lib/office/types';

type OfficeAttendanceViewProps = {
  schoolId: string;
  students: OfficeStudent[];
  classes: OfficeClass[];
  isLoading: boolean;
};

const STATUS_OPTIONS: { id: OfficeAttendanceStatus; label: string }[] = [
  { id: 'present', label: 'Present' },
  { id: 'absent', label: 'Absent' },
  { id: 'late', label: 'Late' },
  { id: 'excused', label: 'Excused' },
];

const STATUS_STYLES: Record<OfficeAttendanceStatus, string> = {
  present: 'bg-emerald-600 text-white hover:bg-emerald-600/90',
  absent: 'bg-red-600 text-white hover:bg-red-600/90',
  late: 'bg-amber-500 text-white hover:bg-amber-500/90',
  excused: 'bg-slate-500 text-white hover:bg-slate-500/90',
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function OfficeAttendanceView({ schoolId, students, classes, isLoading }: OfficeAttendanceViewProps) {
  const { toast } = useToast();
  const write = useOfficeWrite(schoolId);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(todayIso());
  const [busy, setBusy] = useState(false);
  const [marks, setMarks] = useState<Record<string, OfficeAttendanceStatus>>({});

  const sortedClasses = useMemo(
    () => classes.slice().sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    [classes],
  );

  useEffect(() => {
    if (!classId && sortedClasses.length > 0) setClassId(sortedClasses[0].id);
  }, [classId, sortedClasses]);

  const classStudents = useMemo(
    () => (classId ? officeStudentsForClass(students, classId) : []),
    [students, classId],
  );

  const {
    entries: dayEntries,
    isLoading: attendanceLoading,
    error: attendanceError,
  } = useOfficeAttendanceForDate(schoolId, date || null);

  const existingForClass = useMemo(() => {
    const map = new Map<string, OfficeAttendanceStatus>();
    for (const e of dayEntries) {
      if (e.classId === classId) map.set(e.studentId, e.status);
    }
    return map;
  }, [dayEntries, classId]);

  // Re-seed the working marks whenever the class/date selection (or the loaded rows for it)
  // changes, defaulting unmarked students to Present so a normal day is a single click to save.
  // Guarded by content, not just reference, so an upstream hook returning a new-but-equal
  // array/map on every render can't put this in an infinite render loop.
  useEffect(() => {
    const seeded: Record<string, OfficeAttendanceStatus> = {};
    for (const s of classStudents) {
      seeded[s.id] = existingForClass.get(s.id) ?? 'present';
    }
    setMarks((prev) => {
      const prevKeys = Object.keys(prev);
      const seededKeys = Object.keys(seeded);
      const unchanged =
        prevKeys.length === seededKeys.length && seededKeys.every((k) => prev[k] === seeded[k]);
      return unchanged ? prev : seeded;
    });
  }, [classStudents, existingForClass]);

  const counts = useMemo(() => {
    const c: Record<OfficeAttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const status of Object.values(marks)) c[status] += 1;
    return c;
  }, [marks]);

  const handleSave = async () => {
    if (!write.ctx || !classId || !date) return;
    setBusy(true);
    try {
      await write.bulkSetOfficeAttendance(write.ctx, {
        classId,
        date,
        marks: classStudents.map((s) => ({ studentId: s.id, status: marks[s.id] ?? 'present' })),
      });
      toast({ title: 'Attendance saved', description: `${classStudents.length} students · ${date}` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save attendance', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return <OfficeLoadingRows cols={2} rows={6} />;
  }

  if (classes.length === 0) {
    return (
      <OfficeEmptyState
        icon={CalendarCheck}
        title="No classes yet"
        description="Create a class on the Classes page before taking attendance."
      />
    );
  }

  if (attendanceError) {
    return (
      <OfficeEmptyState
        icon={CalendarCheck}
        title="Attendance is almost ready"
        description="Daily attendance will open here after the next update. Everything else in the office works as usual."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pick a class and a day, mark anyone who wasn&apos;t simply present, then save.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Class</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-52 h-11 rounded-xl">
              <SelectValue placeholder="Choose a class" />
            </SelectTrigger>
            <SelectContent>
              {sortedClasses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 w-44 rounded-xl" />
        </div>
        <Button type="button" className="rounded-xl" onClick={() => void handleSave()} disabled={busy || !classId}>
          {busy ? 'Saving…' : 'Save attendance'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {counts.present} present · {counts.absent} absent · {counts.late} late · {counts.excused} excused
      </p>

      {attendanceLoading ? (
        <OfficeLoadingRows cols={1} rows={5} />
      ) : classStudents.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No students assigned to this class yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <ul className="divide-y dark:divide-slate-800">
            {classStudents.map((s) => {
              const status = marks[s.id] ?? 'present';
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                  <span className="text-sm font-medium">{getOfficeStudentFullName(s)}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={cn(
                          'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                          status === opt.id ? STATUS_STYLES[opt.id] : 'bg-muted text-muted-foreground hover:bg-muted/70',
                        )}
                        onClick={() => setMarks((prev) => ({ ...prev, [s.id]: opt.id }))}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
