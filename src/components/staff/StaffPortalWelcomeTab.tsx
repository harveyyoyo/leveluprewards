'use client';

import type { LucideIcon } from 'lucide-react';
import { ChevronRight, Sparkles, TableProperties } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  staffPortalTabDescription,
  staffPortalTabsForRole,
  type StaffPortalRole,
} from '@/lib/staffPortal';
import type { Settings } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';

type StaffPortalWelcomeTabProps = {
  role: StaffPortalRole;
  settings: Settings;
  onGoToTab: (tabValue: string) => void;
  /** Admin-only: open bulk CSV roster import. */
  onBulkRoster?: () => void;
  includeDeveloperBackups?: boolean;
  /** First name or display name for a personal greeting. */
  displayName?: string | null;
  /** Shown on admin welcome when available. */
  schoolName?: string | null;
  className?: string;
};

function firstName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

/** One short line — easier to scan than full registry copy. */
function shortTabBlurb(description: string): string {
  const sentence = description.split(/(?<=[.!?])\s+/)[0]?.trim() ?? description;
  if (sentence.length <= 80) return sentence;
  return `${sentence.slice(0, 77).trimEnd()}…`;
}

function TabLinkRow({
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
        'group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3.5 text-left',
        'transition-colors hover:border-primary/25 hover:bg-muted/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
      )}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15"
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-snug text-foreground">{label}</p>
        <p className="mt-0.5 text-sm leading-snug text-muted-foreground line-clamp-1">
          {shortTabBlurb(description)}
        </p>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground"
        aria-hidden
      />
    </button>
  );
}

export function StaffPortalWelcomeTab({
  role,
  settings,
  onGoToTab,
  onBulkRoster,
  includeDeveloperBackups = false,
  displayName,
  schoolName,
  className,
}: StaffPortalWelcomeTabProps) {
  const tabs = staffPortalTabsForRole(role, settings, { includeDeveloperBackups }).filter(
    (t) => t.value !== 'welcome',
  );
  const core = tabs.filter((t) => t.kind === 'core');
  const addons = tabs.filter((t) => t.kind === 'addon');

  const greetingName = displayName ? firstName(displayName) : '';
  const greeting = greetingName ? `Hi, ${greetingName}` : 'Welcome';

  const intro =
    role === 'teacher'
      ? 'Choose what you want to do today. Your tabs are always available on the left or across the top.'
      : schoolName?.trim()
        ? `Quick links for ${schoolName.trim()}. Open a section below or use the tabs.`
        : 'Quick links to every section. Open one below or use the tabs.';

  return (
    <div className={cn('space-y-6', className)}>
      <div className="rounded-2xl border border-border/50 bg-muted/25 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary"
            aria-hidden
          >
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">{greeting}</h3>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">{intro}</p>
          </div>
        </div>
      </div>

      {role === 'admin' && onBulkRoster ? (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"
              aria-hidden
            >
              <TableProperties className="h-4 w-4" />
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
            onClick={onBulkRoster}
          >
            Open import
          </Button>
        </div>
      ) : null}

      {core.length > 0 ? (
        <section className="space-y-2.5">
          <h4 className="text-sm font-medium text-foreground">
            {role === 'teacher' ? 'Your everyday tools' : 'Main areas'}
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {core.map((tab) => (
              <TabLinkRow
                key={tab.value}
                icon={tab.icon}
                label={tab.label}
                description={staffPortalTabDescription(tab)}
                onOpen={() => onGoToTab(tab.value)}
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
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
