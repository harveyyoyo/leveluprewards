'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { OfficeAssistantBanner } from '@/components/office/OfficeAssistantBanner';
import { useOfficeUrlSync } from '@/lib/office/useOfficeUrlSync';
import { findClassByAskedName } from '@/lib/office/officeAssistantView';
import { useReportOfficeAssistantResults } from '@/lib/office/officeAssistantResults';
import {
  filterOfficeStudents,
  officeFailingStudentIds,
  officeStudentsListReport,
  type OfficeRosterFilter,
} from '@/lib/office/officeAssistantLists';
import { ArrowDown, ArrowUp, Download, MoreHorizontal, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

/** Column heading that sorts the list when clicked (replaces a separate Sort box). */
function SortHeader({
  label,
  active,
  descending,
  onClick,
}: {
  label: string;
  active: boolean;
  descending?: boolean;
  onClick: () => void;
}) {
  const Arrow = descending ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('inline-flex items-center gap-1 hover:text-foreground', active && 'text-foreground')}
      aria-label={`Sort by ${label.toLowerCase()}`}
    >
      {label}
      {active ? <Arrow className="h-3 w-3" aria-hidden /> : null}
    </button>
  );
}
type RosterFilter = OfficeRosterFilter;

const ROSTER_FILTERS: RosterFilter[] = [
  'missing-grades',
  'failing',
  'no-billing',
  'unassigned',
  'no-teacher',
  'no-family',
  'allergies',
  'withdrawn',
  'graduated',
];

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
  families = [],
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
  const importRef = useRef<(() => void) | null>(null);
  // Set when Help → Ask opened this page with a list (e.g. students living in Brooklyn).
  const [askLabel, setAskLabel] = useState('');
  const [addressText, setAddressText] = useState('');
  const [teacherText, setTeacherText] = useState('');
  // "Last name starts with L" from Help → Ask.
  const [lastStarts, setLastStarts] = useState('');
  const [firstStarts, setFirstStarts] = useState('');
  /** 1–12, from "birthdays in March". */
  const [birthMonth, setBirthMonth] = useState<number | null>(null);
  /** The students a Help answer was about (from reading records). */
  const [idsFilter, setIdsFilter] = useState<Set<string> | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const familyById = useMemo(() => new Map(families.map((f) => [f.id, f])), [families]);

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

  const failingForTerm = useMemo(() => officeFailingStudentIds(gradeEntries, activeTerm), [gradeEntries, activeTerm]);
  const failingCount = activeStudents.filter((s) => failingForTerm.has(s.id)).length;
  const missingGradesCount = activeStudents.length - activeStudents.filter((s) => gradedForTerm.has(s.id)).length;
  const noBillingCount = useMemo(
    () => activeStudents.filter((s) => !billingAccountForStudent(billingAccounts, s.id)).length,
    [activeStudents, billingAccounts],
  );

  const filtered = useMemo(() => {
    const list = filterOfficeStudents(
      students,
      {
        rosterFilter,
        classFilter,
        homeroomFilter,
        query,
        teacherText,
        addressText,
        lastStarts,
        firstStarts,
        birthMonth,
        idsFilter,
      },
      { classNameById, teacherNameById, gradedForTerm, failingForTerm, billingAccounts, familyById },
    );
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
    query,
    classFilter,
    homeroomFilter,
    rosterFilter,
    sortBy,
    classNameById,
    teacherNameById,
    gradedForTerm,
    failingForTerm,
    billingAccounts,
    teacherText,
    addressText,
    familyById,
    lastStarts,
    firstStarts,
    birthMonth,
    idsFilter,
  ]);

  useEffect(() => {
    const f = searchParams.get('filter')?.trim();
    if (f && (ROSTER_FILTERS as string[]).includes(f)) {
      setRosterFilter(f as RosterFilter);
      if (f === 'unassigned') setClassFilter('__unassigned__');
    }
  }, [searchParams]);

  // A list opened from Help → Ask. Applied once per question, after the roster has loaded.
  const appliedAskAt = useRef<string | null>(null);
  const pendingAskClass = useRef<string | null>(null);
  const [reportAskAt, setReportAskAt] = useState<string | null>(null);
  useEffect(() => {
    const askAt = searchParams.get('askAt');
    const ask = searchParams.get('ask')?.trim();
    if (isLoading || !askAt || !ask || appliedAskAt.current === askAt) return;
    appliedAskAt.current = askAt;
    const f = searchParams.get('filter')?.trim() ?? '';
    const cls = findClassByAskedName(classes, searchParams.get('className'));
    setReportAskAt(askAt);
    setAskLabel(ask);
    setQuery(searchParams.get('q')?.trim() ?? '');
    setTeacherText(searchParams.get('teacher')?.trim() ?? '');
    setAddressText(searchParams.get('address')?.trim() ?? '');
    setLastStarts(searchParams.get('lastStarts')?.trim() ?? '');
    setFirstStarts(searchParams.get('firstStarts')?.trim() ?? '');
    const month = Number(searchParams.get('birthMonth'));
    setBirthMonth(Number.isInteger(month) && month >= 1 && month <= 12 ? month : null);
    const ids = searchParams.get('ids');
    setIdsFilter(ids ? new Set(ids.split(',').filter(Boolean)) : null);
    setHomeroomFilter('all');
    setRosterFilter((ROSTER_FILTERS as string[]).includes(f) ? (f as RosterFilter) : 'all');
    setClassFilter(f === 'unassigned' ? '__unassigned__' : cls ? cls.id : 'all');
    // The class list can arrive a moment after the page first shows; pick the class up then.
    const askedClass = searchParams.get('className')?.trim();
    pendingAskClass.current = !cls && askedClass && f !== 'unassigned' ? askedClass : null;
  }, [searchParams, classes, isLoading]);

  useEffect(() => {
    const cls = findClassByAskedName(classes, pendingAskClass.current);
    if (!cls) return;
    pendingAskClass.current = null;
    setClassFilter(cls.id);
  }, [classes]);

  // Tell the Help chat what this list shows, so it can answer with the same names.
  useReportOfficeAssistantResults(reportAskAt, !isLoading, () =>
    officeStudentsListReport(filtered, classNameById, birthMonth),
  );

  const clearAll = () => {
    setReportAskAt(null);
    setAskLabel('');
    setQuery('');
    setTeacherText('');
    setAddressText('');
    setLastStarts('');
    setFirstStarts('');
    setBirthMonth(null);
    setIdsFilter(null);
    setRosterFilter('all');
    setClassFilter('all');
    setHomeroomFilter('all');
    router.replace(pathname, { scroll: false });
  };

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
  const noFamilyCount = useMemo(() => activeStudents.filter((s) => !s.familyId).length, [activeStudents]);
  const allergiesCount = useMemo(() => activeStudents.filter((s) => !!s.allergies?.trim()).length, [activeStudents]);

  const rosterFilterOptions: { id: RosterFilter; label: string }[] = [
    { id: 'all', label: 'All students' },
    ...(missingGradesCount > 0
      ? [{ id: 'missing-grades' as const, label: `Missing grades (${missingGradesCount})` }]
      : []),
    ...(failingCount > 0 ? [{ id: 'failing' as const, label: `Failing a subject (${failingCount})` }] : []),
    ...(noBillingCount > 0 ? [{ id: 'no-billing' as const, label: `No billing (${noBillingCount})` }] : []),
    ...(unassignedCount > 0 ? [{ id: 'unassigned' as const, label: `No class (${unassignedCount})` }] : []),
    ...(noTeacherCount > 0
      ? [{ id: 'no-teacher' as const, label: `No teacher (${noTeacherCount})` }]
      : []),
    ...(noFamilyCount > 0 ? [{ id: 'no-family' as const, label: `No family (${noFamilyCount})` }] : []),
    ...(allergiesCount > 0 ? [{ id: 'allergies' as const, label: `Has allergies (${allergiesCount})` }] : []),
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
          title="No students yet"
          description="Add students one at a time, or import a spreadsheet."
        />
        <OfficeRosterManager schoolId={schoolId} classes={classes} teachers={teachers} />
      </div>
    );
  }

  const isFiltered =
    rosterFilter !== 'all' ||
    classFilter !== 'all' ||
    homeroomFilter !== 'all' ||
    !!query.trim() ||
    !!teacherText.trim() ||
    !!addressText.trim() ||
    !!lastStarts ||
    !!firstStarts ||
    !!birthMonth ||
    !!idsFilter;

  return (
    <div className="space-y-3">
      {askLabel ? <OfficeAssistantBanner label={askLabel} onClear={clearAll} /> : null}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {filtered.length === students.length
              ? `${students.length} student${students.length === 1 ? '' : 's'}`
              : `${filtered.length} of ${students.length} students`}
          </span>
          {isFiltered ? (
            <button
              type="button"
              className="text-xs font-medium text-teal-800 hover:underline dark:text-teal-300"
              onClick={clearAll}
            >
              Clear
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="icon" className="h-10 w-10 rounded-xl" aria-label="More options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-xl">
              <DropdownMenuItem onSelect={() => importRef.current?.()}>
                <Upload className="mr-2 h-4 w-4" />
                Import from a spreadsheet
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  exportOfficeStudentsCsv(schoolId, filtered, classNameById, teacherNameById);
                  toast({ title: 'Spreadsheet downloaded', description: `${filtered.length} students.` });
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Download this list
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <OfficeRosterManager schoolId={schoolId} classes={classes} teachers={teachers} importRef={importRef} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <OfficeSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search students…"
          className="basis-full sm:basis-auto sm:min-w-[12rem] sm:flex-1"
        />
        <Select
          value={rosterFilter}
          onValueChange={(v) => {
            const next = v as RosterFilter;
            setRosterFilter(next);
            if (next === 'unassigned') setClassFilter('__unassigned__');
            else if (classFilter === '__unassigned__') setClassFilter('all');
          }}
        >
          <SelectTrigger className="h-10 min-w-0 flex-1 rounded-xl sm:w-44 sm:flex-none" aria-label="Show">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {rosterFilterOptions.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="h-10 min-w-0 flex-1 rounded-xl sm:w-40 sm:flex-none" aria-label="Class">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {unassignedCount > 0 ? <SelectItem value="__unassigned__">No class ({unassignedCount})</SelectItem> : null}
            {classOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium text-muted-foreground dark:border-slate-800">
              <th className="px-4 py-2.5">
                <SortHeader
                  label="Student"
                  active={sortBy === 'name-asc' || sortBy === 'name-desc'}
                  descending={sortBy === 'name-desc'}
                  onClick={() => setSortBy(sortBy === 'name-asc' ? 'name-desc' : 'name-asc')}
                />
              </th>
              <th className="px-4 py-2.5 hidden sm:table-cell">
                <SortHeader label="Class" active={sortBy === 'class'} onClick={() => setSortBy('class')} />
              </th>
              <th className="px-4 py-2.5 hidden md:table-cell">Teacher</th>
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
                    <span className="text-muted-foreground">—</span>
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
