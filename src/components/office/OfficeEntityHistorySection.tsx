'use client';

import { useState } from 'react';
import { ChevronDown, History } from 'lucide-react';
import { OfficeHistoryEntryRow } from '@/components/office/OfficeHistoryEntryRow';
import { useOfficeEntityHistory } from '@/lib/office/useOfficeEntityHistory';
import { useOfficeHistoryNames } from '@/lib/office/useOfficeHistoryNames';
import { cn } from '@/lib/utils';

type OfficeEntityHistorySectionProps = {
  schoolId: string;
  entityId: string | null;
};

/** Collapsed "History" block for a profile card; loads only when opened. */
export function OfficeEntityHistorySection({ schoolId, entityId }: OfficeEntityHistorySectionProps) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(10);
  const { entries, isLoading } = useOfficeEntityHistory(schoolId, entityId, open);
  const nameFor = useOfficeHistoryNames(schoolId);

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <History className="h-3.5 w-3.5" aria-hidden />
        History
        <ChevronDown className={cn('ml-auto h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open ? (
        isLoading ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">No changes recorded yet.</p>
        ) : (
          <>
            <ul className="mt-1 space-y-1.5">
              {entries.slice(0, shown).map((entry) => (
                <OfficeHistoryEntryRow key={entry.id} entry={entry} showDate compact nameFor={nameFor} />
              ))}
            </ul>
            {entries.length > shown ? (
              <button
                type="button"
                onClick={() => setShown((n) => n + 20)}
                className="mt-2 px-1 text-xs font-medium text-teal-800 hover:underline dark:text-teal-300"
              >
                Show older changes
              </button>
            ) : null}
          </>
        )
      ) : null}
    </section>
  );
}
