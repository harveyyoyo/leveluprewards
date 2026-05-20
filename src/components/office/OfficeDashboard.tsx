'use client';

import Link from 'next/link';
import { AlertCircle, ArrowRight, CreditCard, FileText, GraduationCap, LayoutGrid, RefreshCw, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/office/officeNav';
import { officePublicHref } from '@/lib/officePublicUrl';
import type { OfficeDashboardInsights } from '@/lib/office/officeUtils';
import { formatGradeDisplay } from '@/lib/office/officeUtils';
import type { OfficeGradeEntry, OfficeInvoice } from '@/lib/office/types';

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
}: OfficeDashboardProps) {
  const quickLinks = [
    {
      href: officePublicHref(schoolId, 'students'),
      title: 'Students',
      description: 'Search roster and open student profiles.',
      icon: Users,
      stat: `${studentCount} students`,
    },
    {
      href: officePublicHref(schoolId, 'classes'),
      title: 'Classes',
      description: 'View students grouped by class.',
      icon: LayoutGrid,
      stat: `${classCount} classes`,
    },
    {
      href: officePublicHref(schoolId, 'grades'),
      title: 'Grades',
      description: 'Record and export term grades.',
      icon: GraduationCap,
      stat: `${insights.activeTerm}`,
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

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-teal-200/60 bg-gradient-to-br from-teal-50 to-white p-6 shadow-sm dark:border-teal-900/40 dark:from-teal-950/40 dark:to-slate-900">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-teal-700 dark:text-teal-300">Welcome</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          School office
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground leading-relaxed">
          Grades and billing in one calm workspace. Office roster is separate from rewards arcade data.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl bg-white/80 px-4 py-2 text-sm font-semibold shadow-sm dark:bg-slate-800/80">
              {studentCount} students
            </div>
            <div className="rounded-xl bg-white/80 px-4 py-2 text-sm font-semibold shadow-sm dark:bg-slate-800/80">
              Term: {insights.activeTerm}
            </div>
            {insights.overdueInvoiceCount > 0 ? (
              <div className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                {insights.overdueInvoiceCount} overdue invoice{insights.overdueInvoiceCount === 1 ? '' : 's'}
              </div>
            ) : null}
          </div>
          {canPopulateDemoData && onPopulateDemoData ? (
            <Button
              type="button"
              variant="secondary"
              className="w-fit rounded-xl gap-2 bg-white/90 text-teal-900 shadow-sm hover:bg-white dark:bg-slate-800 dark:text-teal-100 dark:hover:bg-slate-700"
              disabled={isPopulatingDemoData}
              onClick={onPopulateDemoData}
            >
              <RefreshCw className={`h-4 w-4 ${isPopulatingDemoData ? 'animate-spin' : ''}`} />
              {isPopulatingDemoData ? 'Populating...' : 'Populate demo data'}
            </Button>
          ) : null}
        </div>
      </section>

      {needsAttention ? (
        <section className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />
            <div className="min-w-0 flex-1 space-y-2">
              <h3 className="font-bold text-amber-950 dark:text-amber-100">Needs attention</h3>
              <ul className="text-sm text-amber-900/90 dark:text-amber-200/90 space-y-1">
                {insights.overdueInvoiceCount > 0 ? (
                  <li>
                    {insights.overdueInvoiceCount} invoice{insights.overdueInvoiceCount === 1 ? '' : 's'} past due —{' '}
                    <Link href={officePublicHref(schoolId, 'billing')} className="underline font-medium">
                      review billing
                    </Link>
                  </li>
                ) : null}
                {insights.studentsMissingGrades > 0 ? (
                  <li>
                    {insights.studentsMissingGrades} student{insights.studentsMissingGrades === 1 ? '' : 's'} without grades for{' '}
                    {insights.activeTerm} —{' '}
                    <Link href={officePublicHref(schoolId, 'grades')} className="underline font-medium">
                      add grades
                    </Link>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Card key={link.href} className="group border-slate-200/80 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800">
              <CardHeader className="pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{link.title}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">{link.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-0">
                <span className="text-sm font-semibold text-teal-800 dark:text-teal-300">{link.stat}</span>
                <Button asChild variant="ghost" size="sm" className="gap-1 text-teal-700 group-hover:bg-teal-50">
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

      <div className="grid gap-4 md:grid-cols-2">
        <RecentGradesCard entries={insights.recentGrades} studentLabelById={studentLabelById} schoolId={schoolId} />
        <RecentInvoicesCard
          invoices={insights.recentInvoices}
          accountNameById={accountNameById}
          schoolId={schoolId}
        />
      </div>
    </div>
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
              <li key={e.id} className="flex justify-between gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{studentLabelById.get(e.studentId) ?? 'Student'}</span>
                  <span className="text-muted-foreground"> · {e.subject}</span>
                </span>
                <span className="shrink-0 text-muted-foreground">{formatGradeDisplay(e)}</span>
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="link" className="mt-3 h-auto p-0 text-teal-700">
          <Link href={`/${schoolId}/office/grades`}>View all grades</Link>
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
              <li key={inv.id} className="flex justify-between gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{accountNameById.get(inv.accountId) ?? 'Account'}</span>
                  <span className="text-muted-foreground"> · {inv.label}</span>
                </span>
                <span className="shrink-0 font-medium">{formatCents(inv.amountCents)}</span>
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
