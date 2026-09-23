'use client';

import Link from 'next/link';
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  Plus,
  Upload,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OfficeEmptyState } from '@/components/office/OfficeEmptyState';
import { formatCents, type OfficeNavId } from '@/lib/office/officeNav';
import { useAppContext } from '@/components/AppProvider';
import { useOfficeHiddenSections } from '@/lib/office/useOfficeHiddenSections';
import { useCurrentOfficeStaffAccess } from '@/lib/office/useCurrentOfficeStaffAccess';
import { officePublicHref } from '@/lib/officePublicUrl';
import type { OfficeDashboardInsights } from '@/lib/office/officeUtils';
import { cn } from '@/lib/utils';

type OfficeDashboardProps = {
  schoolId: string;
  studentCount: number;
  classCount: number;
  teacherCount: number;
  insights: OfficeDashboardInsights;
  activeTerm: string;
  showAttendance?: boolean;
};

/** Grid widths by how many boxes are showing, so hidden sections don't leave gaps. */
const STAT_COLS: Record<number, string> = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' };
const ACTION_COLS: Record<number, string> = { 1: 'lg:grid-cols-2', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' };

type StatTile = {
  section: OfficeNavId;
  href: string;
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
};

export function OfficeDashboard({
  schoolId,
  studentCount,
  classCount,
  teacherCount,
  insights,
  activeTerm,
  showAttendance = true,
}: OfficeDashboardProps) {
  const { userName } = useAppContext();
  const { hidden } = useOfficeHiddenSections();
  const { allowedSections } = useCurrentOfficeStaffAccess(schoolId, userName);
  // Home only offers what this person has in their menu: sections switched off in Interface,
  // not allowed for their sign-in, or turned off for the school don't appear here either.
  const isShown = (id: OfficeNavId) =>
    !hidden.includes(id) &&
    (!allowedSections || allowedSections.includes(id)) &&
    (id !== 'attendance' || showAttendance);

  const gradePct =
    insights.termSubjects.length > 0
      ? insights.subjectGradeCompletionPct
      : insights.gradeCompletionPct;

  const attentionItems: { label: string; href: string; section: OfficeNavId }[] = [];
  if (insights.overdueInvoiceCount > 0) {
    attentionItems.push({
      label: `${insights.overdueInvoiceCount} overdue invoice${insights.overdueInvoiceCount === 1 ? '' : 's'}`,
      href: `${officePublicHref(schoolId, 'billing')}?filter=overdue`,
      section: 'billing',
    });
  }
  if (insights.studentsMissingGrades > 0) {
    attentionItems.push({
      label: `${insights.studentsMissingGrades} student${insights.studentsMissingGrades === 1 ? '' : 's'} need grades`,
      href: `${officePublicHref(schoolId, 'students')}?filter=missing-grades`,
      section: 'grades',
    });
  }
  if (insights.dueSoonCount > 0) {
    attentionItems.push({
      label: `${insights.dueSoonCount} payment${insights.dueSoonCount === 1 ? '' : 's'} due soon`,
      href: `${officePublicHref(schoolId, 'billing')}?filter=due-soon`,
      section: 'billing',
    });
  }
  const visibleAttention = attentionItems.filter((item) => isShown(item.section));

  const allClear = visibleAttention.length === 0 && studentCount > 0;
  const isEmpty = studentCount === 0;

  // A few numbers at a glance — the side menu already lists every page, so Home doesn't repeat it.
  const allStats: StatTile[] = [
    {
      section: 'students',
      href: officePublicHref(schoolId, 'students'),
      label: 'Students',
      value: String(studentCount),
      note: `${classCount} ${classCount === 1 ? 'class' : 'classes'} · ${teacherCount} ${teacherCount === 1 ? 'teacher' : 'teachers'}`,
      icon: Users,
    },
    {
      section: 'grades',
      href: `${officePublicHref(schoolId, 'grades')}?term=${encodeURIComponent(activeTerm)}`,
      label: 'Grades done',
      value: `${gradePct}%`,
      note: activeTerm,
      icon: GraduationCap,
    },
    {
      section: 'billing',
      href: officePublicHref(schoolId, 'billing'),
      label: 'Still owed',
      value: formatCents(insights.openBalanceCents),
      note: insights.overdueInvoiceCount > 0 ? `${insights.overdueInvoiceCount} overdue` : 'Nothing overdue',
      icon: CreditCard,
    },
  ];
  const stats = allStats.filter((s) => isShown(s.section));

  const allQuickActions: Array<{ section: OfficeNavId; href: string; label: string; icon: LucideIcon }> = [
    { section: 'students', href: officePublicHref(schoolId, 'students'), label: 'Add student', icon: Users },
    {
      section: 'grades',
      href: `${officePublicHref(schoolId, 'grades')}?term=${encodeURIComponent(activeTerm)}`,
      label: 'Record grades',
      icon: GraduationCap,
    },
    {
      section: 'billing',
      href: `${officePublicHref(schoolId, 'billing')}?action=new-invoice`,
      label: 'New invoice',
      icon: CreditCard,
    },
    { section: 'attendance', href: officePublicHref(schoolId, 'attendance'), label: 'Take attendance', icon: CalendarCheck },
  ];
  const quickActions = allQuickActions.filter((a) => isShown(a.section));

  return (
    <div className="w-full space-y-5">
      {isEmpty ? (
        <section className="rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900/80 dark:ring-slate-800">
          <p className="text-lg font-medium text-slate-900 dark:text-white">Welcome — let’s set up your roster.</p>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Add students, teachers, and classes to get started.
          </p>
        </section>
      ) : null}

      {visibleAttention.length > 0 ? (
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
                {visibleAttention.map((item) => (
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
                <Link href={`${officePublicHref(schoolId, 'settings')}?tab=import`}>
                  <Upload className="h-4 w-4" />
                  Import spreadsheet
                </Link>
              </Button>
            </div>
          }
        />
      ) : (
        <>
          {stats.length > 0 ? (
            <section className={cn('grid gap-2.5', STAT_COLS[stats.length])}>
              {stats.map((stat) => (
                <StatTileLink key={stat.href} {...stat} />
              ))}
            </section>
          ) : null}

          {quickActions.length > 0 ? (
            <section className={cn('grid grid-cols-2 gap-2.5', ACTION_COLS[quickActions.length])} aria-label="Quick actions">
              {quickActions.map((action) => (
                <QuickAction key={action.href} href={action.href} label={action.label} icon={action.icon} />
              ))}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function StatTileLink({ href, label, value, note, icon: Icon }: StatTile) {
  return (
    <Link
      href={href}
      className="group rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-200/70 transition-all hover:shadow-md hover:ring-teal-300/70 dark:bg-slate-900/80 dark:ring-slate-800 dark:hover:ring-teal-800/60"
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </span>
      <span className="mt-1 block text-2xl font-semibold tracking-tight text-slate-900 tabular-nums dark:text-white">
        {value}
      </span>
      <span className="block truncate text-xs text-muted-foreground">{note}</span>
    </Link>
  );
}

function QuickAction({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm ring-1 ring-slate-200/70 transition-colors hover:bg-teal-50 hover:text-teal-900 hover:ring-teal-200/80 dark:bg-slate-900/80 dark:text-slate-100 dark:ring-slate-800 dark:hover:bg-teal-950/40"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      {label}
    </Link>
  );
}
