'use client';

import { useMemo } from 'react';
import { OfficeDashboard } from '@/components/office/OfficeDashboard';
import { useOfficePortalData } from '@/components/office/OfficePortalGate';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { useOfficeTerm } from '@/lib/office/useOfficeTerm';
import { useOfficeSettings } from '@/lib/office/useOfficeSettings';
import { buildOfficeDashboardInsights } from '@/lib/office/officeUtils';
import { useAppContext } from '@/components/AppProvider';

export default function OfficeHomePage() {
  const { schoolId } = useAppContext();
  const { gradeEntries, billingAccounts, invoices } = useOfficePortalData();
  const shared = useOfficeSharedData(schoolId, true);
  const { term } = useOfficeTerm(schoolId);
  const { settings } = useOfficeSettings(schoolId);

  const insights = useMemo(
    () => buildOfficeDashboardInsights(shared.students, gradeEntries, invoices, term, billingAccounts),
    [shared.students, gradeEntries, invoices, term, billingAccounts],
  );

  if (!schoolId) return null;

  // Demo-school sample data tools live in Settings → Demo school.
  return (
    <OfficeDashboard
      schoolId={schoolId}
      studentCount={shared.students.length}
      classCount={shared.classes.length}
      teacherCount={shared.teachers.length}
      insights={insights}
      activeTerm={term}
      showAttendance={settings?.features?.attendance !== false}
    />
  );
}
