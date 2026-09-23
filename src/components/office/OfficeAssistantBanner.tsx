'use client';

import { Sparkles, X } from 'lucide-react';

/** Shown on a page the Help assistant opened with a filtered list, e.g. "Showing: Families owing more than $100". */
export function OfficeAssistantBanner({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-xl bg-teal-50/80 px-3 py-2 text-sm text-teal-950 ring-1 ring-teal-200/60 dark:bg-teal-950/30 dark:text-teal-100 dark:ring-teal-900/40"
    >
      <Sparkles className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-300" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="text-muted-foreground">Showing:</span> <span className="font-medium">{label}</span>
      </span>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium text-teal-800 hover:bg-teal-100 dark:text-teal-200 dark:hover:bg-teal-900/50"
      >
        <X className="h-3 w-3" aria-hidden />
        Clear
      </button>
    </div>
  );
}
