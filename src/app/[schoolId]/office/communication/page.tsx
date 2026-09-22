'use client';

import { OfficeCommunicationView } from '@/components/office/OfficeCommunicationView';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { useAppContext } from '@/components/AppProvider';

export default function OfficeCommunicationPage() {
  const { schoolId } = useAppContext();
  const shared = useOfficeSharedData(schoolId, true);

  if (!schoolId) return null;

  return (
    <OfficeCommunicationView
      schoolId={schoolId}
      students={shared.students}
      classes={shared.classes}
      families={shared.families}
      isLoading={shared.isLoading}
    />
  );
}
