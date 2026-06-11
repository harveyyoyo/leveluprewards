'use client';

import { useState } from 'react';
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';
import { SchoolReportsPanel } from '@/components/reports/SchoolReportsPanel';
import { StudentActivityLogSection } from '@/components/reports/StudentActivityLogSection';
import {
  StaffPortalSectionCard,
  StaffPortalSectionCardContent,
} from '@/components/staff/StaffPortalSection';
import { StaffPortalTabPanel } from '@/components/staff/StaffPortalTabHeader';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import type { StudentActivityRow } from '@/hooks/useStudentActivityLog';
import type { Category, Class, Coupon, Prize, Student, Teacher } from '@/lib/types';

export function AdminReportsTab({
  schoolName,
  students,
  classes,
  teachers,
  coupons,
  prizes,
  categories,
  rafflePointsPerTicket,
  studentActivityLog,
  studentActivityLogLoading,
  loadStudentActivityLog,
}: {
  schoolName: string;
  students: Student[] | null | undefined;
  classes: Class[] | null | undefined;
  teachers: Teacher[] | null | undefined;
  coupons: Coupon[] | null | undefined;
  prizes: Prize[] | null | undefined;
  categories: Category[] | null | undefined;
  rafflePointsPerTicket?: number;
  studentActivityLog: StudentActivityRow[];
  studentActivityLogLoading: boolean;
  loadStudentActivityLog: () => void;
}) {
  const [section, setSection] = useState<'reports' | 'activity'>('reports');

  return (
    <StaffPortalTabPanel tabValue="reports" trailing={<TabWalkthroughHeaderAction />}>
      <StaffPortalSectionCard className="w-full overflow-hidden bg-background/95 backdrop-blur-md">
        <StaffPortalSectionCardContent className="space-y-6 p-6">
          <ContentSectionTreeNav
            items={[
              { id: 'reports', label: 'Reports' },
              { id: 'activity', label: 'Activity Log' },
            ]}
            value={section}
            onValueChange={(id) => setSection(id as 'reports' | 'activity')}
            className="mb-2"
          />

          {section === 'reports' ? (
            <SchoolReportsPanel
              scope="school"
              schoolName={schoolName}
              students={students ?? []}
              classes={classes ?? []}
              teachers={teachers ?? []}
              coupons={coupons ?? []}
              prizes={prizes ?? []}
              categories={categories ?? []}
              rafflePointsPerTicket={rafflePointsPerTicket}
              embedded
            />
          ) : (
            <StudentActivityLogSection
              entries={studentActivityLog}
              loading={studentActivityLogLoading}
              onRefresh={loadStudentActivityLog}
            />
          )}
        </StaffPortalSectionCardContent>
      </StaffPortalSectionCard>
    </StaffPortalTabPanel>
  );
}
