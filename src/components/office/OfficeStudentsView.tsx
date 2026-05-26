'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useOfficeUrlSync } from '@/lib/office/useOfficeUrlSync';
import { Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { OfficeSearchInput } from '@/components/office/OfficeSearchInput';
import { OfficeStudentSheet } from '@/components/office/OfficeStudentSheet';
import { OfficeRosterManager } from '@/components/office/OfficeRosterManager';
import type { OfficeBillingAccount, OfficeClass, OfficeGradeEntry, OfficeStudent, OfficeTeacher } from '@/lib/office/types';
import {
  billingAccountForStudent,
  exportOfficeStudentsCsv,
  getOfficeStudentFullName,
  getOfficeStudentLabel,
  getOfficeTeacherLabel,
  officeStudentHasTeacher,
  studentIdsWithGradesForTerm,
} from '@/lib/office/officeUtils';
import { OfficeEmptyState } from '@/components/office/OfficeEmptyState';
import { OfficeLoadingRows } from '@/components/office/OfficeLoadingRows';
import { Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type SortKey = 'name-asc' | 'name-desc' | 'class';
type RosterFilter = 'all' | 'missing-grades' | 'no-billing' | 'unassigned' | 'no-teacher';

type OfficeStudentsViewProps = {
  schoolId: string;
  students: OfficeStudent[];
  classes: OfficeClass[];
  teachers: OfficeTeacher[];
  classNameById: Map<string, string>;
  teacherNameById: Map<string, string>;
  gradeEntries: OfficeGradeEntry[];
  billingAccounts: OfficeBillingAccount[];
  activeTerm: string;
  isLoading: boolean;
};

export function OfficeStudentsView({
  schoolId,
  students,
  classes,
  teachers,
  classNameById,
  teacherNameById,
  gradeEntries,
  billingAccounts,
  activeTerm,
  isLoading,
}: OfficeStudentsViewProps) {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [rosterFilter, setRosterFilter] = useState<RosterFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('name-asc');
  const [selected, setSelected] = useState<OfficeStudent | null>(null);
  const openedFromQuery = useRef(false);

  const classOptions = useMemo(() => {
    return classes.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [classes]);

  const gradedForTerm = useMemo(
    () => studentIdsWithGradesForTerm(gradeEntries, activeTerm),
    [gradeEntries, activeTerm],
  );

  const missingGradesCount = students.length - gradedForTerm.size;
  const noBillingCount = useMemo(
    () => students.filter((s) => !billingAccountForStudent(billingAccounts, s.id)).length,
    [students, billingAccounts],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = students.filter((s) => {
      if (rosterFilter === 'unassigned' && s.classId) return false;
      if (rosterFilter === 'no-teacher' && officeStudentHasTeacher(s)) return false;
      if (rosterFilter === 'missing-grades' && gradedForTerm.has(s.id)) return false;
      if (rosterFilter === 'no-billing' && billingAccountForStudent(billingAccounts, s.id)) return false;
      if (classFilter === '__unassigned__' && s.classId) return false;
      if (classFilter !== 'all' && classFilter !== '__unassigned__' && s.classId !== classFilter) return false;
      if (!q) return true;
      const label = getOfficeStudentFullName(s).toLowerCase();
      const cls = (s.classId && classNameById.get(s.classId))?.toLowerCase() ?? '';
      return label.includes(q) || cls.includes(q);
    });
    return list.slice().sort((a, b) => {
      if (sortBy === 'name-desc') {
        return getOfficeStudentFullName(b).localeCompare(getOfficeStudentFullName(a));
      }
      if (sortBy === 'class') {
        const ca = (a.classId && classNameById.get(a.classId)) ?? '';
        const cb = (b.classId && classNameById.get(b.classId)) ?? '';
        if (ca !== cb) return ca.localeCompare(cb);
        return getOfficeStudentFullName(a).localeCompare(getOfficeStudentFullName(b));
      }
      return getOfficeStudentFullName(a).localeCompare(getOfficeStudentFullName(b));
    });
  }, [students, query, classFilter, rosterFilter, sortBy, classNameById, gradedForTerm, billingAccounts]);

  useEffect(() => {
    const f = searchParams.get('filter')?.trim();
    if (f === 'missing-grades' || f === 'no-billing' || f === 'unassigned' || f === 'no-teacher') {
      setRosterFilter(f);
      if (f === 'unassigned') setClassFilter('__unassigned__');
    }
  }, [searchParams]);

  useEffect(() => {
    if (openedFromQuery.current || isLoading) return;
    const id = searchParams.get('student')?.trim();
    if (!id) return;
    const match = students.find((s) => s.id === id);
    if (match) {
      openedFromQuery.current = true;
      setSelected(match);
    }
  }, [searchParams, students, isLoading]);

  useOfficeUrlSync({
    filter: rosterFilter === 'all' ? undefined : rosterFilter,
    student: selected?.id,
    class:
      classFilter === 'all' || classFilter === '__unassigned__' ? undefined : classFilter,
  });

  const unassignedCount = useMemo(() => students.filter((s) => !s.classId).length, [students]);
  const noTeacherCount = useMemo(
    () => students.filter((s) => !officeStudentHasTeacher(s)).length,
    [students],
  );

  const rosterFilterOptions: { id: RosterFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    ...(missingGradesCount > 0
      ? [{ id: 'missing-grades' as const, label: `Missing grades (${missingGradesCount})` }]
      : []),
    ...(noBillingCount > 0 ? [{ id: 'no-billing' as const, label: `No billing (${noBillingCount})` }] : []),
    ...(unassignedCount > 0 ? [{ id: 'unassigned' as const, label: `Unassigned (${unassignedCount})` }] : []),
    ...(noTeacherCount > 0
      ? [{ id: 'no-teacher' as const, label: `No teacher (${noTeacherCount})` }]
      : []),
  ];

  if (isLoading) {
    return <OfficeLoadingRows cols={4} />;
  }

  if (students.length === 0) {
    return (
      <div className="space-y-4">
        <OfficeEmptyState
          icon={Users}
          title="No office students yet"
          description="Add students manually or import a CSV roster."
        />
        <OfficeRosterManager schoolId={schoolId} classes={classes} teachers={teachers} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <OfficeRosterManager schoolId={schoolId} classes={classes} teachers={teachers} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl gap-2"
          disabled={students.length === 0}
          onClick={() => {
            exportOfficeStudentsCsv(schoolId, filtered, classNameById, teacherNameById);
            toast({ title: 'Roster exported', description: `${filtered.length} rows.` });
          }}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {rosterFilterOptions.map((opt) => (
          <Button
            key={opt.id}
            type="button"
            size="sm"
            variant={rosterFilter === opt.id ? 'default' : 'outline'}
            className="rounded-lg h-8"
            onClick={() => {
              setRosterFilter(opt.id);
              if (opt.id === 'unassigned') setClassFilter('__unassigned__');
              else if (classFilter === '__unassigned__') setClassFilter('all');
            }}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <OfficeSearchInput value={query} onChange={setQuery} placeholder="Search by name or class…" className="flex-1" />
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Class</Label>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-44 h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {unassignedCount > 0 ? (
                <SelectItem value="__unassigned__">Unassigned ({unassignedCount})</SelectItem>
              ) : null}
              {classOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Sort</Label>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-36 h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name A → Z</SelectItem>
              <SelectItem value="name-desc">Name Z → A</SelectItem>
              <SelectItem value="class">By class</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {filtered.length === students.length
          ? `${students.length} student${students.length === 1 ? '' : 's'}`
          : `${filtered.length} of ${students.length} students`}
      </p>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground dark:bg-slate-800/50">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3 hidden sm:table-cell">Class</th>
              <th className="px-4 py-3 hidden md:table-cell">Teacher</th>
              <th className="px-4 py-3 hidden lg:table-cell">Billing</th>
              <th className="px-4 py-3 hidden lg:table-cell">{activeTerm}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr
                key={s.id}
                className={cn(
                  'border-b border-slate-100 last:border-0 dark:border-slate-800 cursor-pointer hover:bg-teal-50/60 dark:hover:bg-teal-950/20',
                  selected?.id === s.id && 'bg-teal-50/80 dark:bg-teal-950/30',
                )}
                onClick={() => setSelected(s)}
              >
                <td className="px-4 py-3 font-medium">
                  {getOfficeStudentLabel(s)} {s.lastName}
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                  {(s.classId && classNameById.get(s.classId)) || '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  {getOfficeTeacherLabel(s, teacherNameById) || '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                  {billingAccountForStudent(billingAccounts, s.id)?.familyName ?? '—'}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  {gradedForTerm.has(s.id) ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[0.625rem] font-bold uppercase text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                      Graded
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.625rem] font-bold uppercase text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                      Missing
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {students.length === 0
              ? 'No office students yet. Add students or import a CSV.'
              : 'No students match your filters.'}
          </p>
        ) : null}
      </div>

      <OfficeStudentSheet
        schoolId={schoolId}
        student={selected}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        classLabel={selected?.classId ? classNameById.get(selected.classId) : undefined}
        gradeEntries={gradeEntries}
        billingAccounts={billingAccounts}
        activeTerm={activeTerm}
        classes={classes}
        teachers={teachers}
      />
    </div>
  );
}
