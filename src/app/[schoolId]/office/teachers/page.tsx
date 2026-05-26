'use client';

import { OfficeTeachersView } from '@/components/office/OfficeTeachersView';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { useAppContext } from '@/components/AppProvider';

export default function OfficeTeachersPage() {
  const { schoolId } = useAppContext();
  const shared = useOfficeSharedData(schoolId, true);

  if (!schoolId) return null;

  return (
    <OfficeTeachersView
      schoolId={schoolId}
      teachers={shared.teachers}
      students={shared.students}
      isLoading={shared.isLoading}
    />
  );
}
