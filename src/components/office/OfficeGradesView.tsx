'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useOfficeUrlSync } from '@/lib/office/useOfficeUrlSync';
import { OfficeCsvImportDialog } from '@/components/office/OfficeCsvImportDialog';
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
import { ChevronRight, Download, Layers, Pencil, Plus, Printer, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { OfficeSearchInput } from '@/components/office/OfficeSearchInput';
import { OfficeWorkingTermSelect } from '@/components/office/OfficeWorkingTermSelect';
import type { OfficeGradeEntry, OfficeStudent } from '@/lib/office/types';
import { OfficeQuickChips } from '@/components/office/OfficeQuickChips';
import { OfficeEmptyState } from '@/components/office/OfficeEmptyState';
import { OfficeLoadingRows } from '@/components/office/OfficeLoadingRows';
import {
  downloadCsv,
  formatGradeDisplay,
  getOfficeStudentFullName,
  collectOfficeTermOptions,
  studentsWithoutGradesForTerm,
  uniqueGradeSubjects,
} from '@/lib/office/officeUtils';
import { useOfficeTerm } from '@/lib/office/useOfficeTerm';
import { useOfficeSettings } from '@/lib/office/useOfficeSettings';
import { useOfficeWrite } from '@/lib/office/useOfficeWrite';
import { useOfficePortalChrome } from '@/components/office/OfficePortalChrome';
import { officePublicHref } from '@/lib/officePublicUrl';
import Link from 'next/link';

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
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const write = useOfficeWrite(schoolId);
  const { marksLabels } = useOfficePortalChrome();
  const { term: activeTerm, setTerm: setActiveTerm, configuredTerms } = useOfficeTerm(schoolId);
  const { settings } = useOfficeSettings(schoolId);
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
  const [search, setSearch] = useState('');
  const [showMissingPanel, setShowMissingPanel] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSubject, setBulkSubject] = useState('');
  const [bulkLetter, setBulkLetter] = useState('');
  const [bulkNumeric, setBulkNumeric] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const filterTermOptions = useMemo(
    () =>
      collectOfficeTermOptions({
        gradeEntries: entries,
        activeTerm,
        schoolDefaultTerm: settings?.defaultActiveTerm,
        configuredTerms,
      }),
    [entries, activeTerm, settings?.defaultActiveTerm, configuredTerms],
  );

  const classOptions = useMemo(() => {
    const ids = new Set(students.map((s) => s.classId).filter(Boolean) as string[]);
    return Array.from(ids)
      .map((id) => ({ id, name: classNameById.get(id) ?? id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, classNameById]);

  const studentClassId = useMemo(() => new Map(students.map((s) => [s.id, s.classId])), [students]);

  const missingForTerm = useMemo(
    () => studentsWithoutGradesForTerm(students, entries, activeTerm),
    [students, entries, activeTerm],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (filterTerm !== 'all' && e.termLabel !== filterTerm) return false;
      if (filterClass !== 'all') {
        const cid = studentClassId.get(e.studentId);
        if (cid !== filterClass) return false;
      }
      if (q) {
        const label = (studentLabelById.get(e.studentId) ?? '').toLowerCase();
        const subj = (e.subject ?? '').toLowerCase();
        if (!label.includes(q) && !subj.includes(q)) return false;
      }
      return true;
    });
  }, [entries, filterTerm, filterClass, studentClassId, search, studentLabelById]);

  const subjectSuggestions = useMemo(() => uniqueGradeSubjects(entries), [entries]);
  const letterGrades = ['A', 'B', 'C', 'D', 'F'];

  const sorted = useMemo(() => {
    return filtered.slice().sort((a, b) => {
      const sa = studentLabelById.get(a.studentId) ?? '';
      const sb = studentLabelById.get(b.studentId) ?? '';
      if (sa !== sb) return sa.localeCompare(sb);
      return (a.subject ?? '').localeCompare(b.subject ?? '');
    });
  }, [filtered, studentLabelById]);

  const groupedByStudent = useMemo(() => {
    const map = new Map<string, OfficeGradeEntry[]>();
    for (const row of sorted) {
      const list = map.get(row.studentId) ?? [];
      list.push(row);
      map.set(row.studentId, list);
    }
    return Array.from(map.entries())
      .map(([studentId, grades]) => {
        const student = students.find((s) => s.id === studentId);
        const classId = grades[0]?.classId ?? student?.classId ?? null;
        const ordered = grades.slice().sort((a, b) => {
          const termCmp = (a.termLabel ?? '').localeCompare(b.termLabel ?? '');
          if (termCmp !== 0) return termCmp;
          return (a.subject ?? '').localeCompare(b.subject ?? '');
        });
        return {
          studentId,
          label: studentLabelById.get(studentId) ?? 'Unknown',
          classId,
          grades: ordered,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [sorted, students, studentLabelById]);

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

  useEffect(() => {
    const term = searchParams.get('term')?.trim();
    if (term) setFilterTerm(term);
    const cls = searchParams.get('class')?.trim();
    if (cls && (cls === 'all' || classOptions.some((c) => c.id === cls))) {
      setFilterClass(cls);
    }
  }, [searchParams, classOptions]);

  useOfficeUrlSync({
    term: filterTerm !== 'all' ? filterTerm : undefined,
    class: filterClass !== 'all' ? filterClass : undefined,
  });

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
    if (!write.ctx || !form.studentId || !form.subject.trim() || !form.termLabel.trim()) {
      toast({ variant: 'destructive', title: 'Student, term, and subject are required.' });
      return;
    }
    const duplicate = entries.find(
      (e) =>
        e.id !== editingId &&
        e.studentId === form.studentId &&
        e.termLabel === form.termLabel.trim() &&
        (e.subject ?? '').toLowerCase() === form.subject.trim().toLowerCase(),
    );
    if (duplicate) {
      toast({
        variant: 'destructive',
        title: 'Duplicate grade',
        description: 'This student already has a grade for that term and subject. Edit the existing entry instead.',
      });
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
      };
      if (editingId) {
        await write.updateOfficeGradeEntry(write.ctx, editingId, payload);
        toast({ title: `${marksLabels.singular} updated` });
      } else {
        await write.createOfficeGradeEntry(write.ctx, payload);
        toast({ title: `${marksLabels.singular} saved` });
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
    if (!write.ctx || !confirm(`Delete this ${marksLabels.singular.toLowerCase()} entry?`)) return;
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    try {
      await write.deleteOfficeGradeEntry(write.ctx, entry);
      toast({ title: `${marksLabels.singular} removed` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Delete failed', description: (e as Error).message });
    }
  };

  const exportMissingCsv = () => {
    const rows = missingForTerm.map((s) => [
      getOfficeStudentFullName(s),
      (s.classId && classNameById.get(s.classId)) ?? '',
      activeTerm,
    ]);
    downloadCsv(`missing-grades-${schoolId}.csv`, ['Student', 'Class', 'Term'], rows);
    toast({ title: 'Exported', description: `${rows.length} students without grades.` });
  };

  const handleBulkGrades = async () => {
    if (!write.ctx || !bulkSubject.trim()) {
      toast({ variant: 'destructive', title: 'Subject is required for bulk entry.' });
      return;
    }
    if (missingForTerm.length === 0) {
      toast({ title: `No students need ${marksLabels.plural} for this term.` });
      return;
    }
    const numeric = bulkNumeric ? Number(bulkNumeric) : null;
    if (bulkNumeric && (!Number.isFinite(numeric) || numeric! < 0 || numeric! > 100)) {
      toast({ variant: 'destructive', title: 'Enter a valid percent (0–100) or leave blank.' });
      return;
    }
    setBusy(true);
    try {
      const termLabel = activeTerm.trim();
      const bulkEntries = missingForTerm.map((student) => ({
        studentId: student.id,
        classId: student.classId ?? null,
        termLabel,
        subject: bulkSubject.trim(),
        letterGrade: bulkLetter.trim() || null,
        numericGrade: numeric,
        notes: null,
      }));
      await write.bulkCreateOfficeGradeEntries(write.ctx, bulkEntries);
      toast({
        title: `Bulk ${marksLabels.plural} saved`,
        description: `${missingForTerm.length} students · ${bulkSubject.trim()} · ${termLabel}`,
      });
      setBulkOpen(false);
      setBulkSubject('');
      setBulkLetter('');
      setBulkNumeric('');
      setShowMissingPanel(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Bulk save failed', description: (e as Error).message });
    } finally {
      setBusy(false);
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
          Term: <span className="font-semibold text-foreground">{activeTerm}</span> — grades and reports filter to this term
        </p>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" className="rounded-xl gap-2" asChild>
            <Link href={`${officePublicHref(schoolId, 'reports')}?term=${encodeURIComponent(activeTerm)}`}>
              <Printer className="h-4 w-4" />
              Print report
            </Link>
          </Button>
          <Button variant="outline" className="rounded-xl gap-2" onClick={exportCsv} disabled={sorted.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <OfficeCsvImportDialog
            schoolId={schoolId}
            mode="grades"
            students={students}
            userName={userName}
            disabled={students.length === 0}
          />
          {missingForTerm.length > 0 ? (
            <Button variant="outline" className="rounded-xl gap-2" onClick={() => setBulkOpen(true)}>
              <Layers className="h-4 w-4" />
              Bulk fill ({missingForTerm.length})
            </Button>
          ) : null}
          <Button className="rounded-xl gap-2" onClick={() => openAdd()}>
            <Plus className="h-4 w-4" />
            Add grade
          </Button>
        </div>
      </div>

      <OfficeSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search student or subject…"
        className="max-w-lg"
      />

      <div className="flex flex-wrap items-end gap-3">
        <Button
          type="button"
          variant={filterTerm === activeTerm ? 'default' : 'outline'}
          size="sm"
          className="rounded-lg h-9"
          onClick={() => setFilterTerm(activeTerm)}
        >
          This term
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg h-9"
          onClick={() => setFilterTerm('all')}
        >
          All terms
        </Button>
        {missingForTerm.length > 0 ? (
          <Button
            type="button"
            variant={showMissingPanel ? 'default' : 'outline'}
            size="sm"
            className="rounded-lg h-9 text-amber-900 border-amber-200 dark:text-amber-200"
            onClick={() => setShowMissingPanel((v) => !v)}
          >
            {missingForTerm.length} missing grades
          </Button>
        ) : null}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Filter term</Label>
          <Select value={filterTerm} onValueChange={setFilterTerm}>
            <SelectTrigger className="w-36 h-9 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All terms</SelectItem>
              {filterTermOptions.map((t) => (
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
        <OfficeWorkingTermSelect
          label="Term"
          value={activeTerm}
          onValueChange={setActiveTerm}
          gradeEntries={entries}
          schoolDefaultTerm={settings?.defaultActiveTerm}
          configuredTerms={configuredTerms}
          id="office-grades-working-term"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {groupedByStudent.length} student{groupedByStudent.length === 1 ? '' : 's'}
        {sorted.length !== entries.length
          ? ` · ${sorted.length} of ${entries.length} grade entries`
          : ` · ${sorted.length} grade ${sorted.length === 1 ? 'entry' : 'entries'}`}
      </p>

      {showMissingPanel && missingForTerm.length > 0 ? (
        <section className="rounded-2xl border border-amber-200/70 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-bold text-amber-950 dark:text-amber-100">
              No grades for {activeTerm}
            </h3>
            <Button type="button" variant="outline" size="sm" className="rounded-lg gap-1.5" onClick={exportMissingCsv}>
              <Download className="h-3.5 w-3.5" />
              Export list
            </Button>
          </div>
          <ul className="grid gap-1 sm:grid-cols-2">
            {missingForTerm.slice(0, 12).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm dark:bg-slate-900/60">
                <span className="truncate font-medium">{getOfficeStudentFullName(s)}</span>
                <Button asChild variant="ghost" size="sm" className="h-7 shrink-0 rounded-md text-teal-700">
                  <Link
                    href={`${officePublicHref(schoolId, 'grades')}?student=${encodeURIComponent(s.id)}&term=${encodeURIComponent(activeTerm)}`}
                  >
                    Add
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
          {missingForTerm.length > 12 ? (
            <p className="mt-2 text-xs text-muted-foreground">+{missingForTerm.length - 12} more — export for full list</p>
          ) : null}
        </section>
      ) : null}

      {isLoading ? (
        <OfficeLoadingRows cols={5} />
      ) : entries.length === 0 ? (
        <OfficeEmptyState
          title="No grades yet"
          description="Record term grades for students, or use bulk fill when many students share the same subject."
          action={
            <Button className="rounded-xl gap-2" onClick={() => openAdd()}>
              <Plus className="h-4 w-4" />
              Add first grade
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground dark:bg-slate-800/50">
                <th className="w-10 px-2 py-3" aria-label="Expand" />
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3 hidden sm:table-cell">Class</th>
                <th className="px-4 py-3 hidden md:table-cell">Grades</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {groupedByStudent.map((group) => {
                const open = expandedStudentId === group.studentId;
                const classLabel = (group.classId && classNameById.get(group.classId)) || '—';
                const summary = group.grades
                  .map((g) => `${g.subject} ${formatGradeDisplay(g)}`.trim())
                  .join(' · ');
                return (
                  <Fragment key={group.studentId}>
                    <tr
                      className={cn(
                        'border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-teal-50/50 dark:hover:bg-teal-950/20',
                        open && 'bg-teal-50/40 dark:bg-teal-950/25',
                      )}
                      onClick={() => setExpandedStudentId(open ? null : group.studentId)}
                    >
                      <td className="px-2 py-3 text-center">
                        <ChevronRight
                          className={cn(
                            'mx-auto h-4 w-4 text-muted-foreground transition-transform',
                            open && 'rotate-90',
                          )}
                          aria-hidden
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">{group.label}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{classLabel}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-xs truncate">
                        {open ? (
                          <span className="text-xs">
                            {group.grades.length} {group.grades.length === 1 ? 'entry' : 'entries'}
                          </span>
                        ) : (
                          <span className="text-xs" title={summary}>
                            {group.grades.length} {group.grades.length === 1 ? 'subject' : 'subjects'}
                            {summary ? ` — ${summary}` : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg text-xs"
                            onClick={() =>
                              openAdd(
                                group.studentId,
                                filterTerm !== 'all' ? filterTerm : activeTerm,
                              )
                            }
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {open
                      ? group.grades.map((row) => (
                          <tr
                            key={row.id}
                            className="border-b border-slate-100 bg-slate-50/70 last:border-0 dark:border-slate-800 dark:bg-slate-800/40"
                          >
                            <td className="w-10" />
                            <td className="px-4 py-2 pl-8">
                              <span className="font-medium">{row.subject}</span>
                              <span className="text-xs text-muted-foreground ml-2">{row.termLabel}</span>
                            </td>
                            <td className="px-4 py-2 hidden sm:table-cell" />
                            <td className="px-4 py-2 font-semibold text-teal-800 dark:text-teal-300 hidden md:table-cell">
                              {formatGradeDisplay(row)}
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex justify-end gap-1">
                                <span className="font-semibold text-teal-800 dark:text-teal-300 md:hidden mr-1">
                                  {formatGradeDisplay(row)}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEdit(row)}
                                  aria-label="Edit grade"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => void handleDelete(row.id)}
                                  aria-label="Delete grade"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {sorted.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No grade entries match your filters.</p>
          ) : null}
        </div>
      )}

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Bulk fill missing grades</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Adds one grade row for each of the {missingForTerm.length} student
            {missingForTerm.length === 1 ? '' : 's'} with no grades for <strong>{activeTerm}</strong>.
          </p>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={bulkSubject}
                onChange={(e) => setBulkSubject(e.target.value)}
                placeholder="e.g. Math"
                className="rounded-xl"
              />
              <OfficeQuickChips
                options={subjectSuggestions.slice(0, 8)}
                value={bulkSubject}
                onSelect={setBulkSubject}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Letter (optional)</Label>
                <Input
                  value={bulkLetter}
                  onChange={(e) => setBulkLetter(e.target.value)}
                  className="rounded-xl"
                />
                <OfficeQuickChips options={letterGrades} value={bulkLetter} onSelect={setBulkLetter} />
              </div>
              <div className="space-y-2">
                <Label>Percent (optional)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={bulkNumeric}
                  onChange={(e) => setBulkNumeric(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleBulkGrades()} disabled={busy || !bulkSubject.trim()}>
              Save {missingForTerm.length} grades
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  {!isLoading && form.studentId && !students.some((s) => s.id === form.studentId) ? (
                    <SelectItem value={form.studentId}>Unknown student (deleted)</SelectItem>
                  ) : null}
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
                <OfficeWorkingTermSelect
                  label="Term"
                  layout="stacked"
                  value={form.termLabel}
                  onValueChange={(termLabel) => setForm((f) => ({ ...f, termLabel }))}
                  gradeEntries={entries}
                  schoolDefaultTerm={settings?.defaultActiveTerm}
                  configuredTerms={configuredTerms}
                  id="office-grade-form-term"
                  triggerClassName="max-w-none rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Math"
                  className="rounded-xl"
                  list="office-grade-subjects"
                />
                <datalist id="office-grade-subjects">
                  {subjectSuggestions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <OfficeQuickChips
                  options={subjectSuggestions.slice(0, 8)}
                  value={form.subject}
                  onSelect={(subject) => setForm((f) => ({ ...f, subject }))}
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
                <OfficeQuickChips
                  options={letterGrades}
                  value={form.letterGrade}
                  onSelect={(letterGrade) => setForm((f) => ({ ...f, letterGrade }))}
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
