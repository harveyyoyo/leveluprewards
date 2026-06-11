'use client';

import { Suspense } from 'react';
import { OfficeReportsHub } from '@/components/office/OfficeReportsHub';
import { useOfficePortalData } from '@/components/office/OfficePortalGate';
import { useAppContext } from '@/components/AppProvider';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import { useDoc } from '@/firebase';

export default function OfficeReportsPage() {
  const { schoolId } = useAppContext();
  const { auditEntries, payments } = useOfficePortalData();
  const schoolDocRef = useSchoolMetadataDocRef();
  const { data: schoolMeta } = useDoc<{ name?: string }>(schoolDocRef);

  if (!schoolId) return null;

  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading reports…</p>}>
      <OfficeReportsHub
        schoolId={schoolId}
        schoolName={schoolMeta?.name}
        auditEntries={auditEntries}
        payments={payments}
      />
    </Suspense>
  );
}
