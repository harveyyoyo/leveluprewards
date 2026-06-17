'use client';

import { useMemo } from 'react';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore } from '@/firebase';
import type { OfficeWriteContext } from '@/lib/office/officeDb';
import * as officeDb from '@/lib/office/officeDb';
import { useOfficeSettings } from '@/lib/office/useOfficeSettings';
import { isOfficeFeatureEnabled } from '@/lib/office/officeTerminology';

export function useOfficeWrite(schoolId: string | null) {
  const firestore = useFirestore();
  const { userName } = useAppContext();
  const { settings } = useOfficeSettings(schoolId);

  const ctx = useMemo<OfficeWriteContext | null>(() => {
    if (!firestore || !schoolId) return null;
    return {
      firestore,
      schoolId,
      changedBy: userName,
      auditLog: isOfficeFeatureEnabled(settings, 'auditLog'),
    };
  }, [firestore, schoolId, userName, settings]);

  return useMemo(
    () => ({
      ctx,
      ready: !!ctx,
      ...officeDb,
    }),
    [ctx],
  );
}
