'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, Mail, Pencil, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useOfficeConfirm } from '@/components/office/useOfficeConfirm';
import { useOfficeWrite } from '@/lib/office/useOfficeWrite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OfficeEntityLink } from '@/components/office/OfficeEntityLink';
import { OfficeEntityHistorySection } from '@/components/office/OfficeEntityHistorySection';
import { OfficeTeacherWeek } from '@/components/office/OfficeClassScheduleSection';
import { teacherWeek } from '@/lib/office/officeSchedule';
import { useOfficeEntityNav } from '@/components/office/OfficeEntityNavProvider';
import { officePublicHref } from '@/lib/officePublicUrl';
import {
  formatGradeDisplay,
  getOfficeStudentFullName,
  getTeacherIds,
  gradesForStudent,
  officeStudentsForTeacher,
  studentIdsWithGradesForTerm,
} from '@/lib/office/officeUtils';
import type { OfficeClass, OfficeGradeEntry, OfficeStudent, OfficeTeacher } from '@/lib/office/types';

type OfficeTeacherSheetProps = {
  schoolId: string;
  teacher: OfficeTeacher | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: OfficeStudent[];
  classes: OfficeClass[];
  classNameById: Map<string, string>;
  gradeEntries: OfficeGradeEntry[];
  activeTerm: string;
};

