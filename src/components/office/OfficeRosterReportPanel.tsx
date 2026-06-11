'use client';

import { useMemo, useState } from 'react';
import { downloadCsv, getOfficeStudentFullName, getOfficeTeacherLabel } from '@/lib/office/officeUtils';
import { OfficeSearchInput } from '@/components/office/OfficeSearchInput';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { OfficeClass, OfficeFamily, OfficeStudent, OfficeTeacher } from '@/lib/office/types';
import { safeString } from '@/lib/safeDisplayValue';

type OfficeRosterReportPanelProps = {
  schoolId: string;
  students: OfficeStudent[];
  families: OfficeFamily[];
  classes: OfficeClass[];
  teachers: OfficeTeacher[];
  classNameById: Map<string, string>;
  teacherNameById: Map<string, string>;
};

export function OfficeRosterReportPanel({
  schoolId,
  students,
  families,
  classNameById,
  teacherNameById,
}: OfficeRosterReportPanelProps) {
  const { toast } = useToast();
  const [query, setQuery] = useState('');

  const familyNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of families) map.set(f.id, safeString(f.displayName));
    return map;
  }, [families]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const family = s.familyId ? familyNameById.get(s.familyId) : '';
      const hay = [
        getOfficeStudentFullName(s),
        classNameById.get(s.classId ?? ''),
        getOfficeTeacherLabel(s, teacherNameById),
        safeString(s.busRoute),
        safeString(s.notes),
        family,
      ]
        .map((x) => safeString(x).toLowerCase())
        .join(' ');
      return hay.includes(q);
    });
  }, [students, query, classNameById, teacherNameById, familyNameById]);

  const exportCsv = () => {
    const rows = filtered.map((s) => [
      getOfficeStudentFullName(s),
      safeString(s.classId ? classNameById.get(s.classId) : ''),
      getOfficeTeacherLabel(s, teacherNameById),
      safeString(s.familyId ? familyNameById.get(s.familyId) : ''),
      safeString(s.busRoute),
      safeString(s.notes),
    ]);
    downloadCsv(`office-roster-report-${schoolId}.csv`, ['Student', 'Class', 'Teacher', 'Family', 'Bus', 'Notes'], rows);
    toast({ title: 'Roster exported', description: `${rows.length} students.` });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <OfficeSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search name, class, bus, family, notes…"
          className="max-w-md"
        />
        <Button type="button" variant="outline" className="rounded-xl" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} students in this view.</p>
    </div>
  );
}
