'use client';

import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { OfficeSearchInput } from '@/components/office/OfficeSearchInput';
import { OfficeStudentSheet } from '@/components/office/OfficeStudentSheet';
import { OfficeRosterManager } from '@/components/office/OfficeRosterManager';
import type { OfficeBillingAccount, OfficeClass, OfficeGradeEntry, OfficeStudent } from '@/lib/office/types';
import { getOfficeStudentFullName, getOfficeStudentLabel } from '@/lib/office/officeUtils';
import { cn } from '@/lib/utils';

type OfficeStudentsViewProps = {
  schoolId: string;
  students: OfficeStudent[];
  classes: OfficeClass[];
  classNameById: Map<string, string>;
  gradeEntries: OfficeGradeEntry[];
  billingAccounts: OfficeBillingAccount[];
  activeTerm: string;
  isLoading: boolean;
};

export function OfficeStudentsView({
  schoolId,
  students,
  classes,
  classNameById,
  gradeEntries,
  billingAccounts,
  activeTerm,
  isLoading,
}: OfficeStudentsViewProps) {
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [selected, setSelected] = useState<OfficeStudent | null>(null);

  const classOptions = useMemo(() => {
    return classes.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [classes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (classFilter !== 'all' && s.classId !== classFilter) return false;
      if (!q) return true;
      const label = getOfficeStudentFullName(s).toLowerCase();
      const cls = (s.classId && classNameById.get(s.classId))?.toLowerCase() ?? '';
      return label.includes(q) || cls.includes(q);
    });
  }, [students, query, classFilter, classNameById]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading roster…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Office roster is separate from rewards arcade students. Add students here or import once from rewards (admin).
      </p>
      <OfficeRosterManager schoolId={schoolId} classes={classes} />
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
              {classOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground dark:bg-slate-800/50">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3 hidden sm:table-cell">Class</th>
              <th className="px-4 py-3 hidden md:table-cell">Teacher</th>
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
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{s.teacherName || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {students.length === 0
              ? 'No office students yet. Add students or import from rewards (admin).'
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
      />
    </div>
  );
}
