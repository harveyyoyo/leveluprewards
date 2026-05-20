'use client';

import { useMemo } from 'react';
import { OfficeDashboard } from '@/components/office/OfficeDashboard';
import { useOfficePortalData } from '@/components/office/OfficePortalGate';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { useOfficeTerm } from '@/lib/office/useOfficeTerm';
import { buildOfficeDashboardInsights } from '@/lib/office/officeUtils';
import { useAppContext } from '@/components/AppProvider';

export default function OfficeHomePage() {
  const { schoolId } = useAppContext();
  const { gradeEntries, billingAccounts, invoices } = useOfficePortalData();
  const shared = useOfficeSharedData(schoolId, true);
  const { term } = useOfficeTerm(schoolId);

  const insights = useMemo(
    () => buildOfficeDashboardInsights(shared.students, gradeEntries, invoices, term),
    [shared.students, gradeEntries, invoices, term],
  );

  const accountNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of billingAccounts) map.set(a.id, a.familyName);
    return map;
  }, [billingAccounts]);

  if (!schoolId) return null;

  return (
    <OfficeDashboard
      schoolId={schoolId}
      studentCount={shared.students.length}
      classCount={shared.classes.length}
      insights={insights}
      studentLabelById={shared.studentLabelById}
      accountNameById={accountNameById}
    />
  );
}
