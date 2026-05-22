'use client';

import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileText,
  GraduationCap,
  Printer,
  LayoutGrid,
  PlusCircle,
  RefreshCw,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCents } from '@/lib/office/officeNav';
import { officePublicHref } from '@/lib/officePublicUrl';
import type { OfficeDashboardInsights } from '@/lib/office/officeUtils';
import { formatGradeDisplay } from '@/lib/office/officeUtils';
import type { OfficeGradeEntry, OfficeInvoice, OfficeInvoiceStatus } from '@/lib/office/types';

type OfficeDashboardProps = {
  schoolId: string;
  studentCount: number;
  classCount: number;
  insights: OfficeDashboardInsights;
  studentLabelById: Map<string, string>;
  accountNameById: Map<string, string>;
  canPopulateDemoData?: boolean;
  isPopulatingDemoData?: boolean;
  onPopulateDemoData?: () => void;
  activeTerm: string;
  onActiveTermChange: (term: string) => void;
  suggestedTerm?: string;
};

export function OfficeDashboard({
  schoolId,
  studentCount,
  classCount,
  insights,
  studentLabelById,
  accountNameById,
  canPopulateDemoData = false,
  isPopulatingDemoData = false,
  onPopulateDemoData,
  activeTerm,
  onActiveTermChange,
  suggestedTerm,
}: OfficeDashboardProps) {
  const quickLinks = [
    {
      href: officePublicHref(schoolId, 'students'),
      title: 'Students',
      description: 'Search roster and open student profiles.',
      icon: Users,
      stat: `${studentCount} enrolled`,
    },
    {
      href: officePublicHref(schoolId, 'classes'),
      title: 'Classes',
      description: 'View students grouped by class.',
      icon: LayoutGrid,
      stat: `${classCount} ${classCount === 1 ? 'class' : 'classes'}`,
    },
    {
      href: officePublicHref(schoolId, 'grades'),
      title: 'Grades',
      description: 'Record and export term grades.',
      icon: GraduationCap,
      stat:
        studentCount > 0
          ? `${insights.gradeCompletionPct}% graded`
          : insights.activeTerm,
    },
    {
      href: officePublicHref(schoolId, 'billing'),
      title: 'Billing',
      description: 'Family accounts, invoices, and balances.',
      icon: CreditCard,
      stat: `${formatCents(insights.openBalanceCents)} open`,
    },
    {
      href: officePublicHref(schoolId, 'reports'),
      title: 'Reports',
      description: 'Print scannable term grade summaries.',
      icon: FileText,
      stat: 'Print ready',
    },
  ];

  const needsAttention =
    insights.overdueInvoiceCount > 0 || insights.studentsMissingGrades > 0;
  const allClear = !needsAttention && studentCount > 0;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-2xl border border-teal-200/60 bg-gradient-to-br from-teal-50 to-white p-6 shadow-sm dark:border-teal-900/40 dark:from-teal-950/40 dark:to-slate-900">
        <p className="text-[0.625rem] font-bold uppercase tracking-[0.25em] text-teal-700 dark:text-teal-300">
          Welcome
        </p>
        <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          School office
        </h2>
        <p className="mt-2 max-w-2xl text-xs text-muted-foreground leading-relaxed">
          Grades and billing in one calm workspace. Office roster is separate from rewards arcade
          data.
        </p>

        {/* Stats row */}
        <div className="mt-5 flex flex-wrap gap-2">
          <StatChip label={`${studentCount} students`} />
          <StatChip label={`Term: ${insights.activeTerm}`} />
          {studentCount > 0 ? (
            <StatChip
              label={
                <>
                  {insights.studentsGraded}/{studentCount} graded
                  <span className="ml-2 inline-block h-1.5 w-14 rounded-full bg-teal-100 align-middle overflow-hidden">
                    <span
                      className="block h-full rounded-full bg-teal-500 transition-all"
                      style={{ width: `${insights.gradeCompletionPct}%` }}
                    />
                  </span>
                </>
              }
            />
          ) : null}
          {insights.dueSoonCount > 0 ? (
            <StatChip
              href={`${officePublicHref(schoolId, 'billing')}?filter=due-soon`}
              label={`${insights.dueSoonCount} due this week`}
              variant="amber"
            />
          ) : null}
          {insights.overdueInvoiceCount > 0 ? (
            <StatChip
              href={officePublicHref(schoolId, 'billing')}
              label={`${insights.overdueInvoiceCount} overdue invoice${insights.overdueInvoiceCount === 1 ? '' : 's'}`}
              variant="amber"
            />
          ) : insights.paidInvoiceCount > 0 ? (
            <StatChip label={`${insights.paidInvoiceCount} paid`} variant="green" />
          ) : null}
          {insights.unassignedCount > 0 ? (
            <StatChip
              href={`${officePublicHref(schoolId, 'students')}?filter=unassigned`}
              label={`${insights.unassignedCount} unassigned`}
            />
          ) : null}
          {insights.noBillingCount > 0 ? (
            <StatChip
              href={`${officePublicHref(schoolId, 'students')}?filter=no-billing`}
              label={`${insights.noBillingCount} no billing`}
            />
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-[0.625rem] font-bold uppercase text-muted-foreground">Working term</Label>
            <Input
              value={activeTerm}
              onChange={(e) => onActiveTermChange(e.target.value)}
              placeholder={suggestedTerm ?? 'e.g. Fall 2026'}
              className="h-9 w-40 rounded-xl bg-white/90 dark:bg-slate-800/80"
            />
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl gap-1.5 border-teal-200 bg-white/80 text-teal-800 hover:bg-teal-50 dark:border-teal-800 dark:bg-slate-800/80 dark:text-teal-200"
          >
            <Link href={officePublicHref(schoolId, 'students')}>
              <PlusCircle className="h-3.5 w-3.5" />
              Add student
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl gap-1.5 border-teal-200 bg-white/80 text-teal-800 hover:bg-teal-50 dark:border-teal-800 dark:bg-slate-800/80 dark:text-teal-200"
          >
            <Link href={officePublicHref(schoolId, 'grades')}>
              <PlusCircle className="h-3.5 w-3.5" />
              Record grade
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl gap-1.5 border-teal-200 bg-white/80 text-teal-800 hover:bg-teal-50 dark:border-teal-800 dark:bg-slate-800/80 dark:text-teal-200"
          >
            <Link href={officePublicHref(schoolId, 'billing')}>
              <PlusCircle className="h-3.5 w-3.5" />
              New invoice
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl gap-1.5 border-teal-200 bg-white/80 text-teal-800 hover:bg-teal-50 dark:border-teal-800 dark:bg-slate-800/80 dark:text-teal-200"
          >
            <Link href={officePublicHref(schoolId, 'reports')}>
              <Printer className="h-3.5 w-3.5" />
              Print report
            </Link>
          </Button>
          {canPopulateDemoData && onPopulateDemoData ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-xl gap-1.5 bg-white/90 text-teal-900 shadow-sm hover:bg-white dark:bg-slate-800 dark:text-teal-100 dark:hover:bg-slate-700"
              disabled={isPopulatingDemoData}
              onClick={onPopulateDemoData}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPopulatingDemoData ? 'animate-spin' : ''}`} />
              {isPopulatingDemoData ? 'Populating…' : 'Populate demo data'}
            </Button>
          ) : null}
        </div>
      </section>

      {/* Attention / All-clear banner */}
      {needsAttention ? (
        <section className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />
            <div className="min-w-0 flex-1 space-y-2">
              <h3 className="font-bold text-amber-950 dark:text-amber-100">Needs attention</h3>
              <ul className="text-sm text-amber-900/90 dark:text-amber-200/90 space-y-1">
                {insights.overdueInvoiceCount > 0 ? (
                  <li>
                    {insights.overdueInvoiceCount} invoice
                    {insights.overdueInvoiceCount === 1 ? '' : 's'} past due —{' '}
                    <Link
                      href={officePublicHref(schoolId, 'billing')}
                      className="underline font-medium"
                    >
                      review billing
                    </Link>
                  </li>
                ) : null}
                {insights.studentsMissingGrades > 0 ? (
                  <li>
                    {insights.studentsMissingGrades} student
                    {insights.studentsMissingGrades === 1 ? '' : 's'} without grades for{' '}
                    {insights.activeTerm} —{' '}
                    <Link
                      href={`${officePublicHref(schoolId, 'grades')}?term=${encodeURIComponent(insights.activeTerm)}`}
                      className="underline font-medium"
                    >
                      add grades
                    </Link>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </section>
      ) : allClear ? (
        <section className="rounded-2xl border border-emerald-200/60 bg-emerald-50/60 px-5 py-3.5 flex items-center gap-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
            All clear — billing is current and all {studentCount} student
            {studentCount === 1 ? '' : 's'} have grades for {insights.activeTerm}.
          </p>
        </section>
      ) : null}

      {/* Quick link cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Card
              key={link.href}
              className="group border-slate-200/80 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800"
            >
              <CardHeader className="pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{link.title}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  {link.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-0">
                <span className="text-sm font-semibold text-teal-800 dark:text-teal-300">
                  {link.stat}
                </span>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-teal-700 group-hover:bg-teal-50 dark:group-hover:bg-teal-950/30"
                >
                  <Link href={link.href}>
                    Open
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <RecentGradesCard
          entries={insights.recentGrades}
          studentLabelById={studentLabelById}
          schoolId={schoolId}
        />
        <RecentInvoicesCard
          invoices={insights.recentInvoices}
          accountNameById={accountNameById}
          schoolId={schoolId}
        />
      </div>
    </div>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────

function StatChip({
  label,
  variant = 'default',
  href,
}: {
  label: React.ReactNode;
  variant?: 'default' | 'amber' | 'green';
  href?: string;
}) {
  const styles = {
    default:
      'bg-white/80 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200',
    amber:
      'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
    green:
      'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
  };
  const className = `flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm ${styles[variant]} ${href ? 'hover:opacity-90 transition-opacity' : ''}`;
  if (href) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }
  return <div className={className}>{label}</div>;
}

function InvoiceStatusBadge({ status }: { status: OfficeInvoiceStatus }) {
  const config: Record<
    OfficeInvoiceStatus,
    { label: string; classes: string }
  > = {
    draft: {
      label: 'Draft',
      classes: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    },
    sent: {
      label: 'Sent',
      classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    },
    paid: {
      label: 'Paid',
      classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    },
    void: {
      label: 'Void',
      classes: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
    },
  };
  const { label, classes } = config[status] ?? config.draft;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide ${classes}`}
    >
      {label}
    </span>
  );
}

