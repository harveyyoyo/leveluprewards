'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useOfficeUrlSync } from '@/lib/office/useOfficeUrlSync';
import { Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { OfficeSearchInput } from '@/components/office/OfficeSearchInput';
import { OfficeRosterManager } from '@/components/office/OfficeRosterManager';
import { OfficeEntityLink } from '@/components/office/OfficeEntityLink';
import { useOfficeEntityNav } from '@/components/office/OfficeEntityNavProvider';
import { handleSelectableRowClick } from '@/lib/ui/selectableRowClick';
import type { OfficeBillingAccount, OfficeClass, OfficeFamily, OfficeGradeEntry, OfficeStudent, OfficeTeacher } from '@/lib/office/types';
import {
  billingAccountForStudent,
  exportOfficeStudentsCsv,
  getOfficeStudentFullName,
  getOfficeStudentLabel,
  getOfficeTeacherLabel,
  getTeacherIds,
  officeStudentHasTeacher,
  studentIdsWithGradesForTerm,
} from '@/lib/office/officeUtils';
import { OfficeEmptyState } from '@/components/office/OfficeEmptyState';
import { OfficeLoadingRows } from '@/components/office/OfficeLoadingRows';
import { Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type SortKey = 'name-asc' | 'name-desc' | 'class';
type RosterFilter = 'all' | 'missing-grades' | 'no-billing' | 'unassigned' | 'no-teacher' | 'withdrawn' | 'graduated';

type OfficeStudentsViewProps = {
  schoolId: string;
  students: OfficeStudent[];
  classes: OfficeClass[];
  teachers: OfficeTeacher[];
  families?: OfficeFamily[];
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
  families: _families = [],
  classNameById,
  teacherNameById,
  gradeEntries,
  billingAccounts,
  activeTerm,
  isLoading,
}: OfficeStudentsViewProps) {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { openStudent, selectedStudentId } = useOfficeEntityNav();
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [homeroomFilter, setHomeroomFilter] = useState('all');
  const [rosterFilter, setRosterFilter] = useState<RosterFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('name-asc');
  const openedHomeroomFromQuery = useRef(false);

  const classOptions = useMemo(() => {
    return classes.slice().sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }, [classes]);

  // The default roster view is "active students" — withdrawn/graduated students have their
  // own dedicated filter chips instead of cluttering the main list and its counts.
  const activeStudents = useMemo(
    () => students.filter((s) => (s.status ?? 'active') === 'active'),
    [students],
  );
  const withdrawnCount = useMemo(() => students.filter((s) => s.status === 'withdrawn').length, [students]);
  const graduatedCount = useMemo(() => students.filter((s) => s.status === 'graduated').length, [students]);

  const gradedForTerm = useMemo(
    () => studentIdsWithGradesForTerm(gradeEntries, activeTerm),
    [gradeEntries, activeTerm],
  );

  const missingGradesCount = activeStudents.length - activeStudents.filter((s) => gradedForTerm.has(s.id)).length;
  const noBillingCount = useMemo(
    () => activeStudents.filter((s) => !billingAccountForStudent(billingAccounts, s.id)).length,
    [activeStudents, billingAccounts],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base =
      rosterFilter === 'withdrawn'
        ? students.filter((s) => s.status === 'withdrawn')
        : rosterFilter === 'graduated'
          ? students.filter((s) => s.status === 'graduated')
          : activeStudents;
    const list = base.filter((s) => {
      if (homeroomFilter !== 'all' && !getTeacherIds(s).includes(homeroomFilter)) return false;
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
  }, [
    students,
    activeStudents,
    query,
    classFilter,
    homeroomFilter,
    rosterFilter,
    sortBy,
    classNameById,
    gradedForTerm,
    billingAccounts,
  ]);

  useEffect(() => {
    const f = searchParams.get('filter')?.trim();
    if (
      f === 'missing-grades' ||
      f === 'no-billing' ||
      f === 'unassigned' ||
      f === 'no-teacher' ||
      f === 'withdrawn' ||
      f === 'graduated'
    ) {
      setRosterFilter(f);
      if (f === 'unassigned') setClassFilter('__unassigned__');
    }
  }, [searchParams]);

  useEffect(() => {
    if (openedHomeroomFromQuery.current) return;
    const homeroom = searchParams.get('homeroom')?.trim();
    if (homeroom && teachers.some((t) => t.id === homeroom)) {
      openedHomeroomFromQuery.current = true;
      setHomeroomFilter(homeroom);
    }
  }, [searchParams, teachers]);

  useOfficeUrlSync({
    filter: rosterFilter === 'all' ? undefined : rosterFilter,
    homeroom: homeroomFilter === 'all' ? undefined : homeroomFilter,
    class:
      classFilter === 'all' || classFilter === '__unassigned__' ? undefined : classFilter,
  });

  const unassignedCount = useMemo(() => activeStudents.filter((s) => !s.classId).length, [activeStudents]);
  const noTeacherCount = useMemo(
    () => activeStudents.filter((s) => !officeStudentHasTeacher(s)).length,
    [activeStudents],
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
    ...(withdrawnCount > 0 ? [{ id: 'withdrawn' as const, label: `Withdrawn (${withdrawnCount})` }] : []),
    ...(graduatedCount > 0 ? [{ id: 'graduated' as const, label: `Graduated (${graduatedCount})` }] : []),
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
          description="Add students one at a time, or import a spreadsheet."
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
          Download spreadsheet
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
                  selectedStudentId === s.id && 'bg-teal-50/80 dark:bg-teal-950/30',
                )}
                onClick={(event) => handleSelectableRowClick(event, () => openStudent(s))}
              >
                <td className="px-4 py-3 font-medium">
                  {getOfficeStudentLabel(s)} {s.lastName}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  {s.classId ? (
                    <OfficeEntityLink
                      kind="class"
                      id={s.classId}
                      label={classNameById.get(s.classId) ?? 'Class'}
                      muted
                    />
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {getTeacherIds(s).length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {getTeacherIds(s).map((tId: string) => (
                        <OfficeEntityLink
                          key={tId}
                          kind="teacher"
                          id={tId}
                          label={teacherNameById.get(tId) ?? 'Teacher'}
                          muted
                        />
                      ))}
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                  {billingAccountForStudent(billingAccounts, s.id)?.familyName ?? '—'}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  {gradedForTerm.has(s.id) ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                      Graded
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden />
                      Not yet
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
              ? 'No students yet. Add students or import a spreadsheet.'
              : 'No students match your filters.'}
          </p>
        ) : null}
      </div>
    </div>
  );
}
