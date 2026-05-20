'use client';

import { OfficeGradesView } from '@/components/office/OfficeGradesView';
import { useOfficePortalData } from '@/components/office/OfficePortalGate';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { useAppContext } from '@/components/AppProvider';

export default function OfficeGradesPage() {
  const { schoolId, userName } = useAppContext();
  const { gradeEntries } = useOfficePortalData();
  const shared = useOfficeSharedData(schoolId, true);

  if (!schoolId) return null;

  return (
    <OfficeGradesView
      schoolId={schoolId}
      students={shared.students}
      classNameById={shared.classNameById}
      studentLabelById={shared.studentLabelById}
      entries={gradeEntries}
      userName={userName}
      isLoading={shared.isLoading}
    />
  );
}
