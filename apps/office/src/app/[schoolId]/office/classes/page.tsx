'use client';

import { Suspense } from 'react';
import { OfficeClassesView } from '@/components/office/OfficeClassesView';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { useAppContext } from '@/components/providers/OfficeAuthProvider';

export default function OfficeClassesPage() {
  const { schoolId } = useAppContext();
  const shared = useOfficeSharedData(schoolId, true);

  if (!schoolId) return null;

  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading classes…</p>}>
      <OfficeClassesView
        schoolId={schoolId}
        students={shared.students}
        classes={shared.classes}
        teacherNameById={shared.teacherNameById}
        isLoading={shared.isLoading}
      />
    </Suspense>
  );
}
