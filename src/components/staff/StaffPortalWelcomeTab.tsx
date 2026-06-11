'use client';

import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight, TableProperties } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  StaffPortalSectionCard,
  StaffPortalSectionCardContent,
} from '@/components/staff/StaffPortalSection';
import {
  staffPortalAddOnTabs,
  staffPortalCoreTabs,
  staffPortalTabDescription,
  type StaffPortalRole,
} from '@/lib/staffPortal';
import type { Settings } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import {
  adminWelcomeTitle,
  buildAdminQuickActions,
  trackStaffPortalQuickAction,
  type AdminQuickActionId,
} from '@/lib/staffPortalQuickActions';

export type StaffPortalWelcomeStats = {
  studentCount: number;
  classCount: number;
  staffCount: number;
  activePrizeCount: number;
};

/** @deprecated Use StaffPortalWelcomeStats */
export type AdminWelcomeStats = StaffPortalWelcomeStats;

type StaffPortalWelcomeTabProps = {
  role: StaffPortalRole;
  settings: Settings;
  onGoToTab: (tabValue: string) => void;
  /** Used for admin quick-action usage tracking. */
  schoolId?: string | null;
  /** Admin-only: open bulk CSV roster import. */
  onBulkRoster?: () => void;
  /** Shown under the hero heading when available. */
  schoolName?: string | null;
  /** Staff member name (e.g. teacher's name) shown in the welcome greeting. */
  staffName?: string | null;
  /** Hero metrics for admin and teacher welcome tabs. */
  welcomeStats?: StaffPortalWelcomeStats;
  /** @deprecated Use welcomeStats */
  adminStats?: StaffPortalWelcomeStats;
  className?: string;
};

function formatStat(n: number): string {
  return n.toLocaleString();
}

function useCountUp(target: number, duration = 800, enabled = true): number {
  const [current, setCurrent] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!enabled || hasAnimated.current || target === 0) {
      setCurrent(target);
      return;
    }
    hasAnimated.current = true;

    const startTime = performance.now();
    let rafId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration, enabled]);

  return current;
}

function AnimatedStat({ value, label }: { value: number; label: string }) {
  const animatedValue = useCountUp(value, 800);

  return (
    <div className="rounded-xl border border-border/60 bg-primary/5 px-3 py-3 sm:px-4 sm:py-3.5">
      <p className="text-xl font-bold tabular-nums tracking-tight text-foreground sm:text-2xl">
        {formatStat(animatedValue)}
      </p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
        {label}
      </p>
    </div>
  );
}

function TabLinkRow({
  icon: Icon,
  label,
  description,
  onOpen,
  tabValue,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  onOpen: () => void;
  tabValue?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-intro-tour={tabValue ? `addon-link-${tabValue}` : undefined}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors',
        'border-border/70 bg-card hover:border-ring/30 hover:bg-muted/30',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35',
      )}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ring/10 text-ring transition-colors group-hover:bg-ring/20"
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-snug text-foreground">{label}</p>
        <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted-foreground">{description}</p>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground"
        aria-hidden
      />
    </button>
  );
}

function StaffPortalWelcomeHero({
  schoolName,
  staffName,
  stats,
  description,
  statLabels,
  greeting,
}: {
  schoolName: string | null;
  staffName: string | null;
  stats: StaffPortalWelcomeStats;
  description: string;
  statLabels: [string, string, string, string];
  greeting?: string;
}) {
  const statTiles = [
    { label: statLabels[0], value: stats.studentCount },
    { label: statLabels[1], value: stats.classCount },
    { label: statLabels[2], value: stats.staffCount },
    { label: statLabels[3], value: stats.activePrizeCount },
  ];

  const greetingText = greeting ?? (staffName ? `Welcome back, ${staffName} 👋` : 'Welcome back 👋');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          {schoolName ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {schoolName}
            </p>
          ) : null}
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{greetingText}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {statTiles.map((tile) => (
          <AnimatedStat key={tile.label} value={tile.value} label={tile.label} />
        ))}
      </div>
    </div>
  );
}

