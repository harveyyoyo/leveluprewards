'use client';

import type { LucideIcon } from 'lucide-react';
import {
  ChevronRight,
  Sparkles,
  TableProperties,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  StaffPortalSectionCard,
  StaffPortalSectionCardContent,
  StaffPortalSectionCardHeader,
  StaffPortalSectionCardTitle,
} from '@/components/staff/StaffPortalSection';
import {
  staffPortalTabDescription,
  staffPortalTabsForRole,
  type StaffPortalRole,
} from '@/lib/staffPortal';
import type { Settings } from '@/components/providers/SettingsProvider';
import { cn, staffGreetingName } from '@/lib/utils';

export type AdminWelcomeStats = {
  studentCount: number;
  classCount: number;
  staffCount: number;
  activePrizeCount: number;
};

type StaffPortalWelcomeTabProps = {
  role: StaffPortalRole;
  settings: Settings;
  onGoToTab: (tabValue: string) => void;
  /** Admin-only: open bulk CSV roster import. */
  onBulkRoster?: () => void;
  /** First name or display name for a personal greeting. */
  displayName?: string | null;
  /** Shown on admin welcome when available. */
  schoolName?: string | null;
  /** Admin hero metrics (students, classes, staff, active prizes). */
  adminStats?: AdminWelcomeStats;
  className?: string;
};

function formatStat(n: number): string {
  return n.toLocaleString();
}

function TabLinkRow({
  icon: Icon,
  label,
  description,
  onOpen,
  variant = 'default',
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  onOpen: () => void;
  variant?: 'default' | 'admin';
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
        variant === 'admin'
          ? 'border-border/70 bg-card hover:border-primary/20 hover:bg-muted/30'
          : 'border-border/60 bg-card hover:border-primary/25 hover:bg-muted/40',
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
          variant === 'admin'
            ? 'bg-primary/10 text-primary group-hover:bg-primary/15'
            : 'bg-primary/10 text-primary group-hover:bg-primary/15',
        )}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-snug text-foreground">{label}</p>
        <p
          className={cn(
            'mt-0.5 text-sm leading-snug text-muted-foreground',
            variant === 'admin' ? 'line-clamp-2' : 'line-clamp-1',
          )}
        >
          {description}
        </p>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground"
        aria-hidden
      />
    </button>
  );
}

function AdminWelcomeHero({
  schoolName,
  stats,
}: {
  schoolName: string | null;
  stats: AdminWelcomeStats;
}) {
  const statTiles = [
    { label: 'Students', value: stats.studentCount },
    { label: 'Classes', value: stats.classCount },
    { label: 'Staff', value: stats.staffCount },
    { label: 'Active prizes', value: stats.activePrizeCount },
  ];

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
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Welcome back 👋</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              This is your control center. Manage students, award points, run the prize shop, and
              power the screens around your school — all from one place.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {statTiles.map((tile) => (
            <div
              key={tile.label}
              className="rounded-xl border border-border/60 bg-primary/5 px-3 py-3 sm:px-4 sm:py-3.5"
            >
              <p className="text-xl font-bold tabular-nums tracking-tight text-foreground sm:text-2xl">
                {formatStat(tile.value)}
              </p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
                {tile.label}
              </p>
            </div>
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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary"
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

export function StaffPortalWelcomeTab({
  role,
  settings,
  onGoToTab,
  onBulkRoster,
  displayName,
  schoolName,
  adminStats,
  className,
}: StaffPortalWelcomeTabProps) {
  const tabs = staffPortalTabsForRole(role, settings).filter(
    (t) => t.value !== 'welcome',
  );
  const core = tabs.filter((t) => t.kind === 'core');
  const addons = tabs.filter((t) => t.kind === 'addon');

  const greetingName = displayName ? staffGreetingName(displayName) : '';
  const greeting = greetingName ? `Hi, ${greetingName}` : 'Welcome';

  const intro =
    role === 'teacher'
      ? 'Choose what you want to do today. Your tabs are always available on the left or across the top.'
      : schoolName?.trim()
        ? `Quick links for ${schoolName.trim()}. Open a section below or use the tabs.`
        : 'Quick links to every section. Open one below or use the tabs.';

  const isAdminHero = role === 'admin' && adminStats;

  const welcomeBody = (
    <>
      {isAdminHero ? (
        <AdminWelcomeHero
          schoolName={schoolName?.trim() || null}
          stats={adminStats}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-5 py-8 text-center sm:px-6">
          <div className="mx-auto flex max-w-md flex-col items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
              aria-hidden
            >
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">{greeting}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{intro}</p>
            </div>
          </div>
        </div>
      )}

      {role === 'admin' && onBulkRoster ? <ImportRosterCard onOpen={onBulkRoster} /> : null}

      {core.length > 0 ? (
        <section className="space-y-3">
          <h4
            className={cn(
              'font-medium text-foreground',
              role === 'admin' ? 'text-xs font-semibold uppercase tracking-wider text-muted-foreground' : 'text-sm',
            )}
          >
            {role === 'teacher' ? 'Your everyday tools' : 'Main areas'}
          </h4>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {core.map((tab) => (
              <TabLinkRow
                key={tab.value}
                icon={tab.icon}
                label={tab.label}
                description={staffPortalTabDescription(tab)}
                onOpen={() => onGoToTab(tab.value)}
                variant={role === 'admin' ? 'admin' : 'default'}
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
                variant={role === 'admin' ? 'admin' : 'default'}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );

  return (
    <StaffPortalSectionCard className={className}>
      <StaffPortalSectionCardHeader>
        <StaffPortalSectionCardTitle>
          <Sparkles className="h-5 w-5 text-primary" aria-hidden />
          Welcome
        </StaffPortalSectionCardTitle>
      </StaffPortalSectionCardHeader>
      <StaffPortalSectionCardContent className="space-y-6 p-5 sm:p-6">
        {welcomeBody}
      </StaffPortalSectionCardContent>
    </StaffPortalSectionCard>
  );
}
