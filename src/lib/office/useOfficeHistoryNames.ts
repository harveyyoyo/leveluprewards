'use client';

import { useCallback } from 'react';
import { useOfficePortalData } from '@/components/office/OfficePortalGate';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import type { OfficeHistoryNameLookup } from '@/lib/office/officeHistoryLabels';
import { safeString } from '@/lib/safeDisplayValue';

/** Turns record ids in history snapshots into names (including removed records). */
export function useOfficeHistoryNames(schoolId: string): OfficeHistoryNameLookup {
  const shared = useOfficeSharedData(schoolId, true);
  const { billingAccounts } = useOfficePortalData();

  return useCallback(
    (id: string) =>
      shared.studentLabelById.get(id) ??
      shared.teacherNameById.get(id) ??
      shared.classNameById.get(id) ??
      (shared.familyById.get(id) ? safeString(shared.familyById.get(id)!.displayName) : undefined) ??
      billingAccounts.find((a) => a.id === id)?.familyName,
    [shared.studentLabelById, shared.teacherNameById, shared.classNameById, shared.familyById, billingAccounts],
  );
}
