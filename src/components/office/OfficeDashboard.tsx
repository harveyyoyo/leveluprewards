'use client';

import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutGrid,
  Plus,
  RefreshCw,
  Settings,
  Upload,
  UserRound,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OfficeEmptyState } from '@/components/office/OfficeEmptyState';
import { OfficeWorkingTermSelect } from '@/components/office/OfficeWorkingTermSelect';
import type { OfficeGradeEntry } from '@/lib/office/types';
import { formatCents } from '@/lib/office/officeNav';
import { officePublicHref } from '@/lib/officePublicUrl';
import type { OfficeDashboardInsights } from '@/lib/office/officeUtils';
import { cn } from '@/lib/utils';

type OfficeDashboardProps = {
  schoolId: string;
  studentCount: number;
  classCount: number;
  teacherCount: number;
  insights: OfficeDashboardInsights;
  studentLabelById: Map<string, string>;
  accountNameById: Map<string, string>;
  canPopulateDemoData?: boolean;
  isPopulatingDemoData?: boolean;
  onPopulateDemoData?: () => void;
  activeTerm: string;
  onActiveTermChange: (term: string) => void;
  gradeEntries?: OfficeGradeEntry[];
  schoolDefaultTerm?: string | null;
  configuredTerms?: string[];
};

type NavTile = {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
};

