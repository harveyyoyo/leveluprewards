'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useOfficeWrite } from '@/lib/office/useOfficeWrite';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useOfficeEntityNav } from '@/components/office/OfficeEntityNavProvider';
import { OfficeEntityLink } from '@/components/office/OfficeEntityLink';
import { OfficeEntityHistorySection } from '@/components/office/OfficeEntityHistorySection';
import { OfficeClassScheduleSection } from '@/components/office/OfficeClassScheduleSection';
import { officePublicHref } from '@/lib/officePublicUrl';
import { getOfficeStudentFullName, getOfficeTeacherLabel, officeStudentsForClass } from '@/lib/office/officeUtils';
import type { OfficeClass, OfficeStudent, OfficeTeacher } from '@/lib/office/types';

type OfficeClassSheetProps = {
  schoolId: string;
  officeClass: OfficeClass | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: OfficeStudent[];
  teachers?: OfficeTeacher[];
  allClasses?: OfficeClass[];
  teacherNameById: Map<string, string>;
};

export function OfficeClassSheet({
  schoolId,
  officeClass,
  open,
  onOpenChange,
  students,
  teachers = [],
  allClasses = [],
  teacherNameById,
}: OfficeClassSheetProps) {
  const { openStudent } = useOfficeEntityNav();
  const write = useOfficeWrite(schoolId);
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const classStudents = useMemo(
    () => (officeClass ? officeStudentsForClass(students, officeClass.id) : []),
    [students, officeClass],
  );

  const teacherIds = useMemo(() => {
    if (officeClass?.teacherIds && officeClass.teacherIds.length > 0) {
      return officeClass.teacherIds;
    }
    if (officeClass?.teacherId) {
      return [officeClass.teacherId];
    }
    return [];
  }, [officeClass]);

  const teacherNames = useMemo(() => {
    return teacherIds.map((id) => teacherNameById.get(id)).filter(Boolean).join(', ');
  }, [teacherIds, teacherNameById]);

  const availableTeachers = useMemo(
    () =>
      teachers
        .filter((t) => !teacherIds.includes(t.id))
        .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    [teachers, teacherIds],
  );

  if (!officeClass) return null;

  const saveTeachers = async (nextTeacherIds: string[]) => {
    if (!write.ctx) return;
    setBusy(true);
    try {
      await write.setOfficeClassTeachers(write.ctx, {
        cls: officeClass,
        teacherIds: nextTeacherIds,
        classStudentIds: classStudents.map((s) => s.id),
        teacherNameById,
      });
      toast({ title: 'Teachers updated' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not update teachers', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const classesHref = `${officePublicHref(schoolId, 'classes')}?class=${encodeURIComponent(officeClass.id)}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-xl font-bold">{officeClass.name}</SheetTitle>
          <SheetDescription>
            {classStudents.length}
            {officeClass.capacity ? `/${officeClass.capacity}` : ''} student{classStudents.length === 1 ? '' : 's'}
            {teacherNames ? ` · ${teacherNames}` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {officeClass.capacity && classStudents.length > officeClass.capacity ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              Over capacity — {classStudents.length} students, capacity is {officeClass.capacity}.
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-xs">
              <Link href={classesHref}>Open on Classes</Link>
            </Button>
          </div>

          {officeClass.notes?.trim() ? (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Notes</h3>
              <p className="mt-2 text-sm bg-muted/20 border rounded-xl p-3">{officeClass.notes}</p>
            </section>
          ) : null}

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Teachers</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {teacherIds.map((teacherId, index) => (
                <span
                  key={teacherId}
                  className="inline-flex items-center gap-1 rounded-full border bg-white py-0.5 pl-3 pr-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <OfficeEntityLink kind="teacher" id={teacherId} label={teacherNameById.get(teacherId) ?? 'Teacher'} />
                  {index === 0 ? (
                    <span className="rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-800 dark:bg-teal-950/50 dark:text-teal-200">
                      Main
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void saveTeachers([teacherId, ...teacherIds.filter((id) => id !== teacherId)])}
                      className="rounded-full px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-slate-100 hover:text-foreground disabled:opacity-50 dark:hover:bg-slate-800"
                    >
                      Make main
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void saveTeachers(teacherIds.filter((id) => id !== teacherId))}
                    aria-label={`Take ${teacherNameById.get(teacherId) ?? 'this teacher'} off ${officeClass.name}`}
                    className="rounded-full p-1 text-muted-foreground hover:bg-slate-100 hover:text-foreground disabled:opacity-50 dark:hover:bg-slate-800"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {teacherIds.length === 0 ? <span className="text-sm text-muted-foreground">No teacher yet.</span> : null}
            </div>
            {availableTeachers.length > 0 ? (
              <Select
                value=""
                disabled={busy}
                onValueChange={(id) => {
                  if (id) void saveTeachers([...teacherIds, id]);
                }}
              >
                <SelectTrigger className="mt-2 h-9 w-full rounded-lg sm:w-60" aria-label="Add a teacher to this class">
                  <SelectValue placeholder="+ Add a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {availableTeachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {classStudents.length > 0 ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Changes also apply to the {classStudents.length} student{classStudents.length === 1 ? '' : 's'} in this class.
              </p>
            ) : null}
          </section>

          <OfficeClassScheduleSection
            schoolId={schoolId}
            officeClass={officeClass}
            allClasses={allClasses}
            teachers={teachers}
            teacherNameById={teacherNameById}
          />

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Students</h3>
            {classStudents.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {classStudents.map((student) => (
                  <li key={student.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors hover:bg-teal-50/60 dark:hover:bg-teal-950/20"
                      onClick={() => openStudent(student.id)}
                    >
                      <span className="font-medium">{getOfficeStudentFullName(student)}</span>
                      <span className="text-xs text-muted-foreground">
                        {getOfficeTeacherLabel(student, teacherNameById) || 'No teacher'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No students in this class yet.</p>
            )}
          </section>

          <OfficeEntityHistorySection schoolId={schoolId} entityId={officeClass.id} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
