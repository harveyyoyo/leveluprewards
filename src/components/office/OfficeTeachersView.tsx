'use client';

import { useMemo, useState } from 'react';
import { useOfficeOpenFromLink } from '@/lib/office/useOfficeOpenFromLink';
import { collection, doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { Mail, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useOfficeConfirm } from '@/components/office/useOfficeConfirm';
import { useOfficeWrite } from '@/lib/office/useOfficeWrite';
import { officeAuditSnapshot } from '@/lib/office/officeAuditLog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OfficeStudent, OfficeTeacher, OfficeClass } from '@/lib/office/types';
import { countOfficeStudentsByTeacher, getTeacherIds } from '@/lib/office/officeUtils';
import { OfficeSearchInput } from '@/components/office/OfficeSearchInput';
import { OfficeLoadingRows } from '@/components/office/OfficeLoadingRows';
import { useOfficeEntityNav } from '@/components/office/OfficeEntityNavProvider';
import { officePublicHref } from '@/lib/officePublicUrl';
import Link from 'next/link';
import { handleSelectableRowClick } from '@/lib/ui/selectableRowClick';
import { cn } from '@/lib/utils';

type OfficeTeachersViewProps = {
  schoolId: string;
  teachers: OfficeTeacher[];
  students: OfficeStudent[];
  classes: OfficeClass[];
  isLoading: boolean;
};

export function OfficeTeachersView({ schoolId, teachers, students, classes, isLoading }: OfficeTeachersViewProps) {
  const firestore = useFirestore();
  const write = useOfficeWrite(schoolId);
  const { toast } = useToast();
  const { confirm, confirmDialog } = useOfficeConfirm();
  const { openTeacher, selectedTeacherId } = useOfficeEntityNav();
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OfficeTeacher | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const studentCountByTeacher = useMemo(() => countOfficeStudentsByTeacher(students), [students]);
  const noTeacherCount = useMemo(
    () => students.filter((s) => !s.teacherId?.trim() && !s.teacherName?.trim()).length,
    [students],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...teachers].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    if (!q) return list;
    return list.filter(
      (t) => (t.name ?? '').toLowerCase().includes(q) || (t.email?.toLowerCase().includes(q) ?? false),
    );
  }, [teachers, query]);

  const openNew = () => {
    setEditing(null);
    setName('');
    setEmail('');
    setSelectedClassIds([]);
    setDialogOpen(true);
  };
  useOfficeOpenFromLink('add', dialogOpen, openNew, !isLoading);

  const openEdit = (t: OfficeTeacher) => {
    setEditing(t);
    setName(t.name);
    setEmail(t.email ?? '');
    setSelectedClassIds(classes.filter(c => getTeacherIds(c).includes(t.id)).map(c => c.id));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!firestore || !name.trim()) {
      toast({ variant: 'destructive', title: 'Teacher name is required.' });
      return;
    }
    setBusy(true);
    try {
      const batch = writeBatch(firestore);
      const now = Date.now();
      
      const teacherPayload = {
        name: name.trim(),
        email: email.trim() || null,
        updatedAt: now,
      };

      let teacherId = editing?.id;
      if (editing) {
        batch.update(doc(firestore, 'schools', schoolId, 'officeTeachers', editing.id), teacherPayload);
      } else {
        const newTeacherRef = doc(collection(firestore, 'schools', schoolId, 'officeTeachers'));
        teacherId = newTeacherRef.id;
        batch.set(newTeacherRef, { ...teacherPayload, id: teacherId });
      }

      // Update classes and students
      const prevClassIds = editing ? classes.filter(c => getTeacherIds(c).includes(editing.id)).map(c => c.id) : [];
      const addedClassIds = selectedClassIds.filter(id => !prevClassIds.includes(id));
      const removedClassIds = prevClassIds.filter(id => !selectedClassIds.includes(id));

      const classesToUpdate = [...addedClassIds, ...removedClassIds];
      
      for (const classId of classesToUpdate) {
        const cls = classes.find(c => c.id === classId);
        if (!cls) continue;

        let nextTeacherIds = getTeacherIds(cls);
        if (addedClassIds.includes(classId)) {
          if (!nextTeacherIds.includes(teacherId!)) {
            nextTeacherIds = [...nextTeacherIds, teacherId!];
          }
        } else {
          nextTeacherIds = nextTeacherIds.filter(id => id !== teacherId);
        }

        const classUpdate = {
          teacherId: nextTeacherIds[0] ?? null,
          teacherIds: nextTeacherIds,
          updatedAt: now,
        };

        batch.update(doc(firestore, 'schools', schoolId, 'officeClasses', classId), classUpdate);

        // Update students in this class
        const classStudents = students.filter(s => s.classId === classId);
        for (const student of classStudents) {
          batch.update(doc(firestore, 'schools', schoolId, 'officeStudents', student.id), {
            ...classUpdate,
            teacherName: null,
          });
        }
      }

      await batch.commit();
      if (write.ctx && teacherId) {
        const classNames = (ids: string[]) =>
          ids.map((id) => classes.find((c) => c.id === id)?.name ?? id).join(', ');
        const classNote = [
          addedClassIds.length ? `added to ${classNames(addedClassIds)}` : '',
          removedClassIds.length ? `removed from ${classNames(removedClassIds)}` : '',
        ]
          .filter(Boolean)
          .join('; ');
        await write.logOfficeChange(write.ctx, {
          entityType: 'officeTeacher',
          entityId: teacherId,
          action: editing ? 'update' : 'create',
          summary: `${editing ? 'Updated' : 'Created'} teacher ${teacherPayload.name}${classNote ? ` · ${classNote}` : ''}`,
          before: editing ? officeAuditSnapshot(editing as unknown as Record<string, unknown>) : null,
          after: officeAuditSnapshot({ ...teacherPayload, addedClassIds, removedClassIds }),
        });
      }
      toast({ title: editing ? 'Teacher updated' : 'Teacher added' });
      setDialogOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (t: OfficeTeacher) => {
    if (!write.ctx) return;
    const assigned = studentCountByTeacher.get(t.id) ?? 0;
    if (assigned > 0) {
      toast({
        variant: 'destructive',
        title: 'Teacher has students',
        description: `Reassign ${assigned} student${assigned === 1 ? '' : 's'} before removing them.`,
      });
      return;
    }
    const ok = await confirm({
      title: `Remove ${t.name}?`,
      description: 'They will be hidden from the teacher list. Their past records stay in the change history.',
      confirmLabel: 'Remove teacher',
      tone: 'caution',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await write.archiveOfficeTeacher(write.ctx, t);
      toast({ title: 'Teacher removed', description: 'Their past records are kept in the change history.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Delete failed', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {confirmDialog}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {teachers.length} {teachers.length === 1 ? 'teacher' : 'teachers'}
          {noTeacherCount > 0 ? (
            <>
              {' · '}
              <Link
                href={`${officePublicHref(schoolId, 'students')}?filter=no-teacher`}
                className="text-amber-800 hover:underline dark:text-amber-300"
              >
                {noTeacherCount} student{noTeacherCount === 1 ? '' : 's'} without a teacher
              </Link>
            </>
          ) : null}
        </p>
        <Button type="button" className="rounded-xl gap-2" onClick={openNew}>
          <Plus className="h-4 w-4" />
          Add teacher
        </Button>
      </div>

      <OfficeSearchInput value={query} onChange={setQuery} placeholder="Search teachers…" />

      {isLoading ? (
        <OfficeLoadingRows cols={3} rows={4} />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <Users className="mx-auto h-8 w-8 text-teal-700/70" aria-hidden />
          <p className="mt-3 font-semibold">No office teachers yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add teachers here, then assign them when you add or edit students.
          </p>
          <Button type="button" className="mt-4 rounded-xl" onClick={openNew}>
            Add teacher
          </Button>
        </div>
      ) : (
        <ul className="divide-y rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {filtered.map((t) => {
            const count = studentCountByTeacher.get(t.id) ?? 0;
            return (
              <li
                key={t.id}
                className={cn(
                  'flex flex-wrap items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-teal-50/60 dark:hover:bg-teal-950/20',
                  selectedTeacherId === t.id && 'bg-teal-50/80 dark:bg-teal-950/30',
                )}
                onClick={(event) => handleSelectableRowClick(event, () => openTeacher(t))}
              >
                <div className="min-w-0">
                  <p className="font-semibold">{t.name}</p>
                  {t.email ? (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3 shrink-0" aria-hidden />
                      {t.email}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {count} student{count === 1 ? '' : 's'} assigned
                  </p>
                </div>
                <div className="flex gap-1">
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit teacher' : 'Add teacher'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Email (optional)</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl"
                placeholder="for office contact only"
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned Classes (optional)</Label>
              <div className="flex flex-col gap-2">
                <Select 
                  value="__none__" 
                  onValueChange={(v) => {
                    if (v !== '__none__' && !selectedClassIds.includes(v)) {
                      setSelectedClassIds([...selectedClassIds, v]);
                    }
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={selectedClassIds.length > 0 ? "Add another class" : "Select a class"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select a class...</SelectItem>
                    {classes.filter(c => !selectedClassIds.includes(c.id)).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClassIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedClassIds.map((id) => (
                      <div key={id} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-sm">
                        <span>{classes.find(c => c.id === id)?.name || 'Unknown'}</span>
                        <button 
                          type="button" 
                          onClick={() => setSelectedClassIds(selectedClassIds.filter(cId => cId !== id))}
                          className="text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => editing && void handleDelete(editing)}
              disabled={busy}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete teacher
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} disabled={busy} className="rounded-xl">
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
