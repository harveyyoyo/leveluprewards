'use client';

import { useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { OfficeSearchInput } from '@/components/office/OfficeSearchInput';
import { OfficeHistoryEntryRow } from '@/components/office/OfficeHistoryEntryRow';
import { useOfficeEntityNav } from '@/components/office/OfficeEntityNavProvider';
import { useOfficeHistory } from '@/lib/office/useOfficeHistory';
import { useOfficeHistoryNames } from '@/lib/office/useOfficeHistoryNames';
import {
  OFFICE_HISTORY_GROUPS,
  officeHistoryDayLabel,
  officeHistoryGroup,
  type OfficeHistoryGroup,
} from '@/lib/office/officeHistoryLabels';
import type { OfficeAuditLogEntry } from '@/lib/office/types';
import { safeString } from '@/lib/safeDisplayValue';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 200;

type OfficeHistoryViewProps = {
  schoolId: string;
  /** Ids of records that still exist, so "Open" only shows when there is something to open. */
  studentIds: Set<string>;
  teacherIds: Set<string>;
  classIds: Set<string>;
};

/** School-wide, read-only history of every Office change, newest first. */
export function OfficeHistoryView({ schoolId, studentIds, teacherIds, classIds }: OfficeHistoryViewProps) {
  const [maxEntries, setMaxEntries] = useState(PAGE_SIZE);
  const [group, setGroup] = useState<OfficeHistoryGroup>('all');
  const [search, setSearch] = useState('');
  const { entries, isLoading, error, mayHaveMore } = useOfficeHistory(schoolId, maxEntries);
  const { openStudent, openTeacher, openClass } = useOfficeEntityNav();
  const nameFor = useOfficeHistoryNames(schoolId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (group !== 'all' && officeHistoryGroup(e) !== group) return false;
      if (!q) return true;
      return [e.summary, safeString(e.changedBy)].join(' ').toLowerCase().includes(q);
    });
  }, [entries, group, search]);

  const byDay = useMemo(() => {
    const days: Array<{ label: string; items: OfficeAuditLogEntry[] }> = [];
    for (const entry of filtered) {
      const label = officeHistoryDayLabel(entry.changedAt);
      const last = days[days.length - 1];
      if (last && last.label === label) last.items.push(entry);
      else days.push({ label, items: [entry] });
    }
    return days;
  }, [filtered]);

  const openerFor = (entry: OfficeAuditLogEntry): (() => void) | undefined => {
    if ((entry.entityType === 'officeStudent' || entry.entityType === 'officeDeskLog') && studentIds.has(entry.entityId)) {
      return () => openStudent(entry.entityId);
    }
    if (entry.entityType === 'officeTeacher' && teacherIds.has(entry.entityId)) return () => openTeacher(entry.entityId);
    if (entry.entityType === 'officeClass' && classIds.has(entry.entityId)) return () => openClass(entry.entityId);
    return undefined;
  };

  return (
    <section className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h3 className="text-base font-bold">Change history</h3>
        <p className="text-sm text-muted-foreground">
          Every change made in the office, who made it, and when. Nothing here can be edited or erased.
        </p>
      </div>

      <OfficeSearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by name, invoice, or staff member…"
        aria-label="Search history"
        className="max-w-md"
      />

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show changes to">
        {OFFICE_HISTORY_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGroup(g.id)}
            aria-pressed={group === g.id}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              group === g.id
                ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
            )}
          >
            {g.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          The history couldn&apos;t be loaded right now. Please try again in a moment.
        </p>
      ) : isLoading && entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading history…</p>
      ) : byDay.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <History className="h-6 w-6 text-teal-700" aria-hidden />
          <p className="text-sm font-medium">{entries.length === 0 ? 'No changes yet' : 'Nothing matches'}</p>
          <p className="text-xs text-muted-foreground">
            {entries.length === 0
              ? 'Changes will appear here as soon as anyone adds or edits something.'
              : 'Try a different search or pick “Everything”.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {byDay.map((day) => (
            <div key={day.label}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day.label}</p>
              <ul className="space-y-1.5">
                {day.items.map((entry) => (
                  <OfficeHistoryEntryRow key={entry.id} entry={entry} onOpen={openerFor(entry)} nameFor={nameFor} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {mayHaveMore && !error ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setMaxEntries((n) => n + PAGE_SIZE)}
            disabled={isLoading}
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {isLoading ? 'Loading…' : 'Show older changes'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
