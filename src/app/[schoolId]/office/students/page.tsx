'use client';

import { Suspense } from 'react';
import { OfficeStudentsView } from '@/components/office/OfficeStudentsView';
import { useOfficePortalData } from '@/components/office/OfficePortalGate';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { useOfficeTerm } from '@/lib/office/useOfficeTerm';
import { useAppContext } from '@/components/AppProvider';

export default function OfficeStudentsPage() {
  const { schoolId } = useAppContext();
  const shared = useOfficeSharedData(schoolId, true);
  const { gradeEntries, billingAccounts } = useOfficePortalData();
  const { term } = useOfficeTerm(schoolId);

  if (!schoolId) return null;

  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading students…</p>}>
      <OfficeStudentsView
        schoolId={schoolId}
        students={shared.students}
        classes={shared.classes}
        classNameById={shared.classNameById}
        gradeEntries={gradeEntries}
        billingAccounts={billingAccounts}
        activeTerm={term}
        isLoading={shared.isLoading}
      />
    </Suspense>
  );
}
