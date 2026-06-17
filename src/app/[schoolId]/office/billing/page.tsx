'use client';

import { Suspense } from 'react';
import { OfficeBillingView } from '@/components/office/OfficeBillingView';
import { useOfficePortalData } from '@/components/office/OfficePortalGate';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { useAppContext } from '@/components/AppProvider';

export default function OfficeBillingPage() {
  const { schoolId } = useAppContext();
  const { billingAccounts, invoices } = useOfficePortalData();
  const shared = useOfficeSharedData(schoolId, true);

  if (!schoolId) return null;

  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading billing…</p>}>
      <OfficeBillingView
        schoolId={schoolId}
        students={shared.students}
        families={shared.families}
        studentLabelById={shared.studentLabelById}
        accounts={billingAccounts}
        invoices={invoices}
        isLoading={shared.isLoading}
        classNameById={shared.classNameById}
      />
    </Suspense>
  );
}
