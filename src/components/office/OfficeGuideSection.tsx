'use client';

import Link from 'next/link';
import { Info } from 'lucide-react';
import { useOfficePortalChrome } from '@/components/office/OfficePortalChrome';
import { getOfficeNavItems } from '@/lib/office/officeNav';
import { useOfficePageTips } from '@/lib/office/useOfficePageTips';

/** Handy things that aren't obvious from the menu. */
const TIPS = [
  'Search (top bar) finds any student, family, or invoice by name.',
  'Interface (the sliders button) lets you hide menu sections you don’t use and switch to a wide layout.',
  'Nothing is ever erased. Anything removed stays in Reports → Change history, with who did it and when.',
  'Most pages keep extra actions in the ⋯ menu so the screen stays simple.',
];

/**
 * Help → Guide: what every page is for (the same text as each page's first-visit tip), with links,
 * plus a few tips. Replaces the old Office guide card.
 */
export function OfficeGuidePanel({ schoolId, onNavigate }: { schoolId: string | null; onNavigate: () => void }) {
  const { settings } = useOfficePortalChrome();
  const { showAllAgain } = useOfficePageTips();
  const pages = getOfficeNavItems(settings);

  return (
    <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
      <p className="text-sm text-muted-foreground">
        The School Office keeps your school&apos;s records in one place: students and families, classes and teachers,
        grades, attendance, bills, and more.
      </p>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Pages</h3>
        <ul className="mt-2 space-y-1">
          {pages.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Link
                  href={schoolId ? item.href(schoolId) : '#'}
                  onClick={onNavigate}
                  className="flex gap-3 rounded-xl px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-300" aria-hidden />
                  <span>
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">{item.explainer}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Good to know</h3>
        <ul className="mt-2 space-y-2">
          {TIPS.map((tip) => (
            <li key={tip} className="flex gap-2 text-sm">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-300" aria-hidden />
              {tip}
            </li>
          ))}
        </ul>
      </section>

      <button
        type="button"
        onClick={() => {
          showAllAgain();
          onNavigate();
        }}
        className="text-xs font-medium text-teal-800 hover:underline dark:text-teal-300"
      >
        Show the tip at the top of each page again
      </button>
    </div>
  );
}
