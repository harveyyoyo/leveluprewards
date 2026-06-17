'use client';

import { createContext, useContext, useMemo } from 'react';
import { useOfficeSettings } from '@/lib/office/useOfficeSettings';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { useOfficePortalData } from '@/components/office/OfficePortalGate';
import { buildOfficeSearchIndex, type OfficeSearchResult } from '@/lib/office/officeSearchIndex';
import { getOfficeMarksLabels, isOfficeFeatureEnabled } from '@/lib/office/officeTerminology';
import type { OfficeMarksLabels } from '@/lib/office/officeTerminology';
import type { OfficeSettings } from '@/lib/office/types';

type OfficePortalChromeValue = {
  schoolId: string;
  settings: OfficeSettings | null;
  marksLabels: OfficeMarksLabels;
  searchIndex: OfficeSearchResult[];
  features: {
    aiHelp: boolean;
    familyProfiles: boolean;
    studentPhotos: boolean;
    busInfo: boolean;
    medicalNotes: boolean;
    auditLog: boolean;
  };
  isDataLoading: boolean;
};

const OfficePortalChromeContext = createContext<OfficePortalChromeValue | null>(null);

export function OfficePortalChromeProvider({
  schoolId,
  children,
}: {
  schoolId: string;
  children: React.ReactNode;
}) {
  const { settings, isLoading: settingsLoading } = useOfficeSettings(schoolId);
  const shared = useOfficeSharedData(schoolId, true);
  const portal = useOfficePortalData();

  const value = useMemo<OfficePortalChromeValue>(() => {
    const marksLabels = getOfficeMarksLabels(settings);
    const searchIndex = buildOfficeSearchIndex({
      students: shared.students,
      families: shared.families,
      classes: shared.classes,
      teachers: shared.teachers,
      billingAccounts: portal.billingAccounts,
      invoices: portal.invoices,
      gradeEntries: portal.gradeEntries,
      classNameById: shared.classNameById,
      teacherNameById: shared.teacherNameById,
      studentLabelById: shared.studentLabelById,
    });
    return {
      schoolId,
      settings,
      marksLabels,
      searchIndex,
      features: {
        aiHelp: isOfficeFeatureEnabled(settings, 'aiHelp'),
        familyProfiles: isOfficeFeatureEnabled(settings, 'familyProfiles'),
        studentPhotos: isOfficeFeatureEnabled(settings, 'studentPhotos'),
        busInfo: isOfficeFeatureEnabled(settings, 'busInfo'),
        medicalNotes: isOfficeFeatureEnabled(settings, 'medicalNotes'),
        auditLog: isOfficeFeatureEnabled(settings, 'auditLog'),
      },
      isDataLoading: shared.isLoading || portal.isOfficeDataLoading || settingsLoading,
    };
  }, [schoolId, settings, shared, portal, settingsLoading]);

  return <OfficePortalChromeContext.Provider value={value}>{children}</OfficePortalChromeContext.Provider>;
}

export function useOfficePortalChrome(): OfficePortalChromeValue {
  const ctx = useContext(OfficePortalChromeContext);
  if (!ctx) {
    throw new Error('useOfficePortalChrome must be used within OfficePortalChromeProvider');
  }
  return ctx;
}
