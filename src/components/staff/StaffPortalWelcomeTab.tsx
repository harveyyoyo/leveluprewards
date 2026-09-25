'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronRight,
  GraduationCap,
  UserCheck,
  Users,
  Gift,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  StaffPortalSectionCard,
  StaffPortalSectionCardContent,
} from '@/components/staff/StaffPortalSection';
import type { StaffPortalRole } from '@/lib/staffPortal';
import type { Settings } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { adminWelcomeTitle } from '@/lib/staffPortalQuickActions';
import { useAppContext } from '@/components/AppProvider';

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
  /** Tab values visible on the left sidebar — removed from the middle. */
  sidebarTabValues?: string[];
  className?: string;
};

function formatStat(n: number): string {
  return n.toLocaleString();
}

function useCountUp(target: number, duration = 800, enabled = true): number {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!enabled || target === 0) {
      setCurrent(target);
      return;
    }

    setCurrent(0);
    let startTime: number | null = null;
    let rafId: number;

    const animate = (now: number) => {
      if (startTime === null) {
        startTime = now;
      }
      const elapsed = Math.max(0, now - startTime);
      const progress = Math.min(Math.max(elapsed / duration, 0), 1);
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

function AnimatedStat({
  value,
  label,
  icon: Icon,
  iconBg,
  gradient,
}: {
  value: number;
  label: string;
  icon: LucideIcon;
  iconBg: string;
  gradient: string;
}) {
  const animatedValue = useCountUp(value, 800);

  return (
    <div className="group relative flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-muted/50 cursor-default">
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-xs transition-transform duration-200 group-hover:scale-110',
          iconBg,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex flex-col text-left">
        <span
          className={cn(
            'text-base sm:text-lg font-black tabular-nums tracking-tight leading-none bg-gradient-to-r bg-clip-text text-transparent',
            gradient,
          )}
        >
          {formatStat(animatedValue)}
        </span>
        <span className="mt-1 text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap leading-none">
          {label}
        </span>
      </div>
    </div>
  );
}

type PortalLargeButtonDef = {
  id: string;
  href: string;
  tabValue?: string;
  title: string;
  subtitle: string;
  image: string;
  accentColor: string;
};

function PortalLargeButton({
  item,
  onGoToTab,
}: {
  item: PortalLargeButtonDef;
  onGoToTab?: (tabValue: string) => void;
}) {
  const handleClick = (e: React.MouseEvent) => {
    if (item.tabValue && onGoToTab) {
      e.preventDefault();
      onGoToTab(item.tabValue);
    }
  };

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      className={cn(
        'group relative flex flex-col items-center rounded-2xl sm:rounded-3xl border border-border/80 bg-card p-2 sm:p-2.5 text-center shadow-xs transition-all duration-300',
        'hover:border-primary/50 hover:shadow-xl hover:-translate-y-1',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      )}
    >
      {/* Top illustration container */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl sm:rounded-2xl bg-muted/20">
        <img
          src={item.image}
          alt={item.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="eager"
        />
      </div>

      {/* Title & subtitle below */}
      <div className="flex flex-col items-center text-center mt-2 pb-0.5 px-1 min-w-0 w-full">
        <h3 className="text-xs sm:text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-primary truncate w-full">
          {item.title}
        </h3>
        <span className="mt-0.5 text-[9px] sm:text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground truncate w-full">
          {item.subtitle}
        </span>
      </div>
    </Link>
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
  staffName,
  stats,
  statLabels,
  greeting,
}: {
  schoolName?: string | null;
  staffName: string | null;
  stats: StaffPortalWelcomeStats;
  description?: string;
  statLabels: [string, string, string, string];
  greeting?: string;
}) {
  const statTiles = [
    {
      label: statLabels[0],
      value: Number(stats.studentCount ?? 0) || 0,
      icon: Users,
      iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/25',
      gradient: 'from-blue-600 via-sky-500 to-cyan-500 dark:from-blue-400 dark:to-cyan-300',
    },
    {
      label: statLabels[1],
      value: Number(stats.classCount ?? 0) || 0,
      icon: GraduationCap,
      iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/25',
      gradient: 'from-emerald-600 via-teal-500 to-teal-400 dark:from-emerald-400 dark:to-teal-300',
    },
    {
      label: statLabels[2],
      value: Number(stats.staffCount ?? 0) || 0,
      icon: UserCheck,
      iconBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500/25',
      gradient: 'from-purple-600 via-indigo-500 to-indigo-400 dark:from-purple-400 dark:to-indigo-300',
    },
    {
      label: statLabels[3],
      value: Number(stats.activePrizeCount ?? 0) || 0,
      icon: Gift,
      iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/25',
      gradient: 'from-amber-500 via-orange-500 to-amber-600 dark:from-amber-400 dark:to-orange-300',
    },
  ];

  const greetingText = greeting ?? (staffName ? `Welcome back, ${staffName}` : 'Welcome back');

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {greetingText}
        </h2>

        {/* Compact stats dash */}
        <div className="grid w-full shrink-0 grid-cols-2 items-center gap-1 rounded-2xl border border-border/80 bg-card/85 p-1 shadow-xs backdrop-blur-md sm:inline-flex sm:w-fit">
          {statTiles.map((tile, idx) => (
            <div key={tile.label} className="flex min-w-0 items-center">
              {idx > 0 && <div className="mx-0.5 hidden h-6 w-px bg-border/60 sm:block" />}
              <AnimatedStat
                value={tile.value}
                label={tile.label}
                icon={tile.icon}
                iconBg={tile.iconBg}
                gradient={tile.gradient}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StaffPortalWelcomeTab({
  role,
  settings,
  onGoToTab,
  schoolName,
  staffName,
  welcomeStats,
  adminStats,
  sidebarTabValues,
  className,
}: StaffPortalWelcomeTabProps) {
  const stats = welcomeStats ?? adminStats;
  const trimmedStaffName = staffName?.trim() || null;

  const { schoolId } = useAppContext();
  const root = schoolId ? `/${schoolId.toLowerCase()}` : '';

  const largePillarButtons = useMemo<PortalLargeButtonDef[]>(() => {
    return [
      {
        id: 'rewards',
        href: `${root}/admin?tab=prizes`,
        tabValue: 'prizes',
        title: 'Rewards',
        subtitle: 'STUDENT INCENTIVES',
        image: '/pillars/pillar-rewards.png',
        accentColor: '#d97706',
      },
      {
        id: 'office',
        href: `${root}/office`,
        title: 'School Office',
        subtitle: 'ADMINISTRATION',
        image: '/pillars/pillar-office.png',
        accentColor: '#4f46e5',
      },
      {
        id: 'classroom',
        href: `${root}/classroom`,
        title: 'Classroom',
        subtitle: 'ACTIVE LEARNING',
        image: '/pillars/pillar-classroom.png',
        accentColor: '#059669',
      },
      {
        id: 'attendance',
        href: `${root}/admin?tab=attendance`,
        tabValue: 'attendance',
        title: 'Attendance',
        subtitle: 'DAILY REGISTRY',
        image: '/pillars/pillar-attendance.png',
        accentColor: '#e11d48',
      },
      {
        id: 'library',
        href: `${root}/library`,
        title: 'Library',
        subtitle: 'RESOURCES',
        image: '/pillars/pillar-library.png',
        accentColor: '#7c3aed',
      },
    ];
  }, [root]);

  const heroStatLabels: [string, string, string, string] =
    role === 'teacher'
      ? ['Students', 'Classes', 'Point categories', 'Active prizes']
      : ['Students', 'Classes', 'Staff', 'Active prizes'];

  const heroGreeting =
    role === 'admin' ? adminWelcomeTitle(trimmedStaffName) : undefined;

  return (
    <StaffPortalSectionCard className={className}>
      <StaffPortalSectionCardContent className="space-y-6 p-5 sm:p-6">
        {stats ? (
          <StaffPortalWelcomeHero
            schoolName={schoolName}
            staffName={trimmedStaffName}
            stats={stats}
            statLabels={heroStatLabels}
            greeting={heroGreeting}
          />
        ) : null}

        {/* Pillar boxes: 5 cards in a single row on desktop */}
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 items-stretch">
          {largePillarButtons.map((item) => (
            <PortalLargeButton
              key={item.id}
              item={item}
              onGoToTab={onGoToTab}
            />
          ))}
        </section>
      </StaffPortalSectionCardContent>
    </StaffPortalSectionCard>
  );
}
