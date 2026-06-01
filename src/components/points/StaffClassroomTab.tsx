'use client';

import dynamic from 'next/dynamic';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGrid, Monitor, Users } from 'lucide-react';
import Link from 'next/link';
import { useScrollPausedValue } from '@/hooks/useScrollPausedValue';
import { useAppContext } from '@/components/AppProvider';
import { useFirebase } from '@/firebase';
import { ensureDeveloperSchoolAccess } from '@/lib/classroom/ensureDeveloperSchoolAccess';
import { isAllowedDeveloperGoogleUser } from '@/lib/developerAccess';
import { buildClassroomSections } from '@/lib/classroom/classroomTabSections';
import { ClassroomPointsPanel } from '@/components/points/ClassroomPointsPanel';
import { useSettings } from '@/components/providers/SettingsProvider';
import { filterCategoriesForStaffPortal } from '@/lib/staffCategoryScope';
import { isClassroomOnlyMode, isClassroomPillarOn, CLASSROOM_SESSION_ONLY } from '@/lib/productPillars';
import { ClassroomSetupWizardTrigger } from '@/app/[schoolId]/admin/sections/ClassroomSetupWizard';
import { ClassroomManagementHelpWizard } from '@/components/classroom/ClassroomManagementHelpWizard';
import { ClassroomSectionFrame } from '@/components/classroom/ClassroomSectionFrame';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  const pageScrollRef = useRef<HTMLElement | null>(null);
  const pausedStudents = useScrollPausedValue(students ?? [], pageScrollRef, 280);
  const deferredStudents = useDeferredValue(pausedStudents);
  const { loginState } = useAppContext();
  const { user } = useFirebase();
  const { settings, updateSettings } = useSettings();
  const classroomOn = isClassroomPillarOn(settings);
  const sessionOnly = isClassroomOnlyMode(settings);
  const isAdminVariant = variant === 'admin';
  const canEditSetup = isAdminVariant;
  const parentPortalOn = settings.enableParentView === true;
  const principalTimelineOn = settings.enablePrincipalBehaviorTimeline === true;
  const roomDisplayOn = settings.enableClassroomRoomDisplay === true;

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
  const onBehaviorNoteSaved = useCallback(() => {
    setBehaviorNotesRefresh((n) => n + 1);
  }, []);

  const sections = useMemo(
    () => buildClassroomSections({ parentPortalOn, principalTimelineOn, roomDisplayOn }),
    [parentPortalOn, principalTimelineOn, roomDisplayOn],
  );

  const seatingDescription = sessionOnly
    ? CLASSROOM_SESSION_ONLY.tabBody
    : roomDisplayOn
      ? 'Tap students for quick awards, burst mode, room display, and live session totals on each desk.'
      : 'Tap students for quick awards, burst mode, and live session totals on each desk.';

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
            {canEditSetup
              ? 'Classroom Management is not enabled. Run the setup wizard to turn on seating charts and quick awards for teachers.'
              : 'Classroom Management is not enabled for your school yet. Ask a school administrator to turn it on.'}
          </p>
          {canEditSetup ? (
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

  const setupContent = (
    <ClassroomSectionFrame
      title="Setup"
      description={
        canEditSetup
          ? 'Optional features for your school. When enabled, their section appears in the menu above for everyone.'
          : 'These options are set by your school administrator. Teachers and admins see the same sections when a feature is on.'
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
          <div className="min-w-0 space-y-0.5">
            <Label htmlFor="enable-principal-timeline" className="text-sm font-bold">
              Principal
            </Label>
            <p className="text-xs text-muted-foreground">
              School-wide behavior timeline for staff and principals.
            </p>
          </div>
          <Switch
            id="enable-principal-timeline"
            checked={principalTimelineOn}
            disabled={!canEditSetup}
            onCheckedChange={(v) => updateSettings({ enablePrincipalBehaviorTimeline: v })}
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
          <div className="min-w-0 space-y-0.5">
            <Label htmlFor="enable-room-display" className="text-sm font-bold">
              Room display
            </Label>
            <p className="text-xs text-muted-foreground">
              In-room projector or TV view of the live seating chart, session totals, and class messages — not the
              hallway Smart Screen.
            </p>
          </div>
          <Switch
            id="enable-room-display"
            checked={roomDisplayOn}
            disabled={!canEditSetup}
            onCheckedChange={(v) => updateSettings({ enableClassroomRoomDisplay: v })}
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
          <div className="min-w-0 space-y-0.5">
            <Label htmlFor="enable-parent-view" className="text-sm font-bold">
              Parent portal
            </Label>
            <p className="text-xs text-muted-foreground">
              Families sign in with the parent email on file to view shared notes and points.
            </p>
          </div>
          <Switch
            id="enable-parent-view"
            checked={parentPortalOn}
            disabled={!canEditSetup}
            onCheckedChange={(v) => updateSettings({ enableParentView: v })}
          />
        </div>
      </div>
    </ClassroomSectionFrame>
  );

  const seatingContent = (
    <ClassroomSectionFrame title="Seating chart" icon={LayoutGrid} description={seatingDescription}>
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
      />
    </ClassroomSectionFrame>
  );

  const behaviorContent = (
    <BehaviorTimelinePanel
      schoolId={schoolId}
      refreshToken={behaviorNotesRefresh}
      embedded
      mode="behavior"
    />
  );

  const principalContent = principalTimelineOn ? (
    <BehaviorTimelinePanel
      schoolId={schoolId}
      refreshToken={behaviorNotesRefresh}
      embedded
      mode="principal"
    />
  ) : null;

  const roomDisplayContent = roomDisplayOn ? (
    <ClassroomSectionFrame
      title="Room display"
      icon={Monitor}
      description="Mirror the live class session on a projector, interactive board, or classroom TV."
      headerExtra={
        <Badge variant="secondary" className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
          Coming soon
        </Badge>
      }
    >
      <div className="space-y-4 rounded-xl border border-dashed border-violet-500/40 bg-violet-500/5 px-4 py-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Purpose:</span> give students and visitors a read-only view
          of who is on the chart, points earned this session, and optional class messages — without opening the full
          teacher seating tools on the big screen.
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>Runs on a dedicated display URL for the room (separate from the hallway Smart Screen).</li>
          <li>Stays in sync with the seating chart while you award during the lesson.</li>
          <li>Best for projectors, classroom TVs, and front-of-room boards.</li>
        </ul>
        <p className="text-sm font-semibold text-foreground">
          The full Room display experience is coming soon. You can still use the seating chart and session totals
          today.
        </p>
      </div>
    </ClassroomSectionFrame>
  ) : null;

  const parentsContent = parentPortalOn ? (
    <ClassroomSectionFrame
      title="Parent portal"
      icon={Users}
      description="Preview what families see, or share the link from your school portal."
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Parent sign-in: <span className="font-mono text-foreground">/{schoolId}/parent</span>
        </p>
        <Button asChild variant="outline" size="sm" className="shrink-0 rounded-xl">
          <Link href={`/${schoolId}/parent`} target="_blank" rel="noopener noreferrer">
            Open parent portal
          </Link>
        </Button>
      </div>
    </ClassroomSectionFrame>
  ) : null;

  return (
    <ClassroomTabLayout
      className={className}
      defaultSection="seating"
      sections={sections}
      headerAction={<ClassroomManagementHelpWizard sections={sections} />}
      setupContent={setupContent}
      seatingContent={seatingContent}
      behaviorContent={behaviorContent}
      principalContent={principalContent}
      roomDisplayContent={roomDisplayContent}
      parentsContent={parentsContent}
    />
  );
}
