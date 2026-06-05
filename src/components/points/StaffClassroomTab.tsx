'use client';

import dynamic from 'next/dynamic';
import { useDeferredValue, useEffect, useMemo } from 'react';
import { LayoutGrid } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useFirebase } from '@/firebase';
import { ensureDeveloperSchoolAccess } from '@/lib/classroom/ensureDeveloperSchoolAccess';
import { isAllowedDeveloperGoogleUser } from '@/lib/developerAccess';
import {
  buildClassroomSections,
  CLASSROOM_TAB_LABEL,
} from '@/lib/classroom/classroomTabSections';
import { useSettings } from '@/components/providers/SettingsProvider';
import { isClassroomPillarOn, isParentPortalOn } from '@/lib/productPillars';
import { ClassroomSetupWizardTrigger } from '@/app/[schoolId]/admin/sections/ClassroomSetupWizard';
import { ClassAwardsLiveSettingsSection } from '@/components/classroom/ClassAwardsLiveSettingsSection';
import { ClassroomManagementHelpWizard } from '@/components/classroom/ClassroomManagementHelpWizard';
import { ClassroomRoomDisplaySection } from '@/components/classroom/ClassroomRoomDisplaySection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  categories: _categories,
  classes,
  students,
  managerTeacherId,
  schoolWideAccess: _schoolWideAccess = false,
  isGraphic: _isGraphic,
  className,
  manualAccentColor: _manualAccentColor,
  manualBudgetOptions: _manualBudgetOptions,
}: StaffClassroomTabProps) {
  const deferredStudents = useDeferredValue(students ?? []);
  const { loginState } = useAppContext();
  const { user } = useFirebase();
  const { settings, updateSettings } = useSettings();
  const classroomOn = isClassroomPillarOn(settings);
  const isAdminVariant = variant === 'admin';
  const canEditClassroomSetup = classroomOn;
  const canEnableClassroomPillar = isAdminVariant;
  const parentPortalOn = isParentPortalOn(settings);
  const principalTimelineOn = settings.enablePrincipalBehaviorTimeline === true;

  useEffect(() => {
    if (!classroomOn || !schoolId) return;
    if (loginState !== 'developer' && loginState !== 'admin') return;
    if (!isAllowedDeveloperGoogleUser(user)) return;
    void ensureDeveloperSchoolAccess(schoolId).catch(() => {
      /* save path retries provisioning */
    });
  }, [classroomOn, loginState, schoolId, user]);

  const sortedClasses = useMemo(
    () => (classes ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    [classes],
  );
  const seatingScope = managerTeacherId ?? (isAdminVariant ? 'admin' : 'staff');

  const sections = useMemo(() => buildClassroomSections(), []);

  const classAwardsLiveContent = useMemo(
    () => (
      <ClassAwardsLiveSettingsSection
        schoolId={schoolId}
        seatingScope={seatingScope}
        classes={sortedClasses}
        settings={settings}
        updateSettings={updateSettings}
        canEdit={canEditClassroomSetup}
        parentPortalOn={parentPortalOn}
        principalTimelineOn={principalTimelineOn}
      />
    ),
    [
      schoolId,
      seatingScope,
      sortedClasses,
      settings,
      updateSettings,
      canEditClassroomSetup,
      parentPortalOn,
      principalTimelineOn,
    ],
  );

  const behaviorContent = useMemo(
    () => (
      <BehaviorTimelinePanel
        schoolId={schoolId}
        refreshToken={0}
        embedded
        mode="behavior"
      />
    ),
    [schoolId],
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
            {CLASSROOM_TAB_LABEL}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {canEnableClassroomPillar
              ? `${CLASSROOM_TAB_LABEL} is not enabled. Run the setup wizard to turn on seating charts and quick awards for teachers.`
              : `${CLASSROOM_TAB_LABEL} is not enabled for your school yet. Ask a school administrator to turn it on.`}
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
      seatingContent={classAwardsLiveContent}
      behaviorContent={behaviorContent}
      roomDisplayContent={roomDisplayContent}
    />
  );
}
