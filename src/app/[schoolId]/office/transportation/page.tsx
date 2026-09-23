'use client';

import { OfficeTransportationView } from '@/components/office/OfficeTransportationView';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { useAppContext } from '@/components/AppProvider';

export default function OfficeTransportationPage() {
  const { schoolId } = useAppContext();
  const shared = useOfficeSharedData(schoolId, true);

  if (!schoolId) return null;

  return (
    <OfficeTransportationView
      schoolId={schoolId}
      students={shared.students}
      classNameById={shared.classNameById}
      familyById={shared.familyById}
      isLoading={shared.isLoading}
    />
  );
}
