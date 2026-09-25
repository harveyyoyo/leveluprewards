'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarCheck } from 'lucide-react';
import { OfficeAssistantBanner } from '@/components/office/OfficeAssistantBanner';
import {
  ATTENDANCE_STATUS_OPTIONS,
  findClassByAskedName,
  type OfficeAssistantAttendanceStatus,
} from '@/lib/office/officeAssistantView';
import { OFFICE_ASSISTANT_CHAT_ROWS, useReportOfficeAssistantResults } from '@/lib/office/officeAssistantResults';
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

const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.id, o.label])) as Record<OfficeAttendanceStatus, string>;

const STATUS_STYLES: Record<OfficeAttendanceStatus, string> = {
  present: 'bg-emerald-600 text-white hover:bg-emerald-600/90',
  absent: 'bg-red-600 text-white hover:bg-red-600/90',
  late: 'bg-amber-500 text-white hover:bg-amber-500/90',
  excused: 'bg-slate-500 text-white hover:bg-slate-500/90',
};

/** Today on this computer's calendar (not UTC, which is already tomorrow on a US evening). */
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const ASK_STATUS_LABEL: Record<OfficeAssistantAttendanceStatus, string> = {
  absent: 'absent',
  late: 'late',
  excused: 'excused',
  'not-present': 'absent, late, or excused',
};

export function OfficeAttendanceView({ schoolId, students, classes, isLoading }: OfficeAttendanceViewProps) {
  const { toast } = useToast();
  const write = useOfficeWrite(schoolId);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(todayIso());
  const [busy, setBusy] = useState(false);
  const [marks, setMarks] = useState<Record<string, OfficeAttendanceStatus>>({});
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // A day opened from Help → Ask ("who is absent today?"): one list across classes instead of
  // the class-by-class taking screen, until Clear. Applied once per question.
  const appliedAskAt = useRef<string | null>(null);
  const pendingAskClass = useRef<string | null>(null);
  const [reportAskAt, setReportAskAt] = useState<string | null>(null);
  const [askLabel, setAskLabel] = useState('');
  const [askStatus, setAskStatus] = useState<OfficeAssistantAttendanceStatus>('absent');
  const [askClassId, setAskClassId] = useState<string | null>(null);
  useEffect(() => {
    const askAt = searchParams.get('askAt');
    const ask = searchParams.get('ask')?.trim();
    if (isLoading || !askAt || !ask || appliedAskAt.current === askAt) return;
    appliedAskAt.current = askAt;
    const askedDate = searchParams.get('date');
    const status = searchParams.get('status');
    const cls = findClassByAskedName(classes, searchParams.get('className'));
    setReportAskAt(askAt);
    setAskLabel(ask);
    setDate(askedDate && /^\d{4}-\d{2}-\d{2}$/.test(askedDate) ? askedDate : todayIso());
    setAskStatus(
      (ATTENDANCE_STATUS_OPTIONS as readonly string[]).includes(status ?? '')
        ? (status as OfficeAssistantAttendanceStatus)
        : 'absent',
    );
    setAskClassId(cls?.id ?? null);
    if (cls) setClassId(cls.id);
    // The class list can arrive a moment after the page first shows; pick the class up then.
    pendingAskClass.current = cls ? null : searchParams.get('className')?.trim() || null;
  }, [searchParams, classes, isLoading]);

  useEffect(() => {
    const cls = findClassByAskedName(classes, pendingAskClass.current);
    if (!cls) return;
    pendingAskClass.current = null;
    setAskClassId(cls.id);
    setClassId(cls.id);
  }, [classes]);

  const clearAsk = () => {
    setReportAskAt(null);
    setAskLabel('');
    setAskClassId(null);
    setDate(todayIso());
    router.replace(pathname, { scroll: false });
  };

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

  const classNameById = useMemo(() => new Map(classes.map((c) => [c.id, c.name ?? ''])), [classes]);
  const askMatches = useMemo(() => {
    if (!askLabel) return [];
    const studentById = new Map(students.map((s) => [s.id, s]));
    return dayEntries
      .filter((e) => (askStatus === 'not-present' ? e.status !== 'present' : e.status === askStatus))
      .filter((e) => !askClassId || e.classId === askClassId)
      .map((e) => {
        const s = studentById.get(e.studentId);
        return { entry: e, name: s ? getOfficeStudentFullName(s) : 'Student', className: classNameById.get(e.classId) ?? '' };
      })
      .sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name));
  }, [askLabel, askStatus, askClassId, dayEntries, students, classNameById]);

  // Tell the Help chat what this day shows, so it can answer with the same names.
  useReportOfficeAssistantResults(reportAskAt, !!attendanceError || (!isLoading && !attendanceLoading), () =>
    attendanceError
      ? { status: 'unavailable', message: 'Attendance isn’t open yet — it opens after the next update.' }
      : {
          status: 'ready',
          total: askMatches.length,
          noun: ['student', 'students'],
          studentIds: [...new Set(askMatches.map((m) => m.entry.studentId))],
          rows: askMatches.slice(0, OFFICE_ASSISTANT_CHAT_ROWS).map((m) => ({
            id: m.entry.id,
            name: m.name,
            open: { kind: 'student', id: m.entry.studentId },
            detail: [m.className, askStatus === 'not-present' ? STATUS_LABEL[m.entry.status] : null]
              .filter(Boolean)
              .join(' · '),
          })),
        },
  );

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
      <div className="space-y-3">
        {askLabel ? <OfficeAssistantBanner label={askLabel} onClear={clearAsk} /> : null}
        <OfficeEmptyState
          icon={CalendarCheck}
          title="Attendance is almost ready"
          description="Daily attendance will open here after the next update. Everything else in the office works as usual."
        />
      </div>
    );
  }

  if (askLabel) {
    const dayLabel = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    return (
      <div className="space-y-3">
        <OfficeAssistantBanner label={askLabel} onClear={clearAsk} />
        <p className="text-sm text-muted-foreground">
          {dayLabel}
          {askClassId ? ` · ${classNameById.get(askClassId)}` : ' · all classes'}
        </p>
        {attendanceLoading ? (
          <OfficeLoadingRows cols={2} rows={4} />
        ) : askMatches.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-white px-4 py-8 text-center text-sm text-muted-foreground dark:border-slate-800 dark:bg-slate-900">
            No one was marked {ASK_STATUS_LABEL[askStatus]} this day.
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {askMatches.map((m) => (
              <li key={m.entry.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  {m.className ? <p className="text-xs text-muted-foreground">{m.className}</p> : null}
                </div>
                <span className={cn('rounded-lg px-2.5 py-1 text-xs font-semibold', STATUS_STYLES[m.entry.status])}>
                  {STATUS_LABEL[m.entry.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
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
                          'min-h-11 rounded-lg px-3 text-xs font-semibold transition-colors',
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
