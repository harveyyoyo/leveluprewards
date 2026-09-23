'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Clock, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useOfficeConfirm } from '@/components/office/useOfficeConfirm';
import { useOfficeWrite } from '@/lib/office/useOfficeWrite';
import {
  OFFICE_WEEK_DAYS,
  findTeacherScheduleConflicts,
  formatScheduleBlockTime,
  formatScheduleDays,
  sortScheduleBlocks,
  validateScheduleBlock,
} from '@/lib/office/officeSchedule';
import type { OfficeClass, OfficeScheduleBlock, OfficeTeacher } from '@/lib/office/types';
import { cn } from '@/lib/utils';

const NO_TEACHER = '__none__';

type Draft = {
  id: string | null;
  subject: string;
  teacherId: string;
  days: number[];
  startTime: string;
  endTime: string;
  room: string;
};

function newBlockId(): string {
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

type OfficeClassScheduleSectionProps = {
  schoolId: string;
  officeClass: OfficeClass;
  /** Every class, so double-booked teachers can be spotted across the school. */
  allClasses: OfficeClass[];
  teachers: OfficeTeacher[];
  teacherNameById: Map<string, string>;
};

/** Weekly timetable for one class, shown on the class card. */
export function OfficeClassScheduleSection({
  schoolId,
  officeClass,
  allClasses,
  teachers,
  teacherNameById,
}: OfficeClassScheduleSectionProps) {
  const write = useOfficeWrite(schoolId);
  const { toast } = useToast();
  const { confirm, confirmDialog } = useOfficeConfirm();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const blocks = useMemo(() => sortScheduleBlocks(officeClass.schedule ?? []), [officeClass.schedule]);

  const classTeacherIds = useMemo(
    () => (officeClass.teacherIds?.length ? officeClass.teacherIds : officeClass.teacherId ? [officeClass.teacherId] : []),
    [officeClass],
  );

  // This class's teachers first, then everyone else.
  const teacherOptions = useMemo(() => {
    const byName = (a: OfficeTeacher, b: OfficeTeacher) => (a.name ?? '').localeCompare(b.name ?? '');
    return [
      ...teachers.filter((t) => classTeacherIds.includes(t.id)).sort(byName),
      ...teachers.filter((t) => !classTeacherIds.includes(t.id)).sort(byName),
    ];
  }, [teachers, classTeacherIds]);

  const conflicts = useMemo(() => {
    if (!draft || draft.teacherId === NO_TEACHER || validateScheduleBlock(draft)) return [];
    return findTeacherScheduleConflicts(allClasses, {
      id: draft.id ?? '__draft__',
      teacherId: draft.teacherId,
      days: draft.days,
      startTime: draft.startTime,
      endTime: draft.endTime,
    });
  }, [draft, allClasses]);

  const describe = (b: Pick<OfficeScheduleBlock, 'subject' | 'days' | 'startTime' | 'endTime'>) =>
    `${b.subject} (${formatScheduleDays(b.days)} ${formatScheduleBlockTime(b)})`;

  const save = async (schedule: OfficeScheduleBlock[], summary: string) => {
    if (!write.ctx) return false;
    setBusy(true);
    try {
      await write.saveOfficeClassSchedule(write.ctx, { cls: officeClass, schedule, summary });
      return true;
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save the schedule', description: (e as Error).message });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openNew = () =>
    setDraft({
      id: null,
      subject: '',
      teacherId: classTeacherIds[0] ?? NO_TEACHER,
      days: [1, 2, 3, 4, 5],
      startTime: '09:00',
      endTime: '09:45',
      room: '',
    });

  const openEdit = (b: OfficeScheduleBlock) =>
    setDraft({
      id: b.id,
      subject: b.subject,
      teacherId: b.teacherId ?? NO_TEACHER,
      days: b.days,
      startTime: b.startTime,
      endTime: b.endTime,
      room: b.room ?? '',
    });

  const submit = async () => {
    if (!draft) return;
    const problem = validateScheduleBlock(draft);
    if (problem) {
      toast({ variant: 'destructive', title: problem });
      return;
    }
    const block: OfficeScheduleBlock = {
      id: draft.id ?? newBlockId(),
      subject: draft.subject.trim(),
      teacherId: draft.teacherId === NO_TEACHER ? null : draft.teacherId,
      days: Array.from(new Set(draft.days)).sort((a, b) => a - b),
      startTime: draft.startTime,
      endTime: draft.endTime,
      room: draft.room.trim() || null,
    };
    const previous = blocks.find((b) => b.id === block.id);
    const next = previous ? blocks.map((b) => (b.id === block.id ? block : b)) : [...blocks, block];
    const who = block.teacherId ? ` with ${teacherNameById.get(block.teacherId) ?? 'a teacher'}` : '';
    const summary = previous ? `changed ${describe(previous)} → ${describe(block)}${who}` : `added ${describe(block)}${who}`;
    if (await save(next, summary)) {
      toast({ title: previous ? 'Schedule updated' : 'Added to schedule' });
      setDraft(null);
    }
  };

  const remove = async (b: OfficeScheduleBlock) => {
    const ok = await confirm({
      title: `Take ${b.subject} off the schedule?`,
      description: `${formatScheduleDays(b.days)}, ${formatScheduleBlockTime(b)}. The change is kept in the history.`,
      confirmLabel: 'Take off',
      tone: 'caution',
    });
    if (!ok) return;
    if (await save(blocks.filter((x) => x.id !== b.id), `removed ${describe(b)}`)) {
      toast({ title: 'Taken off the schedule' });
    }
  };

  return (
    <section>
      {confirmDialog}
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Weekly schedule</h3>

      {blocks.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm dark:border-slate-800">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openEdit(b)}>
                <span className="block font-medium">{b.subject}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatScheduleDays(b.days)} · {formatScheduleBlockTime(b)}
                  {b.teacherId ? ` · ${teacherNameById.get(b.teacherId) ?? 'Teacher'}` : ''}
                  {b.room ? ` · ${b.room}` : ''}
                </span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove(b)}
                aria-label={`Take ${b.subject} off the schedule`}
                className="rounded-full p-1 text-muted-foreground hover:bg-slate-100 hover:text-foreground disabled:opacity-50 dark:hover:bg-slate-800"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : !draft ? (
        <p className="mt-2 text-sm text-muted-foreground">No times set yet.</p>
      ) : null}

      {draft ? (
        <div className="mt-3 space-y-3 rounded-xl border bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="office-sched-subject">Subject</Label>
              <Input
                id="office-sched-subject"
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                placeholder="e.g. Math"
                className="rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Teacher</Label>
              <Select value={draft.teacherId} onValueChange={(v) => setDraft({ ...draft, teacherId: v })}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TEACHER}>No teacher</SelectItem>
                  {teacherOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Days</Label>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Days">
              {OFFICE_WEEK_DAYS.map((d) => {
                const on = draft.days.includes(d.day);
                return (
                  <button
                    key={d.day}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setDraft({ ...draft, days: on ? draft.days.filter((x) => x !== d.day) : [...draft.days, d.day] })
                    }
                    className={cn(
                      'h-8 min-w-[2.75rem] rounded-lg border px-2 text-xs font-medium transition-colors',
                      on
                        ? 'border-teal-700 bg-teal-700 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
                    )}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="office-sched-start">Starts</Label>
              <Input
                id="office-sched-start"
                type="time"
                value={draft.startTime}
                onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="office-sched-end">Ends</Label>
              <Input
                id="office-sched-end"
                type="time"
                value={draft.endTime}
                onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                className="rounded-lg"
              />
            </div>
            <div className="col-span-2 space-y-1.5 sm:col-span-1">
              <Label htmlFor="office-sched-room">Room (optional)</Label>
              <Input
                id="office-sched-room"
                value={draft.room}
                onChange={(e) => setDraft({ ...draft, room: e.target.value })}
                placeholder="e.g. Room 4"
                className="rounded-lg"
              />
            </div>
          </div>

          {conflicts.length > 0 ? (
            <div className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                {teacherNameById.get(draft.teacherId) ?? 'This teacher'} is already teaching then:{' '}
                {conflicts
                  .map((c) => `${c.block.subject} in ${c.className} (${formatScheduleDays(c.block.days)} ${formatScheduleBlockTime(c.block)})`)
                  .join('; ')}
                . You can still save.
              </span>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button type="button" size="sm" className="rounded-lg" disabled={busy} onClick={() => void submit()}>
              {busy ? 'Saving…' : draft.id ? 'Save changes' : 'Add to schedule'}
            </Button>
            <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" className="mt-2 h-8 gap-1.5 rounded-lg text-xs" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" />
          Add a time
        </Button>
      )}
    </section>
  );
}

/** One teacher's week across every class, for the teacher card. */
export function OfficeTeacherWeek({
  week,
  onOpenClass,
}: {
  week: Array<{ day: number; items: Array<{ classId: string; className: string; block: OfficeScheduleBlock }> }>;
  onOpenClass: (classId: string) => void;
}) {
  return (
    <section>
      <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <Clock className="h-3.5 w-3.5" aria-hidden />
        Weekly schedule
      </h3>
      {week.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No times yet. Add them from a class card, under Weekly schedule.
        </p>
      ) : (
        <div className="mt-2 space-y-3">
          {week.map(({ day, items }) => (
            <div key={day}>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{OFFICE_WEEK_DAYS[day]?.long}</p>
              <ul className="mt-1 space-y-1">
                {items.map(({ classId, className, block }) => (
                  <li key={`${block.id}-${day}`}>
                    <button
                      type="button"
                      onClick={() => onOpenClass(classId)}
                      className="flex w-full items-baseline gap-3 rounded-lg px-2 py-1 text-left text-sm hover:bg-teal-50/60 dark:hover:bg-teal-950/20"
                    >
                      <span className="w-36 shrink-0 text-xs tabular-nums text-muted-foreground">
                        {formatScheduleBlockTime(block)}
                      </span>
                      <span className="min-w-0">
                        <span className="font-medium">{block.subject}</span>
                        <span className="text-muted-foreground">
                          {' '}
                          · {className}
                          {block.room ? ` · ${block.room}` : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
