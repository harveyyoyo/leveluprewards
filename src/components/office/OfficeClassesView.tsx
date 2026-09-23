'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useOfficeUrlSync } from '@/lib/office/useOfficeUrlSync';
import { useOfficeEntityNav } from '@/components/office/OfficeEntityNavProvider';
import { OfficeEntityLink } from '@/components/office/OfficeEntityLink';
import { AlertTriangle, ArrowUpRight, ChevronRight, Download, Plus, Pencil, Trash2 } from 'lucide-react';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useOfficeConfirm } from '@/components/office/useOfficeConfirm';
import { useOfficeWrite } from '@/lib/office/useOfficeWrite';
import { officeAuditSnapshot } from '@/lib/office/officeAuditLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { OfficeClass, OfficeStudent, OfficeTeacher } from '@/lib/office/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { planOfficeClassPromotion } from '@/lib/office/officeClassPromotion';
import { downloadCsv, getOfficeStudentFullName, getOfficeStudentLabel, getOfficeTeacherLabel } from '@/lib/office/officeUtils';
import { OfficeSearchInput } from '@/components/office/OfficeSearchInput';
import { OfficeLoadingRows } from '@/components/office/OfficeLoadingRows';
import { cn } from '@/lib/utils';

type OfficeClassesViewProps = {
  schoolId: string;
  students: OfficeStudent[];
  classes: OfficeClass[];
  teachers?: OfficeTeacher[];
  teacherNameById: Map<string, string>;
  isLoading: boolean;
};

