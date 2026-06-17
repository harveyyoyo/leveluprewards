'use client';

import { useMemo, useState } from 'react';
import { OfficeSearchInput } from '@/components/office/OfficeSearchInput';
import type { OfficeAuditLogEntry } from '@/lib/office/types';
import { safeString } from '@/lib/safeDisplayValue';

type OfficeAuditLogPanelProps = {
  entries: OfficeAuditLogEntry[];
};

export function OfficeAuditLogPanel({ entries }: OfficeAuditLogPanelProps) {
  const [query, setQuery] = useState('');

  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.changedAt - a.changedAt),
    [entries],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted.slice(0, 100);
    return sorted
      .filter((e) => {
        const hay = [
          e.summary,
          e.entityType,
          e.entityId,
          e.action,
          e.changedBy,
          JSON.stringify(e.after ?? {}),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 100);
  }, [sorted, query]);

  return (
    <div className="space-y-4">
      <OfficeSearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search changes, users, entity ids…"
        className="max-w-md"
      />
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No change history yet.</p>
        ) : (
          filtered.map((e) => (
            <div key={e.id} className="rounded-xl border px-3 py-2 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{e.summary}</p>
                <time className="text-xs text-muted-foreground">
                  {new Date(e.changedAt).toLocaleString()}
                </time>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {e.action} · {e.entityType} · {safeString(e.changedBy) || 'Unknown user'}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
