'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { prefetchBehaviorNotes } from '@/lib/classroom/behaviorNotesClient';
import {
  CheckCircle2,
  ExternalLink,
  LayoutGrid,
  LogOut,
  Monitor,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Timer,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { classroomSessionTimeoutMinFromSettings } from '@/lib/classroom/classroomManagementSettings';
import {
  classroomMonitorPointsDisplayLabel,
  normalizeClassroomMonitorPointsDisplay,
  type ClassroomMonitorPointsDisplay,
} from '@/lib/classroom/classroomMonitorDisplaySettings';
import { isPillarOn, isRewardsPillarOn } from '@/lib/productPillars';
import { BathroomPassTimerSettings } from '@/components/classroom/BathroomPassTimerSettings';
import {
  ClassroomBehaviorQuickPicksEditor,
  ClassroomSchoolQuickAwardsEditor,
} from '@/components/classroom/ClassroomLabelsSetupSection';
import { ClassroomAlertRulesSection } from '@/components/classroom/ClassroomAlertRulesSection';
import { ClassroomLaunchMonitorButton } from '@/components/classroom/ClassroomLaunchMonitorButton';
import { ClassroomPointDeductionSettingsEditor } from '@/components/classroom/ClassroomPointDeductionSettingsEditor';
import type { Settings } from '@/components/providers/SettingsProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  const studentDisplayOn = settings.classroomStudentDisplayEnabled !== false;
  const pointsDisplay = normalizeClassroomMonitorPointsDisplay(settings.classroomMonitorPointsDisplay);
  const includeSessionLastAward = settings.classroomMonitorIncludeSessionLastAward !== false;
  const includeLastName = settings.classroomMonitorIncludeLastName === true;
  const includeStudentEmoji = settings.classroomMonitorIncludeStudentEmoji === true;
  const balanceLabel = rewardsPillarOn ? 'LevelUp reward balance' : 'Classroom point balance';
  const classSignInEnabled = isPillarOn(settings, 'payAttendance') && !!settings.enableClassSignIn;

  const firestore = useFirestore();
  const [principalPreviewOpen, setPrincipalPreviewOpen] = useState(false);

  const openPrincipalPreview = () => {
    prefetchBehaviorNotes(schoolId, firestore);
    setPrincipalPreviewOpen(true);
  };

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none absolute top-0 right-0 -z-10 h-64 w-64 rounded-full bg-gradient-to-br from-violet-500/10 to-amber-500/10 blur-3xl" />

      <div className="rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-background to-amber-500/5 p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <ClassroomLaunchMonitorButton
            schoolId={schoolId}
            seatingScope={_seatingScope}
            classes={classes}
            audience="teacher"
          />
          {studentDisplayOn ? (
            <ClassroomLaunchMonitorButton
              schoolId={schoolId}
              seatingScope={_seatingScope}
              classes={classes}
              audience="student"
            />
          ) : null}
        </div>
        <p className="mt-3 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
          Open the teacher monitor for quick awards during the lesson. Use{' '}
          <span className="font-semibold text-foreground">Launch for class screen</span> on your projector
          — it mirrors the chart live but hides behavior comments and notes.
        </p>
      </div>

      <p className="text-sm font-bold tracking-tight text-foreground">Settings</p>

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
            Configure point display below — teachers can still adjust on the live monitor toolbar.
          </span>
        ) : null}
      </div>

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
              onClick={openPrincipalPreview}
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
          School-wide quick-award buttons and behavior-note phrases. With Local rewards, each quick-award
          button becomes its own category. Open each section to edit.
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
        <ClassroomPointDeductionSettingsEditor
          settings={settings}
          updateSettings={updateSettings}
          disabled={!canEdit}
        />
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

      <SettingsPanel icon={Monitor} title="Desk display" iconClassName="h-4 w-4 text-emerald-500">
        <p className="text-[11px] text-muted-foreground">
          Default for the live monitor and class screen. Session totals are on-screen only and can be reset
          without changing stored student points.
        </p>
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card/60 p-3">
            <p className="text-sm font-bold">How to show point totals</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Choose whether desks show {balanceLabel.toLowerCase()}, session totals earned today, both, or
              neither.
            </p>
            <RadioGroup
              value={pointsDisplay}
              disabled={!canEdit}
              onValueChange={(v) =>
                updateSettings({
                  classroomMonitorPointsDisplay: v as ClassroomMonitorPointsDisplay,
                })
              }
              className="mt-3 gap-2"
            >
              {(['off', 'balance', 'session', 'both'] as const).map((mode) => (
                <label key={mode} className="flex cursor-pointer items-start gap-2">
                  <RadioGroupItem value={mode} className="mt-0.5" aria-label={classroomMonitorPointsDisplayLabel(mode)} />
                  <span className="text-xs leading-snug">
                    <span className="font-semibold">{classroomMonitorPointsDisplayLabel(mode)}</span>
                    {mode === 'balance' ? (
                      <span className="block text-[10px] text-muted-foreground">{balanceLabel}</span>
                    ) : null}
                    {mode === 'session' ? (
                      <span className="block text-[10px] text-muted-foreground">
                        Resets with the monitor Reset screen button — stored points stay the same.
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="rounded-2xl border bg-card/60 p-3">
            <p className="text-sm font-bold">What to include on desks</p>
            <div className="mt-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <Label htmlFor="classroom-include-session-label" className="text-sm font-bold">
                    Last award label
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Show the latest quick-award phrase under session totals.
                  </p>
                </div>
                <Switch
                  id="classroom-include-session-label"
                  checked={includeSessionLastAward}
                  disabled={!canEdit || pointsDisplay === 'off' || pointsDisplay === 'balance'}
                  onCheckedChange={(v) => updateSettings({ classroomMonitorIncludeSessionLastAward: v })}
                />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <Label htmlFor="classroom-include-last-name" className="text-sm font-bold">
                    Last names
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Append surname after each desk label.</p>
                </div>
                <Switch
                  id="classroom-include-last-name"
                  checked={includeLastName}
                  disabled={!canEdit}
                  onCheckedChange={(v) => updateSettings({ classroomMonitorIncludeLastName: v })}
                />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <Label htmlFor="classroom-include-student-emoji" className="text-sm font-bold">
                    Student emoji
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Sticker or theme emoji on avatars (photo still wins when set).
                  </p>
                </div>
                <Switch
                  id="classroom-include-student-emoji"
                  checked={includeStudentEmoji}
                  disabled={!canEdit}
                  onCheckedChange={(v) => updateSettings({ classroomMonitorIncludeStudentEmoji: v })}
                />
              </div>
            </div>
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel icon={Monitor} title="Monitor session" iconClassName="h-4 w-4 text-slate-500">
        <div className="space-y-3">
          <div className="rounded-2xl border bg-card/60 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <Label htmlFor="classroom-student-display" className="text-sm font-bold">
                  Class screen launch
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Show a second launch button for a read-only class projector view. Behavior comments and
                  notes are hidden on that screen.
                </p>
              </div>
              <Switch
                id="classroom-student-display"
                checked={studentDisplayOn}
                disabled={!canEdit}
                onCheckedChange={(v) => updateSettings({ classroomStudentDisplayEnabled: v })}
                aria-label="Enable class screen launch"
              />
            </div>
          </div>

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
        </div>
      </SettingsPanel>

      <SettingsPanel icon={Timer} title="Bathroom pass timer" iconClassName="h-4 w-4 text-violet-500">
        <BathroomPassTimerSettings
          classSignInEnabled={classSignInEnabled}
          enableBathroomTimer={settings.enableBathroomTimer ?? true}
          bathroomMaxMinutes={settings.bathroomMaxMinutes ?? 5}
          bathroomRequirePresent={settings.bathroomRequirePresent ?? true}
          canEdit={canEdit}
          onChange={updateSettings}
        />
      </SettingsPanel>

      <Dialog
        open={principalPreviewOpen}
        onOpenChange={(open) => {
          if (open) prefetchBehaviorNotes(schoolId, firestore);
          setPrincipalPreviewOpen(open);
        }}
      >
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
