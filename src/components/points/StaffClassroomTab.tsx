'use client';

import dynamic from 'next/dynamic';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { BellRing, ExternalLink, LayoutGrid, LogOut, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { useAppContext } from '@/components/AppProvider';
import { useFirebase } from '@/firebase';
import { ensureDeveloperSchoolAccess } from '@/lib/classroom/ensureDeveloperSchoolAccess';
import { isAllowedDeveloperGoogleUser } from '@/lib/developerAccess';
import { buildClassroomSections, CLASSROOM_SEATING_SECTION_LABEL } from '@/lib/classroom/classroomTabSections';
import {
  classroomSessionTimeoutMinFromSettings,
} from '@/lib/classroom/classroomManagementSettings';
import { ClassroomPointsPanel } from '@/components/points/ClassroomPointsPanel';
import { useSettings } from '@/components/providers/SettingsProvider';
import { filterCategoriesForStaffPortal } from '@/lib/staffCategoryScope';
import { isClassroomOnlyMode, isClassroomPillarOn, CLASSROOM_SESSION_ONLY } from '@/lib/productPillars';
import { ClassroomSetupWizardTrigger } from '@/app/[schoolId]/admin/sections/ClassroomSetupWizard';
import { ClassroomManagementHelpWizard } from '@/components/classroom/ClassroomManagementHelpWizard';
import { ClassroomLabelsSetupSection } from '@/components/classroom/ClassroomLabelsSetupSection';
import { ClassroomRoomDisplaySection } from '@/components/classroom/ClassroomRoomDisplaySection';
import { ClassroomAlertRulesSection } from '@/components/classroom/ClassroomAlertRulesSection';
import { ClassroomSectionFrame } from '@/components/classroom/ClassroomSectionFrame';
import {
  ClassroomSeatingShortcutsHint,
  type ClassroomSeatingShortcutsHintState,
} from '@/components/points/classroomSeatingShortcutsHint';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ManualPointsAwardDialog } from '@/components/points/ManualPointsAwardDialog';
import type { Category, Class, Student } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { StaffPointsTabVariant } from '@/components/points/StaffPointsTab';
import { ClassroomTabLayout } from '@/components/points/ClassroomTabLayout';

const BehaviorTimelinePanel = dynamic(
  () =>
    import('@/components/classroom/BehaviorTimelinePanel').then((m) => ({
      default: m.BehaviorTimelinePanel,
    })),
  { ssr: false, loading: () => null },
);

const CLASSROOM_SECTION_CARD =
  'w-full overflow-visible border-t-4 border-violet-500 bg-background shadow-md';

export type StaffClassroomTabProps = {
  variant: StaffPointsTabVariant;
  schoolId: string;
  categories: Category[] | null | undefined;
  classes: Class[] | null | undefined;
  students: Student[] | null | undefined;
  managerTeacherId?: string;
  schoolWideAccess?: boolean;
  isGraphic?: boolean;
  className?: string;
  manualAccentColor?: string;
  manualBudgetOptions?: React.ComponentProps<typeof ManualPointsAwardDialog>['budgetOptions'];
};

