'use client';

import { LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { ClassroomPointsPanel } from '@/components/points/ClassroomPointsPanel';
import { BehaviorTimelinePanel } from '@/components/classroom/BehaviorTimelinePanel';
import { useSettings } from '@/components/providers/SettingsProvider';
import { filterCategoriesForStaffPortal } from '@/lib/staffCategoryScope';
import { isClassroomOnlyMode, isClassroomPillarOn, CLASSROOM_SESSION_ONLY } from '@/lib/productPillars';
import { ClassroomSetupWizardTrigger } from '@/app/[schoolId]/admin/sections/ClassroomSetupWizard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ManualPointsAwardDialog } from '@/components/points/ManualPointsAwardDialog';
import type { Category, Class, Student } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { StaffPointsTabVariant } from '@/components/points/StaffPointsTab';

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
  const { settings, updateSettings } = useSettings();
  const classroomOn = isClassroomPillarOn(settings);
  const sessionOnly = isClassroomOnlyMode(settings);
  const categoryList = filterCategoriesForStaffPortal(categories, {
    schoolWideAccess: variant === 'admin' || schoolWideAccess,
    managerTeacherId,
    printOnly: false,
  });
  const sortedClasses = (classes ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const seatingScope = managerTeacherId ?? (variant === 'admin' ? 'admin' : 'staff');

  if (!classroomOn) {
    if (variant !== 'admin') return null;
    return (
      <Card className={cn('w-full border-t-4 border-violet-500 shadow-md overflow-hidden bg-background/95 backdrop-blur-md', className)}>
        <CardHeader className="bg-secondary/35 border-b border-border/40 p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight sm:text-2xl">
            <LayoutGrid className="h-5 w-5 shrink-0 text-violet-500 sm:h-6 sm:w-6" />
            Classroom Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <p className="text-sm text-muted-foreground">
            Classroom Management is not enabled. Run setup to turn on seating charts and quick awards for
            teachers.
          </p>
          <ClassroomSetupWizardTrigger
            schoolId={schoolId}
            classes={sortedClasses}
            students={students ?? []}
            updateSettings={updateSettings}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
    <Card className="w-full border-t-4 border-violet-500 shadow-md overflow-hidden bg-background/95 backdrop-blur-md">
      <CardHeader className="bg-secondary/35 border-b border-border/40 p-4 sm:p-6">
        <Helper content="Seating chart, session quick awards, behavior notes, and the in-room display for projectors or classroom TVs.">
          <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight sm:text-2xl">
            <LayoutGrid className="h-5 w-5 shrink-0 text-violet-500 sm:h-6 sm:w-6" />
            Classroom Management
          </CardTitle>
        </Helper>
        {sessionOnly ? (
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
            {CLASSROOM_SESSION_ONLY.tabBody}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {variant === 'admin' ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2 sm:justify-start">
              <div>
                <Label htmlFor="enable-parent-view" className="text-sm font-bold">
                  Parent portal
                </Label>
                <p className="text-xs text-muted-foreground">Families view points, notes, and attendance</p>
              </div>
              <Switch
                id="enable-parent-view"
                checked={settings.enableParentView === true}
                onCheckedChange={(v) => updateSettings({ enableParentView: v })}
              />
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              {settings.enableParentView ? (
                <Button asChild variant="outline" size="sm" className="rounded-xl">
                  <Link href={`/${schoolId}/parent`} target="_blank" rel="noopener noreferrer">
                    Open parent portal
                  </Link>
                </Button>
              ) : null}
              <ClassroomSetupWizardTrigger
                schoolId={schoolId}
                classes={sortedClasses}
                students={students ?? []}
                updateSettings={updateSettings}
              />
            </div>
          </div>
        ) : null}
        <ClassroomPointsPanel
          schoolId={schoolId}
          students={students ?? []}
          classes={sortedClasses}
          categories={categoryList}
          storageScope={seatingScope}
          accentColor={manualAccentColor}
          isGraphic={isGraphic}
          budgetOptions={manualBudgetOptions}
          sessionOnly={sessionOnly}
        />
      </CardContent>
    </Card>
    {variant === 'admin' ? <BehaviorTimelinePanel schoolId={schoolId} /> : null}
    </div>
  );
}