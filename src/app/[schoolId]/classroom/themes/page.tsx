'use client';

import { useParams } from 'next/navigation';
import { ClassroomThemeKitStudio } from '@/components/classroom/ClassroomThemeKitStudio';

export default function ClassroomThemesPage() {
  const params = useParams();
  const schoolId = typeof params?.schoolId === 'string' ? params.schoolId : '';

  return <ClassroomThemeKitStudio schoolId={schoolId} />;
}
