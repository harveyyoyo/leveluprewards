'use client';

import { useMemo, useState } from 'react';
import { collection, deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { Mail, Pencil, Plus, Trash2, Users } from 'lucide-react';
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
import type { OfficeStudent, OfficeTeacher } from '@/lib/office/types';
import { countOfficeStudentsByTeacher } from '@/lib/office/officeUtils';
import { OfficeSearchInput } from '@/components/office/OfficeSearchInput';
import { OfficeLoadingRows } from '@/components/office/OfficeLoadingRows';
import { officePublicHref } from '@/lib/officePublicUrl';
import Link from 'next/link';

type OfficeTeachersViewProps = {
  schoolId: string;
  teachers: OfficeTeacher[];
  students: OfficeStudent[];
  isLoading: boolean;
};

export function OfficeTeachersView({ schoolId, teachers, students, isLoading }: OfficeTeachersViewProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OfficeTeacher | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const studentCountByTeacher = useMemo(() => countOfficeStudentsByTeacher(students), [students]);
  const noTeacherCount = useMemo(
    () => students.filter((s) => !s.teacherId?.trim() && !s.teacherName?.trim()).length,
    [students],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...teachers].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return list;
    return list.filter(
      (t) => t.name.toLowerCase().includes(q) || (t.email?.toLowerCase().includes(q) ?? false),
    );
  }, [teachers, query]);

  const openNew = () => {
    setEditing(null);
    setName('');
    setEmail('');
    setDialogOpen(true);
  };

  const openEdit = (t: OfficeTeacher) => {
    setEditing(t);
    setName(t.name);
    setEmail(t.email ?? '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!firestore || !name.trim()) {
      toast({ variant: 'destructive', title: 'Teacher name is required.' });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim() || null,
        updatedAt: Date.now(),
      };
      if (editing) {
        await updateDoc(doc(firestore, 'schools', schoolId, 'officeTeachers', editing.id), payload);
        toast({ title: 'Teacher updated' });
      } else {
        await setDoc(doc(collection(firestore, 'schools', schoolId, 'officeTeachers')), payload);
        toast({ title: 'Teacher added' });
      }
      setDialogOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (t: OfficeTeacher) => {
    if (!firestore) return;
    const assigned = studentCountByTeacher.get(t.id) ?? 0;
    if (assigned > 0) {
      toast({
        variant: 'destructive',
        title: 'Teacher has students',
        description: `Reassign ${assigned} student${assigned === 1 ? '' : 's'} before deleting.`,
      });
      return;
    }
    if (!confirm(`Remove ${t.name} from the office teacher list?`)) return;
    setBusy(true);
    try {
      await deleteDoc(doc(firestore, 'schools', schoolId, 'officeTeachers', t.id));
      toast({ title: 'Teacher removed' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Delete failed', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Teachers</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            Classroom and homeroom teachers for the office roster. Assign each student on{' '}
            <Link href={officePublicHref(schoolId, 'students')} className="font-medium text-teal-800 underline-offset-2 hover:underline">
              Students
            </Link>{' '}
            — separate from rewards points staff in Admin.
          </p>
        </div>
        <Button type="button" className="rounded-xl gap-2" onClick={openNew}>
          <Plus className="h-4 w-4" />
          Add teacher
        </Button>
      </div>

      {noTeacherCount > 0 ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
          {noTeacherCount} student{noTeacherCount === 1 ? '' : 's'} ha{noTeacherCount === 1 ? 's' : 've'} no teacher assigned.
        </p>
      ) : null}

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
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
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
                  <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => openEdit(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => void handleDelete(t)}
                    disabled={busy}
                    aria-label={`Remove ${t.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={busy}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
