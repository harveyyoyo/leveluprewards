'use client';

import { OfficeFrontDeskView } from '@/components/office/OfficeFrontDeskView';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { useAppContext } from '@/components/AppProvider';

export default function OfficeFrontDeskPage() {
  const { schoolId } = useAppContext();
  const shared = useOfficeSharedData(schoolId, true);

  if (!schoolId) return null;

  return (
    <OfficeFrontDeskView
      schoolId={schoolId}
      students={shared.students}
      classNameById={shared.classNameById}
      familyById={shared.familyById}
      isLoading={shared.isLoading}
    />
  );
}