export function OfficeClassesView({
  schoolId,
  students,
  classes,
  teachers = [],
  teacherNameById,
  isLoading,
}: OfficeClassesViewProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { confirm, confirmDialog } = useOfficeConfirm();
  const write = useOfficeWrite(schoolId);
  const { openStudent, openClass } = useOfficeEntityNav();

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

  // `student` in the URL belongs to the profile sheet (OfficeEntityNavProvider); writing it here
  // re-added it right after the sheet closed and reopened the profile.
  useOfficeUrlSync({
    class: expandedClassId ?? undefined,
  });

  // Class Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<OfficeClass | null>(null);
  const [className, setClassName] = useState('');
  const [classTeacherIds, setClassTeacherIds] = useState<string[]>([]);
  const [classCapacity, setClassCapacity] = useState('');
  const [classNotes, setClassNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const promotionPlan = useMemo(() => planOfficeClassPromotion(classes), [classes]);

  const openNewClass = () => {
    setEditingClass(null);
    setClassName('');
    setClassTeacherIds([]);
    setClassCapacity('');
    setClassNotes('');
    setDialogOpen(true);
  };

  const openEditClass = (cls: OfficeClass, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClass(cls);
    setClassName(cls.name);
    setClassTeacherIds(cls.teacherIds ?? (cls.teacherId ? [cls.teacherId] : []));
    setClassCapacity(cls.capacity != null ? String(cls.capacity) : '');
    setClassNotes(cls.notes ?? '');
    setDialogOpen(true);
  };

  const handleSaveClass = async () => {
    if (!write.ctx) return;
    if (!className.trim()) {
      toast({ variant: 'destructive', title: 'Class name is required.' });
      return;
    }
    const parsedCapacity = classCapacity.trim() ? Number.parseInt(classCapacity.trim(), 10) : null;
    if (classCapacity.trim() && (!Number.isFinite(parsedCapacity) || (parsedCapacity ?? 0) <= 0)) {
      toast({ variant: 'destructive', title: 'Capacity must be a positive number.' });
      return;
    }
    const nextTeacherIds = classTeacherIds.length > 0 ? classTeacherIds : null;
    const oldTeacherIds = editingClass?.teacherIds ?? (editingClass?.teacherId ? [editingClass.teacherId] : []);
    
    // Check if teachers changed by comparing arrays
    const teacherChanged = !editingClass || 
      (nextTeacherIds?.join(',') !== oldTeacherIds.join(','));
      
    setBusy(true);
    try {
      const classId = await write.upsertOfficeClass(write.ctx, editingClass?.id ?? null, {
        name: className.trim(),
        teacherId: nextTeacherIds?.[0] ?? null, // keep single field for legacy
        teacherIds: nextTeacherIds ?? [], // use new array field
        capacity: parsedCapacity,
        notes: classNotes.trim() || null,
      });

      let updatedStudentCount = 0;
      if (teacherChanged && editingClass) {
        const classStudents = students.filter((s) => s.classId === classId);
        if (classStudents.length > 0) {
          const batch = writeBatch(firestore!);
          for (const student of classStudents) {
            batch.update(doc(firestore!, 'schools', schoolId, 'officeStudents', student.id), {
              teacherId: nextTeacherIds?.[0] ?? null,
              teacherIds: nextTeacherIds ?? [],
              teacherName: null,
              updatedAt: Date.now(),
            });
          }
          await batch.commit();
          updatedStudentCount = classStudents.length;
          await write.logOfficeChange(write.ctx, {
            entityType: 'officeClass',
            entityId: classId,
            action: 'update',
            summary: `Updated the teacher for ${classStudents.length} student${classStudents.length === 1 ? '' : 's'} in ${className.trim()}`,
            before: officeAuditSnapshot({ teacherIds: oldTeacherIds }),
            after: officeAuditSnapshot({
              teacherIds: nextTeacherIds ?? [],
              studentIds: classStudents.map((s) => s.id),
            }),
          });
        }
      }

      toast({
        title: editingClass ? 'Class updated' : 'Class created',
        description:
          updatedStudentCount > 0
            ? `Also updated the teacher for ${updatedStudentCount} student${updatedStudentCount === 1 ? '' : 's'} in this class.`
            : undefined,
      });
      setDialogOpen(false);
      setClassName('');
      setClassTeacherIds([]);
      setClassCapacity('');
      setClassNotes('');
      setEditingClass(null);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save class', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleApplyPromotion = async () => {
    if (!firestore || promotionPlan.changes.length === 0) return;
    setBusy(true);
    try {
      const batch = writeBatch(firestore);
      const now = Date.now();
      for (const row of promotionPlan.changes) {
        batch.update(doc(firestore, 'schools', schoolId, 'officeClasses', row.classId), {
          name: row.nextName,
          updatedAt: now,
        });
      }
      await batch.commit();
      if (write.ctx) {
        for (const row of promotionPlan.changes) {
          const before = classes.find((c) => c.id === row.classId);
          await write.logOfficeChange(write.ctx, {
            entityType: 'officeClass',
            entityId: row.classId,
            action: 'update',
            summary: `Advanced class ${before?.name ?? row.classId} → ${row.nextName} for next year`,
            before: officeAuditSnapshot({ name: before?.name ?? null }),
            after: officeAuditSnapshot({ name: row.nextName }),
          });
        }
      }
      toast({
        title: 'Class names advanced',
        description: `${promotionPlan.changes.length} class${promotionPlan.changes.length === 1 ? '' : 'es'} updated for next year.`,
      });
      setPromoteOpen(false);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not advance class names',
        description: (e as Error).message,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteClass = async (cls: OfficeClass, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!write.ctx) return;

    const classStudents = students.filter((s) => s.classId === cls.id);
    const hasStudents = classStudents.length > 0;

    const ok = await confirm({
      title: `Remove the class “${cls.name}”?`,
      description: hasStudents
        ? `Its ${classStudents.length} student${classStudents.length === 1 ? '' : 's'} will move to “No class” so you can place them again. The class stays in the change history.`
        : 'The class stays in the change history.',
      confirmLabel: 'Remove class',
      tone: 'caution',
    });
    if (!ok) return;

    setBusy(true);
    try {
      await write.archiveOfficeClassBatch(
        write.ctx,
        cls,
        classStudents.map((s) => s.id),
      );
      toast({ title: 'Class removed' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not remove class', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const grouped = useMemo(() => {
    const byClass = new Map<string, OfficeStudent[]>();
    const unassigned: OfficeStudent[] = [];
    const knownClassIds = new Set(classes.map((c) => c.id));
    for (const s of students) {
      // Orphaned classIds (class deleted) fall back to Unassigned so students never disappear.
      if (!s.classId || !knownClassIds.has(s.classId)) {
        unassigned.push(s);
        continue;
      }
      const list = byClass.get(s.classId) ?? [];
      list.push(s);
      byClass.set(s.classId, list);
    }
    const sortedClasses = classes
      .slice()
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
      .map((c) => ({
        class: c,
        students: (byClass.get(c.id) ?? []).sort((a, b) => {
          const ln = (a.lastName ?? '').localeCompare(b.lastName ?? '');
          if (ln !== 0) return ln;
          return getOfficeStudentLabel(a).localeCompare(getOfficeStudentLabel(b));
        }),
      }));
    if (unassigned.length) {
      sortedClasses.push({
        class: { id: '__unassigned__', name: 'Unassigned', updatedAt: 0 },
        students: unassigned.sort((a, b) => (a.lastName ?? '').localeCompare(b.lastName ?? '')),
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
          const label = `${getOfficeStudentLabel(s)} ${s.lastName ?? ''}`.toLowerCase();
          return label.includes(q) || (cls.name ?? '').toLowerCase().includes(q);
        }),
      }))
      .filter(({ class: cls, students: list }) => (cls.name ?? '').toLowerCase().includes(q) || list.length > 0);
  }, [grouped, query]);

  if (isLoading) {
    return <OfficeLoadingRows cols={2} rows={4} />;
  }

  return (
    <div className="space-y-4">
      {confirmDialog}
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
            disabled={classes.length === 0 || promotionPlan.changes.length === 0}
            onClick={() => setPromoteOpen(true)}
          >
            <ArrowUpRight className="h-4 w-4" />
            Advance for next year
          </Button>
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
                  {cls.id === '__unassigned__' ? (
                    <span className="font-semibold text-foreground">{cls.name}</span>
                  ) : (
                    <OfficeEntityLink kind="class" id={cls.id} label={cls.name} className="text-base" />
                  )}
                  <span className="ml-2 text-sm text-muted-foreground">
                    {list.length}
                    {cls.capacity ? `/${cls.capacity}` : ''} students
                    {cls.teacherId ? ` · ${teacherNameById.get(cls.teacherId) ?? 'Teacher'}` : ''}
                  </span>
                  {cls.capacity && list.length > cls.capacity ? (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[0.625rem] font-bold uppercase text-red-800 dark:bg-red-950/50 dark:text-red-200">
                      <AlertTriangle className="h-3 w-3" aria-hidden />
                      Over capacity
                    </span>
                  ) : null}
                </span>
                <div className="flex items-center gap-1">
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
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left text-sm font-medium hover:text-teal-800 dark:hover:text-teal-300"
                        onClick={() => {
                          setHighlightStudentId(s.id);
                          setExpandedClassId(cls.id === '__unassigned__' ? null : cls.id);
                          openStudent(s.id);
                        }}
                      >
                          {getOfficeStudentLabel(s)} {s.lastName}
                      </button>
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

      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Advance class names for next year</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1 text-sm">
            <p className="text-muted-foreground">
              Bumps each class name up one grade. Students stay in the same class — only the label changes
              (for example, Grade 5 becomes Grade 6).
            </p>
            {promotionPlan.changes.length > 0 ? (
              <ul className="max-h-56 space-y-2 overflow-y-auto rounded-xl border p-3">
                {promotionPlan.changes.map((row) => (
                  <li key={row.classId} className="flex items-center justify-between gap-3">
                    <span className="font-medium">{row.currentName}</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="font-medium text-teal-800 dark:text-teal-300">{row.nextName}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed p-4 text-center text-muted-foreground">
                No classes matched Grade, Kindergarten, or ordinal formats.
              </p>
            )}
            {promotionPlan.skipped.length > 0 ? (
              <div className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Skipped ({promotionPlan.skipped.length})</p>
                <p className="mt-1">
                  {promotionPlan.skipped
                    .slice(0, 4)
                    .map((row) => `${row.name} (${row.reason})`)
                    .join(' · ')}
                  {promotionPlan.skipped.length > 4 ? ' · …' : ''}
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPromoteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleApplyPromotion()}
              disabled={busy || promotionPlan.changes.length === 0}
            >
              Apply {promotionPlan.changes.length} change{promotionPlan.changes.length === 1 ? '' : 's'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <DialogTitle>{editingClass ? 'Edit class' : 'New class'}</DialogTitle>
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
            <div className="space-y-2">
              <Label>Teachers (optional)</Label>
              <div className="flex flex-col gap-2">
                <Select 
                  value="__none__" 
                  onValueChange={(v) => {
                    if (v !== '__none__' && !classTeacherIds.includes(v)) {
                      setClassTeacherIds([...classTeacherIds, v]);
                    }
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={classTeacherIds.length > 0 ? "Add another teacher" : "No teacher assigned"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select a teacher...</SelectItem>
                    {teachers.filter(t => !classTeacherIds.includes(t.id)).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {classTeacherIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {classTeacherIds.map((id) => (
                      <div key={id} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-sm">
                        <span>{teachers.find(t => t.id === id)?.name || 'Unknown'}</span>
                        <button 
                          type="button" 
                          onClick={() => setClassTeacherIds(classTeacherIds.filter(tId => tId !== id))}
                          className="text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {editingClass ? (
                <p className="text-xs text-muted-foreground">
                  Changing this updates the teacher for every student currently in this class.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-capacity-input">Capacity (optional)</Label>
              <Input
                id="class-capacity-input"
                type="number"
                min={1}
                value={classCapacity}
                onChange={(e) => setClassCapacity(e.target.value)}
                placeholder="e.g. 20"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-notes-input">Notes (optional)</Label>
              <Textarea
                id="class-notes-input"
                value={classNotes}
                onChange={(e) => setClassNotes(e.target.value)}
                placeholder="Supply list, room number, schedule quirks…"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            {editingClass ? (
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => editingClass && void handleDeleteClass(editingClass, e)}
                disabled={busy}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete class
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="button" onClick={() => void handleSaveClass()} disabled={busy} className="rounded-xl">
                {editingClass ? 'Save changes' : 'Create class'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
