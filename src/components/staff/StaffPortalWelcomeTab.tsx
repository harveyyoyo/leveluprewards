'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, ChevronRight, Clock, Gift, LayoutGrid, TableProperties } from 'lucide-react';
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
import { adminWelcomeTitle } from '@/lib/staffPortalQuickActions';

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

type PillarBoxLink = {
  tabValue: string;
  icon: LucideIcon;
  label: string;
  description: string;
};

function PillarLinkRow({
  icon: Icon,
  label,
  description,
  onOpen,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
        'hover:bg-muted/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35',
      )}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ring/10 text-ring transition-colors group-hover:bg-ring/20"
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-foreground">{label}</p>
        <p className="mt-0.5 line-clamp-1 text-xs leading-snug text-muted-foreground">{description}</p>
      </div>
      <ChevronRight
        className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground"
        aria-hidden
      />
    </button>
  );
}

function PillarBox({
  icon: Icon,
  gradient,
  title,
  subtitle,
  links,
  onGoToTab,
}: {
  icon: LucideIcon;
  gradient: string;
  title: string;
  subtitle: string;
  links: PillarBoxLink[];
  onGoToTab: (tabValue: string) => void;
}) {
  if (links.length === 0) return null;

  return (
    <div className="space-y-4 rounded-2xl border bg-background p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-md bg-gradient-to-br', gradient)}>
          <Icon className="h-6 w-6 text-white" aria-hidden />
        </div>
        <div>
          <h3 className="text-xl font-black tracking-tight text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="divide-y divide-border/50">
        {links.map((link) => (
          <PillarLinkRow
            key={link.tabValue}
            icon={link.icon}
            label={link.label}
            description={link.description}
            onOpen={() => onGoToTab(link.tabValue)}
          />
        ))}
      </div>
    </div>
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
    { label: statLabels[0], value: Number(stats.studentCount ?? 0) || 0 },
    { label: statLabels[1], value: Number(stats.classCount ?? 0) || 0 },
    { label: statLabels[2], value: Number(stats.staffCount ?? 0) || 0 },
    { label: statLabels[3], value: Number(stats.activePrizeCount ?? 0) || 0 },
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

  // Tab values that move into pillar boxes
  const REWARDS_PILLAR_VALUES = new Set(['prizes', 'categories', 'bonuspoints', 'goals', 'houses']);
  const CLASSROOM_PILLAR_VALUES = new Set(['classroom']);
  const ATTENDANCE_PILLAR_VALUES = new Set(['attendance']);
  const LIBRARY_PILLAR_VALUES = new Set(['library']);

  // Combined set for filtering out of core/addon grids
  const PILLAR_VALUES = new Set([
    ...REWARDS_PILLAR_VALUES,
    ...CLASSROOM_PILLAR_VALUES,
    ...ATTENDANCE_PILLAR_VALUES,
    ...LIBRARY_PILLAR_VALUES,
  ]);

  // Filter core and addon lists to remove welcome itself and items shown in pillar boxes
  const filteredCore = core.filter((t) => t.value !== 'welcome' && !PILLAR_VALUES.has(t.value));
  const filteredAddons = addons.filter((t) => !PILLAR_VALUES.has(t.value));

  // Build rewards pillar links from enabled tabs
  const rewardsPillarLinks = useMemo(() => {
    // Order: Rewards, Coupons, Bonus Points, Goals, Houses
    const orderedValues = ['prizes', 'categories', 'bonuspoints', 'goals', 'houses'];
    const allTabs = [...core, ...addons];
    const enabledMap = new Map(allTabs.map((t) => [t.value, t]));

    return orderedValues
      .filter((v) => enabledMap.has(v))
      .map((v) => {
        const tab = enabledMap.get(v)!;
        return {
          tabValue: tab.value,
          icon: tab.icon,
          label: tab.label,
          description: staffPortalTabDescription(tab),
        };
      });
  }, [core, addons]);

  // Build classroom pillar links
  const classroomPillarLinks = useMemo(() => {
    const allTabs = [...core, ...addons];
    const classroomTab = allTabs.find((t) => t.value === 'classroom');
    if (!classroomTab) return [];
    return [
      {
        tabValue: classroomTab.value,
        icon: classroomTab.icon,
        label: classroomTab.label,
        description: staffPortalTabDescription(classroomTab),
      },
    ];
  }, [core, addons]);

  // Build attendance pillar links
  const attendancePillarLinks = useMemo(() => {
    const allTabs = [...core, ...addons];
    const attendanceTab = allTabs.find((t) => t.value === 'attendance');
    if (!attendanceTab) return [];
    return [
      {
        tabValue: attendanceTab.value,
        icon: attendanceTab.icon,
        label: attendanceTab.label,
        description: staffPortalTabDescription(attendanceTab),
      },
    ];
  }, [core, addons]);

  // Build library pillar links
  const libraryPillarLinks = useMemo(() => {
    const allTabs = [...core, ...addons];
    const libraryTab = allTabs.find((t) => t.value === 'library');
    if (!libraryTab) return [];
    return [
      {
        tabValue: libraryTab.value,
        icon: libraryTab.icon,
        label: libraryTab.label,
        description: staffPortalTabDescription(libraryTab),
      },
    ];
  }, [core, addons]);

  const heroDescription =
    role === 'teacher' ? TEACHER_WELCOME_DESCRIPTION : ADMIN_WELCOME_DESCRIPTION;

  const heroStatLabels: [string, string, string, string] =
    role === 'teacher'
      ? ['Students', 'Classes', 'Point categories', 'Active prizes']
      : ['Students', 'Classes', 'Staff', 'Active prizes'];

  const heroGreeting =
    role === 'admin' ? `${adminWelcomeTitle(trimmedStaffName)} 👋` : undefined;

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

        {role === 'admin' && onBulkRoster ? <ImportRosterCard onOpen={onBulkRoster} /> : null}

        {filteredCore.length > 0 ? (
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Main areas
            </h4>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {filteredCore.map((tab) => (
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

        {/* Pillar boxes */}
        <section className="grid gap-4 sm:grid-cols-2">
          {rewardsPillarLinks.length > 0 ? (
            <PillarBox
              icon={Gift}
              gradient="from-amber-500 to-orange-600"
              title="Rewards"
              subtitle="Points, prizes, coupons, milestones, and competitions."
              links={rewardsPillarLinks}
              onGoToTab={onGoToTab}
            />
          ) : null}
          {classroomPillarLinks.length > 0 ? (
            <PillarBox
              icon={LayoutGrid}
              gradient="from-emerald-500 to-teal-600"
              title="Classroom"
              subtitle="Seating charts, behavior notes, quick awards, and room display."
              links={classroomPillarLinks}
              onGoToTab={onGoToTab}
            />
          ) : null}
          {attendancePillarLinks.length > 0 ? (
            <PillarBox
              icon={Clock}
              gradient="from-blue-500 to-indigo-600"
              title="Attendance"
              subtitle="Sign-in rules, period slots, room passes, and attendance reporting."
              links={attendancePillarLinks}
              onGoToTab={onGoToTab}
            />
          ) : null}
          {libraryPillarLinks.length > 0 ? (
            <PillarBox
              icon={BookOpen}
              gradient="from-indigo-600 to-sky-500"
              title="Library"
              subtitle="Look up books, check them in and out, and let students check out on their own."
              links={libraryPillarLinks}
              onGoToTab={onGoToTab}
            />
          ) : null}
        </section>

        {filteredAddons.length > 0 ? (
          <section className="space-y-2.5">
            <div>
              <h4 className="text-sm font-medium text-foreground">More tools</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Turn these on and pin them from Add more when you need them.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredAddons.map((tab) => (
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