export function StaffClassroomTab({
  variant,
  schoolId,
  categories,
  classes,
  students,
  managerTeacherId,
  schoolWideAccess = false,
  isGraphic,
  className,
  manualAccentColor,
  manualBudgetOptions,
}: StaffClassroomTabProps) {
  /** Defer roster updates so Firestore snapshots do not block scroll on the staff portal page. */
  const deferredStudents = useDeferredValue(students ?? []);
  const { loginState } = useAppContext();
  const { user } = useFirebase();
  const { settings, updateSettings } = useSettings();
  const classroomOn = isClassroomPillarOn(settings);
  const sessionOnly = isClassroomOnlyMode(settings);
  const isAdminVariant = variant === 'admin';
  /** Teachers and admins share classroom setup toggles when the pillar is on. */
  const canEditClassroomSetup = classroomOn;
  /** Turning on the Classroom pillar itself stays admin-only. */
  const canEnableClassroomPillar = isAdminVariant;
  const parentPortalOn = settings.enableParentView === true;
  const principalTimelineOn = settings.enablePrincipalBehaviorTimeline === true;
  const classroomAutoExitOn = settings.classroomAutoLogoutEnabled !== false;
  const classroomIdleMin = classroomSessionTimeoutMinFromSettings(settings);

  useEffect(() => {
    if (!classroomOn || !schoolId) return;
    if (loginState !== 'developer' && loginState !== 'admin') return;
    if (!isAllowedDeveloperGoogleUser(user)) return;
    void ensureDeveloperSchoolAccess(schoolId).catch(() => {
      /* save path retries provisioning */
    });
  }, [classroomOn, loginState, schoolId, user]);

  const categoryList = filterCategoriesForStaffPortal(categories, {
    schoolWideAccess: isAdminVariant || schoolWideAccess,
    managerTeacherId,
    printOnly: false,
  });
  const sortedClasses = useMemo(
    () => (classes ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    [classes],
  );
  const seatingScope = managerTeacherId ?? (isAdminVariant ? 'admin' : 'staff');
  const [behaviorNotesRefresh, setBehaviorNotesRefresh] = useState(0);
  const [principalPreviewOpen, setPrincipalPreviewOpen] = useState(false);
  const onBehaviorNoteSaved = useCallback(() => {
    setBehaviorNotesRefresh((n) => n + 1);
  }, []);

  const sections = useMemo(() => buildClassroomSections(), []);

  const seatingDescription = sessionOnly ? CLASSROOM_SESSION_ONLY.tabBody : undefined;

  const [sectionHint, setSectionHint] = useState<ClassroomSeatingShortcutsHintState | null>(null);
  const onSectionHintChange = useCallback((state: ClassroomSeatingShortcutsHintState | null) => {
    setSectionHint(state);
  }, []);

  const setupContent = useMemo(
    () => (
      <ClassroomSectionFrame
        title="Setup"
        description="Control what principals and families can see, and full-screen classroom session timing."
      >
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
                  When on, principals and admins can open a school-wide behavior timeline — all classes, positives,
                  concerns, and incidents.
                </p>
              </div>
              <Switch
                id="enable-principal-timeline"
                checked={principalTimelineOn}
                disabled={!canEditClassroomSetup}
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
                <p className="self-center text-xs text-muted-foreground">Turn on to preview the school-wide view.</p>
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
                  When on, families sign in with the parent email on file to view shared behavior notes and student
                  points.
                </p>
              </div>
              <Switch
                id="enable-parent-view"
                checked={parentPortalOn}
                disabled={!canEditClassroomSetup}
                onCheckedChange={(v) => updateSettings({ enableParentView: v })}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={!parentPortalOn}
              >
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

          <ClassroomLabelsSetupSection
            settings={settings}
            updateSettings={updateSettings}
            disabled={!canEditClassroomSetup}
          />

          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <LogOut className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
                  <Label htmlFor="classroom-auto-exit" className="text-sm font-bold">
                    Full-screen auto-exit
                  </Label>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  When teachers use the full-screen classroom view on a shared tablet or projector PC,
                  return to the portal after idle time — separate from staff or kiosk auto-logout.
                </p>
              </div>
              <Switch
                id="classroom-auto-exit"
                checked={classroomAutoExitOn}
                disabled={!canEditClassroomSetup}
                onCheckedChange={(v) => updateSettings({ classroomAutoLogoutEnabled: v })}
                aria-label="Enable full-screen classroom auto-exit"
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
                  disabled={!canEditClassroomSetup || !classroomAutoExitOn}
                  onChange={(e) =>
                    updateSettings({
                      classroomSessionTimeoutMs:
                        Math.max(1, parseInt(e.target.value, 10) || 1) * 60_000,
                    })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {classroomAutoExitOn
                  ? 'Tap, click, scroll, or keyboard activity resets the timer.'
                  : 'Full-screen classroom stays open until closed manually.'}
              </p>
            </div>
          </div>
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
    ),
    [
      canEditClassroomSetup,
      classroomAutoExitOn,
      classroomIdleMin,
      parentPortalOn,
      principalTimelineOn,
      schoolId,
      behaviorNotesRefresh,
      principalPreviewOpen,
      settings,
      updateSettings,
    ],
  );

  const seatingPanel = useMemo(
    () => (
      <ClassroomPointsPanel
        schoolId={schoolId}
        students={deferredStudents}
        classes={sortedClasses}
        categories={categoryList}
        storageScope={seatingScope}
        accentColor={manualAccentColor}
        isGraphic={isGraphic}
        budgetOptions={manualBudgetOptions}
        sessionOnly={sessionOnly}
        onBehaviorNoteSaved={onBehaviorNoteSaved}
        onSectionHintChange={onSectionHintChange}
      />
    ),
    [
      schoolId,
      deferredStudents,
      sortedClasses,
      categoryList,
      seatingScope,
      manualAccentColor,
      isGraphic,
      manualBudgetOptions,
      sessionOnly,
      onBehaviorNoteSaved,
      onSectionHintChange,
    ],
  );

  const seatingContent = (
    <ClassroomSectionFrame
      title={CLASSROOM_SEATING_SECTION_LABEL}
      icon={LayoutGrid}
      description={seatingDescription}
      titleBelow={sectionHint ? <ClassroomSeatingShortcutsHint {...sectionHint} /> : null}
    >
      {seatingPanel}
    </ClassroomSectionFrame>
  );

  const behaviorContent = useMemo(
    () => (
      <BehaviorTimelinePanel
        schoolId={schoolId}
        refreshToken={behaviorNotesRefresh}
        embedded
        mode="behavior"
      />
    ),
    [schoolId, behaviorNotesRefresh],
  );

  const alertsContent = useMemo(
    () => (
      <ClassroomSectionFrame
        title="If / then alerts"
        icon={BellRing}
        description="Automatic behavior notes when students hit award or note thresholds in a time window."
      >
        <ClassroomAlertRulesSection
          settings={settings}
          updateSettings={updateSettings}
          disabled={!canEditClassroomSetup}
        />
      </ClassroomSectionFrame>
    ),
    [settings, updateSettings, canEditClassroomSetup],
  );

  const roomDisplayContent = useMemo(
    () => (
      <ClassroomRoomDisplaySection
        schoolId={schoolId}
        scope={seatingScope}
        classes={sortedClasses}
        students={deferredStudents}
      />
    ),
    [schoolId, seatingScope, sortedClasses, deferredStudents],
  );

  const headerAction = useMemo(
    () => <ClassroomManagementHelpWizard sections={sections} />,
    [sections],
  );

  if (!classroomOn) {
    return (
      <Card className={cn(CLASSROOM_SECTION_CARD, className)}>
        <CardHeader className="border-b border-border/40 bg-secondary/35 p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight sm:text-2xl">
            <LayoutGrid className="h-5 w-5 shrink-0 text-violet-500 sm:h-6 sm:w-6" aria-hidden />
            Classroom Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {canEnableClassroomPillar
              ? 'Classroom Management is not enabled. Run the setup wizard to turn on seating charts and quick awards for teachers.'
              : 'Classroom Management is not enabled for your school yet. Ask a school administrator to turn it on.'}
          </p>
          {canEnableClassroomPillar ? (
            <ClassroomSetupWizardTrigger
              schoolId={schoolId}
              classes={sortedClasses}
              students={students ?? []}
              updateSettings={updateSettings}
            />
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <ClassroomTabLayout
      className={className}
      defaultSection="seating"
      sections={sections}
      headerAction={headerAction}
      setupContent={setupContent}
      seatingContent={seatingContent}
      behaviorContent={behaviorContent}
      alertsContent={alertsContent}
      roomDisplayContent={roomDisplayContent}
    />
  );
}