export function OfficeDashboard({
  schoolId,
  studentCount,
  classCount,
  teacherCount,
  insights,
  canPopulateDemoData = false,
  isPopulatingDemoData = false,
  onPopulateDemoData,
  activeTerm,
  onActiveTermChange,
  gradeEntries,
  schoolDefaultTerm,
  configuredTerms,
}: OfficeDashboardProps) {
  const gradePct =
    insights.termSubjects.length > 0
      ? insights.subjectGradeCompletionPct
      : insights.gradeCompletionPct;

  const attentionItems: { label: string; href: string }[] = [];
  if (insights.overdueInvoiceCount > 0) {
    attentionItems.push({
      label: `${insights.overdueInvoiceCount} overdue invoice${insights.overdueInvoiceCount === 1 ? '' : 's'}`,
      href: `${officePublicHref(schoolId, 'billing')}?filter=overdue`,
    });
  }
  if (insights.studentsMissingGrades > 0) {
    attentionItems.push({
      label: `${insights.studentsMissingGrades} student${insights.studentsMissingGrades === 1 ? '' : 's'} need grades`,
      href: `${officePublicHref(schoolId, 'students')}?filter=missing-grades`,
    });
  }
  if (insights.dueSoonCount > 0) {
    attentionItems.push({
      label: `${insights.dueSoonCount} payment${insights.dueSoonCount === 1 ? '' : 's'} due soon`,
      href: `${officePublicHref(schoolId, 'billing')}?filter=due-soon`,
    });
  }

  const allClear = attentionItems.length === 0 && studentCount > 0;
  const isEmpty = studentCount === 0;

  const tiles: NavTile[] = [
    {
      href: officePublicHref(schoolId, 'students'),
      title: 'Students',
      subtitle: `${studentCount} on roster`,
      icon: Users,
      tint: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
    },
    {
      href: officePublicHref(schoolId, 'classes'),
      title: 'Classes',
      subtitle: `${classCount} ${classCount === 1 ? 'group' : 'groups'}`,
      icon: LayoutGrid,
      tint: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
    },
    {
      href: officePublicHref(schoolId, 'teachers'),
      title: 'Teachers',
      subtitle: `${teacherCount} homeroom`,
      icon: UserRound,
      tint: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    },
    {
      href: `${officePublicHref(schoolId, 'grades')}?term=${encodeURIComponent(activeTerm)}`,
      title: 'Grades',
      subtitle: studentCount > 0 ? `${gradePct}% done for ${activeTerm}` : 'Record term grades',
      icon: GraduationCap,
      tint: 'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300',
    },
    {
      href: officePublicHref(schoolId, 'billing'),
      title: 'Billing',
      subtitle: `${formatCents(insights.openBalanceCents)} open balance`,
      icon: CreditCard,
      tint: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
    },
    {
      href: officePublicHref(schoolId, 'reports'),
      title: 'Reports',
      subtitle: 'Print grade summaries',
      icon: FileText,
      tint: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
    },
    {
      href: officePublicHref(schoolId, 'settings'),
      title: 'Settings',
      subtitle: 'Terms, staff & import',
      icon: Settings,
      tint: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
    },
  ];

  return (
    <div className="w-full space-y-6">
      <section className="rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900/80 dark:ring-slate-800">
        <p className="text-lg font-medium text-slate-900 dark:text-white">
          {isEmpty ? 'Welcome — let’s set up your roster.' : 'School overview'}
        </p>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {isEmpty
            ? 'Add students, teachers, and classes to get started.'
            : 'Grades and reports filter to the selected term.'}
        </p>
        <div className="mt-4">
          <OfficeWorkingTermSelect
            layout="inline"
            label="Term"
            value={activeTerm}
            onValueChange={onActiveTermChange}
            gradeEntries={gradeEntries}
            schoolDefaultTerm={schoolDefaultTerm}
            configuredTerms={configuredTerms}
          />
        </div>
      </section>

      {attentionItems.length > 0 ? (
        <section
          className="rounded-2xl bg-amber-50/80 px-4 py-3.5 ring-1 ring-amber-200/60 dark:bg-amber-950/25 dark:ring-amber-900/40"
          role="status"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
                A few things to look at
              </p>
              <ul className="flex flex-wrap gap-2">
                {attentionItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="inline-flex rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-amber-900 transition-colors hover:bg-white dark:bg-slate-900/70 dark:text-amber-100 dark:hover:bg-slate-900"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : allClear ? (
        <section
          className="flex items-center gap-2.5 rounded-2xl bg-emerald-50/70 px-4 py-3.5 text-sm text-emerald-900 ring-1 ring-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-200 dark:ring-emerald-900/30"
          role="status"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          All caught up for {activeTerm}.
        </section>
      ) : null}

      {isEmpty ? (
        <OfficeEmptyState
          icon={Users}
          title="No students yet"
          description="Add students one by one, or import your roster from a spreadsheet."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button asChild className="rounded-full gap-1.5">
                <Link href={officePublicHref(schoolId, 'students')}>
                  <Plus className="h-4 w-4" />
                  Add student
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full gap-1.5">
                <Link href={`${officePublicHref(schoolId, 'settings')}#import`}>
                  <Upload className="h-4 w-4" />
                  Import spreadsheet
                </Link>
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <section className="grid gap-2.5 sm:grid-cols-2">
            {tiles.map((tile) => (
              <NavTileLink key={tile.href} {...tile} />
            ))}
          </section>

          <section className="rounded-2xl bg-slate-50/80 px-4 py-3.5 dark:bg-slate-900/40">
            <p className="mb-2.5 text-xs font-medium text-muted-foreground">Quick actions</p>
            <div className="flex flex-wrap gap-2">
              <QuickAction href={officePublicHref(schoolId, 'students')} label="Add student" />
              <QuickAction
                href={`${officePublicHref(schoolId, 'grades')}?term=${encodeURIComponent(activeTerm)}`}
                label="Record grade"
              />
              <QuickAction
                href={`${officePublicHref(schoolId, 'billing')}?action=new-invoice`}
                label="New invoice"
              />
            </div>
          </section>
        </>
      )}

      {canPopulateDemoData && onPopulateDemoData ? (
        <p className="text-center text-xs text-muted-foreground">
          <button
            type="button"
            className="inline-flex items-center gap-1 underline-offset-2 hover:underline disabled:opacity-50"
            disabled={isPopulatingDemoData}
            onClick={onPopulateDemoData}
          >
            <RefreshCw className={cn('h-3 w-3', isPopulatingDemoData && 'animate-spin')} />
            {isPopulatingDemoData ? 'Loading demo data…' : 'Load demo office data'}
          </button>
        </p>
      ) : null}
    </div>
  );
}

function NavTileLink({ href, title, subtitle, icon: Icon, tint }: NavTile) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3.5 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-200/70 transition-all hover:ring-teal-300/70 hover:shadow-md dark:bg-slate-900/80 dark:ring-slate-800 dark:hover:ring-teal-800/60"
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          tint,
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </Link>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/80 transition-colors hover:bg-teal-50 hover:text-teal-900 hover:ring-teal-200/80 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-teal-950/40 dark:hover:text-teal-100"
    >
      <Plus className="h-3 w-3" aria-hidden />
      {label}
    </Link>
  );
}
