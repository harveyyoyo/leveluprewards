'use client';

import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutGrid,
  Plus,
  RefreshCw,
  Settings,
  UserRound,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      label: `${insights.studentsMissingGrades} missing grade${insights.studentsMissingGrades === 1 ? '' : 's'} · ${activeTerm}`,
      href: `${officePublicHref(schoolId, 'students')}?filter=missing-grades`,
    });
  }
  if (insights.dueSoonCount > 0) {
    attentionItems.push({
      label: `${insights.dueSoonCount} due this week`,
      href: `${officePublicHref(schoolId, 'billing')}?filter=due-soon`,
    });
  }

  const allClear = attentionItems.length === 0 && studentCount > 0;

  const tiles: NavTile[] = [
    {
      href: officePublicHref(schoolId, 'students'),
      title: 'Students',
      subtitle: `${studentCount} on roster`,
      icon: Users,
    },
    {
      href: officePublicHref(schoolId, 'classes'),
      title: 'Classes',
      subtitle: `${classCount} ${classCount === 1 ? 'group' : 'groups'}`,
      icon: LayoutGrid,
    },
    {
      href: officePublicHref(schoolId, 'teachers'),
      title: 'Teachers',
      subtitle: `${teacherCount} homeroom`,
      icon: UserRound,
    },
    {
      href: `${officePublicHref(schoolId, 'grades')}?term=${encodeURIComponent(activeTerm)}`,
      title: 'Grades',
      subtitle: studentCount > 0 ? `${gradePct}% complete` : 'Record term grades',
      icon: GraduationCap,
    },
    {
      href: officePublicHref(schoolId, 'billing'),
      title: 'Billing',
      subtitle: `${formatCents(insights.openBalanceCents)} open`,
      icon: CreditCard,
    },
    {
      href: officePublicHref(schoolId, 'reports'),
      title: 'Reports',
      subtitle: 'Print grade summaries',
      icon: FileText,
    },
    {
      href: officePublicHref(schoolId, 'settings'),
      title: 'Settings',
      subtitle: 'Term defaults & staff',
      icon: Settings,
    },
  ];

  return (
    <div className="w-full space-y-8">
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Home
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Grades and billing for your school office roster.
          </p>
        </div>

        <OfficeWorkingTermSelect
          layout="inline"
          value={activeTerm}
          onValueChange={onActiveTermChange}
          gradeEntries={gradeEntries}
          schoolDefaultTerm={schoolDefaultTerm}
          configuredTerms={configuredTerms}
        />
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Students" value={String(studentCount)} />
        <Metric label="Classes" value={String(classCount)} />
        <Metric
          label="Graded"
          value={studentCount > 0 ? `${gradePct}%` : '—'}
          href={`${officePublicHref(schoolId, 'grades')}?term=${encodeURIComponent(activeTerm)}`}
        />
        <Metric
          label="Open balance"
          value={formatCents(insights.openBalanceCents)}
          href={officePublicHref(schoolId, 'billing')}
        />
      </section>

      {attentionItems.length > 0 ? (
        <section
          className="flex flex-col gap-3 rounded-xl border border-amber-200/70 bg-amber-50/50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20 sm:flex-row sm:items-center"
          role="status"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-amber-950 dark:text-amber-100">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            Needs attention
          </div>
          <ul className="flex flex-1 flex-wrap gap-2">
            {attentionItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex rounded-lg bg-white/80 px-3 py-1.5 text-xs font-medium text-amber-900 shadow-sm transition-colors hover:bg-white dark:bg-slate-900/60 dark:text-amber-100 dark:hover:bg-slate-900"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : allClear ? (
        <section
          className="flex items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50/40 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-200"
          role="status"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          All caught up for {activeTerm}.
        </section>
      ) : null}

      <section className="flex flex-wrap gap-2">
        <Button asChild size="sm" className="rounded-lg gap-1.5">
          <Link href={officePublicHref(schoolId, 'students')}>
            <Plus className="h-4 w-4" />
            Add student
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="rounded-lg gap-1.5">
          <Link href={`${officePublicHref(schoolId, 'grades')}?term=${encodeURIComponent(activeTerm)}`}>
            <Plus className="h-4 w-4" />
            Record grade
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="rounded-lg gap-1.5">
          <Link href={`${officePublicHref(schoolId, 'billing')}?action=new-invoice`}>
            <Plus className="h-4 w-4" />
            New invoice
          </Link>
        </Button>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Workspace
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {tiles.map((tile) => (
            <NavTileLink key={tile.href} {...tile} />
          ))}
        </div>
      </section>

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

function Metric({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block transition-opacity hover:opacity-90">
        {body}
      </Link>
    );
  }
  return body;
}

function NavTileLink({ href, title, subtitle, icon: Icon }: NavTile) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm transition-all hover:border-teal-300/60 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-800"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-900 dark:text-white">{title}</span>
        <span className="block text-sm text-muted-foreground">{subtitle}</span>
      </span>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-700 dark:group-hover:text-teal-300"
        aria-hidden
      />
    </Link>
  );
}
