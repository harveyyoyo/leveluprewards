'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  LayoutGrid,
  LogOut,
  Monitor,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { classroomSessionTimeoutMinFromSettings } from '@/lib/classroom/classroomManagementSettings';
import { isRewardsPillarOn } from '@/lib/productPillars';
import {
  ClassroomBehaviorQuickPicksEditor,
  ClassroomSchoolQuickAwardsEditor,
} from '@/components/classroom/ClassroomLabelsSetupSection';
import { ClassroomAlertRulesSection } from '@/components/classroom/ClassroomAlertRulesSection';
import { ClassroomChartPrefsEditor } from '@/components/classroom/ClassroomChartPrefsEditor';
import { ClassroomDeductSettingsEditor } from '@/components/classroom/ClassroomDeductSettingsEditor';
import type { Settings } from '@/components/providers/SettingsProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Class } from '@/lib/types';
import { cn } from '@/lib/utils';

const BehaviorTimelinePanel = dynamic(
  () =>
    import('@/components/classroom/BehaviorTimelinePanel').then((m) => ({
      default: m.BehaviorTimelinePanel,
    })),
  { ssr: false, loading: () => null },
);

type ClassAwardsLiveSettingsSectionProps = {
  schoolId: string;
  seatingScope: string;
  classes: Class[];
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  canEdit: boolean;
  parentPortalOn: boolean;
  principalTimelineOn: boolean;
  behaviorNotesRefresh?: number;
};

function SettingsPanel({
  icon: Icon,
  title,
  iconClassName,
  dense = false,
  children,
}: {
  icon: typeof SlidersHorizontal;
  title: string;
  iconClassName?: string;
  dense?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-3xl border bg-muted/15',
        dense ? 'space-y-3 p-4 md:p-5' : 'space-y-5 p-5 md:p-6',
      )}
    >
      <div className={cn('flex items-center gap-2 border-b', dense ? 'pb-2' : 'pb-3')}>
        <Icon className={iconClassName ?? 'h-4 w-4 text-violet-500'} aria-hidden />
        <p className="text-sm font-bold tracking-tight">{title}</p>
      </div>
      {children}
    </div>
  );
}