function ImportRosterCard({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-ring"
          aria-hidden
        >
          <TableProperties className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Import your roster</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Upload CSV files or paste a spreadsheet to set up classes, staff, and students.
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        className="shrink-0 rounded-lg font-semibold sm:self-center"
        onClick={onOpen}
      >
        Open import
      </Button>
    </div>
  );
}

const ADMIN_WELCOME_DESCRIPTION =
  'This is your control center. Manage students, award points, run the prize shop, and power the screens around your school — all from one place.';

const TEACHER_WELCOME_DESCRIPTION =
  'Award points, print coupons, manage your classes, and track student progress — all from one place.';

export function StaffPortalWelcomeTab({
  role,
  settings,
  onGoToTab,
  schoolId,
  onBulkRoster,
  schoolName,
  staffName,
  welcomeStats,
  adminStats,
  className,
}: StaffPortalWelcomeTabProps) {
  const stats = welcomeStats ?? adminStats;
  const core = staffPortalCoreTabs(role, settings);
  const addons = staffPortalAddOnTabs(role, settings);
  const trimmedSchoolName = schoolName?.trim() || null;
  const trimmedStaffName = staffName?.trim() || null;

  const heroDescription =
    role === 'teacher' ? TEACHER_WELCOME_DESCRIPTION : ADMIN_WELCOME_DESCRIPTION;

  const heroStatLabels: [string, string, string, string] =
    role === 'teacher'
      ? ['Students', 'Classes', 'Point categories', 'Active prizes']
      : ['Students', 'Classes', 'Staff', 'Active prizes'];

  const adminQuickActions =
    role === 'admin' && schoolId
      ? buildAdminQuickActions(schoolId)
      : [];

  const heroGreeting =
    role === 'admin' ? `${adminWelcomeTitle(trimmedStaffName)} 👋` : undefined;

  const handleAdminQuickAction = (id: AdminQuickActionId, tabValue: string) => {
    if (!schoolId) return;
    trackStaffPortalQuickAction(schoolId, id);
    if (id === 'import' && onBulkRoster) {
      onBulkRoster();
      return;
    }
    onGoToTab(tabValue);
  };

  return (
    <StaffPortalSectionCard className={className}>
      <StaffPortalSectionCardContent className="space-y-6 p-5 sm:p-6">
        {stats ? (
          <StaffPortalWelcomeHero
            schoolName={trimmedSchoolName}
            staffName={trimmedStaffName}
            stats={stats}
            description={heroDescription}
            statLabels={heroStatLabels}
            greeting={heroGreeting}
          />
        ) : null}

        {adminQuickActions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {adminQuickActions.map((action) => (
              <Button
                key={action.id}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => handleAdminQuickAction(action.id, action.tabValue)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        ) : null}

        {role === 'admin' && onBulkRoster ? <ImportRosterCard onOpen={onBulkRoster} /> : null}

        {core.length > 0 ? (
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Main areas
            </h4>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {core.map((tab) => (
                <TabLinkRow
                  key={tab.value}
                  icon={tab.icon}
                  label={tab.label}
                  description={staffPortalTabDescription(tab)}
                  onOpen={() => onGoToTab(tab.value)}
                  tabValue={tab.value}
                />
              ))}
            </div>
          </section>
        ) : null}

        {addons.length > 0 ? (
          <section className="space-y-2.5">
            <div>
              <h4 className="text-sm font-medium text-foreground">More tools</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Turn these on and pin them from Add more when you need them.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {addons.map((tab) => (
                <TabLinkRow
                  key={tab.value}
                  icon={tab.icon}
                  label={tab.label}
                  description={staffPortalTabDescription(tab)}
                  onOpen={() => onGoToTab(tab.value)}
                  tabValue={tab.value}
                />
              ))}
            </div>
          </section>
        ) : null}
      </StaffPortalSectionCardContent>
    </StaffPortalSectionCard>
  );
}