function RecentGradesCard({
  entries,
  studentLabelById,
  schoolId,
}: {
  entries: OfficeGradeEntry[];
  studentLabelById: Map<string, string>;
  schoolId: string;
}) {
  return (
    <Card className="border-slate-200/80 dark:border-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recent grades</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No grades recorded yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex justify-between gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium">
                    {studentLabelById.get(e.studentId) ?? 'Student'}
                  </span>
                  <span className="text-muted-foreground"> · {e.subject}</span>
                  {e.termLabel ? (
                    <span className="ml-1 text-[0.6875rem] text-muted-foreground/70">
                      ({e.termLabel})
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 font-semibold text-teal-800 dark:text-teal-300">
                  {formatGradeDisplay(e)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="link" className="mt-3 h-auto p-0 text-teal-700">
          <Link href={officePublicHref(schoolId, 'grades')}>View all grades</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function RecentInvoicesCard({
  invoices,
  accountNameById,
  schoolId,
}: {
  invoices: OfficeInvoice[];
  accountNameById: Map<string, string>;
  schoolId: string;
}) {
  return (
    <Card className="border-slate-200/80 dark:border-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recent invoices</CardTitle>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {invoices.map((inv) => (
              <li
                key={inv.id}
                className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {accountNameById.get(inv.accountId) ?? 'Account'}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{inv.label}</span>
                  {inv.status !== 'paid' && inv.status !== 'void' && inv.dueDate ? (
                    <span className="block text-[0.6875rem] text-muted-foreground/70">
                      Due {inv.dueDate}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 flex flex-col items-end gap-1">
                  <span className="font-semibold">{formatCents(inv.amountCents)}</span>
                  <InvoiceStatusBadge status={inv.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="link" className="mt-3 h-auto p-0 text-teal-700">
          <Link href={officePublicHref(schoolId, 'billing')}>View billing</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
