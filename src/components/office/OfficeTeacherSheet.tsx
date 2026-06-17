'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Check, ExternalLink, Mail, Pencil, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { OfficeEntityLink } from '@/components/office/OfficeEntityLink';
import { useOfficeEntityNav } from '@/components/office/OfficeEntityNavProvider';
import { officeAbsoluteHref, officePublicHref } from '@/lib/officePublicUrl';
import {
  formatGradeDisplay,
  getOfficeStudentFullName,
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
  const firestore = useFirestore();
  const { toast } = useToast();
  const { openStudent } = useOfficeEntityNav();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

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

  const gradedForTerm = useMemo(
    () => studentIdsWithGradesForTerm(gradeEntries, activeTerm),
    [gradeEntries, activeTerm],
  );

  if (!teacher) return null;

  const studentsHref = `${officePublicHref(schoolId, 'students')}?homeroom=${encodeURIComponent(teacher.id)}`;
  const gradesHref = `${officePublicHref(schoolId, 'grades')}?term=${encodeURIComponent(activeTerm)}`;

  const handleSave = async () => {
    if (!firestore || !name.trim()) {
      toast({ variant: 'destructive', title: 'Teacher name is required.' });
      return;
    }
    setBusy(true);
    try {
      await updateDoc(doc(firestore, 'schools', schoolId, 'officeTeachers', teacher.id), {
        name: name.trim(),
        email: email.trim() || null,
        updatedAt: Date.now(),
      });
      toast({ title: 'Teacher updated' });
      setIsEditing(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Update failed', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!firestore) return;
    if (assignedStudents.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Teacher has students',
        description: `Reassign ${assignedStudents.length} student${assignedStudents.length === 1 ? '' : 's'} before deleting.`,
      });
      return;
    }
    if (!confirm(`Remove ${teacher.name} from the office teacher list?`)) return;
    setBusy(true);
    try {
      await deleteDoc(doc(firestore, 'schools', schoolId, 'officeTeachers', teacher.id));
      toast({ title: 'Teacher removed' });
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
                  aria-label="Copy teacher link"
                  onClick={() => {
                    const url = `${officeAbsoluteHref(schoolId, 'teachers')}?teacher=${encodeURIComponent(teacher.id)}`;
                    void navigator.clipboard.writeText(url);
                    toast({ title: 'Copied teacher link' });
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-muted/60"
                  aria-label="Edit teacher"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          {!isEditing ? (
            <SheetDescription>
              {assignedStudents.length} student{assignedStudents.length === 1 ? '' : 's'} assigned
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
                Delete teacher
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
                                  ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-[0.625rem] font-bold uppercase text-emerald-800'
                                  : 'rounded-full bg-amber-100 px-2 py-0.5 text-[0.625rem] font-bold uppercase text-amber-900'
                              }
                            >
                              {gradedForTerm.has(student.id) ? 'Graded' : 'Missing'}
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

            <section className="rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
              <Users className="mb-2 h-4 w-4 text-teal-700" aria-hidden />
              Homeroom teachers are separate from rewards staff in Admin. Assign this teacher when editing a student
              profile.
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
