'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { officePublicHref } from '@/lib/officePublicUrl';
import { useOfficeUrlSync } from '@/lib/office/useOfficeUrlSync';
import { ChevronRight, Download, Plus, Pencil, Trash2 } from 'lucide-react';
import { doc, setDoc, updateDoc, writeBatch, collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { OfficeClass, OfficeStudent } from '@/lib/office/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { downloadCsv, getOfficeStudentFullName, getOfficeStudentLabel, getOfficeTeacherLabel } from '@/lib/office/officeUtils';
import { OfficeSearchInput } from '@/components/office/OfficeSearchInput';
import { OfficeLoadingRows } from '@/components/office/OfficeLoadingRows';
import { cn } from '@/lib/utils';

type OfficeClassesViewProps = {
  schoolId: string;
  students: OfficeStudent[];
  classes: OfficeClass[];
  teacherNameById: Map<string, string>;
  isLoading: boolean;
  onSelectStudent?: (student: OfficeStudent) => void;
};

export function OfficeClassesView({
  schoolId,
  students,
  classes,
  teacherNameById,
  isLoading,
  onSelectStudent,
}: OfficeClassesViewProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const exportClassRoster = () => {
    const rows: string[][] = [];
    for (const s of students) {
      const cls = classes.find((c) => c.id === s.classId);
      rows.push([cls?.name ?? 'Unassigned', getOfficeStudentFullName(s), getOfficeTeacherLabel(s, teacherNameById)]);
    }
    rows.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
    downloadCsv(`classes-roster-${schoolId}.csv`, ['Class', 'Student', 'Teacher'], rows);
    toast({ title: 'Exported', description: `${rows.length} students.` });
  };

  const searchParams = useSearchParams();
  const openedFromQuery = useRef(false);
  const [query, setQuery] = useState('');
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState(false);
  const [highlightStudentId, setHighlightStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (openedFromQuery.current || isLoading) return;
    const classId = searchParams.get('class')?.trim();
    const studentId = searchParams.get('student')?.trim();
    if (classId && classes.some((c) => c.id === classId)) {
      openedFromQuery.current = true;
      setExpandedClassId(classId);
      if (studentId && students.some((s) => s.id === studentId)) {
        setHighlightStudentId(studentId);
      }
    } else if (studentId && students.some((s) => s.id === studentId)) {
      openedFromQuery.current = true;
      const s = students.find((st) => st.id === studentId);
      if (s?.classId) setExpandedClassId(s.classId);
      setHighlightStudentId(studentId);
    }
  }, [searchParams, classes, students, isLoading]);

  useOfficeUrlSync({
    class: expandedClassId ?? undefined,
    student: highlightStudentId ?? undefined,
  });

  // Class Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<OfficeClass | null>(null);
  const [className, setClassName] = useState('');
  const [busy, setBusy] = useState(false);

  const openNewClass = () => {
    setEditingClass(null);
    setClassName('');
    setDialogOpen(true);
  };

  const openEditClass = (cls: OfficeClass, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClass(cls);
    setClassName(cls.name);
    setDialogOpen(true);
  };

  const handleSaveClass = async () => {
    if (!firestore) return;
    if (!className.trim()) {
      toast({ variant: 'destructive', title: 'Class name is required.' });
      return;
    }
    setBusy(true);
    try {
      if (editingClass) {
        await updateDoc(doc(firestore, 'schools', schoolId, 'officeClasses', editingClass.id), {
          name: className.trim(),
          updatedAt: Date.now(),
        });
        toast({ title: 'Class renamed' });
      } else {
        const ref = doc(collection(firestore, 'schools', schoolId, 'officeClasses'));
        await setDoc(ref, {
          name: className.trim(),
          updatedAt: Date.now(),
        });
        toast({ title: 'Class created' });
      }
      setDialogOpen(false);
      setClassName('');
      setEditingClass(null);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save class', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const assignStudentToClass = async (student: OfficeStudent, nextClassId: string) => {
    if (!firestore) return;
    const cid = nextClassId === '__none__' ? null : nextClassId;
    if (cid === (student.classId ?? null)) return;
    try {
      await updateDoc(doc(firestore, 'schools', schoolId, 'officeStudents', student.id), {
        classId: cid,
        updatedAt: Date.now(),
      });
      toast({ title: 'Class updated' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not move student', description: (e as Error).message });
    }
  };

  const handleDeleteClass = async (cls: OfficeClass, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!firestore) return;

    const classStudents = students.filter((s) => s.classId === cls.id);
    const hasStudents = classStudents.length > 0;

    let msg = `Are you sure you want to delete the class "${cls.name}"?`;
    if (hasStudents) {
      msg = `The class "${cls.name}" has ${classStudents.length} student(s) assigned. Deleting it will unassign these students. Are you sure you want to proceed?`;
    }

    if (!confirm(msg)) return;

    setBusy(true);
    try {
      const batch = writeBatch(firestore);
      batch.delete(doc(firestore, 'schools', schoolId, 'officeClasses', cls.id));

      for (const s of classStudents) {
        batch.update(doc(firestore, 'schools', schoolId, 'officeStudents', s.id), {
          classId: null,
          updatedAt: Date.now(),
        });
      }

      await batch.commit();
      toast({ title: 'Class deleted successfully' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Delete failed', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const grouped = useMemo(() => {
    const byClass = new Map<string, OfficeStudent[]>();
    const unassigned: OfficeStudent[] = [];
    for (const s of students) {
      if (!s.classId) {
        unassigned.push(s);
        continue;
      }
      const list = byClass.get(s.classId) ?? [];
      list.push(s);
      byClass.set(s.classId, list);
    }
    const sortedClasses = classes
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({
        class: c,
        students: (byClass.get(c.id) ?? []).sort((a, b) => {
          const ln = a.lastName.localeCompare(b.lastName);
          if (ln !== 0) return ln;
          return getOfficeStudentLabel(a).localeCompare(getOfficeStudentLabel(b));
        }),
      }));
    if (unassigned.length) {
      sortedClasses.push({
        class: { id: '__unassigned__', name: 'Unassigned', updatedAt: 0 },
        students: unassigned.sort((a, b) => a.lastName.localeCompare(b.lastName)),
      });
    }
    return sortedClasses;
  }, [students, classes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return grouped;
    return grouped
      .map(({ class: cls, students: list }) => ({
        class: cls,
        students: list.filter((s) => {
          const label = `${getOfficeStudentLabel(s)} ${s.lastName}`.toLowerCase();
          return label.includes(q) || cls.name.toLowerCase().includes(q);
        }),
      }))
      .filter(({ class: cls, students: list }) => cls.name.toLowerCase().includes(q) || list.length > 0);
  }, [grouped, query]);

  if (isLoading) {
    return <OfficeLoadingRows cols={2} rows={4} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between no-print">
        <div>
          <p className="text-sm text-muted-foreground">
            Browse office students by class. Click a name to open their profile.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {classes.length} {classes.length === 1 ? 'class' : 'classes'} · {students.length} students
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl gap-1.5"
            disabled={students.length === 0}
            onClick={exportClassRoster}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => setExpandAll((v) => !v)}
          >
            {expandAll ? 'Collapse all' : 'Expand all'}
          </Button>
          <Button type="button" className="rounded-xl gap-2" onClick={openNewClass}>
            <Plus className="h-4 w-4" />
            New class
          </Button>
        </div>
      </div>

      <OfficeSearchInput value={query} onChange={setQuery} placeholder="Search class or student…" />

      <div className="space-y-2">
        {filtered.map(({ class: cls, students: list }) => {
          const open = expandAll || expandedClassId === cls.id;
          return (
            <div key={cls.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <div
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors cursor-pointer"
                onClick={() => {
                  const next = open ? null : cls.id;
                  setExpandedClassId(next);
                  if (!next) setHighlightStudentId(null);
                }}
              >
                <span>
                  <span className="font-semibold text-foreground">{cls.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">{list.length} students</span>
                </span>
                <div className="flex items-center gap-1">
                  {cls.id !== '__unassigned__' && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                        onClick={(e) => openEditClass(cls, e)}
                        aria-label="Edit class name"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-muted/80 text-destructive hover:text-destructive/80"
                        onClick={(e) => void handleDeleteClass(cls, e)}
                        aria-label="Delete class"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <ChevronRight className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
                </div>
              </div>
              {open ? (
                <ul className="border-t divide-y dark:divide-slate-800">
                  {list.map((s) => (
                    <li
                      key={s.id}
                      className={cn(
                        'flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-100 last:border-0 dark:border-slate-800',
                        highlightStudentId === s.id && 'bg-teal-50/80 dark:bg-teal-950/30',
                      )}
                    >
                      {onSelectStudent ? (
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left text-sm font-medium hover:text-teal-800 dark:hover:text-teal-300"
                          onClick={() => {
                            setHighlightStudentId(s.id);
                            setExpandedClassId(cls.id === '__unassigned__' ? null : cls.id);
                            onSelectStudent(s);
                          }}
                        >
                          {getOfficeStudentLabel(s)} {s.lastName}
                        </button>
                      ) : (
                        <Link
                          href={`${officePublicHref(schoolId, 'students')}?student=${encodeURIComponent(s.id)}`}
                          className="min-w-0 flex-1 text-sm font-medium hover:text-teal-800 dark:hover:text-teal-300"
                          onClick={() => setHighlightStudentId(s.id)}
                        >
                          {getOfficeStudentLabel(s)} {s.lastName}
                        </Link>
                      )}
                      <Select
                        value={s.classId || '__none__'}
                        onValueChange={(v) => void assignStudentToClass(s, v)}
                      >
                        <SelectTrigger className="h-8 w-36 rounded-lg text-xs" onClick={(e) => e.stopPropagation()}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Unassigned</SelectItem>
                          {classes.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </li>
                  ))}
                  {list.length === 0 ? (
                    <li className="px-4 py-3 text-sm text-muted-foreground">No students in this class.</li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          );
        })}
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No classes match your search.
          </p>
        ) : null}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(next) => {
          setDialogOpen(next);
          if (!next) {
            setClassName('');
            setEditingClass(null);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingClass ? 'Edit class name' : 'New class'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="class-name-input">Class name</Label>
              <Input
                id="class-name-input"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g. Grade 5"
                className="rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSaveClass();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSaveClass()} disabled={busy}>
              {editingClass ? 'Save changes' : 'Create class'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
