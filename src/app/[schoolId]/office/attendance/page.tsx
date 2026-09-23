'use client';

import { OfficeAttendanceView } from '@/components/office/OfficeAttendanceView';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { useAppContext } from '@/components/AppProvider';

export default function OfficeAttendancePage() {
  const { schoolId } = useAppContext();
  const shared = useOfficeSharedData(schoolId, true);

  if (!schoolId) return null;

  return (
    <OfficeAttendanceView
      schoolId={schoolId}
      students={shared.students}
      classes={shared.classes}
      isLoading={shared.isLoading}
    />
  );
}
