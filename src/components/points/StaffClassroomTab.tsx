'use client';

import { ClassroomCommandCenter, type ClassroomWorkbenchTab } from '@/components/classroom/ClassroomCommandCenter';
import type { ClassroomTabSection } from '@/lib/classroom/classroomTabSections';
import type { Category, Class, Student, Teacher } from '@/lib/types';
import type { StaffPointsTabVariant } from '@/components/points/StaffPointsTab';
import type { ManualPointsAwardDialog } from '@/components/points/ManualPointsAwardDialog';

export type StaffClassroomTabProps = {
  variant: StaffPointsTabVariant;
  schoolId: string;
  categories: Category[] | null | undefined;
  classes: Class[] | null | undefined;
  students: Student[] | null | undefined;
  teachers?: Teacher[] | null;
  managerTeacherId?: string;
  schoolWideAccess?: boolean;
  isGraphic?: boolean;
  className?: string;
  manualAccentColor?: string;
  manualBudgetOptions?: React.ComponentProps<typeof ManualPointsAwardDialog>['budgetOptions'];
  initialSection?: ClassroomTabSection;
  canEditRaffleSettings?: boolean;
  raffleOperatorName?: string;
  /** Render inside the Classroom realm (no staff portal tab chrome). */
  realmMode?: boolean;
};

export function StaffClassroomTab({
  variant,
  schoolId,
  categories,
  classes,
  students,
  teachers,
  managerTeacherId,
  schoolWideAccess,
  manualBudgetOptions,
  canEditRaffleSettings,
  raffleOperatorName,
  initialSection,
  className,
}: StaffClassroomTabProps) {
  const mapSectionToTab: Record<ClassroomTabSection, ClassroomWorkbenchTab> = {
    seating: 'seating',
    behavior: 'behavior',
    'room-display': 'display',
    raffle: 'raffle',
  };

  const initialTab = initialSection ? mapSectionToTab[initialSection] : 'seating';

  return (
    <ClassroomCommandCenter
      schoolId={schoolId}
      categories={categories}
      classes={classes}
      students={students}
      teachers={teachers}
      schoolWideAccess={schoolWideAccess}
      budgetOptions={manualBudgetOptions}
      canEditRaffleSettings={canEditRaffleSettings}
      raffleOperatorName={raffleOperatorName}
      variant={variant === 'admin' ? 'admin' : 'teacher'}
      activeTeacherId={managerTeacherId}
      initialTab={initialTab}
      className={className}
    />
  );
}
