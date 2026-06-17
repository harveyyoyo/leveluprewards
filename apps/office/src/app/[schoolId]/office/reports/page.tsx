'use client';

import { Suspense } from 'react';
import { OfficeReportsView } from '@/components/office/OfficeReportsView';
import { useOfficePortalData } from '@/components/office/OfficePortalGate';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { useAppContext } from '@/components/providers/OfficeAuthProvider';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import { useDoc } from '@/firebase';

export default function OfficeReportsPage() {
  const { schoolId } = useAppContext();
  const { gradeEntries, billingAccounts, invoices } = useOfficePortalData();
  const shared = useOfficeSharedData(schoolId, true);
  const schoolDocRef = useSchoolMetadataDocRef();
  const { data: schoolMeta } = useDoc<{ name?: string }>(schoolDocRef);

  if (!schoolId) return null;

  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading reports…</p>}>
      <OfficeReportsView
        schoolId={schoolId}
        schoolName={schoolMeta?.name}
        gradeEntries={gradeEntries}
        students={shared.students}
        classes={shared.classes}
        billingAccounts={billingAccounts}
        invoices={invoices}
        studentLabelById={shared.studentLabelById}
        classNameById={shared.classNameById}
        teacherNameById={shared.teacherNameById}
      />
    </Suspense>
  );
}
