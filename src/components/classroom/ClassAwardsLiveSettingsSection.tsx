'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import {
  ArrowUpRight,
  ExternalLink,
  LayoutGrid,
  LogOut,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { classroomSessionTimeoutMinFromSettings } from '@/lib/classroom/classroomManagementSettings';
import { isRewardsPillarOn } from '@/lib/productPillars';
import { openClassroomFullscreenTab } from '@/lib/classroomPointsUrl';
import { CLASSROOM_SEATING_SECTION_LABEL } from '@/lib/classroom/classroomTabSections';
import {
  ClassroomBehaviorQuickPicksEditor,
  ClassroomSchoolQuickAwardsEditor,
} from '@/components/classroom/ClassroomLabelsSetupSection';
import { ClassroomAlertRulesSection } from '@/components/classroom/ClassroomAlertRulesSection';
import { ClassroomChartPrefsEditor } from '@/components/classroom/ClassroomChartPrefsEditor';
import { ClassroomSectionFrame } from '@/components/classroom/ClassroomSectionFrame';
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

export function ClassAwardsLiveSettingsSection({
  schoolId,
  seatingScope,
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

  const openMonitorDisplay = useCallback(() => {
    if (!classes.length) return;
    const saved =
      typeof window !== 'undefined' ? localStorage.getItem('defaultClassId')?.trim() : '';
    const classId =
      saved && classes.some((c) => c.id === saved) ? saved : (classes[0]?.id ?? '');
    if (!classId) return;
    openClassroomFullscreenTab({
      schoolId,
      classId,
      scope: seatingScope,
    });
  }, [classes, schoolId, seatingScope]);

  return (
    <ClassroomSectionFrame
      title={CLASSROOM_SEATING_SECTION_LABEL}
      icon={LayoutGrid}
      description="Launch the live awards monitor and configure school-wide classroom tools."
      headerExtra={
        <Button
          type="button"
          className="gap-2 rounded-xl border-0 bg-gradient-to-r from-violet-500 to-violet-600 font-bold text-white shadow-md shadow-violet-500/25 transition-all hover:scale-[1.02] hover:from-violet-600 hover:to-violet-700 active:scale-[0.98]"
          disabled={!classes.length}
          onClick={openMonitorDisplay}
        >
          Launch Monitor Display
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Button>
      }
    >
      <div className="space-y-6">
        <section className="space-y-3">
          <div>
            <h4 className="text-sm font-black tracking-tight text-foreground">Live monitor</h4>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Open the seating chart and quick awards on a projector, board, or classroom tablet. Use{' '}
              <span className="font-semibold text-foreground">Class</span> (when you have more than one),{' '}
              <span className="font-semibold text-foreground">Chart style</span>,{' '}
              <span className="font-semibold text-foreground">Layout</span>,{' '}
              <span className="font-semibold text-foreground">Desk display</span>, and{' '}
              <span className="font-semibold text-foreground">Toolbar options</span> on the monitor — toolbar
              buttons update live as you change options.
            </p>
          </div>
          {!classes.length ? (
            <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
              Add a class and students before launching the live awards monitor.
            </p>
          ) : classes.length > 1 ? (
            <p className="text-xs text-muted-foreground">
              Choose the class on the monitor with the <span className="font-semibold text-foreground">Class</span>{' '}
              menu. Launch opens your last-used class or the first in your list.
            </p>
          ) : null}
        </section>

        <section className="space-y-3">
          <div>
            <h4 className="text-sm font-black tracking-tight text-foreground">Chart defaults</h4>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Default points, sounds, correction shortcut
              {rewardsPillarOn ? ', and award source (local vs reward categories)' : ''} — saved for your account
              on this device. Chart style, layout, desk display, and toolbar options are on the live monitor.
            </p>
          </div>
          <ClassroomChartPrefsEditor
            schoolId={schoolId}
            scope={seatingScope}
            disabled={!canEdit}
            rewardsPillarOn={rewardsPillarOn}
          />
        </section>

        <section className="space-y-3">
          <div>
            <h4 className="text-sm font-black tracking-tight text-foreground">School access</h4>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Who can see behavior data outside your class monitor.
            </p>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
                    <Label htmlFor="enable-principal-timeline" className="text-sm font-bold">
                      Principal timeline
                    </Label>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    When on, principals and admins can open a school-wide behavior timeline — all classes,
                    positives, concerns, and incidents.
                  </p>
                </div>
                <Switch
                  id="enable-principal-timeline"
                  checked={principalTimelineOn}
                  disabled={!canEdit}
                  onCheckedChange={(v) => updateSettings({ enablePrincipalBehaviorTimeline: v })}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-border/40 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={!principalTimelineOn}
                  onClick={() => setPrincipalPreviewOpen(true)}
                >
                  <ExternalLink className="mr-2 h-3.5 w-3.5" aria-hidden />
                  Preview principal timeline
                </Button>
                {!principalTimelineOn ? (
                  <p className="self-center text-xs text-muted-foreground">
                    Turn on to preview the school-wide view.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
                    <Label htmlFor="enable-parent-view" className="text-sm font-bold">
                      Parent portal
                    </Label>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Off by default. When on, families sign in with the parent email on file to view shared behavior
                    notes and student points.
                  </p>
                </div>
                <Switch
                  id="enable-parent-view"
                  checked={parentPortalOn}
                  disabled={!canEdit}
                  onCheckedChange={(v) => updateSettings({ enableParentView: v })}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
                <Button asChild variant="outline" size="sm" className="rounded-xl" disabled={!parentPortalOn}>
                  <Link href={`/${schoolId}/parent`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-3.5 w-3.5" aria-hidden />
                    Open parent portal
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Sign-in URL: <span className="font-mono text-foreground">/{schoolId}/parent</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h4 className="text-sm font-black tracking-tight text-foreground">Awards & note labels</h4>
            <p className="text-xs leading-relaxed text-muted-foreground">
              School-wide quick award buttons and behavior-note phrases for every class monitor.
            </p>
          </div>
          <ClassroomSchoolQuickAwardsEditor
            settings={settings}
            updateSettings={updateSettings}
            disabled={!canEdit}
          />
          <ClassroomBehaviorQuickPicksEditor
            settings={settings}
            updateSettings={updateSettings}
            disabled={!canEdit}
          />
        </section>

        <section className="space-y-3">
          <div>
            <h4 className="text-sm font-black tracking-tight text-foreground">If / then alerts</h4>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Auto-create behavior notes when students hit award or note thresholds in a time window.
            </p>
          </div>
          <ClassroomAlertRulesSection
            settings={settings}
            updateSettings={updateSettings}
            disabled={!canEdit}
          />
        </section>

        <section className="space-y-3">
          <div>
            <h4 className="text-sm font-black tracking-tight text-foreground">Monitor session</h4>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Idle timeout for the live awards monitor on shared classroom devices.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <LogOut className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
                  <Label htmlFor="classroom-auto-exit" className="text-sm font-bold">
                    Auto-exit when idle
                  </Label>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Return to the portal after inactivity — separate from staff or kiosk auto-logout.
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
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/40 pt-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="classroom-idle-minutes" className="text-xs font-semibold text-muted-foreground">
                  Idle minutes
                </Label>
                <Input
                  id="classroom-idle-minutes"
                  type="number"
                  min={1}
                  max={1440}
                  className="h-9 w-20 rounded-xl text-center font-bold"
                  value={classroomIdleMin}
                  disabled={!canEdit || !classroomAutoExitOn}
                  onChange={(e) =>
                    updateSettings({
                      classroomSessionTimeoutMs: Math.max(1, parseInt(e.target.value, 10) || 1) * 60_000,
                    })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {classroomAutoExitOn
                  ? 'Tap, click, scroll, or keyboard activity resets the timer.'
                  : 'Live awards monitor stays open until closed manually.'}
              </p>
            </div>
          </div>
        </section>
      </div>

      <Dialog open={principalPreviewOpen} onOpenChange={setPrincipalPreviewOpen}>
        <DialogContent wide className="max-h-[min(90vh,720px)] overflow-hidden p-0 sm:rounded-2xl">
          <DialogHeader className="border-b px-4 py-3 sm:px-6">
            <DialogTitle>Principal timeline preview</DialogTitle>
            <DialogDescription>
              School-wide behavior notes from every class — what principals see when this feature is enabled.
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
    </ClassroomSectionFrame>
  );
}
