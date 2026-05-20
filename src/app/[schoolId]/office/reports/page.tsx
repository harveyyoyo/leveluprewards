'use client';

import { OfficeGradeReportView } from '@/components/office/OfficeGradeReportView';
import { useOfficePortalData } from '@/components/office/OfficePortalGate';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { useAppContext } from '@/components/AppProvider';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import { useDoc } from '@/firebase';

export default function OfficeReportsPage() {
  const { schoolId } = useAppContext();
  const { gradeEntries } = useOfficePortalData();
  const shared = useOfficeSharedData(schoolId, true);
  const schoolDocRef = useSchoolMetadataDocRef();
  const { data: schoolMeta } = useDoc<{ name?: string }>(schoolDocRef);

  if (!schoolId) return null;

  return (
    <OfficeGradeReportView
      schoolId={schoolId}
      schoolName={schoolMeta?.name}
      entries={gradeEntries}
      studentLabelById={shared.studentLabelById}
      classNameById={shared.classNameById}
    />
  );
}
