'use client';

import { useState } from 'react';
import { OfficeClassesView } from '@/components/office/OfficeClassesView';
import { OfficeStudentSheet } from '@/components/office/OfficeStudentSheet';
import { useOfficePortalData } from '@/components/office/OfficePortalGate';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { useOfficeTerm } from '@/lib/office/useOfficeTerm';
import { useAppContext } from '@/components/AppProvider';
import type { OfficeStudent } from '@/lib/office/types';

export default function OfficeClassesPage() {
  const { schoolId } = useAppContext();
  const shared = useOfficeSharedData(schoolId, true);
  const { gradeEntries, billingAccounts } = useOfficePortalData();
  const { term } = useOfficeTerm(schoolId);
  const [selected, setSelected] = useState<OfficeStudent | null>(null);

  if (!schoolId) return null;

  return (
    <>
      <OfficeClassesView
        schoolId={schoolId}
        students={shared.students}
        classes={shared.classes}
        teachers={shared.teachers}
        teacherNameById={shared.teacherNameById}
        isLoading={shared.isLoading}
        onSelectStudent={setSelected}
      />
      <OfficeStudentSheet
        schoolId={schoolId}
        student={selected}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        classLabel={selected?.classId ? shared.classNameById.get(selected.classId) : undefined}
        gradeEntries={gradeEntries}
        billingAccounts={billingAccounts}
        activeTerm={term}
        classes={shared.classes}
        teachers={shared.teachers}
      />
    </>
  );
}
