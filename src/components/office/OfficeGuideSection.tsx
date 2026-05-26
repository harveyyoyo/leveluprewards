'use client';

import { BookOpen, ChevronDown, GraduationCap, LayoutGrid, Sparkles, Users } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type GuideItem = {
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
};

const GUIDE_SECTIONS: GuideItem[] = [
  {
    icon: LayoutGrid,
    title: 'Start here',
    body: 'Use Home for a quick snapshot. Set your working term from the dropdown (top of Home or Grades). That term drives missing-grade counts and report filters. Each staff member keeps their own working term in this browser.',
  },
  {
    icon: Users,
    title: 'Roster',
    body: 'Students, classes, and homeroom teachers live only in School Office (not the rewards arcade). Add teachers first, assign each student on Students, group by class on Classes, or import a CSV. AI import in Settings can read messy spreadsheets and figure out classes, students, teachers, grades, and billing together.',
  },
  {
    icon: GraduationCap,
    title: 'Grades & terms',
    body: 'Terms are labels like Fall 2026 — not a separate calendar you must build first. Add terms under Settings → School terms, pick one as default for new staff, or create a term automatically when you save a grade. Print family summaries from Reports.',
  },
  {
    icon: BookOpen,
    title: 'Billing',
    body: 'Create a billing family, link students, then add invoices. Mark payments when money is received outside the app. Filter overdue and due-soon from Billing chips or Home attention items.',
  },
  {
    icon: Sparkles,
    title: 'Layout & staff',
    body: 'Use the expand button in the page header for wide full-screen layout, or the centered view for a narrower column. Office staff accounts sign in here with username + passcode. Copy the sign-in link in Settings to share with your team.',
  },
];

export function OfficeGuideSection() {
  const [open, setOpen] = useState(true);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-base font-bold">
          <BookOpen className="h-4 w-4 text-teal-700" />
          Office guide
        </span>
        <ChevronDown
          className={cn('h-5 w-5 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>
      {open ? (
        <div className="space-y-4 border-t border-slate-100 px-5 pb-5 pt-4 dark:border-slate-800">
          <p className="text-sm text-muted-foreground">
            School Office is for front-desk grades and billing. This is separate from student rewards, points, and
            the prize shop.
          </p>
          <ul className="space-y-3">
            {GUIDE_SECTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="flex gap-3 rounded-xl bg-slate-50/80 p-3 dark:bg-slate-800/50">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
