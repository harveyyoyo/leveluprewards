'use client';

import { useParams } from 'next/navigation';
import { SssStudentDatabaseView } from '@/components/sss/SssStudentDatabaseView';
import { useSssPortalData } from '@/components/sss/SssPortalGate';

export default function SssHomePage() {
  const routeSchoolId = useParams<{ schoolId: string }>().schoolId?.trim().toLowerCase() ?? '';
  const { students, isSssDataLoading } = useSssPortalData();
  if (!routeSchoolId) return null;
  return (
    <SssStudentDatabaseView schoolId={routeSchoolId} students={students} isLoading={isSssDataLoading} />
  );
}
