'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SssSearchInput } from '@/components/sss/SssSearchInput';
import { SssSpreadsheetImportDialog } from '@/components/sss/SssSpreadsheetImportDialog';
import { SssStudentSheet } from '@/components/sss/SssStudentSheet';
import type { SssStudent } from '@/lib/sss/types';
import { exportSssStudentsCsv, getSssStudentFullName, getSssStudentLabel, sssStudentMatchesQuery } from '@/lib/sss/sssUtils';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;

export function SssStudentDatabaseView({
  schoolId,
  students,
  isLoading,
}: {
  schoolId: string;
  students: SssStudent[];
  isLoading: boolean;
}) {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'school'>('name-asc');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<SssStudent | null>(null);

  const schoolOptions = useMemo(() => {
    const set = new Set(students.map((s) => s.sourceSchool?.trim()).filter(Boolean) as string[]);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [students]);

  const filtered = useMemo(() => {
    return students
      .filter((s) => (schoolFilter === 'all' || s.sourceSchool === schoolFilter) && sssStudentMatchesQuery(s, query))
      .slice()
      .sort((a, b) => {
        if (sortBy === 'school') {
          const cmp = (a.sourceSchool ?? '').localeCompare(b.sourceSchool ?? '');
          return cmp || getSssStudentFullName(a).localeCompare(getSssStudentFullName(b));
        }
        if (sortBy === 'name-desc') return getSssStudentFullName(b).localeCompare(getSssStudentFullName(a));
        return getSssStudentFullName(a).localeCompare(getSssStudentFullName(b));
      });
  }, [students, query, schoolFilter, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading student records…</p>;

  if (students.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-dashed border-violet-300/60 bg-violet-50/40 p-10 text-center dark:border-violet-800 dark:bg-violet-950/20">
          <Database className="mx-auto h-10 w-10 text-violet-600" />
          <h2 className="mt-4 text-lg font-semibold">No students yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Import your Excel roster to get started.</p>
        </div>
        <SssSpreadsheetImportDialog schoolId={schoolId} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between">
        <SssSpreadsheetImportDialog schoolId={schoolId} />
        <Button type="button" variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => { exportSssStudentsCsv(schoolId, filtered); toast({ title: 'Exported', description: `${filtered.length} rows.` }); }}>
          <Download className="h-4 w-4" />Export spreadsheet
        </Button>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <SssSearchInput value={query} onChange={(v) => { setQuery(v); setPage(0); }} placeholder="Search…" className="flex-1" />
        <div className="space-y-1.5">
          <Label className="text-xs uppercase text-muted-foreground">School</Label>
          <Select value={schoolFilter} onValueChange={(v) => { setSchoolFilter(v); setPage(0); }}>
            <SelectTrigger className="w-48 h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All schools</SelectItem>
              {schoolOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase text-muted-foreground">Sort</Label>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-36 h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name A → Z</SelectItem>
              <SelectItem value="name-desc">Name Z → A</SelectItem>
              <SelectItem value="school">By school</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} record{filtered.length === 1 ? '' : 's'}</p>
      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm dark:bg-slate-900">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs font-bold uppercase text-muted-foreground">
              <th className="px-4 py-3">Last</th>
              <th className="px-4 py-3">First</th>
              <th className="px-4 py-3 hidden sm:table-cell">School</th>
              <th className="px-4 py-3 hidden md:table-cell">DOB</th>
              <th className="px-4 py-3 hidden lg:table-cell">Parent</th>
            </tr>
          </thead>
          <motion.tbody initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.02 } } }}>
            {pageRows.map((s) => (
              <motion.tr
                key={s.id}
                variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 32 } } }}
                className={cn('border-b cursor-pointer hover:bg-violet-50/60', selected?.id === s.id && 'bg-violet-50/80')}
                onClick={() => setSelected(s)}
              >
                <td className="px-4 py-3 font-medium">{s.lastName}</td>
                <td className="px-4 py-3">{getSssStudentLabel(s)}</td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{s.sourceSchool || '—'}</td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{s.dateOfBirth || '—'}</td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{s.parent1Name || s.parent2Name || '—'}</td>
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>
      {pageCount > 1 ? (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Page {safePage + 1} of {pageCount}</span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={safePage <= 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button type="button" variant="outline" size="sm" disabled={safePage >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      ) : null}
      <SssStudentSheet student={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}
