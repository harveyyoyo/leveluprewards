'use client';

import { useMemo } from 'react';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useDoc } from '@/firebase';
import { hasVerifiedOfficeFirestoreAccess } from '@/lib/office/officeAccess';
import type { OfficeSettings } from '@/lib/office/types';
import { officeSettingsDocRef } from '@/lib/office/officeSettingsDoc';

export function useOfficeSettings(schoolId: string | null) {
  const firestore = useFirestore();
  const { loginState, isAdmin, isOffice, isInitialized } = useAppContext();
  const roleVerified = hasVerifiedOfficeFirestoreAccess({ loginState, isAdmin, isOffice, schoolId });
  const canLoad = Boolean(schoolId && firestore && isInitialized && roleVerified);

  const ref = useMemo(
    () => (canLoad && firestore && schoolId ? officeSettingsDocRef(firestore, schoolId) : null),
    [canLoad, firestore, schoolId],
  );

  const { data, isLoading } = useDoc<OfficeSettings>(ref);

  return {
    settings: data ?? null,
    isLoading: canLoad && isLoading,
    canLoad,
  };
}