export function ClassAwardsLiveSettingsSection({
  schoolId,
  seatingScope: _seatingScope,
  classes,
  settings,
  updateSettings,
  canEdit,
  parentPortalOn,
  principalTimelineOn,
  behaviorNotesRefresh = 0,
}: ClassAwardsLiveSettingsSectionProps) {
  const classroomAutoExitOn = settings.classroomAutoLogoutEnabled !== false;
  const classroomIdleMin = classroomSessionTimeoutMinFromSettings(settings);
  const rewardsPillarOn = isRewardsPillarOn(settings);

  const [principalPreviewOpen, setPrincipalPreviewOpen] = useState(false);

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute top-0 right-0 -z-10 h-64 w-64 rounded-full bg-gradient-to-br from-violet-500/10 to-amber-500/10 blur-3xl" />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {rewardsPillarOn ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            <span className="font-medium">Connected to LevelUp Rewards</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <XCircle className="h-3.5 w-3.5" aria-hidden />
            <span>Rewards pillar off — classroom-only mode</span>
          </span>
        )}
        {!classes.length ? (
          <span className="font-medium text-amber-700 dark:text-amber-300">
            Add a class and students before launching.
          </span>
        ) : null}
        {!rewardsPillarOn ? (
          <span className="text-muted-foreground">
            Point totals: turn on <span className="font-semibold text-foreground">Point balances</span> and{' '}
            <span className="font-semibold text-foreground">Session badges</span> under Desk display on the monitor.
          </span>
        ) : null}
      </div>

      <SettingsPanel icon={SlidersHorizontal} title="Chart defaults">
        <p className="text-[11px] leading-snug text-muted-foreground">
          Award source and quick deduct are saved school-wide. Default points, sounds, and display options are on
          the monitor toolbar.
        </p>
        <ClassroomChartPrefsEditor
          schoolId={schoolId}
          scope={_seatingScope}
          disabled={!canEdit}
          rewardsPillarOn={rewardsPillarOn}
          embedded
        />
        <ClassroomDeductSettingsEditor
          settings={settings}
          updateSettings={updateSettings}
          disabled={!canEdit}
        />
      </SettingsPanel>

      <SettingsPanel icon={ShieldCheck} title="School access" iconClassName="h-4 w-4 text-indigo-500">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border bg-card/60 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <Label htmlFor="enable-principal-timeline" className="text-sm font-bold">
                  Principal timeline
                </Label>
                <p className="text-[11px] text-muted-foreground">School-wide behavior feed for admins.</p>
              </div>
              <Switch
                id="enable-principal-timeline"
                checked={principalTimelineOn}
                disabled={!canEdit}
                onCheckedChange={(v) => updateSettings({ enablePrincipalBehaviorTimeline: v })}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 h-8 rounded-lg text-xs"
              disabled={!principalTimelineOn}
              onClick={() => setPrincipalPreviewOpen(true)}
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Preview
            </Button>
          </div>

          <div className="rounded-2xl border bg-card/60 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <Label htmlFor="enable-parent-view" className="text-sm font-bold">
                  Parent portal
                </Label>
                <p className="text-[11px] text-muted-foreground">Families view shared notes and points.</p>
              </div>
              <Switch
                id="enable-parent-view"
                checked={parentPortalOn}
                disabled={!canEdit}
                onCheckedChange={(v) => updateSettings({ enableParentView: v })}
              />
            </div>
            <Button asChild variant="outline" size="sm" className="mt-2 h-8 rounded-lg text-xs" disabled={!parentPortalOn}>
              <Link href={`/${schoolId}/parent`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Open portal
              </Link>
            </Button>
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel dense icon={Sparkles} title="Awards & note labels" iconClassName="h-4 w-4 text-amber-500">
        <p className="text-[11px] text-muted-foreground">
          School-wide quick-award buttons and behavior-note phrases. Open each category to edit.
        </p>
        <div className="space-y-2">
          <ClassroomSchoolQuickAwardsEditor
            settings={settings}
            updateSettings={updateSettings}
            disabled={!canEdit}
            popup
          />
          <ClassroomBehaviorQuickPicksEditor
            settings={settings}
            updateSettings={updateSettings}
            disabled={!canEdit}
            popup
          />
        </div>
      </SettingsPanel>

      <SettingsPanel icon={LayoutGrid} title="If / then alerts">
        <p className="text-[11px] text-muted-foreground">
          Auto-create notes when award or note counts hit a threshold in a time window.
        </p>
        <ClassroomAlertRulesSection
          settings={settings}
          updateSettings={updateSettings}
          disabled={!canEdit}
        />
      </SettingsPanel>

      <SettingsPanel icon={Monitor} title="Monitor session" iconClassName="h-4 w-4 text-slate-500">
        <div className="rounded-2xl border bg-card/60 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <LogOut className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
                <Label htmlFor="classroom-auto-exit" className="text-sm font-bold">
                  Auto-exit when idle
                </Label>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Return to the portal after inactivity on shared classroom devices.
              </p>
            </div>
            <Switch
              id="classroom-auto-exit"
              checked={classroomAutoExitOn}
              disabled={!canEdit}
              onCheckedChange={(v) => updateSettings({ classroomAutoLogoutEnabled: v })}
              aria-label="Enable live monitor auto-exit"
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/40 pt-2">
            <Label htmlFor="classroom-idle-minutes" className="text-[11px] font-semibold text-muted-foreground">
              Idle minutes
            </Label>
            <Input
              id="classroom-idle-minutes"
              type="number"
              min={1}
              max={1440}
              className="h-8 w-16 rounded-lg text-center text-sm font-bold"
              value={classroomIdleMin}
              disabled={!canEdit || !classroomAutoExitOn}
              onChange={(e) =>
                updateSettings({
                  classroomSessionTimeoutMs: Math.max(1, parseInt(e.target.value, 10) || 1) * 60_000,
                })
              }
            />
          </div>
        </div>
      </SettingsPanel>

      <Dialog open={principalPreviewOpen} onOpenChange={setPrincipalPreviewOpen}>
        <DialogContent wide className="max-h-[min(90vh,720px)] overflow-hidden p-0 sm:rounded-2xl">
          <DialogHeader className="border-b px-4 py-3 sm:px-6">
            <DialogTitle>Principal timeline preview</DialogTitle>
            <DialogDescription>
              School-wide behavior notes from every class.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(75vh,640px)] overflow-y-auto p-4 sm:p-6">
            <BehaviorTimelinePanel
              schoolId={schoolId}
              refreshToken={behaviorNotesRefresh}
              embedded
              mode="principal"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
