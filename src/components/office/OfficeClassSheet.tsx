'use client';

import { useMemo } from 'react';
import { AlertTriangle, Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useOfficeEntityNav } from '@/components/office/OfficeEntityNavProvider';
import { OfficeEntityLink } from '@/components/office/OfficeEntityLink';
import { officePublicHref } from '@/lib/officePublicUrl';
import { getOfficeStudentFullName, getOfficeTeacherLabel, officeStudentsForClass } from '@/lib/office/officeUtils';
import type { OfficeClass, OfficeStudent } from '@/lib/office/types';

type OfficeClassSheetProps = {
  schoolId: string;
  officeClass: OfficeClass | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: OfficeStudent[];
  teacherNameById: Map<string, string>;
};

export function OfficeClassSheet({
  schoolId,
  officeClass,
  open,
  onOpenChange,
  students,
  teacherNameById,
}: OfficeClassSheetProps) {
  const { openStudent } = useOfficeEntityNav();

  const classStudents = useMemo(
    () => (officeClass ? officeStudentsForClass(students, officeClass.id) : []),
    [students, officeClass],
  );

  const teacherIds = useMemo(() => {
    const set = new Set<string>();
    for (const student of classStudents) {
      if (student.teacherId?.trim()) set.add(student.teacherId.trim());
    }
    return Array.from(set);
  }, [classStudents]);

  if (!officeClass) return null;

  const classesHref = `${officePublicHref(schoolId, 'classes')}?class=${encodeURIComponent(officeClass.id)}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-xl font-bold">{officeClass.name}</SheetTitle>
          <SheetDescription>
            {classStudents.length}
            {officeClass.capacity ? `/${officeClass.capacity}` : ''} student{classStudents.length === 1 ? '' : 's'}
            {teacherIds.length > 0 ? ` · ${teacherIds.length} teacher${teacherIds.length === 1 ? '' : 's'}` : ''}
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

          {teacherIds.length > 0 ? (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Teachers</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {teacherIds.map((teacherId) => (
                  <OfficeEntityLink
                    key={teacherId}
                    kind="teacher"
                    id={teacherId}
                    label={teacherNameById.get(teacherId) ?? 'Teacher'}
                  />
                ))}
              </div>
            </section>
          ) : null}

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

          <section className="rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
            <Users className="mb-2 h-4 w-4 text-teal-700" aria-hidden />
            Assign students to this class from Students or Classes. Teacher assignment is on each student profile.
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
