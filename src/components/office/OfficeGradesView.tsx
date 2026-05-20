'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { OfficeGradeEntry, OfficeStudent } from '@/lib/office/types';
import { downloadCsv, formatGradeDisplay } from '@/lib/office/officeUtils';
import { useOfficeTerm } from '@/lib/office/useOfficeTerm';

type OfficeGradesViewProps = {
  schoolId: string;
  students: OfficeStudent[];
  classNameById: Map<string, string>;
  studentLabelById: Map<string, string>;
  entries: OfficeGradeEntry[];
  userName: string | null;
  isLoading: boolean;
};

type GradeForm = {
  studentId: string;
  termLabel: string;
  subject: string;
  letterGrade: string;
  numericGrade: string;
  notes: string;
};

export function OfficeGradesView({
  schoolId,
  students,
  classNameById,
  studentLabelById,
  entries,
  userName,
  isLoading,
}: OfficeGradesViewProps) {
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { term: activeTerm, setTerm: setActiveTerm } = useOfficeTerm(schoolId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GradeForm>({
    studentId: '',
    termLabel: activeTerm,
    subject: '',
    letterGrade: '',
    numericGrade: '',
    notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [filterTerm, setFilterTerm] = useState('all');
  const [filterClass, setFilterClass] = useState('all');

  const terms = useMemo(() => {
    const set = new Set(entries.map((e) => e.termLabel));
    if (activeTerm) set.add(activeTerm);
    return Array.from(set).sort();
  }, [entries, activeTerm]);

  const classOptions = useMemo(() => {
    const ids = new Set(students.map((s) => s.classId).filter(Boolean) as string[]);
    return Array.from(ids)
      .map((id) => ({ id, name: classNameById.get(id) ?? id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, classNameById]);

  const studentClassId = useMemo(() => new Map(students.map((s) => [s.id, s.classId])), [students]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterTerm !== 'all' && e.termLabel !== filterTerm) return false;
      if (filterClass !== 'all') {
        const cid = studentClassId.get(e.studentId);
        if (cid !== filterClass) return false;
      }
      return true;
    });
  }, [entries, filterTerm, filterClass, studentClassId]);

  const sorted = useMemo(() => {
    return filtered.slice().sort((a, b) => {
      const sa = studentLabelById.get(a.studentId) ?? '';
      const sb = studentLabelById.get(b.studentId) ?? '';
      if (sa !== sb) return sa.localeCompare(sb);
      return a.subject.localeCompare(b.subject);
    });
  }, [filtered, studentLabelById]);

  const openAdd = useCallback((presetStudentId?: string, presetTerm?: string) => {
    setEditingId(null);
    setForm({
      studentId: presetStudentId ?? '',
      termLabel: presetTerm ?? activeTerm,
      subject: '',
      letterGrade: '',
      numericGrade: '',
      notes: '',
    });
    setDialogOpen(true);
  }, [activeTerm]);

  const openedFromQuery = useRef(false);
  useEffect(() => {
    if (openedFromQuery.current || isLoading) return;
    const studentId = searchParams.get('student');
    if (!studentId || !students.some((s) => s.id === studentId)) return;
    openedFromQuery.current = true;
    openAdd(studentId, searchParams.get('term')?.trim() || activeTerm);
  }, [searchParams, students, isLoading, activeTerm, openAdd]);

  const openEdit = (row: OfficeGradeEntry) => {
    setEditingId(row.id);
    setForm({
      studentId: row.studentId,
      termLabel: row.termLabel,
      subject: row.subject,
      letterGrade: row.letterGrade ?? '',
      numericGrade: row.numericGrade != null ? String(row.numericGrade) : '',
      notes: row.notes ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!firestore || !form.studentId || !form.subject.trim() || !form.termLabel.trim()) {
      toast({ variant: 'destructive', title: 'Student, term, and subject are required.' });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        studentId: form.studentId,
        classId: students.find((s) => s.id === form.studentId)?.classId ?? null,
        termLabel: form.termLabel.trim(),
        subject: form.subject.trim(),
        letterGrade: form.letterGrade.trim() || null,
        numericGrade: form.numericGrade ? Number(form.numericGrade) : null,
        notes: form.notes.trim() || null,
        updatedAt: Date.now(),
        updatedBy: userName,
      };
      if (editingId) {
        await setDoc(doc(firestore, 'schools', schoolId, 'officeGradeEntries', editingId), payload, { merge: true });
        toast({ title: 'Grade updated' });
      } else {
        await setDoc(doc(collection(firestore, 'schools', schoolId, 'officeGradeEntries')), payload);
        toast({ title: 'Grade saved' });
      }
      setActiveTerm(form.termLabel.trim());
      setDialogOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not save grade', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !confirm('Delete this grade entry?')) return;
    try {
      await deleteDoc(doc(firestore, 'schools', schoolId, 'officeGradeEntries', id));
      toast({ title: 'Grade removed' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Delete failed', description: (e as Error).message });
    }
  };

  const exportCsv = () => {
    const rows = sorted.map((row) => [
      studentLabelById.get(row.studentId) ?? '',
      (row.classId && classNameById.get(row.classId)) || '',
      row.termLabel,
      row.subject,
      row.letterGrade ?? '',
      row.numericGrade != null ? String(row.numericGrade) : '',
      row.notes ?? '',
    ]);
    downloadCsv(`grades-${schoolId}.csv`, ['Student', 'Class', 'Term', 'Subject', 'Letter', 'Percent', 'Notes'], rows);
    toast({ title: 'Exported', description: `${rows.length} rows downloaded.` });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground max-w-xl">
          Working term: <span className="font-semibold text-foreground">{activeTerm}</span> (saved for this school)
        </p>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" className="rounded-xl gap-2" onClick={exportCsv} disabled={sorted.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button className="rounded-xl gap-2" onClick={() => openAdd()}>
            <Plus className="h-4 w-4" />
            Add grade
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Filter term</Label>
          <Select value={filterTerm} onValueChange={setFilterTerm}>
            <SelectTrigger className="w-36 h-9 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All terms</SelectItem>
              {terms.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Filter class</Label>
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-40 h-9 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Set working term</Label>
          <Input
            value={activeTerm}
            onChange={(e) => setActiveTerm(e.target.value)}
            className="h-9 w-36 rounded-lg"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading grades…</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground dark:bg-slate-800/50">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3 hidden sm:table-cell">Class</th>
                <th className="px-4 py-3">Term</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="px-4 py-3 font-medium">{studentLabelById.get(row.studentId) ?? 'Unknown'}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {(row.classId && classNameById.get(row.classId)) || '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.termLabel}</td>
                  <td className="px-4 py-3">{row.subject}</td>
                  <td className="px-4 py-3">{formatGradeDisplay(row)}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label="Edit grade">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => void handleDelete(row.id)}
                        aria-label="Delete grade"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sorted.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No grade entries match your filters.</p>
          ) : null}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit grade' : 'Add grade'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select
                value={form.studentId}
                onValueChange={(v) => setForm((f) => ({ ...f, studentId: v }))}
                disabled={!!editingId}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Choose student" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {studentLabelById.get(s.id)} · {(s.classId && classNameById.get(s.classId)) || 'No class'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Term</Label>
                <Input
                  value={form.termLabel}
                  onChange={(e) => setForm((f) => ({ ...f, termLabel: e.target.value }))}
                  placeholder="e.g. Q1 2025"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Math"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Letter grade</Label>
                <Input
                  value={form.letterGrade}
                  onChange={(e) => setForm((f) => ({ ...f, letterGrade: e.target.value }))}
                  placeholder="A"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Numeric %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.numericGrade}
                  onChange={(e) => setForm((f) => ({ ...f, numericGrade: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={busy}>
              {editingId ? 'Save changes' : 'Save grade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
