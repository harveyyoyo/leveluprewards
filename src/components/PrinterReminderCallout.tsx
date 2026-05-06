'use client';

import { Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Staff-facing note when choosing a printer (browsers cannot select a device programmatically). */
export function PrinterReminderCallout({
    title,
    message,
    className,
}: {
    title: string;
    message?: string | null;
    className?: string;
}) {
    const m = (message ?? '').trim();
    if (!m) return null;
    return (
        <div
            role="note"
            className={cn(
                'rounded-xl border border-amber-200/90 bg-amber-50/95 dark:bg-amber-950/35 dark:border-amber-800/60 px-3 py-2.5 text-sm text-amber-950 dark:text-amber-50 flex gap-3 items-start shadow-sm',
                className,
            )}
        >
            <Printer className="h-4 w-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" aria-hidden />
            <div className="min-w-0 space-y-0.5">
                <p className="font-bold text-[11px] uppercase tracking-wide text-amber-900 dark:text-amber-200">{title}</p>
                <p className="text-sm leading-snug text-amber-950/95 dark:text-amber-50/95">{m}</p>
            </div>
        </div>
    );
}
