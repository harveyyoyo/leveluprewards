'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { HousesWorkspace } from '@/components/houses/HousesWorkspace';

export default function HousesManagePage() {
  const params = useParams();
  const schoolId = String(params.schoolId || '');

  return (
    <Suspense fallback={null}>
      <HousesWorkspace schoolId={schoolId} initialTab="rosters" />
    </Suspense>
  );
}
