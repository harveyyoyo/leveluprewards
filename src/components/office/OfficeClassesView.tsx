'use client';

import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { OfficeClass, OfficeStudent } from '@/lib/office/types';
import { getOfficeStudentLabel } from '@/lib/office/officeUtils';
import { OfficeSearchInput } from '@/components/office/OfficeSearchInput';
import { cn } from '@/lib/utils';

type OfficeClassesViewProps = {
  students: OfficeStudent[];
  classes: OfficeClass[];
  isLoading: boolean;
  onSelectStudent?: (student: OfficeStudent) => void;
};

export function OfficeClassesView({ students, classes, isLoading, onSelectStudent }: OfficeClassesViewProps) {
  const [query, setQuery] = useState('');
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const byClass = new Map<string, OfficeStudent[]>();
    const unassigned: OfficeStudent[] = [];
    for (const s of students) {
      if (!s.classId) {
        unassigned.push(s);
        continue;
      }
      const list = byClass.get(s.classId) ?? [];
      list.push(s);
      byClass.set(s.classId, list);
    }
    const sortedClasses = classes
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({
        class: c,
        students: (byClass.get(c.id) ?? []).sort((a, b) => {
          const ln = a.lastName.localeCompare(b.lastName);
          if (ln !== 0) return ln;
          return getOfficeStudentLabel(a).localeCompare(getOfficeStudentLabel(b));
        }),
      }));
    if (unassigned.length) {
      sortedClasses.push({
        class: { id: '__unassigned__', name: 'Unassigned', updatedAt: 0 },
        students: unassigned.sort((a, b) => a.lastName.localeCompare(b.lastName)),
      });
    }
    return sortedClasses;
  }, [students, classes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return grouped;
    return grouped
      .map(({ class: cls, students: list }) => ({
        class: cls,
        students: list.filter((s) => {
          const label = `${getOfficeStudentLabel(s)} ${s.lastName}`.toLowerCase();
          return label.includes(q) || cls.name.toLowerCase().includes(q);
        }),
      }))
      .filter(({ class: cls, students: list }) => cls.name.toLowerCase().includes(q) || list.length > 0);
  }, [grouped, query]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading classes…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Browse office students by class. Click a name to open their profile.
      </p>
      <OfficeSearchInput value={query} onChange={setQuery} placeholder="Search class or student…" />

      <div className="space-y-2">
        {filtered.map(({ class: cls, students: list }) => {
          const open = expandedClassId === cls.id;
          return (
            <div key={cls.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                onClick={() => setExpandedClassId(open ? null : cls.id)}
              >
                <span>
                  <span className="font-semibold text-foreground">{cls.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">{list.length} students</span>
                </span>
                <ChevronRight className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
              </button>
              {open ? (
                <ul className="border-t divide-y dark:divide-slate-800">
                  {list.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-teal-50/80 dark:hover:bg-teal-950/30"
                        onClick={() => onSelectStudent?.(s)}
                      >
                        {getOfficeStudentLabel(s)} {s.lastName}
                      </button>
                    </li>
                  ))}
                  {list.length === 0 ? (
                    <li className="px-4 py-3 text-sm text-muted-foreground">No students in this class.</li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          );
        })}
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No classes match your search.
          </p>
        ) : null}
      </div>
    </div>
  );
}
