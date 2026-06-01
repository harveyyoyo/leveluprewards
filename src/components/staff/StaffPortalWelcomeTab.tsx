'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowRight, TableProperties } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  className?: string;
};

function TabLinkCard({
  icon: Icon,
  label,
  description,
  kind,
  onOpen,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  kind: 'core' | 'addon';
  onOpen: () => void;
}) {
  return (
    <Card className="rounded-2xl border-border/70 shadow-sm transition-colors hover:border-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-bold leading-tight">{label}</CardTitle>
            {kind === 'addon' ? (
              <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Add-on
              </p>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl font-semibold gap-1.5"
          onClick={onOpen}
        >
          Open {label}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </CardContent>
    </Card>
  );
}

export function StaffPortalWelcomeTab({
  role,
  settings,
  onGoToTab,
  onBulkRoster,
  includeDeveloperBackups = false,
  className,
}: StaffPortalWelcomeTabProps) {
  const tabs = staffPortalTabsForRole(role, settings, { includeDeveloperBackups }).filter(
    (t) => t.value !== 'welcome',
  );
  const core = tabs.filter((t) => t.kind === 'core');
  const addons = tabs.filter((t) => t.kind === 'addon');

  const intro =
    role === 'teacher'
      ? 'Use the sections below for daily teaching tasks. Pin optional tabs from Add more when you want them in the sidebar or top row.'
      : 'School setup and daily operations live in the sections below. Pin optional features from Add more to keep them one click away.';

  return (
    <div className={cn('space-y-8', className)}>
      <div>
        <h3 className="text-xl font-bold tracking-tight">Welcome</h3>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground leading-relaxed">{intro}</p>
      </div>

      {role === 'admin' && onBulkRoster ? (
        <Card className="rounded-2xl border-dashed border-primary/40 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <TableProperties className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Bulk roster & AI import</CardTitle>
                <CardDescription className="mt-1 text-sm">
                  Import classes, teachers, and students with CSV templates, or paste spreadsheets, exports,
                  or notes and let AI detect columns and build your roster — useful for a new school year or
                  migrating from another system.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Button type="button" className="rounded-xl font-semibold gap-2" onClick={onBulkRoster}>
              <TableProperties className="h-4 w-4" aria-hidden />
              Open bulk roster & AI import
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {core.length > 0 ? (
        <section className="space-y-3">
          <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Main sections</h4>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {core.map((tab) => (
              <TabLinkCard
                key={tab.value}
                icon={tab.icon}
                label={tab.label}
                description={staffPortalTabDescription(tab)}
                kind={tab.kind}
                onOpen={() => onGoToTab(tab.value)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {addons.length > 0 ? (
        <section className="space-y-3">
          <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Optional features
          </h4>
          <p className="text-xs text-muted-foreground">
            These may appear in your tab bar when enabled and pinned, or under Add more.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {addons.map((tab) => (
              <TabLinkCard
                key={tab.value}
                icon={tab.icon}
                label={tab.label}
                description={staffPortalTabDescription(tab)}
                kind={tab.kind}
                onOpen={() => onGoToTab(tab.value)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
