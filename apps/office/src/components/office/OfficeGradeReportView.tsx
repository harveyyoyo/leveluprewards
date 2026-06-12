'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { OfficeGradeEntry } from '@/lib/office/types';
import { collectOfficeTermOptions, downloadCsv, formatGradeDisplay } from '@/lib/office/officeUtils';
import { useOfficeTerm } from '@/lib/office/useOfficeTerm';
import { useOfficeSettings } from '@/lib/office/useOfficeSettings';

type OfficeGradeReportViewProps = {
  schoolId: string;
  schoolName?: string;
  entries: OfficeGradeEntry[];
  studentLabelById: Map<string, string>;
  classNameById: Map<string, string>;
};

export function OfficeGradeReportView({
  schoolId,
  schoolName,
  entries,
  studentLabelById,
  classNameById,
}: OfficeGradeReportViewProps) {
  const searchParams = useSearchParams();
  const { term: activeTerm, configuredTerms } = useOfficeTerm(schoolId);
  const { settings } = useOfficeSettings(schoolId);
  const [term, setTerm] = useState(activeTerm);
  const [classFilter, setClassFilter] = useState('all');
  const [studentFilter, setStudentFilter] = useState('all');
  const [groupByStudent, setGroupByStudent] = useState(false);

  useEffect(() => {
    setTerm(activeTerm);
  }, [activeTerm]);

  useEffect(() => {
    const sid = searchParams.get('student')?.trim();
    if (sid) {
      setStudentFilter(sid);
      setGroupByStudent(true);
    }
    const termParam = searchParams.get('term')?.trim();
    if (termParam) {
      setTerm(termParam);
    }
  }, [searchParams]);

  const terms = useMemo(
    () =>
      collectOfficeTermOptions({
        gradeEntries: entries,
        activeTerm: term,
        schoolDefaultTerm: settings?.defaultActiveTerm,
        configuredTerms,
      }),
    [entries, term, settings?.defaultActiveTerm, configuredTerms],
  );

  const classOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const e of entries) {
      if (e.classId) ids.add(e.classId);
    }
    return Array.from(ids)
      .map((id) => ({ id, name: classNameById.get(id) ?? id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entries, classNameById]);

  const rows = useMemo(() => {
    return entries
      .filter((e) => {
        if (e.termLabel !== term) return false;
        if (classFilter !== 'all' && e.classId !== classFilter) return false;
        if (studentFilter !== 'all' && e.studentId !== studentFilter) return false;
        return true;
      })
      .slice()
      .sort((a, b) => {
        const sa = studentLabelById.get(a.studentId) ?? '';
        const sb = studentLabelById.get(b.studentId) ?? '';
        if (sa !== sb) return sa.localeCompare(sb);
        return (a.subject ?? '').localeCompare(b.subject ?? '');
      });
  }, [entries, term, classFilter, studentFilter, studentLabelById]);

  const groupedByStudent = useMemo(() => {
    const map = new Map<string, OfficeGradeEntry[]>();
    for (const row of rows) {
      const list = map.get(row.studentId) ?? [];
      list.push(row);
      map.set(row.studentId, list);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const la = studentLabelById.get(a[0]) ?? '';
      const lb = studentLabelById.get(b[0]) ?? '';
      return la.localeCompare(lb);
    });
  }, [rows, studentLabelById]);

  const displaySchool = schoolName?.trim() || schoolId;

  const handleExportCsv = () => {
    const filename = `grades-${term.replace(/\s+/g, '-').toLowerCase()}-${schoolId}.csv`;
    downloadCsv(
      filename,
      ['Student', 'Class', 'Subject', 'Grade'],
      rows.map((r) => [
        studentLabelById.get(r.studentId) ?? '',
        (r.classId && classNameById.get(r.classId)) ?? '',
        r.subject,
        formatGradeDisplay(r),
      ]),
    );
  };

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between no-print">
        <div>
          <h2 className="text-lg font-bold">Grade report</h2>
          <p className="text-sm text-muted-foreground">Print a simple term summary for families or records.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Term</Label>
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger className="w-40 h-9 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {terms.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {classOptions.length > 0 ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Class</Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-36 h-9 rounded-lg">
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
          ) : null}
          <Button
            type="button"
            variant={groupByStudent ? 'default' : 'outline'}
            size="sm"
            className="rounded-lg h-9"
            onClick={() => setGroupByStudent((v) => !v)}
          >
            By student
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl gap-2"
            disabled={rows.length === 0}
            onClick={handleExportCsv}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button type="button" className="rounded-xl gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground no-print">
        {rows.length} grade {rows.length === 1 ? 'row' : 'rows'} for {term}
      </p>

      <article className="rounded-2xl border bg-white p-6 shadow-sm print:border-0 print:shadow-none print:p-0 dark:bg-slate-900 dark:border-slate-800">
        <header className="border-b pb-4 mb-4 print:mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-800 dark:text-teal-300">School Office</p>
          <h1 className="text-xl font-bold mt-1">{displaySchool}</h1>
          <p className="text-sm text-muted-foreground mt-1">Term: {term}</p>
        </header>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No grades recorded for this term.</p>
        ) : groupByStudent ? (
          <div className="space-y-6">
            {groupedByStudent.map(([studentId, studentRows]) => (
              <section key={studentId} className="break-inside-avoid">
                <h2 className="text-sm font-bold border-b pb-1 mb-2">
                  {studentLabelById.get(studentId) ?? 'Student'}
                  <span className="ml-2 font-normal text-muted-foreground">
                    {(studentRows[0]?.classId && classNameById.get(studentRows[0].classId)) || ''}
                  </span>
                </h2>
                <ul className="space-y-1 text-sm">
                  {studentRows.map((row) => (
                    <li key={row.id} className="flex justify-between gap-4">
                      <span>{row.subject}</span>
                      <span className="font-medium">{formatGradeDisplay(row)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-bold uppercase text-muted-foreground">
                <th className="py-2 pr-3">Student</th>
                <th className="py-2 pr-3 hidden sm:table-cell">Class</th>
                <th className="py-2 pr-3">Subject</th>
                <th className="py-2">Grade</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="py-2 pr-3 font-medium">{studentLabelById.get(row.studentId) ?? '—'}</td>
                  <td className="py-2 pr-3 text-muted-foreground hidden sm:table-cell">
                    {(row.classId && classNameById.get(row.classId)) || '—'}
                  </td>
                  <td className="py-2 pr-3">{row.subject}</td>
                  <td className="py-2">{formatGradeDisplay(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-6 text-[0.625rem] text-muted-foreground print:mt-4">
          Generated from School Office · {new Date().toLocaleDateString()}
        </p>
      </article>
    </div>
  );
}
