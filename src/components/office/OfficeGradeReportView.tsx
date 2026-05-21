'use client';

import { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { OfficeGradeEntry } from '@/lib/office/types';
import { downloadCsv, formatGradeDisplay } from '@/lib/office/officeUtils';
import { useOfficeTerm } from '@/lib/office/useOfficeTerm';

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
  const { term: activeTerm } = useOfficeTerm(schoolId);
  const [term, setTerm] = useState(activeTerm);

  const terms = useMemo(() => {
    const set = new Set(entries.map((e) => e.termLabel));
    if (activeTerm) set.add(activeTerm);
    return Array.from(set).sort();
  }, [entries, activeTerm]);

  const rows = useMemo(() => {
    return entries
      .filter((e) => e.termLabel === term)
      .slice()
      .sort((a, b) => {
        const sa = studentLabelById.get(a.studentId) ?? '';
        const sb = studentLabelById.get(b.studentId) ?? '';
        if (sa !== sb) return sa.localeCompare(sb);
        return a.subject.localeCompare(b.subject);
      });
  }, [entries, term, studentLabelById]);

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

      <article className="rounded-2xl border bg-white p-6 shadow-sm print:border-0 print:shadow-none print:p-0 dark:bg-slate-900 dark:border-slate-800">
        <header className="border-b pb-4 mb-4 print:mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-800 dark:text-teal-300">School Office</p>
          <h1 className="text-xl font-bold mt-1">{displaySchool}</h1>
          <p className="text-sm text-muted-foreground mt-1">Term: {term}</p>
        </header>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No grades recorded for this term.</p>
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
