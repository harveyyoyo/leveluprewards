'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useOfficeAuth } from './OfficeAuthProvider';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { schoolPublicDocRef } from '@/lib/schoolPublic';
import type { PillarSettings } from '@/lib/productPillars';

type OfficeSettingsContextValue = {
  settings: PillarSettings;
  enableHelperMode: boolean;
};

const OfficeSettingsContext = createContext<OfficeSettingsContextValue>({
  settings: {},
  enableHelperMode: true,
});

export function OfficeSettingsProvider({ children }: { children: React.ReactNode }) {
  const { firestore } = useFirebase();
  const { schoolId } = useOfficeAuth();

  const schoolPublicRef = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return schoolPublicDocRef(firestore, schoolId.trim().toLowerCase());
  }, [firestore, schoolId]);

  const { data: schoolPublic } = useDoc<{ appSettings?: PillarSettings }>(schoolPublicRef);

  const value = useMemo(
    () => ({
      settings: schoolPublic?.appSettings ?? {},
      enableHelperMode: true,
    }),
    [schoolPublic?.appSettings],
  );

  return <OfficeSettingsContext.Provider value={value}>{children}</OfficeSettingsContext.Provider>;
}

export function useSettings() {
  return useContext(OfficeSettingsContext);
}