export function OfficeTeacherSheet({
  schoolId,
  teacher,
  open,
  onOpenChange,
  students,
  classes,
  classNameById,
  gradeEntries,
  activeTerm,
}: OfficeTeacherSheetProps) {
  const write = useOfficeWrite(schoolId);
  const { toast } = useToast();
  const { confirm, confirmDialog } = useOfficeConfirm();
  const { openStudent, openClass } = useOfficeEntityNav();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [editClassIds, setEditClassIds] = useState<string[]>([]);

  useEffect(() => {
    if (teacher) {
      setName(teacher.name ?? '');
      setEmail(teacher.email ?? '');
    }
    setIsEditing(false);
  }, [teacher, open]);

  const assignedStudents = useMemo(
    () => (teacher ? officeStudentsForTeacher(students, teacher.id) : []),
    [students, teacher],
  );

  const assignedClasses = useMemo(() => {
    if (!teacher) return [];
    return classes.filter((c) => {
      const ids = c.teacherIds && c.teacherIds.length > 0 ? c.teacherIds : (c.teacherId ? [c.teacherId] : []);
      return ids.includes(teacher.id);
    });
  }, [classes, teacher]);

  const gradedForTerm = useMemo(
    () => studentIdsWithGradesForTerm(gradeEntries, activeTerm),
    [gradeEntries, activeTerm],
  );

  if (!teacher) return null;

  const studentsHref = `${officePublicHref(schoolId, 'students')}?homeroom=${encodeURIComponent(teacher.id)}`;
  const gradesHref = `${officePublicHref(schoolId, 'grades')}?term=${encodeURIComponent(activeTerm)}`;

  const handleSave = async () => {
    if (!write.ctx || !name.trim()) {
      toast({ variant: 'destructive', title: 'Teacher name is required.' });
      return;
    }
    setBusy(true);
    try {
      // upsertOfficeTeacher and setOfficeClassTeachers also write the change-history entries.
      await write.upsertOfficeTeacher(write.ctx, teacher.id, { name: name.trim(), email: email.trim() || null });
      const beforeIds = assignedClasses.map((c) => c.id);
      const changed = classes.filter((c) => beforeIds.includes(c.id) !== editClassIds.includes(c.id));
      const teacherNameById = new Map([[teacher.id, name.trim()]]);
      for (const cls of changed) {
        const current = getTeacherIds(cls);
        const next = editClassIds.includes(cls.id)
          ? [...current.filter((id) => id !== teacher.id), teacher.id]
          : current.filter((id) => id !== teacher.id);
        await write.setOfficeClassTeachers(write.ctx, {
          cls,
          teacherIds: next,
          classStudentIds: students.filter((s) => s.classId === cls.id).map((s) => s.id),
          teacherNameById,
        });
      }
      toast({ title: 'Teacher updated' });
      setIsEditing(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Update failed', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!write.ctx) return;
    if (assignedStudents.length > 0 || assignedClasses.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Teacher is assigned',
        description: assignedClasses.length > 0 
          ? `This teacher is assigned to ${assignedClasses.length} class${assignedClasses.length === 1 ? '' : 'es'}. Remove them from the classes first.`
          : `Reassign ${assignedStudents.length} student${assignedStudents.length === 1 ? '' : 's'} before deleting.`,
      });
      return;
    }
    const ok = await confirm({
      title: `Remove ${teacher.name}?`,
      description: 'They will be hidden from the teacher list. Their past records stay in the change history.',
      confirmLabel: 'Remove teacher',
      tone: 'caution',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await write.archiveOfficeTeacher(write.ctx, teacher);
      toast({ title: 'Teacher removed', description: 'Their past records are kept in the change history.' });
      onOpenChange(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Delete failed', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {confirmDialog}
        <SheetHeader className="relative">
          {isEditing ? (
            <SheetTitle>Edit teacher</SheetTitle>
          ) : (
            <div className="flex items-center justify-between gap-2 pr-6">
              <SheetTitle className="text-xl font-bold">{teacher.name}</SheetTitle>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-muted/60"
                  aria-label="Edit teacher"
                  onClick={() => {
                    setEditClassIds(assignedClasses.map((c) => c.id));
                    setIsEditing(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          {!isEditing ? (
            <SheetDescription>
              {assignedClasses.length > 0 ? (
                <>
                  {(() => {
                    // The first teacher on a class is its main teacher.
                    const main = assignedClasses.filter((c) => getTeacherIds(c)[0] === teacher.id).map((c) => c.name);
                    const also = assignedClasses.filter((c) => getTeacherIds(c)[0] !== teacher.id).map((c) => c.name);
                    return [
                      main.length ? `Main teacher of ${main.join(', ')}` : '',
                      also.length ? `${main.length ? 'also teaches' : 'Teaches'} ${also.join(', ')}` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ');
                  })()}
                  {assignedStudents.length > 0 ? ` · ${assignedStudents.length} student${assignedStudents.length === 1 ? '' : 's'}` : ''}
                </>
              ) : (
                <>
                  {assignedStudents.length} student{assignedStudents.length === 1 ? '' : 's'} assigned
                </>
              )}
              {teacher.email ? ` · ${teacher.email}` : ''}
            </SheetDescription>
          ) : null}
        </SheetHeader>

        {isEditing ? (
          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Email (optional)</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl"
                placeholder="for office contact only"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Classes</Label>
              <div className="flex flex-wrap items-center gap-2">
                {editClassIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full border bg-white py-0.5 pl-3 pr-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    {classNameById.get(id) ?? 'Class'}
                    <button
                      type="button"
                      onClick={() => setEditClassIds((prev) => prev.filter((x) => x !== id))}
                      aria-label={`Take off ${classNameById.get(id) ?? 'class'}`}
                      className="rounded-full p-1 text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
                {editClassIds.length === 0 ? <span className="text-sm text-muted-foreground">No classes yet.</span> : null}
              </div>
              {classes.some((c) => !editClassIds.includes(c.id)) ? (
                <Select value="" onValueChange={(id) => id && setEditClassIds((prev) => [...prev, id])}>
                  <SelectTrigger className="h-9 w-full rounded-lg" aria-label="Add a class">
                    <SelectValue placeholder="+ Add a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes
                      .filter((c) => !editClassIds.includes(c.id))
                      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
            <div className="space-y-2 border-t pt-4">
              <Button type="button" className="w-full rounded-xl gap-2" onClick={() => void handleSave()} disabled={busy}>
                <Check className="h-4 w-4" />
                Save
              </Button>
              <Button type="button" variant="outline" className="w-full rounded-xl" onClick={() => setIsEditing(false)} disabled={busy}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="w-full rounded-xl gap-2"
                onClick={() => void handleDelete()}
                disabled={busy}
              >
                <Trash2 className="h-4 w-4" />
                Remove teacher
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-xs">
                <Link href={studentsHref}>View on Students</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-xs gap-1">
                <Link href={gradesHref}>
                  Grades
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>

            {teacher.email ? (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Contact</h3>
                <a
                  href={`mailto:${teacher.email}`}
                  className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {teacher.email}
                </a>
              </section>
            ) : null}

            <OfficeTeacherWeek week={teacherWeek(classes, teacher.id)} onOpenClass={openClass} />

            <section>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Assigned students
                </h3>
                <span className="text-xs text-muted-foreground">{activeTerm} grades</span>
              </div>
              {assignedStudents.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {assignedStudents.map((student) => {
                    const termGrades = gradesForStudent(gradeEntries, student.id).filter(
                      (g) => g.termLabel === activeTerm,
                    );
                    return (
                      <li key={student.id}>
                        <button
                          type="button"
                          className="w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors hover:bg-teal-50/60 dark:hover:bg-teal-950/20"
                          onClick={() => openStudent(student.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold">{getOfficeStudentFullName(student)}</p>
                              <p className="text-xs text-muted-foreground">
                                {student.classId ? classNameById.get(student.classId) ?? 'Class' : 'No class'}
                              </p>
                            </div>
                            <span
                              className={
                                gradedForTerm.has(student.id)
                                  ? 'shrink-0 text-xs text-emerald-800 dark:text-emerald-300'
                                  : 'shrink-0 text-xs text-muted-foreground'
                              }
                            >
                              {gradedForTerm.has(student.id) ? 'Graded' : 'Not yet'}
                            </span>
                          </div>
                          {termGrades.length > 0 ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {termGrades
                                .slice(0, 3)
                                .map((g) => `${g.subject}: ${formatGradeDisplay(g)}`)
                                .join(' · ')}
                            </p>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  No students assigned yet. Link students on the Students page.
                </p>
              )}
            </section>

            <OfficeEntityHistorySection schoolId={schoolId} entityId={teacher.id} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
