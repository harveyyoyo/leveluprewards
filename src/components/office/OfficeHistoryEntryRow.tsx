'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { OfficeAuditLogEntry } from '@/lib/office/types';
import {
  officeHistoryActionLabel,
  officeHistoryChanges,
  type OfficeHistoryNameLookup,
} from '@/lib/office/officeHistoryLabels';
import { safeString } from '@/lib/safeDisplayValue';
import { cn } from '@/lib/utils';

type OfficeHistoryEntryRowProps = {
  entry: OfficeAuditLogEntry;
  /** Show the date as well as the time (the full History page groups rows by day instead). */
  showDate?: boolean;
  /** Optional link to open the record this entry is about. */
  onOpen?: () => void;
  compact?: boolean;
  nameFor?: OfficeHistoryNameLookup;
};

/** One change-history line: what happened, who, when — with the field-by-field detail tucked away. */
export function OfficeHistoryEntryRow({ entry, showDate, onOpen, compact, nameFor }: OfficeHistoryEntryRowProps) {
  const [open, setOpen] = useState(false);
  const changes = officeHistoryChanges(entry, nameFor);
  const when = new Date(entry.changedAt);
  const whenLabel = showDate
    ? when.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const action = officeHistoryActionLabel(entry);

  return (
    <li className={cn('rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900', compact ? 'px-2.5 py-2' : 'px-3.5 py-2.5')}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
            action === 'Added' && 'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200',
            action === 'Changed' && 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
            action === 'Removed' && 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
          )}
        >
          {action}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('font-medium leading-snug', compact ? 'text-xs' : 'text-sm')}>{entry.summary}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {whenLabel}
            {' · '}
            {safeString(entry.changedBy) || 'Unknown staff member'}
          </p>
          {open && changes.length > 0 ? (
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/60">
              {changes.map((c) => (
                <div key={c.field} className="contents">
                  <dt className="text-muted-foreground">{c.field}</dt>
                  <dd className="min-w-0 break-words">
                    {entry.before ? (
                      <>
                        <span className="text-muted-foreground line-through decoration-slate-300">{c.before}</span>
                        <span className="mx-1.5 text-muted-foreground">→</span>
                      </>
                    ) : null}
                    <span className="font-medium">{c.after}</span>
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onOpen ? (
            <button
              type="button"
              onClick={onOpen}
              className="rounded-lg px-2 py-1 text-xs font-medium text-teal-800 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/40"
            >
              Open
            </button>
          ) : null}
          {changes.length > 0 ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? 'Hide details' : 'Show details'}
              className="rounded-lg p-1 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
