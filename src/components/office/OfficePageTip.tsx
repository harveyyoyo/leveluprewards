'use client';

import { Info } from 'lucide-react';
import type { OfficeNavItem } from '@/lib/office/officeNav';
import { useOfficePageTips } from '@/lib/office/useOfficePageTips';

/** First-visit, one-line "what is this page?" note. "Got it" hides it; Help → Guide can bring tips back. */
export function OfficePageTip({ item }: { item: OfficeNavItem | undefined }) {
  const { isTipVisible, dismiss } = useOfficePageTips();
  if (!item || !isTipVisible(item.id)) return null;

  return (
    <div
      role="note"
      className="mb-4 flex items-start gap-3 rounded-2xl bg-teal-50/70 px-4 py-3 text-sm text-teal-950 ring-1 ring-teal-200/60 dark:bg-teal-950/30 dark:text-teal-100 dark:ring-teal-900/40"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-300" aria-hidden />
      <p className="min-w-0 flex-1">
        <span className="font-medium">{item.label}:</span> {item.explainer}
      </p>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        className="shrink-0 rounded-lg px-2 py-0.5 text-xs font-medium text-teal-800 hover:bg-teal-100 dark:text-teal-200 dark:hover:bg-teal-900/50"
      >
        Got it
      </button>
    </div>
  );
}
