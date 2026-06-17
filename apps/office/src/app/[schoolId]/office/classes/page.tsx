'use client';

import { OfficeClassesView } from '@/components/office/OfficeClassesView';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { useAppContext } from '@/components/providers/OfficeAuthProvider';

export default function OfficeClassesPage() {
  const { schoolId } = useAppContext();
  const shared = useOfficeSharedData(schoolId, true);

  if (!schoolId) return null;

  return (
    <OfficeClassesView
      schoolId={schoolId}
      students={shared.students}
      classes={shared.classes}
      teacherNameById={shared.teacherNameById}
      isLoading={shared.isLoading}
    />
  );
}
